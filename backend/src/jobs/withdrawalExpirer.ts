import { Job } from 'bullmq';
import { WithdrawalService } from '../modules/withdrawals/service';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

const withdrawalService = new WithdrawalService();

export async function processWithdrawalExpirer(job: Job) {
  try {
    // Find withdrawals that are older than 24 hours and still in requested or otp_sent status
    const expiredWithdrawals = await prisma.withdrawal.findMany({
      where: {
        status: {
          in: ['requested', 'otp_sent']
        },
        created_at: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
        }
      },
      include: {
        user: true
      }
    });

    logger.info(`Found ${expiredWithdrawals.length} expired withdrawals to process`);

    for (const withdrawal of expiredWithdrawals) {
      try {
        // Use transaction to ensure consistency
        await prisma.$transaction(async (tx) => {
          // Update withdrawal status to expired
          await tx.withdrawal.update({
            where: { id: withdrawal.id },
            data: {
              status: 'expired',
              notes: 'Automatically expired after 24 hours'
            }
          });

          // Restore the balance to user (since withdrawal expired)
          // Create ledger entry for the expiration (credit back)
          await tx.ledgerEntry.create({
            data: {
              user_id: withdrawal.user_id,
              direction: 'credit',
              amount: withdrawal.amount_usdt,
              available_balance_after: 0, // Will be calculated by balance service
              ref_type: 'withdrawal',
              ref_id: withdrawal.id,
              meta: {
                expiration_reason: 'Automatically expired after 24 hours',
                expired_at: new Date(),
                original_withdrawal_id: withdrawal.id
              }
            }
          });

          // Log the action
          await tx.auditLog.create({
            data: {
              action: 'WITHDRAWAL_EXPIRED',
              entity: 'Withdrawal',
              entity_id: withdrawal.id,
              new_values: { 
                reason: 'Automatic expiration after 24 hours',
                amount_restored: withdrawal.amount_usdt.toString(),
                user_id: withdrawal.user_id
              }
            }
          });
        });

        logger.info(`Withdrawal ${withdrawal.id} expired and balance restored for user ${withdrawal.user_id}`);
      } catch (error) {
        logger.error(`Failed to expire withdrawal ${withdrawal.id}:`, error);
        // Continue with other withdrawals even if one fails
      }
    }

    logger.info(`Processed ${expiredWithdrawals.length} expired withdrawals`);
  } catch (error) {
    logger.error('Failed to process withdrawal expirer job:', error);
    throw error;
  }
}