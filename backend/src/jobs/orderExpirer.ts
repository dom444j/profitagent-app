import { Job } from 'bullmq';
import { orderService } from '../modules/orders/service';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

export async function processOrderExpirer(job: Job) {
  const { orderId } = job.data;
  
  try {
    // Expire the order
    await orderService.expireOrder(orderId);
    
    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'ORDER_EXPIRED',
        entity: 'Order',
        entity_id: orderId,
        new_values: { reason: 'Automatic expiration' }
      }
    });
    
    logger.info({ orderId }, 'Order expired successfully');
  } catch (error) {
    logger.error({ orderId, error }, 'Failed to expire order');
    throw error;
  }
}