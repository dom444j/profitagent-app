import { sseService } from './sse';
import { telegramService } from './telegram';
import { userNotificationSettingsService } from './user-notification-settings';
import { logger } from '../utils/logger';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export interface NotificationData {
  id: string;
  type: 'withdrawal' | 'order' | 'system' | 'security' | 'bonus' | 'earning' | 'referral';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  userId?: string;
  adminOnly?: boolean;
  metadata?: Record<string, any>;
  timestamp: Date;
  readAt?: Date | null;
}

export interface SystemAlert {
  type: 'high_pending_withdrawals' | 'failed_orders' | 'system_error' | 'security_breach';
  count?: number;
  details: string;
  severity: 'warning' | 'error';
}

class RealTimeNotificationService {
  private notificationHistory: NotificationData[] = [];
  private readonly MAX_HISTORY = 100;

  /**
   * Send notification to specific user via SSE
   */
  async sendToUser(userId: string, notification: Omit<NotificationData, 'id' | 'timestamp'>) {
    const fullNotification: NotificationData = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    // Check if user has this notification type enabled
    const isEnabled = await userNotificationSettingsService.isNotificationEnabled(
      userId, 
      notification.type as any, 
      'push'
    );

    // Always persist to database regardless of user settings
    await this.persistNotification(fullNotification, userId);

    // Add to memory history (for backward compatibility)
    this.addToHistory(fullNotification);

    // Only send via SSE if user has notifications enabled
    if (isEnabled) {
      sseService.sendToUser(userId, {
        type: 'orderUpdated',
        data: fullNotification
      });
    } else {
      logger.info('Notification skipped - user has disabled this type', { userId, notificationType: notification.type });
    }

    logger.info('Notification sent to user', { userId, notification: fullNotification });
  }

  /**
   * Get paginated notification history with filters
   */
  async getNotificationHistoryPaginated(
    userId?: string, 
    adminOnly: boolean = false, 
    options: {
      page?: number;
      limit?: number;
      offset?: number;
      type?: string;
      read?: boolean;
    } = {}
  ): Promise<{ notifications: NotificationData[]; total: number }> {
    try {
      const whereClause: any = {};
      
      if (userId && !adminOnly) {
        whereClause.user_id = userId;
      }
      
      if (options.type) {
        whereClause.type = options.type;
      }
      
      if (options.read !== undefined) {
        if (options.read) {
          whereClause.read_at = { not: null };
        } else {
          whereClause.read_at = null;
        }
      }
      
      // Get total count
      const total = await prisma.notification.count({
        where: whereClause
      });
      
      // Define the type for notifications with user relation
      type NotificationWithUser = Prisma.NotificationGetPayload<{
        include: {
          user: {
            select: {
              id: true;
              role: true;
            }
          }
        }
      }>;
      
      // Get paginated results
      const dbNotifications: NotificationWithUser[] = await prisma.notification.findMany({
        where: whereClause,
        orderBy: { created_at: 'desc' },
        skip: options.offset || 0,
        take: options.limit || 10,
        include: {
          user: {
            select: {
              id: true,
              role: true
            }
          }
        }
      });

      const notifications = dbNotifications
        .filter(notif => {
          if (adminOnly && (!notif.user || notif.user.role !== 'admin')) return false;
          return true;
        })
        .map(notif => ({
          id: notif.id,
          type: notif.type as NotificationData['type'],
          title: notif.title,
          message: notif.message,
          severity: notif.severity as NotificationData['severity'],
          userId: notif.user_id,
          adminOnly: notif.user?.role === 'admin' || false,
          metadata: notif.meta as Record<string, any> || {},
          timestamp: notif.created_at,
          readAt: notif.read_at
        }));
        
      return { notifications, total };
    } catch (error) {
      logger.error('Error fetching paginated notification history from database', { error, userId, adminOnly, options });
      // Fallback to memory history
      const memoryNotifications = this.getMemoryNotificationHistory(userId, adminOnly);
      return { 
        notifications: memoryNotifications.slice(options.offset || 0, (options.offset || 0) + (options.limit || 10)), 
        total: memoryNotifications.length 
      };
    }
   }

  /**
   * Send notification to all admins via SSE
   */
  async sendToAdmins(notification: Omit<NotificationData, 'id' | 'timestamp'>) {
    const fullNotification: NotificationData = {
      ...notification,
      id: `admin_notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      adminOnly: true,
      timestamp: new Date()
    };

    // Get all admin users
    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { id: true }
    });

    // Persist to database for all admin users
    for (const admin of admins) {
      await this.persistNotification(fullNotification, admin.id);
    }

    // Add to memory history (for backward compatibility)
    this.addToHistory(fullNotification);

    // Send via SSE to all admins
    sseService.sendToAdmins({
      type: 'orderUpdated',
      data: fullNotification
    });

    // Send to Telegram if configured
    if (notification.severity === 'error' || notification.severity === 'warning') {
      try {
        await telegramService.sendSystemAlert(
          notification.title,
          notification.message,
          notification.severity === 'error' ? 'error' : 'warning'
        );
      } catch (error) {
        logger.error('Failed to send Telegram alert', { error });
      }
    }

    logger.info('Notification sent to all admins', { notification: fullNotification, adminCount: admins.length });
  }

  /**
   * Send system alert to admins and Telegram
   */
  async sendSystemAlert(alert: SystemAlert) {
    const notification = {
      type: 'system' as const,
      title: this.getAlertTitle(alert.type),
      message: alert.details,
      severity: alert.severity,
      metadata: { alertType: alert.type, count: alert.count }
    };

    // Send to admins
    await this.sendToAdmins(notification);

    // Send to Telegram
    try {
      await telegramService.sendSystemAlert(
        this.getAlertTitle(alert.type),
        this.formatTelegramAlert(alert),
        alert.severity === 'error' ? 'error' : 'warning'
      );
    } catch (error) {
      logger.error('Failed to send system alert to Telegram', { error, alert });
    }
  }

  /**
   * Send withdrawal notification
   */
  async sendWithdrawalNotification(type: 'requested' | 'approved' | 'paid' | 'rejected', withdrawalData: any) {
    const notification = {
      type: 'withdrawal' as const,
      title: this.getWithdrawalTitle(type),
      message: this.getWithdrawalMessage(type, withdrawalData),
      severity: type === 'rejected' ? 'error' as const : 'info' as const,
      metadata: { withdrawalId: withdrawalData.id, amount: withdrawalData.amount_usdt }
    };

    if (withdrawalData.user_id) {
      await this.sendToUser(withdrawalData.user_id, notification);
    } else {
      await this.sendToAdmins(notification);
    }
  }

  /**
   * Send order notification
   */
  async sendOrderNotification(type: 'created' | 'expired' | 'completed', orderData: any) {
    const notification = {
      type: 'order' as const,
      title: this.getOrderTitle(type),
      message: this.getOrderMessage(type, orderData),
      severity: type === 'expired' ? 'warning' as const : 'success' as const
    };

    await this.sendToUser(orderData.user_id, notification);
  }

  /**
   * Send bonus notification
   */
  async sendBonusNotification(type: 'earned' | 'referral', bonusData: any) {
    const notification = {
      type: type === 'referral' ? 'referral' as const : 'earning' as const,
      title: type === 'referral' ? 'Bonus de Referido' : 'Beneficio Diario',
      message: type === 'referral' 
        ? `Has recibido un bonus de $${bonusData.amount} USDT por referir a un nuevo usuario.`
        : `Has recibido $${bonusData.amount} USDT de beneficios diarios.`,
      severity: 'success' as const,
      metadata: { bonusId: bonusData.id, amount: bonusData.amount }
    };

    await this.sendToUser(bonusData.user_id, notification);
  }

  /**
   * Get notification history for user from database (legacy method)
   */
  async getNotificationHistory(userId?: string, adminOnly: boolean = false, limit: number = 50): Promise<NotificationData[]> {
    try {
      const whereClause: any = {};
      
      if (userId && !adminOnly) {
        whereClause.user_id = userId;
      }
      
      const dbNotifications = await prisma.notification.findMany({
        where: whereClause,
        orderBy: { created_at: 'desc' },
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              role: true
            }
          }
        }
      });

      return dbNotifications
        .filter(notif => {
          if (adminOnly && notif.user.role !== 'admin') return false;
          return true;
        })
        .map(notif => ({
          id: notif.id,
          type: notif.type as NotificationData['type'],
          title: notif.title,
          message: notif.message,
          severity: notif.severity as NotificationData['severity'],
          userId: notif.user_id,
          adminOnly: notif.user.role === 'admin',
          metadata: notif.meta as Record<string, any> || {},
          timestamp: notif.created_at,
          readAt: notif.read_at
        }));
    } catch (error) {
      logger.error('Error fetching notification history from database', { error, userId, adminOnly });
      // Fallback to memory history
      return this.getMemoryNotificationHistory(userId, adminOnly);
    }
  }

  /**
   * Clear old notifications from history
   */
  private addToHistory(notification: NotificationData) {
    this.notificationHistory.unshift(notification);
    if (this.notificationHistory.length > this.MAX_HISTORY) {
      this.notificationHistory = this.notificationHistory.slice(0, this.MAX_HISTORY);
    }
  }

  /**
   * Persist notification to database
   */
  private async persistNotification(notification: NotificationData, userId: string) {
    try {
      await prisma.notification.create({
        data: {
          id: notification.id,
          user_id: userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          severity: notification.severity,
          meta: notification.metadata || {},
          read_at: notification.readAt || null
        }
      });
    } catch (error) {
      logger.error('Error persisting notification to database', { error, notification, userId });
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          id: notificationId,
          user_id: userId
        },
        data: {
          read_at: new Date()
        }
      });
      
      return result.count > 0;
    } catch (error) {
      logger.error('Error marking notification as read', { error, notificationId, userId });
      return false;
    }
  }

  /**
   * Fallback method to get notifications from memory
   */
  private getMemoryNotificationHistory(userId?: string, adminOnly: boolean = false): NotificationData[] {
    return this.notificationHistory
      .filter(notif => {
        if (adminOnly && !notif.adminOnly) return false;
        if (userId && notif.userId !== userId && !notif.adminOnly) return false;
        return true;
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 50);
  }

  private getAlertTitle(type: SystemAlert['type']): string {
    const titles: Record<string, string> = {
      high_pending_withdrawals: 'Retiros Pendientes Altos',
      failed_orders: 'Órdenes Fallidas',
      system_error: 'Error del Sistema',
      security_breach: 'Brecha de Seguridad'
    };
    return titles[type] || 'Alerta del Sistema';
  }

  private getWithdrawalTitle(type: string): string {
    const titles: Record<string, string> = {
      requested: 'Retiro Solicitado',
      approved: 'Retiro Aprobado',
      paid: 'Retiro Pagado',
      rejected: 'Retiro Rechazado'
    };
    return titles[type] || 'Notificación de Retiro';
  }

  private getWithdrawalMessage(type: string, data: any): string {
    const amount = data.amount_usdt || data.amount || 0;
    const messages: Record<string, string> = {
      requested: `Se ha solicitado un retiro de $${Number(amount).toFixed(2)} USDT.`,
      approved: `Tu retiro de $${Number(amount).toFixed(2)} USDT ha sido aprobado.`,
      paid: `Tu retiro de $${Number(amount).toFixed(2)} USDT ha sido procesado exitosamente.`,
      rejected: `Tu retiro de $${Number(amount).toFixed(2)} USDT ha sido rechazado.`
    };
    return messages[type] || 'Actualización de retiro';
  }

  private getOrderTitle(type: string): string {
    const titles: Record<string, string> = {
      created: 'Orden Creada',
      expired: 'Orden Expirada',
      completed: 'Orden Completada'
    };
    return titles[type] || 'Notificación de Orden';
  }

  private getOrderMessage(type: string, data: any): string {
    const messages: Record<string, string> = {
      created: `Nueva orden creada por $${data.amount_usdt} USDT.`,
      expired: `Tu orden de $${data.amount_usdt} USDT ha expirado.`,
      completed: `Tu orden de $${data.amount_usdt} USDT ha sido completada exitosamente.`
    };
    return messages[type] || 'Actualización de orden';
  }

  private formatTelegramAlert(alert: SystemAlert): string {
    const emoji = alert.severity === 'error' ? '🚨' : '⚠️';
    let message = `${emoji} *${this.getAlertTitle(alert.type)}*\n\n`;
    message += `📝 ${alert.details}\n`;
    if (alert.count) {
      message += `📊 Cantidad: ${alert.count}\n`;
    }
    message += `⏰ ${new Date().toLocaleString('es-ES', { timeZone: 'America/Bogota' })}`;
    return message;
  }
}

export const realTimeNotificationService = new RealTimeNotificationService();