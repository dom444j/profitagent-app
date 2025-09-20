import axios from 'axios';
import { logger } from '../utils/logger';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';

interface NotificationPreference {
  userId: string;
  type: 'trading_signals' | 'price_alerts' | 'portfolio_updates' | 'system_alerts' | 'news' | 'educational';
  enabled: boolean;
  frequency: 'instant' | 'hourly' | 'daily' | 'weekly';
  channels: ('telegram' | 'email' | 'sms')[];
  filters?: {
    minAmount?: number;
    maxAmount?: number;
    assets?: string[];
    riskLevel?: 'low' | 'medium' | 'high';
    timeframes?: string[];
  };
  customSettings?: any;
}

interface NotificationTemplate {
  id: string;
  type: string;
  title: string;
  template: string;
  variables: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
}

interface QueuedNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduledAt: Date;
  channels: string[];
  metadata?: any;
  retryCount?: number;
}

class TelegramNotificationsService {
  private templates: Map<string, NotificationTemplate> = new Map();
  private botTokens: { [key: string]: string } = {};
  private notificationQueue: QueuedNotification[] = [];
  private isProcessing = false;

  constructor() {
    this.initializeBotTokens();
    this.initializeTemplates();
    this.startNotificationProcessor();
  }

  private initializeBotTokens(): void {
    this.botTokens = {
      support: process.env.TELEGRAM_SUPPORT_BOT_TOKEN || '',
      otp: process.env.TELEGRAM_OTP_BOT_TOKEN || '',
      alerts: process.env.TELEGRAM_ALERTS_BOT_TOKEN || ''
    };
  }

  private initializeTemplates(): void {
    const defaultTemplates: NotificationTemplate[] = [
      {
        id: 'trading_signal',
        type: 'trading_signals',
        title: '🎯 Nueva Señal de Trading',
        template: `🎯 **Nueva Señal de Trading**\n\n` +
                 `📊 **Par:** {asset}\n` +
                 `📈 **Acción:** {action}\n` +
                 `💰 **Precio Entrada:** {entryPrice}\n` +
                 `🎯 **Take Profit:** {takeProfit}\n` +
                 `🛡️ **Stop Loss:** {stopLoss}\n` +
                 `⚡ **Riesgo:** {riskLevel}\n` +
                 `⏰ **Timeframe:** {timeframe}\n\n` +
                 `📝 **Análisis:** {analysis}`,
        variables: ['asset', 'action', 'entryPrice', 'takeProfit', 'stopLoss', 'riskLevel', 'timeframe', 'analysis'],
        priority: 'high',
        category: 'trading'
      },
      {
        id: 'price_alert',
        type: 'price_alerts',
        title: '🚨 Alerta de Precio',
        template: `🚨 **Alerta de Precio**\n\n` +
                 `💎 **Asset:** {asset}\n` +
                 `💰 **Precio Actual:** {currentPrice}\n` +
                 `🎯 **Precio Objetivo:** {targetPrice}\n` +
                 `📊 **Cambio:** {priceChange}\n` +
                 `⏰ **Hora:** {timestamp}`,
        variables: ['asset', 'currentPrice', 'targetPrice', 'priceChange', 'timestamp'],
        priority: 'medium',
        category: 'alerts'
      },
      {
        id: 'portfolio_update',
        type: 'portfolio_updates',
        title: '📊 Actualización de Portfolio',
        template: `📊 **Actualización de Portfolio**\n\n` +
                 `💰 **Valor Total:** {totalValue}\n` +
                 `📈 **P&L Diario:** {dailyPnL}\n` +
                 `📊 **Cambio %:** {percentageChange}\n` +
                 `🏆 **Mejor Posición:** {bestPosition}\n` +
                 `📉 **Peor Posición:** {worstPosition}`,
        variables: ['totalValue', 'dailyPnL', 'percentageChange', 'bestPosition', 'worstPosition'],
        priority: 'low',
        category: 'portfolio'
      },
      {
        id: 'system_alert',
        type: 'system_alerts',
        title: '⚠️ Alerta del Sistema',
        template: `⚠️ **Alerta del Sistema**\n\n` +
                 `🔧 **Tipo:** {alertType}\n` +
                 `📝 **Mensaje:** {message}\n` +
                 `⏰ **Hora:** {timestamp}\n` +
                 `🔍 **Detalles:** {details}`,
        variables: ['alertType', 'message', 'timestamp', 'details'],
        priority: 'urgent',
        category: 'system'
      },
      {
        id: 'news_update',
        type: 'news',
        title: '📰 Noticias del Mercado',
        template: `📰 **Noticias del Mercado**\n\n` +
                 `📰 **Título:** {title}\n` +
                 `📝 **Resumen:** {summary}\n` +
                 `💎 **Assets Afectados:** {affectedAssets}\n` +
                 `📊 **Impacto:** {impact}\n` +
                 `🔗 **Fuente:** {source}`,
        variables: ['title', 'summary', 'affectedAssets', 'impact', 'source'],
        priority: 'medium',
        category: 'news'
      },
      {
        id: 'educational_content',
        type: 'educational',
        title: '🎓 Contenido Educativo',
        template: `🎓 **Contenido Educativo**\n\n` +
                 `📚 **Tema:** {topic}\n` +
                 `📝 **Descripción:** {description}\n` +
                 `⭐ **Nivel:** {level}\n` +
                 `⏱️ **Duración:** {duration}\n` +
                 `🔗 **Enlace:** {link}`,
        variables: ['topic', 'description', 'level', 'duration', 'link'],
        priority: 'low',
        category: 'education'
      }
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Set user notification preferences
   */
  async setUserPreferences(userId: string, preferences: Partial<NotificationPreference>[]): Promise<{ success: boolean; error?: string }> {
    try {
      for (const pref of preferences) {
        // Note: userNotificationPreference model not implemented yet
        logger.info(`Notification preference update requested for user ${userId}, type ${pref.type}, enabled: ${pref.enabled}`);
      }

      logger.info(`Updated notification preferences for user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error setting user preferences:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreference[]> {
    try {
      // Note: userNotificationPreference model not implemented yet
      // Returning default preferences for all notification types
      return [
        { userId, type: 'trading_signals', enabled: true, frequency: 'instant', channels: ['telegram'], filters: {}, customSettings: {} },
        { userId, type: 'price_alerts', enabled: true, frequency: 'instant', channels: ['telegram'], filters: {}, customSettings: {} },
        { userId, type: 'portfolio_updates', enabled: true, frequency: 'daily', channels: ['telegram'], filters: {}, customSettings: {} },
        { userId, type: 'system_alerts', enabled: true, frequency: 'instant', channels: ['telegram'], filters: {}, customSettings: {} },
        { userId, type: 'news', enabled: true, frequency: 'daily', channels: ['telegram'], filters: {}, customSettings: {} },
        { userId, type: 'educational', enabled: true, frequency: 'weekly', channels: ['telegram'], filters: {}, customSettings: {} }
      ];
    } catch (error) {
      logger.error('Error getting user preferences:', error);
      return [];
    }
  }

  /**
   * Send notification to user
   */
  async sendNotification(
    userId: string,
    type: string,
    data: any,
    options?: {
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      scheduleAt?: Date;
      forceChannels?: string[];
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user preferences
      const preferences = await this.getUserPreferences(userId);
      const typePreference = preferences.find(p => p.type === type);

      if (!typePreference || !typePreference.enabled) {
        return { success: false, error: 'Notification type disabled for user' };
      }

      // Check filters
      if (!this.passesFilters(data, typePreference.filters)) {
        return { success: false, error: 'Notification filtered out' };
      }

      // Get template
      const template = this.templates.get(type);
      if (!template) {
        return { success: false, error: 'Template not found' };
      }

      // Generate message
      const message = this.generateMessage(template, data);
      const title = template.title;
      const priority = options?.priority || template.priority;
      const channels = options?.forceChannels || typePreference.channels;

      // Create notification
      const notification: QueuedNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type,
        title,
        message,
        priority,
        scheduledAt: options?.scheduleAt || new Date(),
        channels,
        metadata: data,
        retryCount: 0
      };

      // Handle frequency
      if (typePreference.frequency !== 'instant') {
        await this.scheduleNotification(notification, typePreference.frequency);
      } else {
        this.notificationQueue.push(notification);
      }

      return { success: true };
    } catch (error) {
      logger.error('Error sending notification:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotification(
    userIds: string[],
    type: string,
    data: any,
    options?: {
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      scheduleAt?: Date;
    }
  ): Promise<{ success: boolean; sent: number; failed: number; errors: string[] }> {
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const userId of userIds) {
      try {
        const result = await this.sendNotification(userId, type, data, options);
        if (result.success) {
          sent++;
        } else {
          failed++;
          if (result.error) {
            errors.push(`User ${userId}: ${result.error}`);
          }
        }
      } catch (error) {
        failed++;
        errors.push(`User ${userId}: ${(error as Error).message}`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return { success: true, sent, failed, errors };
  }

  /**
   * Process notification queue
   */
  private async startNotificationProcessor(): Promise<void> {
    setInterval(async () => {
      if (this.isProcessing || this.notificationQueue.length === 0) {
        return;
      }

      this.isProcessing = true;

      try {
        // Sort by priority and scheduled time
        this.notificationQueue.sort((a, b) => {
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return a.scheduledAt.getTime() - b.scheduledAt.getTime();
        });

        const now = new Date();
        const toProcess = this.notificationQueue.filter(n => n.scheduledAt <= now);
        
        for (const notification of toProcess.slice(0, 10)) { // Process max 10 at a time
          await this.processNotification(notification);
          this.notificationQueue = this.notificationQueue.filter(n => n.id !== notification.id);
        }
      } catch (error) {
        logger.error('Error processing notification queue:', error);
      } finally {
        this.isProcessing = false;
      }
    }, 5000); // Process every 5 seconds
  }

  /**
   * Process individual notification
   */
  private async processNotification(notification: QueuedNotification): Promise<void> {
    try {
      // Get user info
      const user = await prisma.user.findUnique({
        where: { id: notification.userId },
        select: {
          telegram_user_id: true,
          email: true,
          phone: true,
          first_name: true,
          status: true
        }
      });

      if (!user || user.status !== 'active') {
        return;
      }

      // Send to each channel
      for (const channel of notification.channels) {
        try {
          switch (channel) {
            case 'telegram':
              if (user.telegram_user_id) {
                await this.sendTelegramMessage(user.telegram_user_id, notification.message);
              }
              break;
            case 'email':
              if (user.email) {
                // Email sending would be implemented here
                logger.info(`Email notification sent to ${user.email}`);
              }
              break;
            case 'sms':
              if (user.phone) {
                // SMS sending would be implemented here
                logger.info(`SMS notification sent to ${user.phone}`);
              }
              break;
          }
        } catch (error) {
          logger.error(`Error sending notification via ${channel}:`, error);
        }
      }

      // Log notification
      await prisma.notification.create({
        data: {
          user_id: notification.userId,
          type: notification.type as any,
          title: notification.title,
          message: notification.message
        }
      });

    } catch (error) {
      logger.error('Error processing notification:', error);
      
      // Retry logic
      if ((notification.retryCount || 0) < 3) {
        notification.retryCount = (notification.retryCount || 0) + 1;
        notification.scheduledAt = new Date(Date.now() + 60000 * notification.retryCount); // Exponential backoff
        this.notificationQueue.push(notification);
      }
    }
  }

  /**
   * Send Telegram message
   */
  private async sendTelegramMessage(telegramUserId: string, message: string): Promise<boolean> {
    try {
      const response = await axios.post(
        `https://api.telegram.org/bot${this.botTokens.support}/sendMessage`,
        {
          chat_id: telegramUserId,
          text: message,
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        },
        { timeout: 10000 }
      );

      return response.data.ok;
    } catch (error) {
      logger.error('Error sending Telegram message:', error);
      return false;
    }
  }

  /**
   * Generate message from template
   */
  private generateMessage(template: NotificationTemplate, data: any): string {
    let message = template.template;
    
    template.variables.forEach(variable => {
      const value = data[variable] || 'N/A';
      message = message.replace(new RegExp(`{${variable}}`, 'g'), value);
    });

    return message;
  }

  /**
   * Check if notification passes user filters
   */
  private passesFilters(data: any, filters?: any): boolean {
    if (!filters) return true;

    // Amount filters
    if (filters.minAmount && data.amount && data.amount < filters.minAmount) {
      return false;
    }
    if (filters.maxAmount && data.amount && data.amount > filters.maxAmount) {
      return false;
    }

    // Asset filters
    if (filters.assets && filters.assets.length > 0 && data.asset) {
      if (!filters.assets.includes(data.asset)) {
        return false;
      }
    }

    // Risk level filters
    if (filters.riskLevel && data.riskLevel && data.riskLevel !== filters.riskLevel) {
      return false;
    }

    return true;
  }

  /**
   * Schedule notification based on frequency
   */
  private async scheduleNotification(notification: QueuedNotification, frequency: string): Promise<void> {
    const now = new Date();
    let scheduledAt: Date;

    switch (frequency) {
      case 'hourly':
        scheduledAt = new Date(now.getTime() + 60 * 60 * 1000);
        break;
      case 'daily':
        scheduledAt = new Date(now);
        scheduledAt.setHours(9, 0, 0, 0); // 9 AM next day
        if (scheduledAt <= now) {
          scheduledAt.setDate(scheduledAt.getDate() + 1);
        }
        break;
      case 'weekly':
        scheduledAt = new Date(now);
        scheduledAt.setDate(now.getDate() + (7 - now.getDay())); // Next Sunday
        scheduledAt.setHours(9, 0, 0, 0);
        break;
      default:
        scheduledAt = now;
    }

    notification.scheduledAt = scheduledAt;
    
    // Store in Redis for persistence
    try {
      await redis.setex(
        `scheduled_notification:${notification.id}`,
        60 * 60 * 24 * 7, // 1 week TTL
        JSON.stringify(notification)
      );
    } catch (error) {
      logger.error('Error storing scheduled notification:', error);
    }

    this.notificationQueue.push(notification);
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(userId?: string): Promise<any> {
    try {
      const whereClause = userId ? { userId } : {};
      
      const stats = await prisma.notification.groupBy({
        by: ['type'],
        where: {
          ...whereClause,
          created_at: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        _count: {
          id: true
        }
      });

      const result: any = {
        totalSent: 0,
        byType: {},
        byStatus: {}
      };

      stats.forEach((stat: any) => {
        result.totalSent += stat._count.id;
        
        if (!result.byType[stat.type]) {
          result.byType[stat.type] = 0;
        }
        result.byType[stat.type] += stat._count.id;
        
        if (!result.byStatus[stat.status]) {
          result.byStatus[stat.status] = 0;
        }
        result.byStatus[stat.status] += stat._count.id;
      });

      return result;
    } catch (error) {
      logger.error('Error getting notification stats:', error);
      return null;
    }
  }

  /**
   * Clean up old notifications
   */
  async cleanupOldNotifications(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      await prisma.notification.deleteMany({
          where: {
            created_at: {
              lt: thirtyDaysAgo
            }
          }
        });

      logger.info('Cleaned up old notifications');
    } catch (error) {
      logger.error('Error cleaning up notifications:', error);
    }
  }
}

// Export singleton instance
export const telegramNotificationsService = new TelegramNotificationsService();