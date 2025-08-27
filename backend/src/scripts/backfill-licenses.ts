import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { Decimal } from '@prisma/client/runtime/library';
import { adminSettingsService } from '../modules/admin/settings.service';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Backfill script to normalize existing licenses to the new profit engine:
 * - Set days_generated based on existing earnings
 * - Initialize flags.pause_potential to false
 * - Ensure compatibility with 10%/day × 20 days (200% cap) model
 * - Migrate old earnings to new structure
 */

async function backfillLicenses() {
  const prisma = new PrismaClient();
  
  try {
    logger.info('Starting license backfill process for configurable motor...');
    
    // Get all licenses to backfill
    const licensesToBackfill = await prisma.userLicense.findMany({
      include: {
        product: {
          select: {
            price_usdt: true
          }
        }
      }
    });
    
    logger.info({ count: licensesToBackfill.length }, 'Found licenses to backfill');
    
    let processedCount = 0;
    let errorCount = 0;
    
    for (const license of licensesToBackfill) {
      try {
        // Calculate days_generated based on existing earnings
        let daysGenerated = 0;
        
        // Get the highest day_index from existing earnings (updated field name)
        const maxDayEarning = await prisma.licenseDailyEarning.findFirst({
          where: { license_id: license.id },
          orderBy: { day_index: 'desc' }
        });
        daysGenerated = maxDayEarning?.day_index || 0;
        
        // Get admin settings for configurable values
    const adminSettings = await adminSettingsService.getSettings();
    const maxDays = adminSettings.system.max_earning_days;
    const dailyRate = adminSettings.system.daily_earning_rate;
    const earningCapPercentage = adminSettings.system.earning_cap_percentage;
    
    // Ensure days_generated doesn't exceed max configured days
    daysGenerated = Math.min(daysGenerated, maxDays);
        
        // Initialize flags with pause_potential
        const currentFlags = license.flags as any || {};
        const updatedFlags = {
          ...currentFlags,
          pause_potential: currentFlags.pause_potential ?? false
        };
        
        // Calculate progress with new motor
        const principalUSDT = Number(license.product.price_usdt);
        const accruedUSDT = daysGenerated * (principalUSDT * dailyRate); // Configurable daily rate
        const capUSDT = principalUSDT * earningCapPercentage; // Configurable cap
        
        // Determine status based on new rules
        let newStatus = license.status;
        if (daysGenerated >= maxDays || accruedUSDT >= capUSDT) {
          newStatus = 'completed';
        }
        
        // Update license with backfilled data
        await prisma.userLicense.update({
          where: { id: license.id },
          data: {
            days_generated: daysGenerated,
            flags: updatedFlags,
            status: newStatus
          }
        });
        
        processedCount++;
        logger.info({
          licenseId: license.id,
          oldDaysGenerated: license.days_generated,
          newDaysGenerated: daysGenerated,
          oldFlags: license.flags,
          newFlags: updatedFlags,
          oldStatus: license.status,
          newStatus: newStatus,
          principalUSDT: principalUSDT,
          accruedUSDT: accruedUSDT.toFixed(6),
          capUSDT: capUSDT.toFixed(6)
        }, 'Backfilled license');
        
      } catch (error) {
        errorCount++;
        logger.error({
          licenseId: license.id,
          error: (error as Error).message
        }, 'Error backfilling license');
      }
    }
    
    // Summary statistics
    const summary = await prisma.userLicense.groupBy({
      by: ['status'],
      _count: true,
      _avg: {
        days_generated: true
      }
    });
    
    logger.info({
      processed: processedCount,
      errors: errorCount,
      total: licensesToBackfill.length,
      summary: summary.map(s => ({
        status: s.status,
        count: s._count,
        avgDays: s._avg.days_generated
      }))
    }, 'Backfill process completed');
    
    return {
      success: true,
      processed: processedCount,
      errors: errorCount,
      total: licensesToBackfill.length
    };
    
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Backfill process failed');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run backfill if called directly
if (require.main === module) {
  backfillLicenses()
    .then((result) => {
      console.log('Backfill completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Backfill failed:', error);
      process.exit(1);
    });
}

export { backfillLicenses };