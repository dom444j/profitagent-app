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
      
      // Get order expiration time
      const expirationMinutes = await settingsService.getOrderExpirationMinutes();
      const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);
      
      // Create order using Prisma
      const order = await prisma.orderDeposit.create({
        data: {
          user_id: data.userId,
          product_id: data.productId,
          amount_usdt: data.amountUsdt,
          wallet_address: assignedWallet.address,
          status: 'pending',
          expires_at: expiresAt
        },
        include: {
          product: {
            select: {
              name: true,
              price_usdt: true
            }
          }
        }
      });
      
      // Schedule order expiration job
      await orderQueue.add(
        'expireOrder',
        { orderId: order.id },
        { delay: expirationMinutes * 60 * 1000 }
      );
      
      return {
        id: order.id,
        user_id: order.user_id,
        product_id: order.product_id,
        amount_usdt: Number(order.amount_usdt),
        wallet_address: order.wallet_address,
        status: order.status,
        expires_at: order.expires_at,
        created_at: order.created_at,
        updated_at: order.updated_at,
        product: {
          name: order.product.name,
          price_usdt: Number(order.product.price_usdt)
        }
      };
    } catch (error) {
      logger.error('Create order error: ' + (error as Error).message);
      throw error;
    }
  }
  
  async getUserPendingOrder(userId: string) {
    try {
      const pendingOrder = await prisma.orderDeposit.findFirst({
        where: {
          user_id: userId,
          status: 'pending'
        },
        include: {
          product: {
            select: {
              name: true,
              price_usdt: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      });
      
      if (!pendingOrder) {
        return null;
      }
      
      return {
        id: pendingOrder.id,
        user_id: pendingOrder.user_id,
        product_id: pendingOrder.product_id,
        amount_usdt: Number(pendingOrder.amount_usdt),
        wallet_address: pendingOrder.wallet_address,
        status: pendingOrder.status,
        expires_at: pendingOrder.expires_at,
        created_at: pendingOrder.created_at,
        updated_at: pendingOrder.updated_at,
        product: {
          name: pendingOrder.product.name,
          price_usdt: Number(pendingOrder.product.price_usdt)
        }
      };
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
      const order = await prisma.orderDeposit.findFirst({
        where: {
          id: id,
          user_id: userId
        },
        include: {
          product: {
            select: {
              name: true,
              price_usdt: true
            }
          }
        }
      });
      
      if (!order) {
        return null;
      }
      
      return {
        id: order.id,
        user_id: order.user_id,
        product_id: order.product_id,
        amount_usdt: Number(order.amount_usdt),
        wallet_address: order.wallet_address,
        status: order.status,
        tx_hash: order.tx_hash,
        expires_at: order.expires_at,
        created_at: order.created_at,
        updated_at: order.updated_at,
        product: {
          name: order.product.name,
          price_usdt: Number(order.product.price_usdt)
        }
      };
    } catch (error) {
      logger.error('Get order by id error: ' + (error as Error).message);
      throw error;
    }
  }
  
  async submitTransaction(orderId: string, userId: string, txHash: string) {
    try {
      // First verify the order exists and belongs to the user
      const existingOrder = await prisma.orderDeposit.findFirst({
        where: {
          id: orderId,
          user_id: userId,
          status: 'pending'
        }
      });
      
      if (!existingOrder) {
        throw new Error('Order not found or not pending');
      }
      
      // Update the order with transaction hash and set status to submitted
      const updatedOrder = await prisma.orderDeposit.update({
        where: {
          id: orderId
        },
        data: {
          tx_hash: txHash,
          status: 'paid',
          updated_at: new Date()
        },
        include: {
          product: {
            select: {
              name: true,
              price_usdt: true
            }
          }
        }
      }) as any;
      
      return {
        id: updatedOrder.id,
        user_id: updatedOrder.user_id,
        product_id: updatedOrder.product_id,
        amount_usdt: Number(updatedOrder.amount_usdt),
        wallet_address: updatedOrder.wallet_address,
        status: updatedOrder.status,
        tx_hash: updatedOrder.tx_hash,
        expires_at: updatedOrder.expires_at,
        created_at: updatedOrder.created_at,
        updated_at: updatedOrder.updated_at,
        product: updatedOrder.product ? {
          name: updatedOrder.product.name,
          price_usdt: Number(updatedOrder.product.price_usdt)
        } : null
      };
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
          },
          include: {
            product: {
              select: {
                name: true,
                price_usdt: true
              }
            }
          }
        });
        
        // Create user license in pending status (requires manual activation)
        const license = await tx.userLicense.create({
          data: {
             user_id: order.user_id,
             product_id: order.product_id,
             order_id: orderId,
             principal_usdt: order.amount_usdt,
             ends_at: new Date(Date.now() + product.duration_days * 24 * 60 * 60 * 1000),
             status: 'active' // License starts as active
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