import { prisma } from '../../lib/prisma';
import { logger } from '../../utils/logger';
import { adminSettingsService } from '../admin/settings.service';

export class LicenseService {
  
  // Get all available license products for purchase
  async getAvailableProducts() {
    try {
      const products = await prisma.licenseProduct.findMany({
        where: {
          active: true
        },
        select: {
          id: true,
          name: true,
          code: true,
          price_usdt: true,
          daily_rate: true,
          duration_days: true,
          description: true,
          sla_hours: true,
          badge: true,
          target_user: true,
          max_cap_percentage: true,
          cashback_cap: true,
          potential_cap: true
        },
        orderBy: {
          price_usdt: 'asc'
        }
      });
      
      return products.map(product => ({
        id: product.id,
        name: product.name,
        code: product.code,
        price_usdt: Number(product.price_usdt),
        daily_rate: Number(product.daily_rate),
        duration_days: product.duration_days,
        description: product.description,
        sla_hours: product.sla_hours,
        badge: product.badge,
        target_user: product.target_user,
        max_cap_percentage: Number(product.max_cap_percentage),
        cashback_cap: Number(product.cashback_cap),
        potential_cap: Number(product.potential_cap)
      }));
    } catch (error) {
      logger.error('Error getting available products: ' + (error as Error).message);
      throw error;
    }
  }
  
  // Get user licenses with all required fields for new motor 8% x 25 days
  async getUserLicenses(userId: string, status?: string, page: number = 1, limit: number = 50) {
    try {
      const skip = (page - 1) * limit;
      const whereClause: any = {
        user_id: userId
      };

      if (status) {
        whereClause.status = status.toLowerCase();
      }

      const [licenses, total] = await Promise.all([
        prisma.userLicense.findMany({
          where: whereClause,
          skip,
          take: limit,
          include: {
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
        prisma.userLicense.count({
          where: whereClause
        })
      ]);

      // Get admin settings for configurable values
      const adminSettings = await adminSettingsService.getSettings();
      const dailyRate = adminSettings.system.daily_earning_rate;
      const earningCapPercentage = adminSettings.system.earning_cap_percentage;
      
      // Transform data to match API specification for new motor
      const transformedLicenses = licenses.map(license => {
        const principalUSDT = Number(license.product.price_usdt);
        const daysGenerated = license.days_generated || 0;
        const accruedUSDT = Number(license.cashback_accum || 0);
        const potentialAccum = Number(license.potential_accum || 0);
        const totalEarnedUSDT = Number(license.total_earned_usdt || 0);
        const capUSDT = principalUSDT * earningCapPercentage; // Configurable cap
        const remainingUSDT = Math.max(0, capUSDT - totalEarnedUSDT);
        
        // Calculate if license should be paused (reached cap)
        const shouldPause = accruedUSDT >= capUSDT;
        
        return {
          id: license.id,
          // CamelCase fields for compatibility
          principalUSDT: principalUSDT.toFixed(6),
          accruedUSDT: accruedUSDT.toFixed(6),
          capUSDT: capUSDT.toFixed(6),
          remainingUSDT: remainingUSDT.toFixed(6),
          startedAt: license.started_at,
          endsAt: license.ends_at,
          // Snake_case fields for frontend compatibility
          principal_usdt: principalUSDT.toFixed(6),
          accrued_usdt: accruedUSDT.toFixed(6),
          days_generated: daysGenerated, // 0-25
          daysGenerated: daysGenerated, // Alias for compatibility
          daily_rate: dailyRate, // Configurable daily rate
          total_earned_usdt: totalEarnedUSDT.toFixed(6), // Total accumulated earnings
          cashback_accum: accruedUSDT.toFixed(6), // Cashback phase accumulation
          potential_accum: potentialAccum.toFixed(6), // Potential phase accumulation
          pause_potential: shouldPause || (license.flags as any)?.pause_potential || false,
          flags: {
            pause_potential: shouldPause || (license.flags as any)?.pause_potential || false
          },
          started_at: license.started_at,
          ends_at: license.ends_at,
          created_at: license.created_at,
          status: license.status,
          product: {
            id: license.product.id,
            name: license.product.name,
            description: license.product.description,
            sla_hours: license.product.sla_hours,
            badge: license.product.badge,
            target_user: license.product.target_user,
            price_usdt: license.product.price_usdt,
            duration_days: license.product.duration_days,
            daily_rate: license.product.daily_rate
          }
        };
      });

      const totalPages = Math.ceil(total / limit);

      return {
        licenses: transformedLicenses,
        total,
        page,
        totalPages
      };
    } catch (error) {
      logger.error('Error getting user licenses: ' + (error as Error).message);
      throw error;
    }
  }

  // Get license earnings history (daily breakdown) for new motor 8% x 25 days
  async getLicenseEarnings(licenseId: string, userId: string) {
    try {
      // First verify the license belongs to the user
      const license = await prisma.userLicense.findFirst({
        where: {
          id: licenseId,
          user_id: userId
        },
        include: {
          product: {
            select: {
              price_usdt: true
            }
          }
        }
      });

      if (!license) {
        throw new Error('License not found or access denied');
      }

      // Get earnings from license_daily_earnings table
      const earnings = await prisma.licenseDailyEarning.findMany({
        where: {
          license_id: licenseId
        },
        orderBy: {
          earning_date: 'asc'
        }
      });

      // Get admin settings for configurable values
      const adminSettings = await adminSettingsService.getSettings();
      const dailyRate = adminSettings.system.daily_earning_rate;
      
      const principalUSDT = Number(license.product.price_usdt);
      const dailyAmount = principalUSDT * dailyRate; // Configurable daily rate
      
      // Transform to match API specification for new motor
      return earnings.map((earning) => {
        const dayIndex = earning.day_index;
        let status = 'paid';
        
        // Check pause conditions
        const licenseFlags = license.flags as any || {};
        const isPaused = licenseFlags.pause_potential === true;
        
        if (isPaused) {
          status = 'paused';
        } else if (!earning.applied_to_balance) {
          status = 'pending';
        }

        return {
          day_index: dayIndex, // 1-25
          daily_amount: dailyAmount.toFixed(6), // 8% of principal
          amount_usdt: Number(earning.cashback_amount).toFixed(6),
          applied_to_balance: earning.applied_to_balance,
          is_paused: isPaused,
          earning_date: earning.earning_date,
          applied_at: earning.applied_at,
          status
        };
      });
    } catch (error) {
      logger.error('Error getting license earnings: ' + (error as Error).message);
      throw error;
    }
  }
}