import { DockerOrderService } from './docker-service';
import { Decimal } from '@prisma/client/runtime/library';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '../../lib/prisma';
import { adminService } from '../admin/service';
import { settingsService } from '../../services/settings';
import { adminSettingsService } from '../admin/settings.service';
import { logger } from '../../utils/logger';

const redis = new Redis(process.env.REDIS_URL!);
const orderQueue = new Queue('orderExpirer', { connection: redis });

interface CreateOrderData {
  userId: string;
  productId: string;
  amountUsdt: Decimal;
  productName: string;
}

class OrderService {
  async createOrder(data: CreateOrderData) {
    try {
      // Get next available wallet from admin pool
      const assignedWallet = await adminService.getNextWalletForAssignment();
      if (!assignedWallet) {
        throw new Error('No wallets available for assignment. Please contact administrator.');
      }
      
      const order = await DockerOrderService.createOrder(
        data.userId,
        data.productId,
        Number(data.amountUsdt),
        assignedWallet.address
      );
      
      // Schedule order expiration job
      const expirationMinutes = await settingsService.getOrderExpirationMinutes();
      await orderQueue.add(
        'expireOrder',
        { orderId: order.id },
        { delay: expirationMinutes * 60 * 1000 } // configurable minutes
      );
      
      return order;
    } catch (error) {
      logger.error('Create order error: ' + (error as Error).message);
      throw error;
    }
  }
  
  async getUserPendingOrder(userId: string) {
    try {
      return await DockerOrderService.getUserPendingOrder(userId);
    } catch (error) {
      logger.error('Get user pending order error: ' + (error as Error).message);
      throw error;
    }
  }

  async getUserOrders(userId: string, page: number = 1, limit: number = 20, status?: string) {
    try {
      const skip = (page - 1) * limit;
      const where: any = { user_id: userId };
      
      if (status && status !== 'all') {
        where.status = status;
      }
      
      return await prisma.orderDeposit.findMany({
        where,
        include: {
          product: true
        },
        orderBy: {
          created_at: 'desc'
        },
        skip,
        take: limit
      });
    } catch (error) {
      logger.error('Get user orders error: ' + (error as Error).message);
      throw error;
    }
  }
  
  async getOrderById(id: string, userId: string) {
    try {
      return await DockerOrderService.getOrderById(id, userId);
    } catch (error) {
      logger.error('Get order by id error: ' + (error as Error).message);
      throw error;
    }
  }
  
  async submitTransaction(orderId: string, userId: string, txHash: string) {
    try {
      return await DockerOrderService.submitTransaction(orderId, userId, txHash);
    } catch (error) {
      logger.error('Submit transaction error: ' + (error as Error).message);
      throw error;
    }
  }
  
  async expireOrder(orderId: string) {
    try {
      const order = await prisma.orderDeposit.findUnique({
        where: { id: orderId }
      });
      
      if (!order || order.status !== 'pending') {
        return null;
      }
      
      return await prisma.orderDeposit.update({
        where: { id: orderId },
        data: { status: 'expired' }
      });
    } catch (error) {
      logger.error('Expire order error: ' + (error as Error).message);
      throw error;
    }
  }
  
  async confirmOrder(orderId: string, adminId: string) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Get order details
        const order = await tx.orderDeposit.findUnique({
          where: { id: orderId },
          include: {
            user: true,
            product: true
          }
        });
        
        if (!order || order.status !== 'paid') {
      throw new Error('Order not found or not in paid status');
        }
        
        // Get product details
        const product = await tx.licenseProduct.findUnique({
          where: { id: order.product_id }
        });
        
        if (!product) {
          throw new Error('Product not found');
        }
        
        // Update order status
        const confirmedOrder = await tx.orderDeposit.update({
          where: { id: orderId },
          data: {
            status: 'confirmed'
          }
        });
        
        // Create user license
        const license = await tx.userLicense.create({
          data: {
             user_id: order.user_id,
             product_id: order.product_id,
             order_id: orderId,
             principal_usdt: order.amount_usdt,
             ends_at: new Date(Date.now() + product.duration_days * 24 * 60 * 60 * 1000),
             status: 'active'
           }
        });
        
        // Create ledger entry for purchase
        await tx.ledgerEntry.create({
          data: {
            user_id: order.user_id,
            direction: 'debit',
            amount: order.amount_usdt,
            ref_type: 'order',
            ref_id: order.id,
            meta: {
              description: `Purchase of ${product.name}`,
              productName: product.name
            }
          }
        });
        
        // Create referral commission if user has sponsor
        if (order.user.sponsor_id) {
          // Get referral commission rate from admin settings
          const adminSettings = await adminSettingsService.getSettings();
          const commissionRate = adminSettings.system.referral_commission_rate;
          const commissionAmount = order.amount_usdt.mul(commissionRate);
          
          await tx.referralCommission.create({
            data: {
              sponsor_id: order.user.sponsor_id,
              referred_user_id: order.user_id,
              license_id: license.id,
              order_id: order.id,
              amount_usdt: commissionAmount,
              status: 'pending'
            }
          });
          
          logger.info(`Created referral commission: ${commissionAmount.toString()} USDT for sponsor ${order.user.sponsor_id}`);
        }
        
        return { order: confirmedOrder, license };
      });
    } catch (error) {
      logger.error('Confirm order error: ' + (error as Error).message);
      throw error;
    }
  }

  async reassignOrder(orderId: string, userId: string) {
    try {
      // Get the original order
      const originalOrder = await this.getOrderById(orderId, userId);
      if (!originalOrder) {
        return {
          success: false,
          error: 'Order not found',
          currentStatus: null
        };
      }

      // Check if order is expired
      if (originalOrder.status !== 'expired') {
        return {
          success: false,
          error: 'Order is not expired or already confirmed',
          currentStatus: originalOrder.status
        };
      }

      // Create new order with same product
      const newOrder = await this.createOrder({
        userId,
        productId: originalOrder.product_id,
        amountUsdt: new Decimal(originalOrder.amount_usdt.toString()),
        productName: originalOrder.product.name
      });

      return {
        success: true,
        newOrder,
        error: null,
        currentStatus: null
      };
    } catch (error) {
      logger.error('Reassign order error: ' + (error as Error).message);
      throw error;
    }
  }
}

export const orderService = new OrderService();