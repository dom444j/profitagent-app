import { Request, Response } from 'express';
import { referralService } from './service';
import { logger } from '../../utils/logger';
import '../../lib/middleware';

export class ReferralController {
  
  // GET /referrals - Get user's referred users
  async getUserReferrals(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const result = await referralService.getUserReferrals(userId, page, limit);
      
      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Get user referrals error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
  
  // GET /referrals/commissions - Get user's commissions
  async getUserCommissions(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const result = await referralService.getUserCommissions(userId, page, limit);
      
      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Get user commissions error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
  
  // GET /admin/referrals - Get all pending commissions (admin only)
  async getPendingCommissions(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const result = await referralService.getPendingCommissions(page, limit);
      
      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Get pending commissions error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
  
  // POST /admin/referrals/:id/release - Release commission (admin only)
  async releaseCommission(req: Request, res: Response) {
    try {
      const commissionId = req.params.id;
      const adminId = req.user?.id;
      
      if (!adminId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      if (!commissionId) {
        return res.status(400).json({ error: 'Commission ID is required' });
      }
      
      const result = await referralService.releaseCommission(commissionId, adminId);
      
      return res.json({
        success: true,
        data: result,
        message: 'Commission released successfully'
      });
    } catch (error) {
      logger.error('Release commission error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
  
  // POST /admin/referrals/:id/cancel - Cancel commission (admin only)
  async cancelCommission(req: Request, res: Response) {
    try {
      const commissionId = req.params.id;
      const adminId = req.user?.id;
      
      if (!adminId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      if (!commissionId) {
        return res.status(400).json({ error: 'Commission ID is required' });
      }
      
      const result = await referralService.cancelCommission(commissionId, adminId);
      
      return res.json({
        success: true,
        data: result,
        message: 'Commission cancelled successfully'
      });
    } catch (error) {
      logger.error('Cancel commission error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
}

export const referralController = new ReferralController();