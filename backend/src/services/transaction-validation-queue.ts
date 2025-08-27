import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { queuePendingValidations } from '../jobs/transactionValidation';
import { logger } from '../utils/logger';

const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null
});

// Transaction validation queue
const transactionValidationQueue = new Queue('transactionValidation', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50, // Keep last 50 failed jobs
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 30000 // Start with 30 seconds, then 60s, 120s
    }
  }
});

class TransactionValidationQueueService {
  /**
   * Add a single order for validation
   */
  async addOrderValidation(orderId: string, delay: number = 0) {
    try {
      const job = await transactionValidationQueue.add(
        'validateTransaction',
        { orderId },
        {
          delay, // Delay in milliseconds
          jobId: `validation-${orderId}`, // Prevent duplicate jobs
          removeOnComplete: true,
          removeOnFail: false
        }
      );
      
      logger.info(`Queued transaction validation for order ${orderId} with ${delay}ms delay`);
      return job;
    } catch (error) {
      logger.error(`Failed to queue validation for order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Add validation with progressive delay (immediate, 5min, 15min, 30min)
   */
  async addOrderValidationWithRetries(orderId: string) {
    const delays = [0, 5 * 60 * 1000, 15 * 60 * 1000, 30 * 60 * 1000]; // 0, 5min, 15min, 30min
    
    for (let i = 0; i < delays.length; i++) {
      await this.addOrderValidation(orderId, delays[i]);
    }
    
    logger.info(`Scheduled ${delays.length} validation attempts for order ${orderId}`);
  }

  /**
   * Queue all pending validations (for batch processing)
   */
  async queueAllPendingValidations() {
    try {
      const orderIds = await queuePendingValidations();
      
      for (const orderId of orderIds) {
        await this.addOrderValidation(orderId, 0);
      }
      
      logger.info(`Queued ${orderIds.length} orders for validation`);
      return orderIds.length;
    } catch (error) {
      logger.error('Failed to queue pending validations:', error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    try {
      const waiting = await transactionValidationQueue.getWaiting();
      const active = await transactionValidationQueue.getActive();
      const completed = await transactionValidationQueue.getCompleted();
      const failed = await transactionValidationQueue.getFailed();
      const delayed = await transactionValidationQueue.getDelayed();
      
      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        total: waiting.length + active.length + delayed.length
      };
    } catch (error) {
      logger.error('Failed to get queue stats:', error);
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        total: 0
      };
    }
  }

  /**
   * Remove a specific validation job
   */
  async removeOrderValidation(orderId: string) {
    try {
      const jobId = `validation-${orderId}`;
      const job = await transactionValidationQueue.getJob(jobId);
      
      if (job) {
        await job.remove();
        logger.info(`Removed validation job for order ${orderId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error(`Failed to remove validation job for order ${orderId}:`, error);
      return false;
    }
  }

  /**
   * Clean up old jobs
   */
  async cleanupOldJobs() {
    try {
      await transactionValidationQueue.clean(24 * 60 * 60 * 1000, 100, 'completed'); // Remove completed jobs older than 24h
      await transactionValidationQueue.clean(7 * 24 * 60 * 60 * 1000, 50, 'failed'); // Remove failed jobs older than 7 days
      
      logger.info('Cleaned up old validation jobs');
    } catch (error) {
      logger.error('Failed to cleanup old jobs:', error);
    }
  }

  /**
   * Pause the queue
   */
  async pauseQueue() {
    await transactionValidationQueue.pause();
    logger.info('Transaction validation queue paused');
  }

  /**
   * Resume the queue
   */
  async resumeQueue() {
    await transactionValidationQueue.resume();
    logger.info('Transaction validation queue resumed');
  }

  /**
   * Get the queue instance (for advanced operations)
   */
  getQueue() {
    return transactionValidationQueue;
  }
}

export const transactionValidationQueueService = new TransactionValidationQueueService();
export { transactionValidationQueue };