import { Request, Response } from 'express';
import { WithdrawalService } from './service';
import { telegramService } from '../../services/telegram';
import { realTimeNotificationService } from '../../services/real-time-notifications';
import { logger } from '../../utils/logger';
import { prisma } from '../../lib/prisma';
import '../../lib/middleware';

export class WithdrawalController {
  private withdrawalService: WithdrawalService;

  constructor() {
    this.withdrawalService = new WithdrawalService();
  }

  // GET /withdrawals - Get user withdrawals
  getWithdrawals = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const withdrawals = await this.withdrawalService.getUserWithdrawals(userId);
      
      return res.json({ data: withdrawals });
    } catch (error) {
      logger.error('Error getting withdrawals: ' + (error as Error).message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  // POST /withdrawals - Create withdrawal request
  createWithdrawal = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Aceptar ambos formatos de payload para compatibilidad
      const amountRaw = (req.body?.amount ?? req.body?.amount_usdt);
      const walletAddressRaw = (req.body?.walletAddress ?? req.body?.payout_address);

      const amount = typeof amountRaw === 'string' ? Number(amountRaw) : amountRaw;
      const walletAddress = typeof walletAddressRaw === 'string' ? walletAddressRaw : walletAddressRaw;
      
      if (amount == null || isNaN(Number(amount)) || Number(amount) <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      if (!walletAddress || String(walletAddress).trim().length === 0) {
        return res.status(400).json({ error: 'Wallet address is required' });
      }

      // Verificar que el usuario tenga una wallet de retiro vinculada y verificada
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { withdrawal_wallet_address: true, withdrawal_wallet_verified: true }
      });

      if (!user?.withdrawal_wallet_address || !user?.withdrawal_wallet_verified) {
        return res.status(400).json({ 
          error: 'You must link and verify a withdrawal wallet in your profile before making withdrawals' 
        });
      }

      // Verificar que la dirección de retiro coincida con la wallet vinculada
      if (String(walletAddress).trim() !== user.withdrawal_wallet_address) {
        return res.status(400).json({ 
          error: 'Withdrawal address must match your verified withdrawal wallet' 
        });
      }

      const withdrawal = await this.withdrawalService.createWithdrawal(userId, Number(amount), String(walletAddress));
      
      // Alertas y notificaciones
      await telegramService.sendWithdrawalAlert('new', {
        ...withdrawal,
        user: req.user
      });
      await realTimeNotificationService.sendWithdrawalNotification('requested', {
        ...withdrawal,
        user: req.user
      });
      
      const requestedAmountStr = Number(amount).toFixed(6);
      
      return res.status(201).json({ 
        data: {
          ...withdrawal,
          requested_amount: requestedAmountStr
        },
        message: 'Withdrawal created successfully and is pending admin approval.',
        requiresOtp: false
      });
    } catch (error) {
      logger.error('Error creating withdrawal: ' + (error as Error).message);
      
      if ((error as Error).message.includes('Insufficient balance')) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }
      if ((error as Error).message.includes('Minimum amount')) {
        return res.status(400).json({ error: 'Amount below minimum threshold' });
      }
      if ((error as Error).message.includes('No USDT address')) {
        return res.status(400).json({ error: 'USDT address not configured in profile' });
      }
      
      return res.status(500).json({ error: 'Internal server error' });
    }
  };



  // DELETE /withdrawals/:id - Cancel withdrawal
  cancelWithdrawal = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Withdrawal ID is required' });
      }

      const canceledWithdrawal = await this.withdrawalService.cancelWithdrawal(id, userId);
      
      logger.info(`Withdrawal ${id} canceled by user ${userId}`);
      
      return res.status(200).json({ 
        data: canceledWithdrawal,
        message: 'Withdrawal canceled successfully'
      });
    } catch (error) {
      logger.error('Error canceling withdrawal: ' + (error as Error).message);
      if ((error as Error).message.includes('not found')) {
        return res.status(404).json({ error: 'Withdrawal not found' });
      }
      if ((error as Error).message.includes('Unauthorized')) {
        return res.status(403).json({ error: 'Unauthorized to cancel this withdrawal' });
      }
      if ((error as Error).message.includes('cannot be canceled')) {
        return res.status(400).json({ error: 'Withdrawal cannot be canceled in current status' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export const withdrawalController = new WithdrawalController();