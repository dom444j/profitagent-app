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

      const withdrawal = await this.withdrawalService.createWithdrawal(userId, Number(amount), String(walletAddress));
      
      // Enviar OTP por Telegram
      const otpResult = await telegramService.sendWithdrawalOTP(userId, withdrawal.id, Number(amount));
      
      if (otpResult.success) {
        // Guardar OTP ID
        await this.withdrawalService.updateWithdrawalOtpId(withdrawal.id, otpResult.otpId!);
        
        // Alertas y notificaciones
        await telegramService.sendWithdrawalAlert('new', {
          ...withdrawal,
          user: req.user
        });
        await realTimeNotificationService.sendWithdrawalNotification('requested', {
          ...withdrawal,
          user: req.user
        });
        
        // Obtener fee desde settings
        const settings = await prisma.setting.findFirst({
          where: { key: 'withdrawal_fee_usdt' }
        });
        const gasFee = parseFloat(settings?.value?.toString() || '2');

        const requestedAmountStr = Number(amount).toFixed(6);
        const gasFeeStr = Number(gasFee).toFixed(6);
        const totalDeductedStr = (Number(amount) + Number(gasFee)).toFixed(6);
        const netAmountStr = Number(amount).toFixed(6);
        
        return res.status(201).json({ 
          data: {
            ...withdrawal,
            otp_id: otpResult.otpId,
            fee_info: {
              gas_fee: gasFeeStr,
              requested_amount: requestedAmountStr,
              total_deducted: totalDeductedStr,
              net_amount: netAmountStr
            }
          },
          message: `Withdrawal created successfully. OTP sent to Telegram. Gas agent fee: ${gasFeeStr} USDT.`,
          requiresOtp: true
        });
      } else {
        logger.error('Failed to send OTP for withdrawal:', withdrawal.id);
        return res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
      }
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

  // POST /withdrawals/{id}/confirm-otp - Confirm OTP for withdrawal
  confirmOtp = async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const userId = req.user.id;

      const { id: rawId } = req.params;
      const id = rawId as string;
      if (!id) {
        return res.status(400).json({ error: 'Withdrawal ID is required' });
      }
      const { otp_code, otp_id } = req.body;
      
      if (!otp_code) {
        return res.status(400).json({ error: 'OTP code is required' });
      }

      if (!otp_id) {
        return res.status(400).json({ error: 'OTP ID is required' });
      }

      // Verify OTP with Telegram service
      const otpVerification = await telegramService.verifyOTP(otp_id, otp_code);
      
      if (!otpVerification.valid) {
        return res.status(400).json({ error: 'Invalid or expired OTP code' });
      }

      if (otpVerification.userId !== userId) {
        return res.status(403).json({ error: 'OTP does not belong to this user' });
      }

      // Update withdrawal status to confirmed
      const updatedWithdrawal = await this.withdrawalService.confirmWithdrawalOtp(id, userId);
      
      if (!updatedWithdrawal) {
        return res.status(404).json({ error: 'Withdrawal not found or cannot be confirmed' });
      }

      logger.info(`Withdrawal ${id} OTP confirmed for user ${userId}`);
      
      return res.status(200).json({ 
        data: updatedWithdrawal,
        message: 'OTP verified successfully. Withdrawal is now pending admin approval.'
      });
    } catch (error) {
      logger.error('Error confirming OTP: ' + (error as Error).message);
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