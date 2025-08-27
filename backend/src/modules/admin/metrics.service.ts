import { prisma } from '../../lib/prisma';
import { logger } from '../../utils/logger';

export interface AdminMetrics {
  licenses: {
    active: number;
    paused: number;
    completed: number;
    total: number;
  };
  orders: {
    pending: number;
    confirmed: number;
    expired: number;
    total: number;
    totalVolumeToday: string;
    totalVolumeThisMonth: string;
  };
  earnings: {
    totalCashbackToday: string;
    totalPotentialToday: string;
    totalDistributedToday: string;
    totalDistributedThisMonth: string;
  };
  withdrawals: {
    pending: { count: number; amount: string };
    approved: { count: number; amount: string };
    paid: { count: number; amount: string };
    rejected: { count: number; amount: string };
    avgProcessingTime: number; // in hours
  };
  wallets: {
    total: number;
    assigned: number;
    available: number;
    lastAssignedAt: string | null;
    usageStats: Array<{
      wallet_address: string;
      assigned_count: number;
      last_assigned_at: string | null;
    }>;
  };
  users: {
    total: number;
    activeToday: number;
    newThisMonth: number;
    withActiveLicenses: number;
  };
  system: {
    totalSystemBalance: string;
    pendingCommissions: string;
    releasedCommissions: string;
  };
}

export class AdminMetricsService {
  async getMetrics(): Promise<AdminMetrics> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfToday = new Date(today);
      endOfToday.setHours(23, 59, 59, 999);

      const [
        licenseStats,
        orderStats,
        earningsStats,
        withdrawalStats,
        walletStats,
        userStats,
        systemStats
      ] = await Promise.all([
        this.getLicenseMetrics(),
        this.getOrderMetrics(today, startOfMonth, endOfToday),
        this.getEarningsMetrics(today, startOfMonth, endOfToday),
        this.getWithdrawalMetrics(),
        this.getWalletMetrics(),
        this.getUserMetrics(today, startOfMonth),
        this.getSystemMetrics()
      ]);

      return {
        licenses: licenseStats,
        orders: orderStats,
        earnings: earningsStats,
        withdrawals: withdrawalStats,
        wallets: walletStats,
        users: userStats,
        system: systemStats
      };
    } catch (error) {
      logger.error('Error getting admin metrics:', error);
      throw new Error('Failed to get admin metrics');
    }
  }

  private async getLicenseMetrics() {
    const [active, paused, completed, total] = await Promise.all([
      prisma.userLicense.count({ where: { status: 'active' } }),
      prisma.userLicense.count({ where: { status: 'paused' } }),
      prisma.userLicense.count({ where: { status: 'completed' } }),
      prisma.userLicense.count()
    ]);

    return { active, paused, completed, total };
  }

  private async getOrderMetrics(today: Date, startOfMonth: Date, endOfToday: Date) {
    const [pending, confirmed, expired, total] = await Promise.all([
      prisma.orderDeposit.count({ where: { status: 'pending' } }),
      prisma.orderDeposit.count({ where: { status: 'confirmed' } }),
      prisma.orderDeposit.count({ where: { status: 'expired' } }),
      prisma.orderDeposit.count()
    ]);

    const [volumeToday, volumeThisMonth] = await Promise.all([
      prisma.orderDeposit.aggregate({
        where: {
          status: 'confirmed',
          created_at: { gte: today, lte: endOfToday }
        },
        _sum: { amount_usdt: true }
      }),
      prisma.orderDeposit.aggregate({
        where: {
          status: 'confirmed',
          created_at: { gte: startOfMonth, lte: endOfToday }
        },
        _sum: { amount_usdt: true }
      })
    ]);

    return {
      pending,
      confirmed,
      expired,
      total,
      totalVolumeToday: volumeToday._sum.amount_usdt?.toString() || '0',
      totalVolumeThisMonth: volumeThisMonth._sum.amount_usdt?.toString() || '0'
    };
  }

  private async getEarningsMetrics(today: Date, startOfMonth: Date, endOfToday: Date) {
    const [todayEarnings, monthEarnings] = await Promise.all([
      prisma.licenseDailyEarning.aggregate({
        where: {
          applied_to_balance: true,
          created_at: { gte: today, lte: endOfToday }
        },
        _sum: {
          cashback_amount: true,
          potential_amount: true
        }
      }),
      prisma.licenseDailyEarning.aggregate({
        where: {
          applied_to_balance: true,
          created_at: { gte: startOfMonth, lte: endOfToday }
        },
        _sum: {
          cashback_amount: true,
          potential_amount: true
        }
      })
    ]);

    const totalCashbackToday = todayEarnings._sum.cashback_amount?.toString() || '0';
    const totalPotentialToday = todayEarnings._sum.potential_amount?.toString() || '0';
    const totalDistributedToday = (
      Number(todayEarnings._sum.cashback_amount || 0) + 
      Number(todayEarnings._sum.potential_amount || 0)
    ).toString();
    const totalDistributedThisMonth = (
      Number(monthEarnings._sum.cashback_amount || 0) + 
      Number(monthEarnings._sum.potential_amount || 0)
    ).toString();

    return {
      totalCashbackToday,
      totalPotentialToday,
      totalDistributedToday,
      totalDistributedThisMonth
    };
  }

  private async getWithdrawalMetrics() {
    const [pending, approved, paid, rejected] = await Promise.all([
      prisma.withdrawal.aggregate({
        where: { status: 'requested' },
        _sum: { amount_usdt: true },
        _count: true
      }),
      prisma.withdrawal.aggregate({
        where: { status: 'approved' },
        _sum: { amount_usdt: true },
        _count: true
      }),
      prisma.withdrawal.aggregate({
        where: { status: 'paid' },
        _sum: { amount_usdt: true },
        _count: true
      }),
      prisma.withdrawal.aggregate({
        where: { status: 'rejected' },
        _sum: { amount_usdt: true },
        _count: true
      })
    ]);

    // Calculate average processing time from creation to paid
    const paidWithdrawals = await prisma.withdrawal.findMany({
      where: {
        status: 'paid',
        paid_at: { not: null }
      },
      select: {
        created_at: true,
        paid_at: true
      },
      take: 100 // Last 100 for average calculation
    });

    let avgProcessingTime = 0;
    if (paidWithdrawals.length > 0) {
      const totalHours = paidWithdrawals.reduce((sum, withdrawal) => {
        if (withdrawal.created_at && withdrawal.paid_at) {
          const diffMs = withdrawal.paid_at.getTime() - withdrawal.created_at.getTime();
          return sum + (diffMs / (1000 * 60 * 60)); // Convert to hours
        }
        return sum;
      }, 0);
      avgProcessingTime = totalHours / paidWithdrawals.length;
    }

    return {
      pending: {
        count: pending._count,
        amount: pending._sum.amount_usdt?.toString() || '0'
      },
      approved: {
        count: approved._count,
        amount: approved._sum.amount_usdt?.toString() || '0'
      },
      paid: {
        count: paid._count,
        amount: paid._sum.amount_usdt?.toString() || '0'
      },
      rejected: {
        count: rejected._count,
        amount: rejected._sum.amount_usdt?.toString() || '0'
      },
      avgProcessingTime: Math.round(avgProcessingTime * 100) / 100 // Round to 2 decimals
    };
  }

  private async getWalletMetrics() {
    const [total, usageStats] = await Promise.all([
      prisma.adminWallet.count(),
      prisma.adminWallet.findMany({
        select: {
          address: true,
          assigned_count: true,
          last_assigned_at: true
        },
        orderBy: {
          assigned_count: 'desc'
        }
      })
    ]);

    const assigned = usageStats.filter(w => w.assigned_count > 0).length;
    const available = total - assigned;
    const lastAssignedAt = usageStats
      .filter(w => w.last_assigned_at)
      .sort((a, b) => (b.last_assigned_at?.getTime() || 0) - (a.last_assigned_at?.getTime() || 0))[0]?.last_assigned_at?.toISOString() || null;

    return {
      total,
      assigned,
      available,
      lastAssignedAt,
      usageStats: usageStats.map(w => ({
        wallet_address: w.address,
        assigned_count: w.assigned_count,
        last_assigned_at: w.last_assigned_at?.toISOString() || null
      }))
    };
  }

  private async getUserMetrics(today: Date, startOfMonth: Date) {
    const [total, activeToday, newThisMonth, withActiveLicenses] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          updated_at: { gte: today }
        }
      }),
      prisma.user.count({
        where: {
          created_at: { gte: startOfMonth }
        }
      }),
      prisma.user.count({
        where: {
          licenses: {
            some: {
              status: 'active'
            }
          }
        }
      })
    ]);

    return {
      total,
      activeToday,
      newThisMonth,
      withActiveLicenses
    };
  }

  private async getSystemMetrics() {
    const [systemBalance, pendingCommissions, releasedCommissions] = await Promise.all([
      prisma.ledgerEntry.aggregate({
        _sum: {
          amount: true
        }
      }),
      prisma.referralCommission.aggregate({
        where: { status: 'pending' },
        _sum: { amount_usdt: true }
      }),
      prisma.referralCommission.aggregate({
        where: { status: 'released' },
        _sum: { amount_usdt: true }
      })
    ]);

    const totalSystemBalance = (systemBalance._sum.amount || 0).toString();

    return {
      totalSystemBalance,
      pendingCommissions: pendingCommissions._sum.amount_usdt?.toString() || '0',
      releasedCommissions: releasedCommissions._sum.amount_usdt?.toString() || '0'
    };
  }
}

export const adminMetricsService = new AdminMetricsService();