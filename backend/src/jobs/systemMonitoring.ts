import { Job } from 'bullmq';
import { pushNotificationService } from '../services/push-notifications';
import { logger } from '../utils/logger';

/**
 * System Monitoring Job
 * Runs every 30 minutes to check system health and metrics
 */
export async function systemMonitoringJob(job: Job): Promise<void> {
  const startTime = Date.now();
  
  try {
    logger.info(`Starting system monitoring job - JobID: ${job.id}`);
    
    // Monitor system metrics and send alerts if needed
    await pushNotificationService.monitorSystemMetrics();
    
    const duration = Date.now() - startTime;
    logger.info(`System monitoring job completed successfully - JobID: ${job.id}, Duration: ${duration}ms`);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`System monitoring job failed - JobID: ${job.id}, Error: ${error instanceof Error ? error.message : 'Unknown error'}, Duration: ${duration}ms`);
    
    // Send critical alert about monitoring failure
    try {
      await pushNotificationService.sendSystemAlert({
        type: 'critical',
        title: 'Fallo en job de monitoreo',
        message: 'El job de monitoreo del sistema ha fallado. Revisar logs inmediatamente.',
        metadata: {
          jobId: job.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: `${duration}ms`
        }
      });
    } catch (alertError) {
      logger.error(`Failed to send monitoring failure alert: ${alertError instanceof Error ? alertError.message : 'Unknown error'}`);
    }
    
    throw error;
  }
}

/**
 * Daily Summary Job
 * Runs once per day at 9:00 AM to send system summary
 */
export async function dailySummaryJob(job: Job): Promise<void> {
  const startTime = Date.now();
  
  try {
    logger.info(`Starting daily summary job - Job ID: ${job.id}`);
    
    // Send daily system summary
    await pushNotificationService.sendDailySummary();
    
    const duration = Date.now() - startTime;
    logger.info(`Daily summary job completed successfully - Job ID: ${job.id}, Duration: ${duration}ms`);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Daily summary job failed - Job ID: ${job.id}, Error: ${error instanceof Error ? error.message : 'Unknown error'}, Duration: ${duration}ms`);
    
    // Send alert about summary failure
    try {
      await pushNotificationService.sendSystemAlert({
        type: 'warning',
        title: 'Fallo en resumen diario',
        message: 'No se pudo enviar el resumen diario del sistema.',
        metadata: {
          jobId: job.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    } catch (alertError) {
      logger.error(`Failed to send summary failure alert: ${alertError instanceof Error ? alertError.message : 'Unknown error'}`);
    }
    
    throw error;
  }
}