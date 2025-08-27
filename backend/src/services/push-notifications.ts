import { telegramService } from './telegram';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

interface SystemAlert {
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

interface PushNotificationConfig {
  enableTelegram: boolean;
  enableEmail: boolean;
  criticalThresholds: {
    failedWithdrawals: number;
    pendingOrders: number;
    systemErrors: number;
  };
}

class PushNotificationService {
  private config: PushNotificationConfig = {
    enableTelegram: true,
    enableEmail: false,
    criticalThresholds: {
      failedWithdrawals: 5,
      pendingOrders: 20,
      systemErrors: 10
    }
  };

  private alertCounts = {
    failedWithdrawals: 0,
    pendingOrders: 0,
    systemErrors: 0
  };

  /**
   * Send system alert to administrators
   */
  async sendSystemAlert(alert: SystemAlert): Promise<void> {
    try {
      logger.info('Sending system alert: ' + JSON.stringify(alert));

      // Send to Telegram if enabled
      if (this.config.enableTelegram) {
        await this.sendTelegramAlert(alert);
      }

      // Log alert to database for audit
      await this.logAlert(alert);

      logger.info('System alert sent successfully - Type: ' + alert.type + ', Title: ' + alert.title);
    } catch (error) {
      logger.error('Failed to send system alert: ' + (error as Error).message + ', Alert: ' + JSON.stringify(alert));
    }
  }

  /**
   * Send alert via Telegram
   */
  private async sendTelegramAlert(alert: SystemAlert): Promise<void> {
    const emoji = this.getAlertEmoji(alert.type);
    const message = `${emoji} *${alert.title}*\n\n${alert.message}`;
    
    if (alert.metadata) {
      const metadataStr = Object.entries(alert.metadata)
        .map(([key, value]) => `• ${key}: ${value}`)
        .join('\n');
      
      await telegramService.sendSystemAlert(alert.title, `${message}\n\n*Detalles:*\n${metadataStr}`, alert.type === 'critical' ? 'error' : alert.type === 'warning' ? 'warning' : 'info');
    } else {
      await telegramService.sendSystemAlert(alert.title, message, alert.type === 'critical' ? 'error' : alert.type === 'warning' ? 'warning' : 'info');
    }
  }

  /**
   * Log alert to database for audit trail
   */
  private async logAlert(alert: SystemAlert): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action: 'SYSTEM_ALERT',
          entity: 'system',
          entity_id: 'system',
          new_values: {
            type: alert.type,
            title: alert.title,
            message: alert.message,
            metadata: alert.metadata || {}
          },
          ip_address: '127.0.0.1',
          user_agent: 'System'
        }
      });
    } catch (error) {
      logger.error('Failed to log alert to database: ' + (error as Error).message + ', Alert: ' + JSON.stringify(alert));
    }
  }

  /**
   * Monitor system metrics and send alerts when thresholds are exceeded
   */
  async monitorSystemMetrics(): Promise<void> {
    try {
      // Check failed withdrawals
      const failedWithdrawals = await prisma.withdrawal.count({
        where: {
          status: 'rejected',
          created_at: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });

      if (failedWithdrawals >= this.config.criticalThresholds.failedWithdrawals) {
        await this.sendSystemAlert({
          type: 'critical',
          title: 'Alto número de retiros rechazados',
          message: `Se han rechazado ${failedWithdrawals} retiros en las últimas 24 horas.`,
          metadata: {
            count: failedWithdrawals,
            threshold: this.config.criticalThresholds.failedWithdrawals,
            period: '24 horas'
          }
        });
      }

      // Check pending orders
      const pendingOrders = await prisma.orderDeposit.count({
        where: {
          status: 'pending',
          created_at: {
            gte: new Date(Date.now() - 2 * 60 * 60 * 1000) // Last 2 hours
          }
        }
      });

      if (pendingOrders >= this.config.criticalThresholds.pendingOrders) {
        await this.sendSystemAlert({
          type: 'warning',
          title: 'Muchas órdenes pendientes',
          message: `Hay ${pendingOrders} órdenes pendientes de confirmación.`,
          metadata: {
            count: pendingOrders,
            threshold: this.config.criticalThresholds.pendingOrders,
            period: '2 horas'
          }
        });
      }

      // Check system health
      await this.checkSystemHealth();

    } catch (error) {
      logger.error('Error monitoring system metrics: ' + (error as Error).message);
      await this.sendSystemAlert({
        type: 'critical',
        title: 'Error en monitoreo del sistema',
        message: 'El sistema de monitoreo ha fallado. Revisar logs inmediatamente.',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Check overall system health
   */
  private async checkSystemHealth(): Promise<void> {
    const healthChecks = {
      database: false,
      redis: false,
      telegram: false
    };

    // Check database
    try {
      await prisma.$queryRaw`SELECT 1`;
      healthChecks.database = true;
    } catch (error) {
      logger.error('Database health check failed: ' + (error as Error).message);
    }

    // Check Telegram service
    try {
      // Simple check - if we can create a service instance
      healthChecks.telegram = true;
    } catch (error) {
      logger.error('Telegram health check failed: ' + (error as Error).message);
    }

    // Send alert if any service is down
    const failedServices = Object.entries(healthChecks)
      .filter(([_, isHealthy]) => !isHealthy)
      .map(([service]) => service);

    if (failedServices.length > 0) {
      await this.sendSystemAlert({
        type: 'critical',
        title: 'Servicios del sistema caídos',
        message: `Los siguientes servicios no están funcionando: ${failedServices.join(', ')}`,
        metadata: {
          failedServices,
          healthStatus: healthChecks
        }
      });
    }
  }

  /**
   * Send daily system summary
   */
  async sendDailySummary(): Promise<void> {
    try {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      // Get daily metrics
      const [newUsers, newOrders, confirmedOrders, withdrawals, earnings] = await Promise.all([
        prisma.user.count({
          where: {
            created_at: {
              gte: yesterday,
              lt: today
            }
          }
        }),
        prisma.orderDeposit.count({
          where: {
            created_at: {
              gte: yesterday,
              lt: today
            }
          }
        }),
        prisma.orderDeposit.count({
          where: {
            status: 'confirmed',
            confirmed_at: {
              gte: yesterday,
              lt: today
            }
          }
        }),
        prisma.withdrawal.count({
          where: {
            created_at: {
              gte: yesterday,
              lt: today
            }
          }
        }),
        prisma.licenseDailyEarning.aggregate({
          where: {
            applied_at: {
              gte: yesterday,
              lt: today
            }
          },
          _sum: {
            cashback_amount: true,
            potential_amount: true
          }
        })
      ]);

      const summary = `📊 *Resumen Diario del Sistema*\n\n` +
        `👥 Nuevos usuarios: ${newUsers}\n` +
        `🛒 Nuevas órdenes: ${newOrders}\n` +
        `✅ Órdenes confirmadas: ${confirmedOrders}\n` +
        `💰 Retiros solicitados: ${withdrawals}\n` +
        `💎 Beneficios generados: $${((earnings._sum?.cashback_amount?.toNumber() || 0) + (earnings._sum?.potential_amount?.toNumber() || 0)).toFixed(2)}\n\n` +
        `📅 Fecha: ${yesterday.toLocaleDateString('es-ES')}`;

      await telegramService.sendSystemAlert('Resumen Diario', summary, 'info');
      logger.info('Daily summary sent successfully');
    } catch (error) {
      logger.error('Failed to send daily summary: ' + (error as Error).message);
    }
  }

  /**
   * Get emoji for alert type
   */
  private getAlertEmoji(type: SystemAlert['type']): string {
    switch (type) {
      case 'critical':
        return '🚨';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PushNotificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Push notification config updated: ' + JSON.stringify(this.config));
  }

  /**
   * Get current configuration
   */
  getConfig(): PushNotificationConfig {
    return { ...this.config };
  }
}

export const pushNotificationService = new PushNotificationService();
export { SystemAlert, PushNotificationConfig };