import { Request, Response } from 'express';
import { adminMetricsService } from './metrics.service';
import { logger } from '../../utils/logger';

export class AdminMetricsController {
  async getMetrics(req: Request, res: Response) {
    try {
      logger.info('Admin metrics requested', { userId: req.user?.id });
      
      const metrics = await adminMetricsService.getMetrics();
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Error getting admin metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get admin metrics'
      });
    }
  }
}

export const adminMetricsController = new AdminMetricsController();