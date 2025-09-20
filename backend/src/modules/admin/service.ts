import { prisma } from '../../lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../../utils/logger';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { adminSettingsService } from './settings.service';

class AdminService {
  async getPendingOrders() {
    try {
      return await prisma.orderDeposit.findMany({
        where: {
          status: 'paid'
        },
        include: {
          user: {
            select: {
              email: true,
              first_name: true,
              last_name: true
            }
          },
          product: true
        },
        orderBy: {
          created_at: 'asc'
        }
      });
    } catch (error) {
      logger.error('Get pending orders error: ' + (error as Error).message);
      throw error;
    }
  }

  async getAllOrders(params: {
    page: number;
    limit: number;
    status?: string;
    search?: string;
  }) {
    try {
      const { page, limit, status, search } = params;
      const skip = (page - 1) * limit;
      
      // Build where clause
      const where: any = {};
      
      if (status && status !== 'all') {
        where.status = status;
      }
      
      if (search) {
        where.OR = [
          {
            user: {
              email: {
                contains: search,
                mode: 'insensitive'
              }
            }
          },
          {
            user: {
              first_name: {
                contains: search,
                mode: 'insensitive'
              }
            }
          },
          {
            user: {
              last_name: {
                contains: search,
                mode: 'insensitive'
              }
            }
          },
          {
            product: {
              name: {
                contains: search,
                mode: 'insensitive'
              }
            }
          },
          {
            id: {
              contains: search,
              mode: 'insensitive'
            }
          }
        ];
        
        if (search.startsWith('0x')) {
          where.OR.push({
            tx_hash: {
              contains: search,
              mode: 'insensitive'
            }
          });
        }
      }
      
      const [orders, total] = await Promise.all([
        prisma.orderDeposit.findMany({
          where,
          include: {
            user: {
              select: {
                email: true,
                first_name: true,
                last_name: true
              }
            },
            product: true
          },
          orderBy: {
            created_at: 'desc'
          },
          skip,
          take: limit
        }),
        prisma.orderDeposit.count({ where })
      ]);
      
      return {
        data: orders,
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Get all orders error: ' + (error as Error).message);
      throw error;
    }
  }
  
  async rejectOrder(orderId: string, adminId: string, reason: string) {
    try {
      const order = await prisma.orderDeposit.findUnique({
        where: { id: orderId }
      });
      
      if (!order || order.status !== 'paid') {
        return null;
      }
      
      return await prisma.orderDeposit.update({
        where: { id: orderId },
        data: {
          status: 'canceled'
        }
      });
    } catch (error) {
      logger.error('Reject order error: ' + (error as Error).message);
      throw error;
    }
  }
  
  async getUsers(page: number = 1, limit: number = 20) {
    try {
      const skip = (page - 1) * limit;
      
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          skip,
          take: limit,
          include: {
            _count: {
              select: {
                licenses: true,
                orders: true
              }
            }
          },
          orderBy: {
            created_at: 'desc'
          }
        }),
        prisma.user.count()
      ]);
      
      return { users, total };
    } catch (error) {
      logger.error('Get users error: ' + (error as Error).message);
      throw error;
    }
  }
  
  async getStats() {
    try {
      const [userStats, orderStats, licenseStats, earningsStats] = await Promise.all([
        // User statistics
        prisma.user.groupBy({
          by: ['status'],
          _count: true
        }),
        
        // Order statistics
        prisma.orderDeposit.groupBy({
          by: ['status'],
          _count: true,
          _sum: {
            amount_usdt: true
          }
        }),
        
        // License statistics
        prisma.userLicense.groupBy({
          by: ['status'],
          _count: true
        }),
        
        // Total earnings distributed
        prisma.licenseDailyEarning.aggregate({
          _sum: {
            cashback_amount: true,
            potential_amount: true
          }
        })
      ]);
      
      // Format user stats
      const users = {
        total: userStats.reduce((sum, stat) => sum + stat._count, 0),
        active: userStats.find(s => s.status === 'active')?._count || 0,
        suspended: userStats.find(s => s.status === 'suspended')?._count || 0
      };
      
      // Format order stats
      const orders = {
        total: orderStats.reduce((sum, stat) => sum + stat._count, 0),
        pending: orderStats.find(s => s.status === 'pending')?._count || 0,
        paid: orderStats.find(s => s.status === 'paid')?._count || 0,
        confirmed: orderStats.find(s => s.status === 'confirmed')?._count || 0,
        canceled: orderStats.find(s => s.status === 'canceled')?._count || 0,
        expired: orderStats.find(s => s.status === 'expired')?._count || 0,
        total_volume: orderStats
          .filter(s => s.status === 'confirmed')
          .reduce((sum, stat) => sum + (stat._sum.amount_usdt?.toNumber() || 0), 0)
      };
      
      // Format license stats
      const licenses = {
        total: licenseStats.reduce((sum, stat) => sum + stat._count, 0),
        active: licenseStats.find(s => s.status === 'active')?._count || 0,
        completed: licenseStats.find(s => s.status === 'completed')?._count || 0,
        paused: licenseStats.find(s => s.status === 'paused')?._count || 0
      };
      
      return {
        users,
        orders,
        licenses,
        total_earnings_distributed: (earningsStats._sum.cashback_amount?.toNumber() || 0) + (earningsStats._sum.potential_amount?.toNumber() || 0)
      };
    } catch (error) {
      logger.error('Get stats error: ' + (error as Error).message);
      throw error;
    }
  }

  // Get all licenses with filters and pagination
  async getLicenses(page: number = 1, limit: number = 20, status?: string, userId?: string) {
    try {
      const skip = (page - 1) * limit;
      const where: any = {};
      
      if (status) {
        where.status = status.toLowerCase();
      }
      if (userId) {
        where.user_id = userId;
      }

      const [licenses, total] = await Promise.all([
        prisma.userLicense.findMany({
          where,
          skip,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                first_name: true,
        last_name: true
              }
            },
            product: {
              select: {
                id: true,
                name: true,
                price_usdt: true,
                daily_rate: true,
                duration_days: true,
                description: true,
                sla_hours: true,
                badge: true,
                target_user: true
              }
            }
          },
          orderBy: {
            created_at: 'desc'
          }
        }),
        prisma.userLicense.count({ where })
      ]);

      const formattedLicenses = licenses.map(license => {
        const principalUSDT = Number(license.product.price_usdt);
        const accruedUSDT = Number(license.cashback_accum || 0);
        const capUSDT = principalUSDT * 2; // 200% cap (tope)
        const remainingUSDT = Math.max(0, capUSDT - accruedUSDT);
        const progressPercentage = capUSDT > 0 ? (accruedUSDT / capUSDT) * 100 : 0;
        
        return {
          id: license.id,
          user: {
            id: license.user.id,
            email: license.user.email,
            name: `${license.user.first_name} ${license.user.last_name}`
          },
          product: {
            id: license.product.id,
            name: license.product.name
          },
          principalUSDT: principalUSDT.toFixed(6),
          daysGenerated: license.days_generated || 0, // 0-25
          dailyRate: 0.08, // New motor: 8% daily
          accruedUSDT: accruedUSDT.toFixed(6),
          capUSDT: capUSDT.toFixed(6), // principal * 2
          remainingUSDT: remainingUSDT.toFixed(6),
          progressPercentage: progressPercentage.toFixed(2), // % ganado
          pausePotential: license.pause_potential || false,
          startedAt: license.started_at,
          endsAt: license.ends_at,
          status: license.status
        };
      });

      return {
        licenses: formattedLicenses,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Get licenses error: ' + (error as Error).message);
      throw error;
    }
  }

  // Pause or resume license potential earnings
  async pauseLicensePotential(licenseId: string, pause: boolean, adminId: string) {
    try {
      const license = await prisma.userLicense.findUnique({
        where: { id: licenseId }
      });

      if (!license) {
        return null;
      }

      // Update flags to include pause_potential
      const currentFlags = license.flags as any || {};
      const updatedFlags = {
        ...currentFlags,
        pause_potential: pause
      };

      return await prisma.userLicense.update({
        where: { id: licenseId },
        data: {
          flags: updatedFlags
        }
      });
    } catch (error) {
      logger.error('Pause license potential error: ' + (error as Error).message);
      throw error;
    }
  }

  // Get admin overview dashboard data
  async getOverview() {
    try {
      const [
        totalUsers, 
        activeLicenses, 
        totalEarnings, 
        pendingWithdrawals, 
        totalProducts,
        totalOrders,
        pendingOrders,
        totalVolumeConfirmed,
        totalCommissionsPaid,
        totalSystemBalance,
        recentActivity
      ] = await Promise.all([
        // Total users
        prisma.user.count(),
        
        // Active licenses
        prisma.userLicense.count({
          where: { status: 'active' }
        }),
        
        // Total earnings distributed (new motor)
        prisma.licenseDailyEarning.aggregate({
          where: { applied_to_balance: true },
          _sum: { cashback_amount: true, potential_amount: true }
        }),
        
        // Pending withdrawals (waiting for admin approval)
        prisma.withdrawal.aggregate({
          where: { status: 'otp_verified' },
          _sum: { amount_usdt: true },
          _count: true
        }),
        
        // Total active products
        prisma.licenseProduct.count({
          where: { active: true }
        }),
        
        // Total orders
        prisma.orderDeposit.count(),
        
        // Pending orders
        prisma.orderDeposit.count({
          where: { status: 'pending' }
        }),
        
        // Total volume confirmed (sum of confirmed orders)
        prisma.orderDeposit.aggregate({
          where: { status: 'confirmed' },
          _sum: { amount_usdt: true }
        }),
        
        // Total commissions paid (from ledger entries)
        prisma.ledgerEntry.aggregate({
          where: {
            ref_type: 'referral_commission',
            direction: 'credit'
          },
          _sum: { amount: true }
        }),
        
        // Total system balance (sum of all user balances)
        prisma.ledgerEntry.groupBy({
          by: ['user_id'],
          _sum: {
            amount: true
          }
        }),
        
        // Recent activity (last 7 days) - Multiple activity types
        this.getRecentSystemActivity()
      ]);

      const totalEarningsAmount = Number(totalEarnings._sum.cashback_amount || 0) + Number(totalEarnings._sum.potential_amount || 0);
      const totalVolumeAmount = Number(totalVolumeConfirmed._sum.amount_usdt || 0);
      const totalCommissionsAmount = Number(totalCommissionsPaid._sum.amount || 0);
      
      // Calculate total system balance from all user balances
      const systemBalance = totalSystemBalance.reduce((total, userBalance) => {
        const userAmount = Number(userBalance._sum.amount || 0);
        return total + (userAmount > 0 ? userAmount : 0); // Only positive balances
      }, 0);
      
      return {
        summary: {
          totalUsers,
          activeLicenses,
          totalEarningsDistributed: totalEarningsAmount.toFixed(6),
          pendingWithdrawals: {
            count: pendingWithdrawals._count,
            amount: Number(pendingWithdrawals._sum.amount_usdt || 0).toFixed(6)
          },
          totalProducts,
          totalOrders,
          pendingOrders,
          totalVolumeConfirmed: totalVolumeAmount.toFixed(6),
          totalCommissionsPaid: totalCommissionsAmount.toFixed(6),
          totalSystemBalance: systemBalance.toFixed(6)
        },
        recentActivity: recentActivity
      };
    } catch (error) {
      logger.error('Get overview error: ' + (error as Error).message);
      throw error;
    }
  }

  // Product management methods
  async getProducts(page: number = 1, limit: number = 20) {
    try {
      const offset = (page - 1) * limit;
      
      const [products, total] = await Promise.all([
        prisma.licenseProduct.findMany({
          skip: offset,
          take: limit,
          orderBy: {
            created_at: 'desc'
          }
        }),
        prisma.licenseProduct.count()
      ]);
      
      return {
        products,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Get products error: ' + (error as Error).message);
      throw error;
    }
  }

  async createProduct(data: {
    name: string;
    code: string;
    price_usdt: number;
    daily_rate: number;
    duration_days: number;
    cashback_cap: number;
    potential_cap: number;
    description?: string;
    sla_hours?: number;
    badge?: string;
    target_user?: string;
  }) {
    try {
      return await prisma.licenseProduct.create({
        data: {
          name: data.name,
          code: data.code,
          price_usdt: new Decimal(data.price_usdt),
          daily_rate: new Decimal(data.daily_rate),
          duration_days: data.duration_days,
          max_cap_percentage: new Decimal(200), // Default 200%
          cashback_cap: new Decimal(data.cashback_cap),
          potential_cap: new Decimal(data.potential_cap),
          description: data.description ?? null,
          sla_hours: data.sla_hours ?? null,
          badge: data.badge ?? null,
          target_user: data.target_user ?? null,
          active: true
        }
      });
    } catch (error) {
      logger.error('Create product error: ' + (error as Error).message);
      throw error;
    }
  }

  async updateProduct(id: string, data: {
    name?: string | undefined;
    code?: string | undefined;
    price_usdt?: number | undefined;
    daily_rate?: number | undefined;
    duration_days?: number | undefined;
    cashback_cap?: number | undefined;
    potential_cap?: number | undefined;
    description?: string | undefined;
    sla_hours?: number | undefined;
    badge?: string | undefined;
    target_user?: string | undefined;
    active?: boolean | undefined;
  }) {
    try {
      const updateData: any = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.code !== undefined) updateData.code = data.code;
      if (data.price_usdt !== undefined) updateData.price_usdt = new Decimal(data.price_usdt);
      if (data.daily_rate !== undefined) updateData.daily_rate = new Decimal(data.daily_rate);
      if (data.duration_days !== undefined) updateData.duration_days = data.duration_days;
      if (data.cashback_cap !== undefined) updateData.cashback_cap = new Decimal(data.cashback_cap);
      if (data.potential_cap !== undefined) updateData.potential_cap = new Decimal(data.potential_cap);
      if (data.description !== undefined) updateData.description = data.description;
      if (data.sla_hours !== undefined) updateData.sla_hours = data.sla_hours;
      if (data.badge !== undefined) updateData.badge = data.badge;
      if (data.target_user !== undefined) updateData.target_user = data.target_user;
      if (data.active !== undefined) updateData.active = data.active;
      
      return await prisma.licenseProduct.update({
        where: { id },
        data: updateData
      });
    } catch (error) {
      logger.error('Update product error: ' + (error as Error).message);
      throw error;
    }
  }

  async deleteProduct(id: string) {
    try {
      // Check if product has any orders or licenses
      const [orderCount, licenseCount] = await Promise.all([
        prisma.orderDeposit.count({ where: { product_id: id } }),
        prisma.userLicense.count({ where: { product_id: id } })
      ]);
      
      if (orderCount > 0 || licenseCount > 0) {
        throw new Error('Cannot delete product with existing orders or licenses');
      }
      
      return await prisma.licenseProduct.delete({
        where: { id }
      });
    } catch (error) {
      logger.error('Delete product error: ' + (error as Error).message);
      throw error;
    }
  }

  async updateUserStatus(userId: string, status: 'active' | 'suspended' | 'deleted', adminId: string, reason?: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return null;
      }

      // Create audit log entry
      await prisma.auditLog.create({
        data: {
          action: 'user_status_update',
          entity: 'user',
          entity_id: userId,
          actor_user_id: adminId,
          old_values: {
            status: user.status
          },
          new_values: {
            status: status,
            reason: reason || 'No reason provided'
          }
        }
      });

      return await prisma.user.update({
        where: { id: userId },
        data: { status }
      });
    } catch (error) {
      logger.error('Update user status error: ' + (error as Error).message);
      throw error;
    }
  }

  async pauseUserPotential(userId: string, pause: boolean, adminId: string, reason?: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return null;
      }

      // Create audit log entry
      await prisma.auditLog.create({
        data: {
          action: 'user_potential_pause',
          entity: 'user',
          entity_id: userId,
          actor_user_id: adminId,
          new_values: {
            pause_enabled: pause,
            reason: reason || 'No reason provided'
          }
        }
      });

      // Also update all active licenses for this user
      await prisma.userLicense.updateMany({
        where: {
          user_id: userId,
          status: 'active'
        },
        data: {
          flags: {
            pause_potential: pause
          }
        }
      });

      return user;
    } catch (error) {
      logger.error('Pause user potential error: ' + (error as Error).message);
      throw error;
    }
  }

  async getUserProfile(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          licenses: {
            include: {
              product: true
            },
            orderBy: {
              created_at: 'desc'
            }
          },
          orders: {
            include: {
              product: true
            },
            orderBy: {
              created_at: 'desc'
            }
          },
          withdrawals: {
            orderBy: {
              created_at: 'desc'
            }
          },
          sponsor: {
            select: {
              id: true,
              email: true,
              ref_code: true
            }
          },
          sponsored: {
            select: {
              id: true,
              email: true,
              created_at: true
            }
          }
        }
      });

      if (!user) {
        return null;
      }

      // Get user balance
      const balanceResult = await prisma.ledgerEntry.aggregate({
        where: {
          user_id: userId
        },
        _sum: {
          amount: true
        }
      });

      const balance = balanceResult._sum.amount || new Decimal(0);

      return {
        ...user,
        balance: balance.toString(),
        total_licenses: (user as any).licenses.length,
        active_licenses: (user as any).licenses.filter((l: any) => l.status === 'active').length,
        total_orders: (user as any).orders.length,
        total_withdrawals: (user as any).withdrawals.length
      };
    } catch (error) {
      logger.error('Get user profile error: ' + (error as Error).message);
      throw error;
    }
  }

  async getBonuses(page: number = 1, limit: number = 20, filters: any = {}) {
    try {
      const skip = (page - 1) * limit;
      const where: any = {};

      // Apply filters
      if (filters.status) {
        where.status = filters.status;
      }
      if (filters.user_email) {
        where.user = {
          email: {
            contains: filters.user_email,
            mode: 'insensitive'
          }
        };
      }
      if (filters.created_from) {
        where.created_at = {
          gte: new Date(filters.created_from)
        };
      }
      if (filters.created_to) {
        where.created_at = {
          ...where.created_at,
          lte: new Date(filters.created_to)
        };
      }

      const [bonuses, total] = await Promise.all([
        prisma.bonus.findMany({
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
            created_by: {
              select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true
              }
            }
          },
          orderBy: {
            created_at: 'desc'
          },
          skip,
          take: limit
        }),
        prisma.bonus.count({ where })
      ]);

      return {
        bonuses: bonuses.map(bonus => ({
          id: bonus.id,
          user: {
            id: bonus.user.id,
            email: bonus.user.email,
            name: `${bonus.user.first_name || ''} ${bonus.user.last_name || ''}`.trim()
          },
          amount_usdt: bonus.amount_usdt.toString(),
          status: bonus.status,
          reason: bonus.reason,
          created_by_admin: bonus.created_by ? {
            id: bonus.created_by.id,
            email: bonus.created_by.email,
            name: `${bonus.created_by.first_name || ''} ${bonus.created_by.last_name || ''}`.trim()
          } : null,
          created_at: bonus.created_at,
          updated_at: bonus.updated_at
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Get bonuses error: ' + (error as Error).message);
      throw error;
    }
  }

  async createBonus(userId: string, amountUsdt: number, reason: string, adminId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return null;
      }

      const bonus = await prisma.$transaction(async (tx) => {
        // Create bonus record
        const bonus = await tx.bonus.create({
          data: {
            user_id: userId,
            amount_usdt: new Decimal(amountUsdt),
            reason,
            status: 'released',
            created_by_admin_id: adminId
          }
        });

        // Create ledger entry to credit user balance
        await tx.ledgerEntry.create({
          data: {
            user_id: userId,
            direction: 'credit',
            amount: new Decimal(amountUsdt),
            ref_type: 'bonus',
            ref_id: bonus.id,
            meta: {
              description: `Admin bonus: ${reason}`
            }
          }
        });

        // Create audit log entry
        await tx.auditLog.create({
          data: {
            action: 'bonus_created',
            entity: 'bonus',
            entity_id: bonus.id,
            actor_user_id: adminId,
            new_values: {
              user_id: userId,
              amount_usdt: amountUsdt,
              reason
            }
          }
        });

        return bonus;
      });

      // Send notification to user after successful transaction
      try {
        const { realTimeNotificationService } = await import('../../services/real-time-notifications');
        await realTimeNotificationService.sendBonusNotification('earned', {
          id: bonus.id,
          user_id: userId,
          amount: amountUsdt
        });
      } catch (notificationError) {
        logger.error('Failed to send bonus notification: ' + (notificationError as Error).message);
        // Don't throw here, bonus creation was successful
      }

      return bonus;
    } catch (error) {
      logger.error('Create bonus error: ' + (error as Error).message);
      throw error;
    }
  }

  async updateUser(userId: string, updateData: {
    first_name?: string;
    last_name?: string;
    email?: string;
  }, adminId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return null;
      }

      // Create audit log entry
      await prisma.auditLog.create({
        data: {
          action: 'user_updated',
          entity: 'user',
          entity_id: userId,
          actor_user_id: adminId,
          old_values: {
            first_name: user.first_name,
        last_name: user.last_name,
            email: user.email
          },
          new_values: updateData
        }
      });

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData
      });

      return updatedUser;
    } catch (error) {
      logger.error('Update user error: ' + (error as Error).message);
      throw error;
    }
  }

  // Wallet management methods
  async getWallets() {
    try {
      return await prisma.adminWallet.findMany({
        orderBy: [
          { status: 'asc' },
          { assigned_count: 'asc' },
          { created_at: 'asc' }
        ]
      });
    } catch (error) {
      logger.error('Get wallets error: ' + (error as Error).message);
      throw error;
    }
  }

  async createWallet(label: string, address: string) {
    try {
      // Check if address already exists
      const existingWallet = await prisma.adminWallet.findUnique({
        where: { address }
      });

      if (existingWallet) {
        throw new Error('Wallet address already exists');
      }

      return await prisma.adminWallet.create({
        data: {
          label,
          address,
          status: 'active',
          assigned_count: 0
        }
      });
    } catch (error) {
      logger.error('Create wallet error: ' + (error as Error).message);
      throw error;
    }
  }

  async updateWallet(walletId: string, updateData: { label?: string; status?: string }) {
    try {
      const wallet = await prisma.adminWallet.findUnique({
        where: { id: walletId }
      });

      if (!wallet) {
        return null;
      }

      return await prisma.adminWallet.update({
        where: { id: walletId },
        data: updateData
      });
    } catch (error) {
      logger.error('Update wallet error: ' + (error as Error).message);
      throw error;
    }
  }

  async deleteWallet(walletId: string) {
    try {
      const wallet = await prisma.adminWallet.findUnique({
        where: { id: walletId },
        include: {
          orders: {
            where: {
              status: {
                in: ['pending', 'paid']
              }
            }
          }
        }
      });

      if (!wallet) {
        return false;
      }

      // Check if wallet has pending orders
      if (wallet.orders.length > 0) {
        throw new Error('Cannot delete wallet with pending orders');
      }

      await prisma.adminWallet.delete({
        where: { id: walletId }
      });

      return true;
    } catch (error) {
      logger.error('Delete wallet error: ' + (error as Error).message);
      throw error;
    }
  }

  // Get next wallet for assignment using LRS (Least Recently Served) strategy
  async getNextWalletForAssignment() {
    try {
      const wallet = await prisma.adminWallet.findFirst({
        where: {
          status: 'active'
        },
        orderBy: [
          { assigned_count: 'asc' },
          { last_assigned_at: 'asc' }
        ]
      });

      if (!wallet) {
        throw new Error('No active wallets available for assignment');
      }

      // Update assignment tracking
      await prisma.adminWallet.update({
        where: { id: wallet.id },
        data: {
          assigned_count: { increment: 1 },
          last_assigned_at: new Date()
        }
      });

      return wallet;
    } catch (error) {
      logger.error('Get next wallet error: ' + (error as Error).message);
      throw error;
    }
  }

  // Get recent system activity (last 7 days)
  async getRecentSystemActivity() {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      // Get different types of activities
      const [newUsers, confirmedOrders, processedWithdrawals, dailyEarnings] = await Promise.all([
        // New user registrations
        prisma.user.findMany({
          where: {
            created_at: { gte: sevenDaysAgo },
            role: 'user'
          },
          select: {
            created_at: true,
            email: true
          },
          orderBy: { created_at: 'desc' },
          take: 10
        }),
        
        // Confirmed orders
        prisma.orderDeposit.findMany({
          where: {
            confirmed_at: { gte: sevenDaysAgo },
            status: 'confirmed'
          },
          select: {
            confirmed_at: true,
            amount_usdt: true,
            user: {
              select: { email: true }
            }
          },
          orderBy: { confirmed_at: 'desc' },
          take: 10
        }),
        
        // Processed withdrawals
        prisma.withdrawal.findMany({
          where: {
            updated_at: { gte: sevenDaysAgo },
            status: 'paid'
          },
          select: {
            updated_at: true,
            amount_usdt: true,
            user: {
              select: { email: true }
            }
          },
          orderBy: { updated_at: 'desc' },
          take: 10
        }),
        
        // Daily earnings distributed
        prisma.licenseDailyEarning.groupBy({
          by: ['earning_date'],
          where: {
            earning_date: { gte: sevenDaysAgo },
            applied_to_balance: true
          },
          _sum: {
            cashback_amount: true,
            potential_amount: true
          },
          _count: true,
          orderBy: {
            earning_date: 'desc'
          }
        })
      ]);
      
      // Combine and format activities
      const activities: Array<{
        type: string;
        date: Date;
        description: string;
        details: string;
        icon: string;
      }> = [];
      
      // Add user registrations
      newUsers.forEach(user => {
        activities.push({
          type: 'user_registration',
          date: user.created_at,
          description: `Nuevo usuario registrado`,
          details: `${user.email.substring(0, 3)}***@${user.email.split('@')[1]}`,
          icon: 'user-plus'
        });
      });
      
      // Add confirmed orders
      confirmedOrders.forEach(order => {
        if (order.confirmed_at) {
          activities.push({
            type: 'order_confirmed',
            date: order.confirmed_at,
            description: `Orden confirmada`,
            details: `$${Number(order.amount_usdt).toFixed(2)} USDT - ${order.user.email.substring(0, 3)}***@${order.user.email.split('@')[1]}`,
            icon: 'check-circle'
          });
        }
      });
      
      // Add processed withdrawals
      processedWithdrawals.forEach(withdrawal => {
        if (withdrawal.updated_at) {
          activities.push({
            type: 'withdrawal_processed',
            date: withdrawal.updated_at,
            description: `Retiro procesado`,
            details: `$${Number(withdrawal.amount_usdt).toFixed(2)} USDT - ${withdrawal.user.email.substring(0, 3)}***@${withdrawal.user.email.split('@')[1]}`,
            icon: 'arrow-up-circle'
          });
        }
      });
      
      // Add daily earnings
      dailyEarnings.forEach(earning => {
        const totalAmount = Number(earning._sum.cashback_amount || 0) + Number(earning._sum.potential_amount || 0);
        activities.push({
          type: 'daily_earnings',
          date: earning.earning_date,
          description: `Ganancias distribuidas`,
          details: `$${totalAmount.toFixed(2)} USDT a ${earning._count} licencias`,
          icon: 'trending-up'
        });
      });
      
      // Sort by date (most recent first) and limit to 15 activities
      return activities
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 15)
        .map(activity => ({
          ...activity,
          date: activity.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
          timestamp: activity.date
        }));
        
    } catch (error) {
      logger.error('Get recent system activity error: ' + (error as Error).message);
      return [];
    }
  }

  async triggerDailyEarnings() {
    try {
      // Create Redis connection
      const redis = new Redis(process.env.REDIS_URL!, {
        maxRetriesPerRequest: null
      });

      // Create daily earnings queue
      const dailyEarningsQueue = new Queue('dailyEarnings', {
        connection: redis
      });

      // Add job to queue for immediate processing
      const job = await dailyEarningsQueue.add('processDailyEarnings', {}, {
        priority: 1, // High priority for manual trigger
        removeOnComplete: 10,
        removeOnFail: 5
      });

      logger.info(`Manual daily earnings job triggered with ID: ${job.id}`);

      // Close connections
      await dailyEarningsQueue.close();
      await redis.quit();

      return {
        jobId: job.id,
        message: 'Daily earnings processing job added to queue'
      };
    } catch (error) {
      logger.error('Trigger daily earnings error: ' + (error as Error).message);
      throw error;
    }
  }

  // Activate a pending license manually
  async activateLicense(licenseId: string, adminId: string) {
    try {
      const license = await prisma.userLicense.findUnique({
        where: { id: licenseId },
        include: {
          user: {
            select: {
              email: true
            }
          },
          product: {
            select: {
              name: true
            }
          }
        }
      });

      if (!license) {
        return null;
      }

      if (license.status === 'active') {
        throw new Error('License is already active');
      }

      // Update license to active status and set started_at to now
      const activatedLicense = await prisma.userLicense.update({
        where: { id: licenseId },
        data: {
          status: 'active',
          started_at: new Date() // Set activation time
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          actor_user_id: adminId,
          action: 'activate_license',
          entity: 'license',
          entity_id: licenseId,
          old_values: { status: 'pending' },
          new_values: { status: 'active', started_at: new Date() },
          diff: { 
            status: { from: 'pending', to: 'active' },
            started_at: { from: null, to: new Date().toISOString() }
          }
        }
      });

      logger.info({
        licenseId,
        adminId,
        userEmail: license.user.email,
        productName: license.product.name
      }, 'License activated manually by admin');

      return activatedLicense;
    } catch (error) {
      logger.error('Activate license error: ' + (error as Error).message);
      throw error;
    }
  }

  // Manually adjust license active days
  async adjustLicenseDays(licenseId: string, newDays: number, reason: string, adminId: string) {
    try {
      const license = await prisma.userLicense.findUnique({
        where: { id: licenseId },
        include: {
          user: {
            select: {
              email: true
            }
          },
          product: {
            select: {
              name: true,
              price_usdt: true
            }
          }
        }
      });

      if (!license) {
        return null;
      }

      // Get admin settings for calculations
      const adminSettings = await adminSettingsService.getSettings();
      const dailyRate = adminSettings.system.daily_earning_rate;
      const maxDays = adminSettings.system.max_earning_days;
      const earningCapPercentage = adminSettings.system.earning_cap_percentage;

      // Validate new days don't exceed maximum
      if (newDays > maxDays) {
        throw new Error(`Days cannot exceed maximum of ${maxDays}`);
      }

      const oldDays = license.days_generated || 0;
      const principalUSDT = Number(license.product.price_usdt);
      const dailyAmount = principalUSDT * dailyRate;

      // Calculate new accumulated values
      const totalEarnedUSDT = newDays * dailyAmount;
      const cashbackDays = Math.min(newDays, 13);
          const potentialDays = Math.max(0, newDays - 13);
      const cashbackAccum = cashbackDays * dailyAmount;
      const potentialAccum = potentialDays * dailyAmount;

      // Check if license should be completed
      const capUSDT = principalUSDT * earningCapPercentage;
      const shouldComplete = newDays >= maxDays || totalEarnedUSDT >= capUSDT;
      const newStatus = shouldComplete ? 'completed' : license.status;

      // Update license in transaction
      const updatedLicense = await prisma.$transaction(async (tx) => {
        // Update license
        const updated = await tx.userLicense.update({
          where: { id: licenseId },
          data: {
            days_generated: newDays,
            total_earned_usdt: new Decimal(totalEarnedUSDT),
            cashback_accum: new Decimal(cashbackAccum),
            potential_accum: new Decimal(potentialAccum),
            status: newStatus
          }
        });

        // If days were reduced, remove excess daily earnings
        if (newDays < oldDays) {
          await tx.licenseDailyEarning.deleteMany({
            where: {
              license_id: licenseId,
              day_index: {
                gt: newDays
              }
            }
          });
        }
        // If days were increased, create missing daily earnings
        else if (newDays > oldDays) {
          const startDate = new Date(license.started_at);
          const earningsToCreate = [];

          for (let day = oldDays + 1; day <= newDays; day++) {
            const earningDate = new Date(startDate);
            earningDate.setDate(earningDate.getDate() + day - 1);
            earningDate.setHours(0, 0, 0, 0);

            // Check if earning already exists
            const existingEarning = await tx.licenseDailyEarning.findFirst({
              where: {
                license_id: licenseId,
                earning_date: earningDate
              }
            });

            if (!existingEarning) {
              earningsToCreate.push({
                license_id: licenseId,
                day_index: day,
                cashback_amount: new Decimal(dailyAmount),
                potential_amount: new Decimal(dailyAmount),
                applied_to_balance: true,
                earning_date: earningDate,
                applied_at: new Date()
              });
            }
          }

          if (earningsToCreate.length > 0) {
            await tx.licenseDailyEarning.createMany({
              data: earningsToCreate
            });
          }

          // Create ledger entries for new earnings
          for (let day = oldDays + 1; day <= newDays; day++) {
            await tx.ledgerEntry.create({
              data: {
                user_id: license.user_id,
                amount: new Decimal(dailyAmount),
                direction: 'credit',
                ref_type: 'earning',
                ref_id: license.id,
                meta: {
                  description: `Manual adjustment - Daily earning from ${license.product.name} (Day ${day})`,
                  licenseId: license.id,
                  productName: license.product.name,
                  dayIndex: day,
                  adjustmentReason: reason
                }
              }
            });
          }
        }

        // Create audit log
        await tx.auditLog.create({
          data: {
            actor_user_id: adminId,
            action: 'adjust_license_days',
            entity: 'license',
            entity_id: licenseId,
            old_values: { 
              days_generated: oldDays,
              total_earned_usdt: license.total_earned_usdt,
              status: license.status
            },
            new_values: { 
              days_generated: newDays,
              total_earned_usdt: totalEarnedUSDT,
              status: newStatus
            },
            diff: { 
              days_generated: { from: oldDays, to: newDays },
              total_earned_usdt: { from: Number(license.total_earned_usdt), to: totalEarnedUSDT },
              status: { from: license.status, to: newStatus },
              reason: reason
            }
          }
        });

        return updated;
      });

      logger.info({
        licenseId,
        adminId,
        userEmail: license.user.email,
        productName: license.product.name,
        oldDays,
        newDays,
        reason
      }, 'License days adjusted manually by admin');

      return updatedLicense;
    } catch (error) {
      logger.error('Adjust license days error: ' + (error as Error).message);
      throw error;
    }
  }

  // Adjust license timing (countdown)
  async adjustLicenseTiming(licenseId: string, totalMinutes: number, reason: string, adminId: string) {
    try {
      const license = await prisma.userLicense.findUnique({
        where: { id: licenseId },
        include: {
          user: {
            select: {
              email: true
            }
          },
          product: {
            select: {
              name: true,
              price_usdt: true
            }
          }
        }
      });

      if (!license) {
        return null;
      }

      // Only allow timing adjustment for active licenses
      if (license.status !== 'active') {
        throw new Error('Only active licenses can have their timing adjusted');
      }

      const oldStartedAt = new Date(license.started_at);
      const newStartedAt = new Date(oldStartedAt.getTime() + (totalMinutes * 60 * 1000));

      // Validate that the new started_at is not in the future beyond reasonable limits
      const now = new Date();
      const maxFutureTime = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 24 hours from now
      
      if (newStartedAt > maxFutureTime) {
        throw new Error('Cannot set license start time more than 24 hours in the future');
      }

      // Update license in transaction
      const updatedLicense = await prisma.$transaction(async (tx) => {
        // Update license started_at
        const updated = await tx.userLicense.update({
          where: { id: licenseId },
          data: {
            started_at: newStartedAt
          }
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            actor_user_id: adminId,
            action: 'adjust_license_timing',
            entity: 'license',
            entity_id: licenseId,
            old_values: { 
              started_at: oldStartedAt.toISOString()
            },
            new_values: { 
              started_at: newStartedAt.toISOString()
            },
            diff: { 
              started_at: { from: oldStartedAt.toISOString(), to: newStartedAt.toISOString() },
              adjustment_minutes: totalMinutes,
              reason: reason
            }
          }
        });

        return updated;
      });

      logger.info({
        licenseId,
        adminId,
        userEmail: license.user.email,
        productName: license.product.name,
        oldStartedAt: oldStartedAt.toISOString(),
        newStartedAt: newStartedAt.toISOString(),
        adjustmentMinutes: totalMinutes,
        reason
      }, 'License timing adjusted manually by admin');

      return updatedLicense;
    } catch (error) {
      logger.error('Adjust license timing error: ' + (error as Error).message);
      throw error;
    }
  }

  // Process earnings for a specific license
  async processLicenseEarnings(licenseId: string, force: boolean, adminId: string) {
    try {
      const license = await prisma.userLicense.findUnique({
        where: { id: licenseId },
        include: {
          user: {
            select: {
              id: true,
              email: true
            }
          },
          product: {
            select: {
              id: true,
              name: true,
              price_usdt: true
            }
          }
        }
      });

      if (!license) {
        return null;
      }

      if (license.status !== 'active') {
        throw new Error('License is not active');
      }

      // Get admin settings
      const adminSettings = await adminSettingsService.getSettings();
      const dailyRate = adminSettings.system.daily_earning_rate;
      const maxDays = adminSettings.system.max_earning_days;
      const earningCapPercentage = adminSettings.system.earning_cap_percentage;

      const principalUSDT = Number(license.product.price_usdt);
      const currentDays = license.days_generated || 0;
      const accruedUSDT = currentDays * (principalUSDT * dailyRate);
      const capUSDT = principalUSDT * earningCapPercentage;

      // Check if license has reached limits
      if (currentDays >= maxDays || accruedUSDT >= capUSDT) {
        throw new Error('License has already reached maximum days or earning cap');
      }

      const nextDay = currentDays + 1;
      const startDate = new Date(license.started_at);
      const earningDate = new Date(startDate);
      earningDate.setDate(earningDate.getDate() + nextDay - 1);
      earningDate.setHours(0, 0, 0, 0);

      // Check 24-hour rule unless forced
      if (!force) {
        const now = new Date();
        const hoursSinceActivation = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceActivation < 24) {
          throw new Error(`License activated only ${hoursSinceActivation.toFixed(2)} hours ago. Must wait 24 hours or use force option.`);
        }
        
        if (earningDate > now) {
          throw new Error('Earning date is in the future');
        }
      }

      // Check for existing earning
      const existingEarning = await prisma.licenseDailyEarning.findFirst({
        where: {
          license_id: licenseId,
          earning_date: earningDate
        }
      });

      if (existingEarning && !force) {
        throw new Error('Earnings already processed for this day. Use force option to override.');
      }

      const dailyAmount = principalUSDT * dailyRate;
      const licenseFlags = license.flags as any || {};
      const shouldPausePotential = licenseFlags.pause_potential === true;
      const appliedToBalance = !shouldPausePotential;

      // Process earning in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Delete existing earning if forcing
        if (existingEarning && force) {
          await tx.licenseDailyEarning.delete({
            where: { id: existingEarning.id }
          });
        }

        // Create new earning record
        const newEarning = await tx.licenseDailyEarning.create({
          data: {
            license_id: licenseId,
            day_index: nextDay,
            cashback_amount: new Decimal(dailyAmount),
            potential_amount: new Decimal(dailyAmount),
            applied_to_balance: appliedToBalance,
            earning_date: earningDate,
            applied_at: appliedToBalance ? new Date() : null
          }
        });

        // Calculate accumulated values
        const totalEarnedUSDT = nextDay * dailyAmount;
        const cashbackDays = Math.min(nextDay, 13);
      const potentialDays = Math.max(0, nextDay - 13);
        const cashbackAccum = cashbackDays * dailyAmount;
        const potentialAccum = potentialDays * dailyAmount;

        // Check if license should be completed
        const shouldComplete = nextDay >= maxDays || totalEarnedUSDT >= capUSDT;
        const newStatus = shouldComplete ? 'completed' : 'active';

        // Update license
        const updatedLicense = await tx.userLicense.update({
          where: { id: licenseId },
          data: {
            days_generated: nextDay,
            total_earned_usdt: new Decimal(totalEarnedUSDT),
            cashback_accum: new Decimal(cashbackAccum),
            potential_accum: new Decimal(potentialAccum),
            status: newStatus
          }
        });

        // Create ledger entry if applied to balance
        if (appliedToBalance) {
          await tx.ledgerEntry.create({
            data: {
              user_id: license.user_id,
              amount: new Decimal(dailyAmount),
              direction: 'credit',
              ref_type: 'earning',
              ref_id: licenseId,
              meta: {
                description: `Manual processing - Daily earning from ${license.product.name} (Day ${nextDay})`,
                licenseId: licenseId,
                productName: license.product.name,
                dayIndex: nextDay,
                processedBy: 'admin',
                forced: force
              }
            }
          });
        }

        // Create audit log
        await tx.auditLog.create({
          data: {
            actor_user_id: adminId,
            action: 'process_license_earnings',
            entity: 'license',
            entity_id: licenseId,
            old_values: {
              days_generated: currentDays,
              total_earned_usdt: license.total_earned_usdt,
              status: license.status
            },
            new_values: {
              days_generated: nextDay,
              total_earned_usdt: totalEarnedUSDT,
              status: newStatus
            },
            diff: {
              days_generated: { from: currentDays, to: nextDay },
              total_earned_usdt: { from: Number(license.total_earned_usdt), to: totalEarnedUSDT },
              status: { from: license.status, to: newStatus },
              forced: force
            }
          }
        });

        return {
          license: updatedLicense,
          earning: newEarning,
          completed: shouldComplete
        };
      });

      logger.info({
        licenseId,
        adminId,
        userEmail: license.user.email,
        productName: license.product.name,
        dayProcessed: nextDay,
        amount: dailyAmount,
        forced: force
      }, 'License earnings processed manually by admin');

      return result;
    } catch (error) {
      logger.error('Process license earnings error: ' + (error as Error).message);
      throw error;
    }
  }
}

export const adminService = new AdminService();