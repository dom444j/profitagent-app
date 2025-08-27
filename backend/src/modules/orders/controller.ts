import { Request, Response } from 'express';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import { orderService } from './service';
import { productService } from '../products/service';
import { logger } from '../../utils/logger';
import '../../lib/middleware';
import Redis from 'ioredis';

const createOrderSchema = z.object({
  product_id: z.string().min(1, 'Product ID is required')
});

const submitTransactionSchema = z.object({
  tx_hash: z.string().min(1, 'Transaction hash is required')
});

class OrderController {
  async getUserOrders(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      
      const orders = await orderService.getUserOrders(userId, page, limit, status);
      
      const formattedOrders = orders.map(order => ({
        id: order.id,
        product_name: order.product.name,
        amount_usdt: order.amount_usdt.toString(),
        wallet_address: order.wallet_address,
        status: order.status,
        tx_hash: order.tx_hash,
        expires_at: order.expires_at,
        created_at: order.created_at
      }));
      
      return res.json({ orders: formattedOrders });
    } catch (error) {
      logger.error('Get user orders error: ' + (error as Error).message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createOrder(req: Request, res: Response) {
    try {
      logger.info('=== CREATE ORDER START ===');
    logger.info('Request body:', req.body);
    logger.info('User:', req.user?.id);
      
      const { product_id } = createOrderSchema.parse(req.body);
      const userId = req.user!.id;
      
      logger.info('Parsed product_id:', product_id, 'userId:', userId);
      
      // Validate product exists and is active
      const product = await productService.getProductById(product_id);
      logger.info('Found product:', product);
      if (!product || product.status !== 'active') {
        logger.warn('Product validation failed - product:', product);
        return res.status(400).json({ error: 'Product not available' });
      }
      
      // Check if user has pending orders
      logger.info('Checking for pending orders...');
      const pendingOrder = await orderService.getUserPendingOrder(userId);
      logger.info('Pending order check result:', pendingOrder);
      if (pendingOrder) {
        logger.warn('User has pending order, returning error');
        return res.status(400).json({ 
          error: 'You have a pending order. Complete or cancel it first.',
          pending_order: {
            id: pendingOrder.id,
            product_name: pendingOrder.product.name,
            amount_usdt: pendingOrder.amount_usdt.toString(),
            expires_at: pendingOrder.expires_at
          }
        });
      }
      
      logger.info('No pending orders found, proceeding with order creation');
    logger.info('Creating order with data:', {
        userId,
        productId: product_id,
        amountUsdt: product.price_usdt,
        productName: product.name
      });
      
      const order = await orderService.createOrder({
        userId,
        productId: product_id,
        amountUsdt: new Decimal(product.price_usdt.toString()),
        productName: product.name
      });
      
      logger.info('Order created successfully:', order);
    logger.info('=== CREATE ORDER SUCCESS ===');
      
      return res.status(201).json({
        id: order.id,
        product_name: product.name,
        amount_usdt: order.amount_usdt.toString(),
        wallet_address: order.wallet_address,
        status: order.status,
        expires_at: order.expires_at,
        created_at: order.created_at
      });
    } catch (error) {
      logger.error('=== CREATE ORDER ERROR ===');
    logger.error('Full error object: ' + (error as Error).message);
    logger.error('Error message: ' + (error instanceof Error ? error.message : 'Unknown error'));
    logger.error('Error stack: ' + (error instanceof Error ? error.stack : 'No stack trace'));
      
      if (error instanceof z.ZodError) {
        logger.error('Zod validation error: ' + JSON.stringify(error.issues));
        return res.status(400).json({ error: error.issues?.[0]?.message || 'Validation error' });
      }
      
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  async getOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      if (!req.user || !id) {
        return res.status(401).json({ error: 'Unauthorized or missing parameters' });
      }
      
      const userId = req.user.id;
      const order = await orderService.getOrderById(id, userId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      return res.json({
          id: order.id,
          product_name: order.product.name,
          amount_usdt: order.amount_usdt.toString(),
          wallet_address: order.wallet_address,
          status: order.status,
          tx_hash: order.tx_hash,
          expires_at: order.expires_at,
          created_at: order.created_at,
          // confirmed_at field removed from schema
        });
    } catch (error) {
      logger.error('Get order error: ' + (error as Error).message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  async submitTransaction(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { tx_hash } = submitTransactionSchema.parse(req.body);
      
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const userId = req.user.id;

      // Idempotency handling
      const idemKey = req.header('Idempotency-Key') || req.header('idempotency-key');
      if (!idemKey) {
        return res.status(400).json({ error: 'Idempotency-Key header is required' });
      }
      const cacheKey = `idem:submit-tx:${userId}:${id}:${idemKey}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
      
      const order = await orderService.submitTransaction(id!, userId, tx_hash);
      if (!order) {
        return res.status(404).json({ error: 'Order not found or cannot be updated' });
      }
      
      const responseBody = {
        id: order.id,
        status: order.status,
        tx_hash: order.tx_hash,
        message: 'Transaction submitted successfully. Awaiting collection agent confirmation.'
      };

      await redis.set(cacheKey, JSON.stringify(responseBody), 'EX', 60 * 60 * 24);
      
      return res.json(responseBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues?.[0]?.message || 'Validation error' });
      }
      logger.error('Submit transaction error: ' + (error as Error).message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async reassignOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const userId = req.user.id;
      
      const result = await orderService.reassignOrder(id!, userId);
      if (!result.success) {
        return res.status(400).json({ 
          error: result.error,
          current_status: result.currentStatus
        });
      }
      
      const newOrder = result.newOrder!;
      return res.status(201).json({
        id: newOrder.id,
        product_name: newOrder.product.name,
        amount_usdt: newOrder.amount_usdt.toString(),
        wallet_address: newOrder.wallet_address,
        status: newOrder.status,
        expires_at: newOrder.expires_at,
        created_at: newOrder.created_at,
        message: 'New order created successfully. Previous order was expired.'
      });
    } catch (error) {
      logger.error('Reassign order error: ' + (error as Error).message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const orderController = new OrderController();
const redis = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });