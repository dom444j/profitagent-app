import { Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import { blockchainService } from '../services/blockchain';
import { telegramService } from '../services/telegram';
import { realTimeNotificationService } from '../services/real-time-notifications';
import { adminSettingsService } from '../modules/admin/settings.service';
import { logger } from '../utils/logger';

interface ValidationJobData {
  orderId: string;
  retryCount?: number;
}

/**
 * Job to validate blockchain transactions for paid orders
 * This job runs periodically to check orders in 'paid' status
 */
export async function processTransactionValidation(job: Job<ValidationJobData>) {
  const { orderId, retryCount = 0 } = job.data;
  
  try {
    logger.info(`Processing transaction validation for order: ${orderId}`);
    
    // Get order details
    const order = await prisma.orderDeposit.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true
          }
        },
        reserved_wallet: {
          select: {
            address: true
          }
        },
        product: {
          select: {
            name: true,
            price_usdt: true,
            duration_days: true
          }
        }
      }
    });

    if (!order) {
      logger.error(`Order not found: ${orderId}`);
      return;
    }

    if (order.status !== 'paid') {
      logger.info(`Order ${orderId} is not in paid status, skipping validation`);
      return;
    }

    if (!order.tx_hash) {
      logger.error(`Order ${orderId} has no transaction hash`);
      return;
    }

    if (!order.reserved_wallet?.address) {
      logger.error(`Order ${orderId} has no reserved wallet address`);
      return;
    }

    // Validate transaction on blockchain
    const validationResult = await blockchainService.validateUSDTTransaction(
      order.tx_hash,
      order.reserved_wallet.address,
      parseFloat(order.amount_usdt.toString()),
      parseInt(process.env.VALIDATION_TOLERANCE_PERCENT || '1')
    );

    if (validationResult.isValid) {
      // Check if automatic order processing is enabled
      const settings = await adminSettingsService.getSettings();
      
      if (settings.system.automatic_order_processing) {
        // Transaction is valid and auto-processing is enabled, auto-confirm the order
        await autoConfirmOrder(order);
        
        logger.info(`Order ${orderId} auto-confirmed after blockchain validation`);
        
        // Send success notification
        await telegramService.sendOrderAlert('auto_confirmed', {
          id: order.id,
          user_email: order.user.email,
          amount: parseFloat(order.amount_usdt.toString()),
          tx_hash: order.tx_hash,
          product_name: order.product.name,
          validation_result: {
            isValid: validationResult.isValid,
            error: validationResult.error,
            amountUSDT: validationResult.amountUSDT
          }
        });
        
        // Send real-time notification to user
        await realTimeNotificationService.sendOrderNotification('completed', order);
      } else {
        // Auto-processing is disabled, mark for manual review
        logger.info(`Order ${orderId} validated but requires manual confirmation (auto-processing disabled)`);
        
        // Update order to mark it as validated but pending manual confirmation
        await prisma.orderDeposit.update({
          where: { id: orderId },
          data: {
            raw_chain_payload: {
              blockchain_validated: true,
              validated_at: new Date().toISOString(),
              validation_result: {
                isValid: validationResult.isValid,
                error: validationResult.error,
                amountUSDT: validationResult.amountUSDT
              },
              requires_manual_confirmation: true,
              auto_processing_disabled: true
            }
          }
        });
        
        // Send alert to admin for manual confirmation
        await telegramService.sendOrderAlert('manual_confirmation_required', {
          id: order.id,
          user_email: order.user.email,
          amount: parseFloat(order.amount_usdt.toString()),
          tx_hash: order.tx_hash,
          product_name: order.product.name,
          validation_result: {
            isValid: validationResult.isValid,
            error: validationResult.error,
            amountUSDT: validationResult.amountUSDT
          }
        });
      }
      
    } else {
      // Transaction validation failed
      logger.warn(`Transaction validation failed for order ${orderId}: ${validationResult.error}`);
      
      // If this is a temporary error (network issues, etc.), retry
      if (retryCount < 3 && isRetryableError(validationResult.error)) {
        logger.info(`Scheduling retry ${retryCount + 1} for order ${orderId}`);
        throw new Error(`Retryable validation error: ${validationResult.error}`);
      }
      
      // If validation consistently fails, mark for manual review
      await markOrderForManualReview(order, validationResult.error || 'Unknown validation error');
      
      // Send alert to admin
      await telegramService.sendOrderAlert('validation_failed', {
        id: order.id,
        user_email: order.user.email,
        amount: parseFloat(order.amount_usdt.toString()),
        tx_hash: order.tx_hash,
        product_name: order.product.name,
        error: validationResult.error
      });
    }
    
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error), orderId }, 'Transaction validation job failed');
    
    // If this is a retryable error and we haven't exceeded retry limit
    if (retryCount < 3) {
      throw error; // This will trigger BullMQ retry
    }
    
    // Max retries exceeded, mark for manual review
    try {
      const order = await prisma.orderDeposit.findUnique({ where: { id: orderId } });
      if (order) {
        await markOrderForManualReview(order, `Validation job failed after ${retryCount + 1} attempts: ${error instanceof Error ? error.message : String(error)}`);
      }
    } catch (dbError) {
      logger.error({ error: dbError instanceof Error ? dbError.message : String(dbError) }, 'Failed to mark order for manual review');
    }
  }
}

/**
 * Auto-confirm an order after successful blockchain validation
 */
async function autoConfirmOrder(order: any) {
  return await prisma.$transaction(async (tx) => {
    // Update order status to confirmed
    const confirmedOrder = await tx.orderDeposit.update({
      where: { id: order.id },
      data: {
        status: 'confirmed',
        confirmed_at: new Date(),
        // Store validation metadata
        raw_chain_payload: {
          auto_validated: true,
          validated_at: new Date().toISOString(),
          validation_method: 'blockchain_service'
        }
      }
    });

    // Create user license in pending status (requires manual activation)
    const license = await tx.userLicense.create({
      data: {
        user_id: order.user_id,
        product_id: order.product_id,
        order_id: order.id,
        principal_usdt: order.amount_usdt,
        ends_at: new Date(Date.now() + order.product.duration_days * 24 * 60 * 60 * 1000),
        status: 'active'
      }
    });

    // Create ledger entry for purchase
    await tx.ledgerEntry.create({
      data: {
        user_id: order.user_id,
        amount: order.amount_usdt,
        direction: 'debit',
        ref_type: 'order',
        ref_id: order.id,
        meta: {
          description: `License purchase - ${order.product.name} (Auto-validated)`,
          orderId: order.id,
          licenseId: license.id,
          productName: order.product.name
        }
      }
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        actor_user_id: null, // System action
        action: 'auto_confirm_order',
        entity: 'order',
        entity_id: order.id,
        old_values: { status: 'paid' },
        new_values: { status: 'confirmed' },
        diff: { status: { from: 'paid', to: 'confirmed' } },
        ip_address: 'system',
        user_agent: 'blockchain_validation_job'
      }
    });

    return { order: confirmedOrder, license };
  });
}

/**
 * Mark an order for manual review when validation fails
 */
async function markOrderForManualReview(order: any, reason: string) {
  await prisma.orderDeposit.update({
    where: { id: order.id },
    data: {
      raw_chain_payload: {
        validation_failed: true,
        validation_error: reason,
        marked_for_review_at: new Date().toISOString(),
        requires_manual_review: true
      }
    }
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      actor_user_id: null,
      action: 'mark_for_manual_review',
      entity: 'order',
      entity_id: order.id,
      old_values: {},
      new_values: { requires_manual_review: true },
      diff: { validation_error: reason },
      ip_address: 'system',
      user_agent: 'blockchain_validation_job',
      created_at: new Date()
    }
  });
}

/**
 * Check if an error is retryable (network issues, temporary API problems)
 */
function isRetryableError(error?: string): boolean {
  if (!error) return false;
  
  const retryablePatterns = [
    'timeout',
    'network',
    'connection',
    'rate limit',
    'api key',
    'service unavailable',
    'internal server error'
  ];
  
  const errorLower = error.toLowerCase();
  return retryablePatterns.some(pattern => errorLower.includes(pattern));
}

/**
 * Batch job to find and queue orders that need validation
 */
export async function queuePendingValidations() {
  try {
    logger.info('Queuing pending transaction validations...');
    
    // Find orders in 'paid' status that haven't been validated yet
    const ordersToValidate = await prisma.orderDeposit.findMany({
      where: {
        status: 'paid',
        tx_hash: { not: null },
        // Only orders that haven't been marked for manual review
        NOT: {
          raw_chain_payload: {
            path: ['requires_manual_review'],
            equals: true
          }
        }
      },
      select: {
        id: true,
        created_at: true
      },
      orderBy: {
        created_at: 'asc'
      },
      take: 50 // Process in batches
    });

    logger.info(`Found ${ordersToValidate.length} orders to validate`);
    
    return ordersToValidate.map(order => order.id);
    
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error queuing pending validations');
    return [];
  }
}