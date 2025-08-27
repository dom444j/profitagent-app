import { prisma } from '../../lib/prisma';
import { logger } from '../../utils/logger';

export class BalanceService {
  
  // Get user balance snapshot - this is the unified function mentioned in specs
  async getUserBalance(userId: string) {
    try {
      return await this.getUserSnapshot(userId);
    } catch (error) {
      logger.error('Error getting user balance: ' + (error as Error).message);
      throw error;
    }
  }

  // getUserSnapshot(userId) - unified function as specified in docs
  async getUserSnapshot(userId: string) {
    try {
      // Get total earned from licenses (cashback_accum from new motor)
      const licenseEarnings = await prisma.userLicense.aggregate({
        where: {
          user_id: userId,
          status: {
            in: ['active', 'paused', 'completed']
          }
        },
        _sum: {
          cashback_accum: true
        }
      });

      // Get commissions available (from referrals with status released)
      const commissionsAvailable = await prisma.referralCommission.aggregate({
        where: {
          sponsor_id: userId,
          status: 'released'
        },
        _sum: {
          amount_usdt: true
        }
      });

      // Get bonuses released
      const bonusesReleased = await prisma.bonus.aggregate({
        where: {
          user_id: userId,
          status: 'released'
        },
        _sum: {
          amount_usdt: true
        }
      });

      // Get pending commissions (from referrals with status pending)
      const pendingCommissions = await prisma.referralCommission.aggregate({
        where: {
          sponsor_id: userId,
          status: 'pending'
        },
        _sum: {
          amount_usdt: true
        }
      });

      // Calculate totalEarned = accruedFromLicenses + commissionsAvailable + bonuses
      const accruedFromLicenses = Number(licenseEarnings._sum.cashback_accum || 0);
      const commissionsAmount = Number(commissionsAvailable._sum.amount_usdt || 0);
      const bonusesAmount = Number(bonusesReleased._sum.amount_usdt || 0);
      const pendingCommissionsAmount = Number(pendingCommissions._sum.amount_usdt || 0);
      const totalEarned = accruedFromLicenses + commissionsAmount + bonusesAmount;

      // Get withdrawals (paid, approved, requested, otp_sent, otp_verified) - excluding canceled and rejected
      const withdrawals = await prisma.withdrawal.aggregate({
        where: {
          user_id: userId,
          status: {
            in: ['paid', 'approved', 'requested', 'otp_sent', 'otp_verified']
          }
        },
        _sum: {
          amount_usdt: true
        }
      });

      const totalWithdrawals = Number(withdrawals._sum.amount_usdt || 0);

      // Get pending withdrawals (requested, otp_sent, otp_verified, approved) - excluding canceled and rejected
      const pendingWithdrawals = await prisma.withdrawal.aggregate({
        where: {
          user_id: userId,
          status: {
            in: ['requested', 'otp_sent', 'otp_verified', 'approved']
          }
        },
        _sum: {
          amount_usdt: true
        }
      });

      const pendingAmount = Number(pendingWithdrawals._sum.amount_usdt || 0);

      // Calculate available = totalEarned - withdrawals(PAID|APPROVED|PENDING)
      const available = Math.max(0, totalEarned - totalWithdrawals);

      return {
        available: available.toFixed(6),
        pendingWithdrawals: pendingAmount.toFixed(6),
        totalEarned: totalEarned.toFixed(6),
        pending_commissions: pendingCommissionsAmount.toFixed(6)
      };
    } catch (error) {
      logger.error('Error getting user snapshot: ' + (error as Error).message);
      throw error;
    }
  }
}