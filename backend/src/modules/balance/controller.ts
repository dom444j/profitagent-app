import { Request, Response } from 'express';
import { BalanceService } from './service';
import { logger } from '../../utils/logger';
import '../../lib/middleware';

export class BalanceController {
  private balanceService: BalanceService;

  constructor() {
    this.balanceService = new BalanceService();
  }

  // GET /balance - Get user balance
  getBalance = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const balance = await this.balanceService.getUserBalance(userId);
      
      return res.json({ data: balance });
    } catch (error) {
      logger.error('Error getting balance: ' + (error as Error).message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export const balanceController = new BalanceController();