import { Request, Response } from 'express';
import '../../lib/middleware';
import { z } from 'zod';
import { WithdrawalService } from '../withdrawals/service';
import { logger } from '../../utils/logger';
import Redis from 'ioredis';

const getListSchema = z.object({
  status: z.enum(['requested', 'otp_sent', 'otp_verified', 'approved', 'paid', 'rejected', 'canceled']).optional(),
  userId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

class AdminWithdrawalsController {
  private withdrawalsService: WithdrawalService;
  private redis: Redis;

  constructor() {
    this.withdrawalsService = new WithdrawalService();
    this.redis = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
  }

  list = async (req: Request, res: Response) => {
    try {
      const parse = getListSchema.safeParse({
        status: req.query.status,
        userId: req.query.userId,
        page: req.query.page,
        limit: req.query.limit,
      });
      if (!parse.success) {
        return res.status(400).json({ success: false, error: 'Invalid params', details: parse.error.issues });
      }
      const { status, userId, page, limit } = parse.data;
      // Build params without undefined keys to satisfy exactOptionalPropertyTypes
      const queryParams: { status?: string; userId?: string; page?: number; limit?: number } = { page, limit };
      if (status !== undefined) queryParams.status = status;
      if (userId !== undefined) queryParams.userId = userId;
      const result = await this.withdrawalsService.getAdminWithdrawals(queryParams);
      return res.json({ success: true, ...result });
    } catch (error) {
      logger.error('Error listing withdrawals: ' + (error as Error).message);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  approve = async (req: Request, res: Response) => {
    try {
      const idParam = req.params?.id;
      if (typeof idParam !== 'string' || !idParam) {
        return res.status(400).json({ success: false, error: 'Invalid withdrawal id' });
      }
      const id: string = idParam;
      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      await this.withdrawalsService.approveWithdrawal(id, adminId);
      return res.json({ success: true, message: 'Withdrawal approved' });
    } catch (error) {
      logger.error('Error approving withdrawal: ' + (error as Error).message);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  markPaid = async (req: Request, res: Response) => {
    try {
      const idParam = req.params?.id;
      if (typeof idParam !== 'string' || !idParam) {
        return res.status(400).json({ success: false, error: 'Invalid withdrawal id' });
      }
      const id: string = idParam;
      const adminId = req.user?.id;
      const txHash = (req.body?.tx_hash ?? req.body?.txHash ?? '').toString();
      if (!adminId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      if (!txHash) {
        return res.status(400).json({ success: false, error: 'Transaction hash is required' });
      }

      // Idempotency handling
      const idemKey = req.header('Idempotency-Key') || req.header('idempotency-key');
      if (!idemKey) {
        return res.status(400).json({ success: false, error: 'Idempotency-Key header is required' });
      }
      const cacheKey = `idem:admin:withdrawals:mark-paid:${adminId}:${id}:${idemKey}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }

      await this.withdrawalsService.markAsPaid(id, txHash, adminId);
      const responseBody = { success: true, message: 'Withdrawal marked as paid' };

      await this.redis.set(cacheKey, JSON.stringify(responseBody), 'EX', 60 * 60 * 24);

      return res.json(responseBody);
    } catch (error) {
      logger.error('Error marking withdrawal as paid: ' + (error as Error).message);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  reject = async (req: Request, res: Response) => {
    try {
      const idParam = req.params?.id;
      if (typeof idParam !== 'string' || !idParam) {
        return res.status(400).json({ success: false, error: 'Invalid withdrawal id' });
      }
      const id: string = idParam;
      const adminId = req.user?.id;
      const reason = (req.body?.reason ?? '').toString();
      if (!adminId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      if (!reason) {
        return res.status(400).json({ success: false, error: 'Reason is required' });
      }
      await this.withdrawalsService.rejectWithdrawal(id, adminId, reason);
      return res.json({ success: true, message: 'Withdrawal rejected' });
    } catch (error) {
      logger.error('Error rejecting withdrawal: ' + (error as Error).message);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  exportWithdrawals = async (req: Request, res: Response) => {
    try {
      const data = await this.withdrawalsService.exportApprovedWithdrawals();
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Error exporting withdrawals: ' + (error as Error).message);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}

export const adminWithdrawalsController = new AdminWithdrawalsController();