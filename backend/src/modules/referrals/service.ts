import { prisma } from '../../lib/prisma';
import { logger } from '../../utils/logger';
import { sseService } from '../../services/sse';
import { Decimal } from '@prisma/client/runtime/library';

export class ReferralService {
  
  // Get user's referred users and their commissions
  async getUserReferrals(userId: string, page: number = 1, limit: number = 20) {
    try {
      const offset = (page - 1) * limit;
      
      // Get referred users with their orders and commissions
      const referrals = await prisma.user.findMany({
        where: {
          sponsor_id: userId
        },
        select: {
          id: true,
          email: true,
          ref_code: true,
          created_at: true,
          orders: {
            where: {
              status: 'confirmed'
            },
            select: {
              id: true,
              amount_usdt: true,
              created_at: true,
              product: {
                select: {
                  name: true
                }
              }
            }
          },
          referral_commissions_referred: {
            select: {
              id: true,
              amount_usdt: true,
              status: true,
              created_at: true,
              release_at: true
            }
          }
        },
        skip: offset,
        take: limit,
        orderBy: {
          created_at: 'desc'
        }
      });
      
      // Get total count
      const total = await prisma.user.count({
        where: {
          sponsor_id: userId
        }
      });
      
      return {
        referrals,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting user referrals: ' + (error as Error).message);
      throw error;
    }
  }
  
  // Get user's commissions
  async getUserCommissions(userId: string, page: number = 1, limit: number = 20) {
    try {
      const offset = (page - 1) * limit;
      
      const commissions = await prisma.referralCommission.findMany({
        where: {
          sponsor_id: userId
        },
        include: {
          referred_user: {
            select: {
              email: true,
              ref_code: true
            }
          }
        },
        skip: offset,
        take: limit,
        orderBy: {
          created_at: 'desc'
        }
      });
      
      const total = await prisma.referralCommission.count({
        where: {
          sponsor_id: userId
        }
      });
      
      return {
        commissions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting user commissions: ' + (error as Error).message);
      throw error;
    }
  }
  
  // Admin: Get all pending commissions
  async getPendingCommissions(page: number = 1, limit: number = 20) {
    try {
      const offset = (page - 1) * limit;
      
      const commissions = await prisma.referralCommission.findMany({
        where: {
          status: 'pending'
        },
        include: {
          sponsor: {
            select: {
              email: true,
              ref_code: true
            }
          },
          referred_user: {
            select: {
              email: true,
              ref_code: true
            }
          }
        },
        skip: offset,
        take: limit,
        orderBy: {
          created_at: 'desc'
        }
      });
      
      const total = await prisma.referralCommission.count({
        where: {
          status: 'pending'
        }
      });
      
      return {
        commissions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting pending commissions: ' + (error as Error).message);
      throw error;
    }
  }
  
  // Admin: Release commission
  async releaseCommission(commissionId: string, adminId: string) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Get commission details
        const commission = await tx.referralCommission.findUnique({
          where: { id: commissionId },
          include: {
            sponsor: true,
            referred_user: true
          }
        });
        
        if (!commission || commission.status !== 'pending') {
          throw new Error('Commission not found or not in pending status');
        }
        
        // Update commission status
        const releasedCommission = await tx.referralCommission.update({
          where: { id: commissionId },
          data: {
            status: 'released',
            release_at: new Date()
          }
        });
        
        // Create ledger entry for commission release
        await tx.ledgerEntry.create({
          data: {
            user_id: commission.sponsor_id,
            direction: 'credit',
            amount: commission.amount_usdt,
            ref_type: 'referral_commission',
            ref_id: commission.id,
            meta: {
              description: `Referral commission released from ${commission.referred_user?.email || 'user'}`
            }
          }
        });
        
        // Emit SSE event to notify user about commission release
        sseService.sendToUser(commission.sponsor_id, {
          type: 'commissionReleased',
          data: {
            commissionId: releasedCommission.id,
            amount: releasedCommission.amount_usdt,
            referredUser: commission.referred_user?.email || 'user',
            releaseDate: releasedCommission.release_at
          }
        });

        logger.info(`Commission ${commissionId} released by admin ${adminId}`);
        return releasedCommission;
      });
    } catch (error) {
      logger.error('Error releasing commission: ' + (error as Error).message);
      throw error;
    }
  }
  
  // Admin: Cancel commission
  async cancelCommission(commissionId: string, adminId: string) {
    try {
      const commission = await prisma.referralCommission.findUnique({
        where: { id: commissionId }
      });
      
      if (!commission || commission.status !== 'pending') {
        throw new Error('Commission not found or not in pending status');
      }
      
      const cancelledCommission = await prisma.referralCommission.update({
        where: { id: commissionId },
        data: {
          status: 'canceled'
        }
      });
      
      logger.info(`Commission ${commissionId} cancelled by admin ${adminId}`);
      return cancelledCommission;
    } catch (error) {
      logger.error('Error cancelling commission: ' + (error as Error).message);
      throw error;
    }
  }
}

export const referralService = new ReferralService();