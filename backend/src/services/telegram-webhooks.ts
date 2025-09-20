import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { prisma } from '../lib/prisma';
import { telegramCommunicationService } from './telegram-communication';
import { telegramChannelsService } from './telegram-channels';
import { telegramNotificationsService } from './telegram-notifications';

interface WebhookConfig {
  botToken: string;
  botType: 'support' | 'otp' | 'alerts' | 'communication';
  url: string;
  secretToken?: string;
  maxConnections?: number;
  allowedUpdates?: string[];
  dropPendingUpdates?: boolean;
}

interface TelegramUpdate {
  update_id: number;
  message?: any;
  edited_message?: any;
  channel_post?: any;
  edited_channel_post?: any;
  inline_query?: any;
  chosen_inline_result?: any;
  callback_query?: any;
  shipping_query?: any;
  pre_checkout_query?: any;
  poll?: any;
  poll_answer?: any;
  my_chat_member?: any;
  chat_member?: any;
  chat_join_request?: any;
}

interface WebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  ip_address?: string;
  last_error_date?: number;
  last_error_message?: string;
  last_synchronization_error_date?: number;
  max_connections?: number;
  allowed_updates?: string[];
}

class TelegramWebhooksService {
  private botTokens: { [key: string]: string } = {};
  private webhookSecret: string = '';
  private baseUrl: string = '';
  private activeWebhooks: Map<string, WebhookConfig> = new Map();

  constructor() {
    this.initializeConfig();
  }

  private initializeConfig(): void {
    this.botTokens = {
      support: process.env.TELEGRAM_SUPPORT_BOT_TOKEN || '',
      otp: process.env.TELEGRAM_OTP_BOT_TOKEN || '',
      alerts: process.env.TELEGRAM_ALERTS_BOT_TOKEN || '',
      communication: process.env.TELEGRAM_SUPPORT_BOT_TOKEN || '' // Same as support for now
    };

    this.webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET || 'profitagent_webhook_secret_2025';
    this.baseUrl = process.env.BASE_URL || 'https://api.profitagent.app';
  }

  /**
   * Set webhook for a specific bot
   */
  async setWebhook(config: WebhookConfig): Promise<{ success: boolean; error?: string; info?: any }> {
    try {
      const webhookUrl = `${this.baseUrl}/api/v1/telegram/webhook/${config.botType}`;
      
      const params: any = {
        url: webhookUrl,
        max_connections: config.maxConnections || 40,
        allowed_updates: config.allowedUpdates || [
          'message',
          'edited_message',
          'callback_query',
          'inline_query',
          'my_chat_member',
          'chat_member'
        ],
        drop_pending_updates: config.dropPendingUpdates || false
      };

      if (config.secretToken || this.webhookSecret) {
        params.secret_token = config.secretToken || this.webhookSecret;
      }

      const response = await axios.post(
        `https://api.telegram.org/bot${config.botToken}/setWebhook`,
        params,
        { timeout: 30000 }
      );

      if (response.data.ok) {
        // Store webhook config
        this.activeWebhooks.set(config.botType, {
          ...config,
          url: webhookUrl,
          secretToken: params.secret_token
        });

        // Save to database
        await prisma.telegramBot.upsert({
          where: { bot_token: config.botToken },
          update: {
            webhook_url: webhookUrl,
            status: 'active'
          },
          create: {
            bot_token: config.botToken,
            bot_username: `${config.botType}_bot`,
            bot_name: `${config.botType} Bot`,
            bot_type: config.botType,
            webhook_url: webhookUrl,
            status: 'active'
          }
        });

        logger.info(`Webhook set successfully for ${config.botType} bot`);
        return { success: true, info: response.data };
      } else {
        logger.error(`Failed to set webhook for ${config.botType}:`, response.data);
        return { success: false, error: response.data.description };
      }
    } catch (error) {
      logger.error(`Error setting webhook for ${config.botType}:`, error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Remove webhook for a specific bot
   */
  async deleteWebhook(botType: string, dropPendingUpdates = false): Promise<{ success: boolean; error?: string }> {
    try {
      const botToken = this.botTokens[botType];
      if (!botToken) {
        return { success: false, error: 'Bot token not found' };
      }

      const response = await axios.post(
        `https://api.telegram.org/bot${botToken}/deleteWebhook`,
        { drop_pending_updates: dropPendingUpdates },
        { timeout: 30000 }
      );

      if (response.data.ok) {
        this.activeWebhooks.delete(botType);

        // Update database
        await prisma.telegramBot.updateMany({
          where: { bot_token: botToken },
          data: {
            webhook_url: null,
            status: 'inactive'
          }
        });

        logger.info(`Webhook deleted successfully for ${botType} bot`);
        return { success: true };
      } else {
        return { success: false, error: response.data.description };
      }
    } catch (error) {
      logger.error(`Error deleting webhook for ${botType}:`, error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Get webhook info for a specific bot
   */
  async getWebhookInfo(botType: string): Promise<{ success: boolean; info?: WebhookInfo; error?: string }> {
    try {
      const botToken = this.botTokens[botType];
      if (!botToken) {
        return { success: false, error: 'Bot token not found' };
      }

      const response = await axios.get(
        `https://api.telegram.org/bot${botToken}/getWebhookInfo`,
        { timeout: 30000 }
      );

      if (response.data.ok) {
        return { success: true, info: response.data.result };
      } else {
        return { success: false, error: response.data.description };
      }
    } catch (error) {
      logger.error(`Error getting webhook info for ${botType}:`, error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Setup all webhooks
   */
  async setupAllWebhooks(): Promise<{ success: boolean; results: any[]; errors: string[] }> {
    const results: any[] = [];
    const errors: string[] = [];

    const webhookConfigs: WebhookConfig[] = [];
    
    if (this.botTokens.support) {
      webhookConfigs.push({
        botToken: this.botTokens.support,
        botType: 'support',
        url: `${this.baseUrl}/api/v1/telegram/webhook/support`,
        maxConnections: 40,
        allowedUpdates: ['message', 'callback_query', 'my_chat_member']
      });
    }
    
    if (this.botTokens.communication) {
      webhookConfigs.push({
        botToken: this.botTokens.communication,
        botType: 'communication',
        url: `${this.baseUrl}/api/v1/telegram/webhook/communication`,
        maxConnections: 40,
        allowedUpdates: ['message', 'callback_query', 'inline_query', 'my_chat_member']
      });
    }
    
    if (this.botTokens.otp) {
      webhookConfigs.push({
        botToken: this.botTokens.otp,
        botType: 'otp',
        url: `${this.baseUrl}/api/v1/telegram/webhook/otp`,
        maxConnections: 20,
        allowedUpdates: ['message']
      });
    }
    
    if (this.botTokens.alerts) {
      webhookConfigs.push({
        botToken: this.botTokens.alerts,
        botType: 'alerts',
        url: `${this.baseUrl}/api/v1/telegram/webhook/alerts`,
        maxConnections: 20,
        allowedUpdates: ['message', 'my_chat_member']
      });
    }

    for (const config of webhookConfigs) {
      if (!config.botToken) {
        errors.push(`Bot token not configured for ${config.botType}`);
        continue;
      }

      const result = await this.setWebhook(config);
      results.push({
        botType: config.botType,
        success: result.success,
        error: result.error,
        info: result.info
      });

      if (!result.success && result.error) {
        errors.push(`${config.botType}: ${result.error}`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const success = errors.length === 0;
    logger.info(`Webhook setup completed. Success: ${success}, Errors: ${errors.length}`);
    
    return { success, results, errors };
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(body: string, signature: string, botType: string): boolean {
    try {
      const webhookConfig = this.activeWebhooks.get(botType);
      const secret = webhookConfig?.secretToken || this.webhookSecret;
      
      if (!secret) {
        logger.warn(`No webhook secret configured for ${botType}`);
        return true; // Allow if no secret is configured
      }

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

      const providedSignature = signature.replace('sha256=', '');
      
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(providedSignature, 'hex')
      );
    } catch (error) {
      logger.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Process incoming webhook update
   */
  async processWebhookUpdate(update: TelegramUpdate, botType: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info(`Processing webhook update for ${botType}:`, {
        updateId: update.update_id,
        type: this.getUpdateType(update)
      });

      // Log interaction
      await this.logInteraction(update, botType);

      // Route to appropriate handler based on bot type
      switch (botType) {
        case 'support':
        case 'communication':
          await this.handleCommunicationUpdate(update);
          break;
        case 'otp':
          await this.handleOtpUpdate(update);
          break;
        case 'alerts':
          await this.handleAlertsUpdate(update);
          break;
        default:
          logger.warn(`Unknown bot type: ${botType}`);
          return { success: false, error: 'Unknown bot type' };
      }

      return { success: true };
    } catch (error) {
      logger.error(`Error processing webhook update for ${botType}:`, error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Handle communication bot updates
   */
  private async handleCommunicationUpdate(update: TelegramUpdate): Promise<void> {
    await telegramCommunicationService.processUpdate(update);
  }

  /**
   * Handle OTP bot updates
   */
  private async handleOtpUpdate(update: TelegramUpdate): Promise<void> {
    if (update.message) {
      // Handle OTP verification messages
      const message = update.message;
      const text = message.text;
      const userId = message.from?.id;

      if (text && userId && /^\d{6}$/.test(text.trim())) {
        // This looks like an OTP code
        logger.info(`Received potential OTP code from user ${userId}`);
        // OTP verification logic would go here
      }
    }
  }

  /**
   * Handle alerts bot updates
   */
  private async handleAlertsUpdate(update: TelegramUpdate): Promise<void> {
    if (update.my_chat_member) {
      // Handle bot being added/removed from channels
      const chatMember = update.my_chat_member;
      logger.info('Bot chat member status changed:', {
        chat: chatMember.chat,
        newStatus: chatMember.new_chat_member.status,
        oldStatus: chatMember.old_chat_member.status
      });
    }
  }

  /**
   * Log interaction to database
   */
  private async logInteraction(update: TelegramUpdate, botType: string): Promise<void> {
    try {
      const interactionType = this.getUpdateType(update);
      const userId = this.extractUserId(update);
      const chatId = this.extractChatId(update);

      if (userId) {
        // Try to find user by telegram_user_id
        const user = await prisma.user.findFirst({
          where: { telegram_user_id: userId.toString() }
        });

        if (user) {
          await prisma.telegramInteraction.create({
            data: {
              user_id: user.id,
              interaction_type: interactionType,
              content: update.message?.text || update.callback_query?.data || null,
              metadata: JSON.parse(JSON.stringify(update))
            }
          });
        }
      }
    } catch (error) {
      logger.error('Error logging interaction:', error);
    }
  }

  /**
   * Get update type from Telegram update
   */
  private getUpdateType(update: TelegramUpdate): 'message' | 'command' | 'callback' | 'join' | 'leave' {
    if (update.message) {
      // Check if it's a command
      if (update.message.text && update.message.text.startsWith('/')) {
        return 'command';
      }
      return 'message';
    }
    if (update.edited_message) return 'message';
    if (update.callback_query) return 'callback';
    if (update.my_chat_member) {
      const newStatus = update.my_chat_member.new_chat_member?.status;
      if (newStatus === 'member' || newStatus === 'administrator') {
        return 'join';
      }
      return 'leave';
    }
    return 'message'; // Default fallback
  }

  /**
   * Extract user ID from update
   */
  private extractUserId(update: TelegramUpdate): number | null {
    if (update.message?.from?.id) return update.message.from.id;
    if (update.callback_query?.from?.id) return update.callback_query.from.id;
    if (update.inline_query?.from?.id) return update.inline_query.from.id;
    if (update.my_chat_member?.from?.id) return update.my_chat_member.from.id;
    return null;
  }

  /**
   * Extract chat ID from update
   */
  private extractChatId(update: TelegramUpdate): number | null {
    if (update.message?.chat?.id) return update.message.chat.id;
    if (update.callback_query?.message?.chat?.id) return update.callback_query.message.chat.id;
    if (update.my_chat_member?.chat?.id) return update.my_chat_member.chat.id;
    return null;
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(): Promise<any> {
    try {
      const stats: any = {
        activeWebhooks: this.activeWebhooks.size,
        webhooks: {},
        totalInteractions: 0,
        interactionsByType: {},
        interactionsByBot: {}
      };

      // Get webhook info for each bot
      for (const [botType] of this.activeWebhooks) {
        const info = await this.getWebhookInfo(botType);
        stats.webhooks[botType] = info;
      }

      // Get interaction statistics
      const interactions = await prisma.telegramInteraction.groupBy({
        by: ['interaction_type'],
        where: {
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        _count: {
          id: true
        }
      });

      interactions.forEach(interaction => {
        const countId = (interaction._count && typeof interaction._count === 'object' && interaction._count.id) || 0;
        stats.totalInteractions += countId;
        
        const interactionType = interaction.interaction_type;
        
        if (interactionType && !stats.interactionsByType[interactionType]) {
          stats.interactionsByType[interactionType] = 0;
        }
        if (interactionType) {
          stats.interactionsByType[interactionType] += countId;
        }
      });

      return stats;
    } catch (error) {
      logger.error('Error getting webhook stats:', error);
      return null;
    }
  }

  /**
   * Health check for all webhooks
   */
  async healthCheck(): Promise<{ healthy: boolean; issues: string[]; details: any }> {
    const issues: string[] = [];
    const details: any = {};

    try {
      for (const [botType] of this.activeWebhooks) {
        const info = await this.getWebhookInfo(botType);
        
        if (info.success && info.info) {
          details[botType] = info.info;
          
          // Check for issues
          if (info.info.pending_update_count > 100) {
            issues.push(`${botType}: High pending updates (${info.info.pending_update_count})`);
          }
          
          if (info.info.last_error_date) {
            const errorAge = Date.now() / 1000 - info.info.last_error_date;
            if (errorAge < 3600) { // Error in last hour
              issues.push(`${botType}: Recent error - ${info.info.last_error_message}`);
            }
          }
          
          if (!info.info.url) {
            issues.push(`${botType}: No webhook URL set`);
          }
        } else {
          issues.push(`${botType}: Failed to get webhook info - ${info.error}`);
        }
      }

      return {
        healthy: issues.length === 0,
        issues,
        details
      };
    } catch (error) {
      logger.error('Error during webhook health check:', error);
      return {
        healthy: false,
        issues: ['Health check failed'],
        details: { error: (error as Error).message }
      };
    }
  }

  /**
   * Initialize webhooks on service start
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Telegram webhooks service...');
      
      // Load existing webhook configurations from database
      const existingBots = await prisma.telegramBot.findMany({
        where: { status: 'active' }
      });

      existingBots.forEach(bot => {
        if (bot.webhook_url && bot.bot_type) {
          this.activeWebhooks.set(bot.bot_type, {
            botToken: bot.bot_token,
            botType: bot.bot_type as any,
            url: bot.webhook_url,
            secretToken: ''
          });
        }
      });

      logger.info(`Loaded ${this.activeWebhooks.size} active webhooks from database`);
      
      // Perform health check
      const health = await this.healthCheck();
      if (!health.healthy) {
        logger.warn('Webhook health check found issues:', health.issues);
      }
      
      logger.info('Telegram webhooks service initialized successfully');
    } catch (error) {
      logger.error('Error initializing webhooks service:', error);
    }
  }
}

// Export singleton instance
export const telegramWebhooksService = new TelegramWebhooksService();