import { prisma } from '../../lib/prisma';
import { logger } from '../../utils/logger';
import { BalanceService } from '../balance/service';
import { telegramService } from '../../services/telegram';
import { realTimeNotificationService } from '../../services/real-time-notifications';

export class WithdrawalService {
  private balanceService: BalanceService;

  constructor() {
    this.balanceService = new BalanceService();
  }





  // Get user withdrawals with transformed data
  async getUserWithdrawals(userId: string) {
    try {
      const withdrawals = await prisma.withdrawal.findMany({
        where: {
          user_id: userId
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      return withdrawals.map(withdrawal => ({
        id: withdrawal.id,
        amount_usdt: Number(withdrawal.amount_usdt).toFixed(6),
        status: withdrawal.status, // pending, approved, paid, rejected
        created_at: withdrawal.created_at,
        paid_at: withdrawal.paid_at,
        paid_tx_hash: withdrawal.paid_tx_hash,
        payout_address: withdrawal.payout_address,
        notes: withdrawal.notes
      }));
    } catch (error) {
      logger.error('Error getting user withdrawals: ' + (error as Error).message);
      throw error;
    }
  }

  // Create withdrawal request
  async createWithdrawal(userId: string, amount: number, walletAddress: string) {
    try {
      // Get system settings for withdrawal configuration
      const settings = await prisma.setting.findMany({
        where: {
          key: {
            in: ['min_withdrawal_amount']
          }
        }
      });
      
      const MIN_WITHDRAWAL = parseFloat(String(settings.find(s => s.key === 'min_withdrawal_amount')?.value || '10'));
      
      if (amount < MIN_WITHDRAWAL) {
        throw new Error(`Minimum amount is $${MIN_WITHDRAWAL}`);
      }

      // Validate wallet address
      if (!walletAddress || walletAddress.trim().length === 0) {
        throw new Error('Wallet address is required');
      }

      // Check available balance
      const balance = await this.balanceService.getUserSnapshot(userId);
      if (Number(balance.available) < amount) {
        throw new Error('Insufficient balance');
      }

      // Use transaction to ensure consistency
      const withdrawal = await prisma.$transaction(async (tx) => {
        // Create withdrawal request
        const newWithdrawal = await tx.withdrawal.create({
          data: {
            user_id: userId,
            amount_usdt: amount, // Store withdrawal amount only
            payout_address: walletAddress,
            status: 'requested'
          }
        });

        // Deduct balance (withdrawal amount only)
        await tx.ledgerEntry.create({
          data: {
            user_id: userId,
            direction: 'debit',
            amount: amount,
            available_balance_after: 0, // Will be calculated by balance service
            ref_type: 'withdrawal',
            ref_id: newWithdrawal.id,
            meta: {
              withdrawal_amount: amount
            }
          }
        });

        return newWithdrawal;
      });

      // Send notifications to admin
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { first_name: true, last_name: true, email: true }
        });

        if (user) {
          const withdrawalData = {
            id: withdrawal.id,
            amount_usdt: amount,
            payout_address: walletAddress,
            created_at: withdrawal.created_at,
            user
          };

          // Send Telegram alert to admin
          await telegramService.sendWithdrawalAlert('new', withdrawalData);
          
          // Send real-time notification
          await realTimeNotificationService.sendWithdrawalNotification('requested', withdrawalData);
        }
      } catch (notificationError) {
        logger.error('Error sending withdrawal notifications: ' + (notificationError as Error).message);
        // Don't throw error for notification failures
      }

      return {
        id: withdrawal.id,
        amount_usdt: Number(withdrawal.amount_usdt).toFixed(6),
        status: withdrawal.status,
        created_at: withdrawal.created_at,
        payout_address: withdrawal.payout_address
      };
    } catch (error) {
      logger.error('Error creating withdrawal: ' + (error as Error).message);
      throw error;
    }
  }

  // Admin: Get all withdrawals with filters
  async getAdminWithdrawals(filters: {
    status?: string;
    userId?: string;
    page?: number;
    limit?: number;
  } = {}) {
    try {
      const { status, userId, page = 1, limit = 20 } = filters;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (status) where.status = status;
      if (userId) where.user_id = userId;

      const [withdrawals, total] = await Promise.all([
        prisma.withdrawal.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                first_name: true,
        last_name: true
              }
            },
            approved_by: {
              select: {
                id: true,
                email: true
              }
            }
          },
          orderBy: { created_at: 'desc' },
          skip,
          take: limit
        }),
        prisma.withdrawal.count({ where })
      ]);

      return {
        withdrawals: withdrawals.map(w => ({
          id: w.id,
          user: {
            id: w.user.id,
            email: w.user.email,
            first_name: w.user.first_name,
        last_name: w.user.last_name
          },
          amount_usdt: Number(w.amount_usdt).toFixed(6),
          status: w.status,
          payout_address: w.payout_address,
          created_at: w.created_at,
          approved_by: w.approved_by ? {
          id: w.approved_by.id,
          email: w.approved_by.email
        } : null,
          paid_at: w.paid_at,
          paid_tx_hash: w.paid_tx_hash,
          notes: w.notes
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting admin withdrawals: ' + (error as Error).message);
      throw error;
    }
  }

  // Admin: Approve withdrawal
  async approveWithdrawal(withdrawalId: string, adminId: string) {
    try {
      const withdrawal = await prisma.withdrawal.findUnique({
        where: { id: withdrawalId }
      });

      if (!withdrawal) {
        throw new Error('Withdrawal not found');
      }

      if (withdrawal.status !== 'requested') {
        throw new Error(`Withdrawal is not in requested status. Current status: '${withdrawal.status}'`);
      }

      const updatedWithdrawal = await prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'approved',
          approved_by_admin_id: adminId
        },
        include: {
          user: {
            select: { first_name: true, last_name: true, email: true }
          }
        }
      });

      // Send notifications
      try {
        const withdrawalData = {
          id: updatedWithdrawal.id,
          amount_usdt: Number(updatedWithdrawal.amount_usdt),
          payout_address: updatedWithdrawal.payout_address,
          created_at: updatedWithdrawal.created_at,
          user: updatedWithdrawal.user,
          user_id: updatedWithdrawal.user_id
        };

        // Send Telegram alert to admin
        await telegramService.sendWithdrawalAlert('approved', withdrawalData);
        
        // Send real-time notification to user
        await realTimeNotificationService.sendWithdrawalNotification('approved', withdrawalData);
      } catch (notificationError) {
        logger.error('Error sending approval notifications: ' + (notificationError as Error).message);
      }

      return {
        id: updatedWithdrawal.id,
        status: updatedWithdrawal.status,
        approvedAt: updatedWithdrawal.updated_at
      };
    } catch (error) {
      logger.error('Error approving withdrawal: ' + (error as Error).message);
      throw error;
    }
  }

  // Admin: Mark withdrawal as paid
  async markAsPaid(withdrawalId: string, txHash: string, adminId: string) {
    try {
      const withdrawal = await prisma.withdrawal.findUnique({
        where: { id: withdrawalId },
        include: { user: true }
      });

      if (!withdrawal) {
        throw new Error('Withdrawal not found');
      }

      if (withdrawal.status !== 'approved') {
        throw new Error('Withdrawal must be approved before marking as paid');
      }



      // Use transaction to ensure consistency
      const result = await prisma.$transaction(async (tx) => {
        // Update withdrawal status
        const updatedWithdrawal = await tx.withdrawal.update({
          where: { id: withdrawalId },
          data: {
            status: 'paid',
            paid_tx_hash: txHash,
            paid_at: new Date()
          }
        });

        // Create ledger entry for the withdrawal
        await tx.ledgerEntry.create({
          data: {
            user_id: withdrawal.user_id,
            direction: 'debit',
            amount: withdrawal.amount_usdt,
            available_balance_after: 0, // Will be calculated by balance service
            ref_type: 'withdrawal',
            ref_id: withdrawalId,
            meta: {
              tx_hash: txHash,
              payout_address: withdrawal.payout_address,
              processed_by_admin: adminId
            }
          }
        });

        return updatedWithdrawal;
      });

      return {
        id: result.id,
        status: result.status,
        txHash: result.paid_tx_hash,
        paidAt: result.paid_at
      };
    } catch (error) {
      logger.error('Error marking withdrawal as paid: ' + (error as Error).message);
      throw error;
    }
  }

  // User: Cancel withdrawal
  async cancelWithdrawal(withdrawalId: string, userId: string) {
    try {
      const withdrawal = await prisma.withdrawal.findUnique({
        where: { id: withdrawalId },
        include: { user: true }
      });

      if (!withdrawal) {
        throw new Error('Withdrawal not found');
      }

      if (withdrawal.user_id !== userId) {
        throw new Error('Unauthorized to cancel this withdrawal');
      }

      if (withdrawal.status !== 'requested') {
        throw new Error('Withdrawal cannot be canceled in current status');
      }

      // Use transaction to ensure consistency
      const result = await prisma.$transaction(async (tx) => {
        // Update withdrawal status
        const updatedWithdrawal = await tx.withdrawal.update({
          where: { id: withdrawalId },
          data: {
            status: 'canceled',
            notes: 'Canceled by user'
          }
        });

        // Restore the balance to user (since withdrawal was canceled)
        // Create ledger entry for the cancellation (credit back)
        await tx.ledgerEntry.create({
          data: {
            user_id: withdrawal.user_id,
            direction: 'credit',
            amount: withdrawal.amount_usdt,
            available_balance_after: 0, // Will be calculated by balance service
            ref_type: 'withdrawal',
            ref_id: withdrawalId,
            meta: {
              cancellation_reason: 'Canceled by user',
              canceled_by_user: userId,
              original_withdrawal_id: withdrawalId
            }
          }
        });

        return updatedWithdrawal;
      });

      return {
        id: result.id,
        status: result.status,
        canceledAt: result.updated_at
      };
    } catch (error) {
      logger.error('Error canceling withdrawal: ' + (error as Error).message);
      throw error;
    }
  }

  // Admin: Reject withdrawal
  async rejectWithdrawal(withdrawalId: string, adminId: string, reason?: string) {
    try {
      const withdrawal = await prisma.withdrawal.findUnique({
        where: { id: withdrawalId },
        include: { user: true }
      });

      if (!withdrawal) {
        throw new Error('Withdrawal not found');
      }

      if (withdrawal.status !== 'requested') {
        throw new Error('Withdrawal is not in requested status');
      }

      // Use transaction to ensure consistency
      const result = await prisma.$transaction(async (tx) => {
        // Update withdrawal status
        const updatedWithdrawal = await tx.withdrawal.update({
          where: { id: withdrawalId },
          data: {
            status: 'rejected',
            notes: reason ?? null
          }
        });

        // Restore the balance to user (since withdrawal was rejected)
        // This will be handled by the ledger entry below

        // Create ledger entry for the rejection (credit back)
        await tx.ledgerEntry.create({
          data: {
            user_id: withdrawal.user_id,
            direction: 'credit',
            amount: withdrawal.amount_usdt,
            available_balance_after: 0, // Will be calculated by balance service
            ref_type: 'withdrawal',
            ref_id: withdrawalId,
            meta: {
              rejection_reason: reason,
              rejected_by_admin: adminId,
              original_withdrawal_id: withdrawalId
            }
          }
        });

        return updatedWithdrawal;
      });

      // Send notifications
      try {
        const withdrawalData = {
          id: result.id,
          amount_usdt: Number(withdrawal.amount_usdt),
          payout_address: withdrawal.payout_address,
          created_at: withdrawal.created_at,
          user: {
            first_name: withdrawal.user.first_name,
            last_name: withdrawal.user.last_name,
            email: withdrawal.user.email
          },
          user_id: withdrawal.user_id,
          rejection_reason: reason
        };

        // Send Telegram alert to admin
        await telegramService.sendWithdrawalAlert('rejected', withdrawalData);
        
        // Send real-time notification to user
        await realTimeNotificationService.sendWithdrawalNotification('rejected', withdrawalData);
      } catch (notificationError) {
        logger.error('Error sending rejection notifications: ' + (notificationError as Error).message);
      }

      return {
        id: result.id,
        status: result.status,
        rejectedAt: result.updated_at,
        rejectionReason: result.notes
      };
    } catch (error) {
      logger.error('Error rejecting withdrawal: ' + (error as Error).message);
      throw error;
    }
  }

  // Admin: Export approved withdrawals
  async exportApprovedWithdrawals() {
    try {
      const withdrawals = await prisma.withdrawal.findMany({
        where: { status: 'approved' },
        include: {
          user: {
            select: {
              email: true,
              first_name: true,
        last_name: true
            }
          }
        },
        orderBy: { created_at: 'desc' }
      });

      return withdrawals.map(w => ({
        id: w.id,
        user_email: w.user.email,
        user_name: `${w.user.first_name} ${w.user.last_name}`.trim(),
        amount_usdt: Number(w.amount_usdt).toFixed(6),
        payout_address: w.payout_address,
        requested_at: w.created_at.toISOString(),
        notes: w.notes || ''
      }));
    } catch (error) {
      logger.error('Error exporting approved withdrawals: ' + (error as Error).message);
      throw error;
    }
  }
}