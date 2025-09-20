import { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../utils/logger';
import { realTimeNotificationService } from '../services/real-time-notifications';
import { adminSettingsService } from '../modules/admin/settings.service';

export async function processDailyEarnings(job: Job) {
  let prisma: PrismaClient | null = null;
  try {
    logger.info('Processing daily earnings for all active licenses - Contractual Model 8%/day x 25 days');
    
    // Get DATABASE_URL from environment
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    logger.info('DATABASE_URL configured from environment');
    
    // Create new Prisma client instance
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl
        }
      }
    });
    
    logger.info('Attempting to connect to database...');
    
    // Test Prisma connection first
    await prisma.$connect();
    logger.info('Prisma connected successfully');
    
    // Get configurable settings from admin panel
    const adminSettings = await adminSettingsService.getSettings();
    const dailyRate = adminSettings.system.daily_earning_rate;
    const maxDays = adminSettings.system.max_earning_days;
    const earningCapPercentage = adminSettings.system.earning_cap_percentage;
    const maintenanceMode = adminSettings.system.maintenance_mode;
    const automaticDailyEarningsProcessing = adminSettings.system.automatic_daily_earnings_processing;
    
    // Check if system is in maintenance mode - if so, skip processing
    if (maintenanceMode) {
      logger.info('System is in maintenance mode - skipping daily earnings processing');
      return {
        success: true,
        processed: 0,
        completed: 0,
        total: 0,
        message: 'Processing skipped due to maintenance mode'
      };
    }
    
    // Check if automatic daily earnings processing is disabled - if so, skip processing
    if (!automaticDailyEarningsProcessing) {
      logger.info('Automatic daily earnings processing is disabled - skipping processing');
      return {
        success: true,
        processed: 0,
        completed: 0,
        total: 0,
        message: 'Processing skipped - automatic daily earnings processing is disabled'
      };
    }
    
    logger.info({ dailyRate, maxDays, earningCapPercentage, maintenanceMode }, 'Using configurable settings from admin panel');
    
    // Get all active licenses
    const activeLicenses = await prisma.userLicense.findMany({
      where: {
        status: 'active'
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            sponsor_id: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            price_usdt: true,
            duration_days: true
          }
        }
      }
    });
    
    logger.info({ count: activeLicenses.length }, 'Found active licenses');
    
    let processedCount = 0;
    let completedLicenses = 0;
    
    for (const license of activeLicenses) {
      try {
        // Calculate principal and current progress
        const principalUSDT = Number(license.product.price_usdt);
        const currentDays = license.days_generated || 0;
        const accruedUSDT = currentDays * (principalUSDT * dailyRate);
        const capUSDT = principalUSDT * earningCapPercentage; // Configurable cap
        
        // Check if license has reached max days or earning cap
        if (currentDays >= maxDays || accruedUSDT >= capUSDT) {
          // Mark license as completed if not already
          if (license.status !== 'completed') {
            await prisma.userLicense.update({
              where: { id: license.id },
              data: { status: 'completed' }
            });
            completedLicenses++;
            
            // Send notification for license completion
            await realTimeNotificationService.sendToUser(license.user_id, {
              type: 'earning',
              title: 'Licencia Completada',
              message: `Tu licencia ${license.product.name} ha sido completada. Total ganado: $${accruedUSDT.toFixed(6)} USDT`,
              severity: 'success',
              metadata: {
                licenseId: license.id,
                productName: license.product.name,
                totalEarned: accruedUSDT.toFixed(6),
                daysCompleted: currentDays
              }
            });
          }
          
          logger.info({ licenseId: license.id, days: currentDays, earned: accruedUSDT, maxDays, capUSDT }, 'License completed - reached limit');
          continue;
        }
        
        // Calculate the correct earning date based on license start date and next day
        const nextDay = currentDays + 1;
        const startDate = new Date(license.started_at);
        const earningDate = new Date(startDate);
        earningDate.setDate(earningDate.getDate() + nextDay - 1);
        earningDate.setHours(0, 0, 0, 0);
        
        // Check if 24 hours have passed since license activation
        const now = new Date();
        const hoursSinceActivation = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60);
        
        // Only process if at least 24 hours have passed since activation
        if (hoursSinceActivation < 24) {
          logger.info({ 
            licenseId: license.id, 
            hoursSinceActivation: hoursSinceActivation.toFixed(2),
            startDate: startDate.toISOString(),
            currentTime: now.toISOString()
          }, 'License activated less than 24 hours ago - skipping earnings processing');
          continue;
        }
        
        // Additional check: ensure earning date is not in the future
        if (earningDate > now) {
          logger.info({ 
            licenseId: license.id, 
            earningDate: earningDate.toISOString(),
            currentTime: now.toISOString()
          }, 'Earning date is in the future - skipping');
          continue;
        }
         
        // Idempotency check: ensure earnings not already processed for this day
        const existingEarning = await prisma.licenseDailyEarning.findFirst({
          where: {
            license_id: license.id,
            earning_date: earningDate
          }
        });
        
        if (existingEarning) {
          logger.info({ licenseId: license.id, existingDay: existingEarning.day_index, earningDate }, 'Earnings already processed for this day - skipping (idempotency)');
          continue;
        }
        
        // Calculate daily earning: 8% of principal
        const dailyAmount = principalUSDT * dailyRate;
        
        // Ensure we don't exceed max days
        if (nextDay > maxDays) {
          logger.info({ licenseId: license.id, nextDay, maxDays }, 'License would exceed max days - marking as completed');
          await prisma.userLicense.update({
            where: { id: license.id },
            data: { status: 'completed' }
          });
          completedLicenses++;
          continue;
        }
        
        // Check if potential should be paused (using flags.pause_potential)
        const licenseFlags = license.flags as any || {};
        const shouldPausePotential = licenseFlags.pause_potential === true;
        
        // Determine if earning should be applied to balance
        const appliedToBalance = !shouldPausePotential;
        
        // Calculate if license will be completed after this earning
        const newAccruedUSDT = nextDay * dailyAmount;
        let licenseCompleted = false;
        
        // Process daily earning
        await prisma.$transaction(async (tx) => {
          // Create daily earning record
          await tx.licenseDailyEarning.create({
            data: {
              license_id: license.id,
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
          
          // Update license with all calculated fields
          await tx.userLicense.update({
            where: { id: license.id },
            data: {
              days_generated: nextDay, // Critical: increment days_generated
               total_earned_usdt: new Decimal(totalEarnedUSDT), // Total accumulated earnings
               cashback_accum: new Decimal(cashbackAccum), // Cashback phase accumulation
               potential_accum: new Decimal(potentialAccum) // Potential phase accumulation
            }
          });
          
          // Check if license should be completed after this earning
          if (nextDay >= maxDays || newAccruedUSDT >= capUSDT) {
            await tx.userLicense.update({
              where: { id: license.id },
              data: { status: 'completed' }
            });
            licenseCompleted = true;
            logger.info({ licenseId: license.id, finalDay: nextDay, finalEarned: newAccruedUSDT }, 'License completed after earning processing');
          }
          
          // Create ledger entry (only if applied to balance)
          if (appliedToBalance) {
            await tx.ledgerEntry.create({
              data: {
                user_id: license.user_id,
                amount: new Decimal(dailyAmount),
                direction: 'credit',
                ref_type: 'earning',
                ref_id: license.id,
                meta: {
                  description: `Daily earning from ${license.product.name} (Day ${nextDay})`,
                  licenseId: license.id,
                  productName: license.product.name,
                  dayIndex: nextDay
                }
              }
            });
          }
        });
        
        // Send notification after successful transaction
        await realTimeNotificationService.sendToUser(license.user_id, {
          type: 'earning',
          title: 'Ganancia Diaria Procesada',
          message: `Se ha procesado tu ganancia diaria de $${dailyAmount.toFixed(6)} USDT para ${license.product.name}`,
          severity: 'success',
          metadata: {
            licenseId: license.id,
            productName: license.product.name,
            day: nextDay,
            dailyAmount: dailyAmount.toFixed(6),
            appliedToBalance: appliedToBalance,
            isPaused: shouldPausePotential
          }
        });
        
        if (licenseCompleted) {
          await realTimeNotificationService.sendToUser(license.user_id, {
            type: 'earning',
            title: 'Licencia Completada',
            message: `Tu licencia ${license.product.name} ha sido completada. Total ganado: $${newAccruedUSDT.toFixed(6)} USDT`,
            severity: 'success',
            metadata: {
              licenseId: license.id,
              productName: license.product.name,
              totalEarned: newAccruedUSDT.toFixed(6),
              daysCompleted: nextDay
            }
          });
        }
        
        if (shouldPausePotential) {
          await realTimeNotificationService.sendToUser(license.user_id, {
            type: 'earning',
            title: 'Licencia Pausada',
            message: `Tu licencia ${license.product.name} ha sido pausada por el administrador`,
            severity: 'warning',
            metadata: {
              licenseId: license.id,
              productName: license.product.name,
              reason: 'License potential paused by admin',
              dailyAmount: dailyAmount.toFixed(6)
            }
          });
        }
        
        processedCount++;
        logger.info({ 
          licenseId: license.id, 
          day: nextDay, 
          dailyAmount: dailyAmount,
          appliedToBalance: appliedToBalance,
          isPaused: shouldPausePotential 
        }, 'Processed daily earning for license');
        
      } catch (error) {
        logger.error({ licenseId: license.id, error }, 'Error processing license');
        // Continue with other licenses
      }
    }
    
    logger.info({ processed: processedCount, completed: completedLicenses, total: activeLicenses.length }, 'Daily earnings processing completed');
    
    return {
      success: true,
      processed: processedCount,
      completed: completedLicenses,
      total: activeLicenses.length
    };
    
  } catch (error) {
    logger.error({ error }, 'Error processing daily earnings');
    throw error;
  } finally {
    // Close Prisma connection
    if (prisma) {
      await prisma.$disconnect();
      logger.info('Prisma connection closed');
    }
  }
}