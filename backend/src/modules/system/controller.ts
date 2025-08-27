import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { logger } from '../../utils/logger';

export class SystemController {
  /**
   * GET /api/v1/system/config
   * Get public system configuration
   */
  async getPublicConfig(req: Request, res: Response) {
    try {
      // Get public system settings
      const settings = await prisma.setting.findMany({
        where: {
          key: {
            in: ['min_withdrawal_amount', 'withdrawal_fee_usdt', 'maintenance_mode']
          }
        }
      });
      
      const config = {
        min_withdrawal_amount: parseFloat(settings.find(s => s.key === 'min_withdrawal_amount')?.value?.toString() || '10'),
        withdrawal_fee_usdt: parseFloat(settings.find(s => s.key === 'withdrawal_fee_usdt')?.value?.toString() || '2'),
        maintenance_mode: settings.find(s => s.key === 'maintenance_mode')?.value === 'true'
      };
      
      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      logger.error({ error }, 'Error getting public system config');
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

export const systemController = new SystemController();