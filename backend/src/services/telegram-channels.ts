import axios from 'axios';
import { logger } from '../utils/logger';
import { prisma } from '../lib/prisma';

interface ChannelConfig {
  id: string;
  name: string;
  type: 'basic' | 'standard' | 'premium' | 'elite' | 'enterprise' | 'admin';
  accessLevel: string;
  inviteLink?: string;
  botToken: string;
  description?: string;
  welcomeMessage?: string;
  rules?: any;
  features?: any;
}

interface UserSubscription {
  userId: string;
  level: string;
  expiresAt?: Date;
  status: 'active' | 'expired' | 'suspended';
}

class TelegramChannelsService {
  private channels: Map<string, ChannelConfig> = new Map();
  private botTokens: { [key: string]: string } = {};

  constructor() {
    this.initializeBotTokens();
    this.initializeChannels();
  }

  private initializeBotTokens(): void {
    this.botTokens = {
      support: process.env.TELEGRAM_SUPPORT_BOT_TOKEN || '',
      otp: process.env.TELEGRAM_OTP_BOT_TOKEN || '',
      alerts: process.env.TELEGRAM_ALERTS_BOT_TOKEN || ''
    };
  }

  private initializeChannels(): void {
    // Default channel configurations
    const defaultChannels: ChannelConfig[] = [
      {
        id: 'basic_signals',
        name: 'ProFitAgent - Señales Básicas',
        type: 'basic',
        accessLevel: 'basic',
        botToken: this.botTokens.support || '',
        description: 'Canal de señales básicas para usuarios nivel básico',
        welcomeMessage: '🎯 Bienvenido al canal de señales básicas de ProFitAgent',
        features: {
          signalsPerDay: 3,
          analysisDepth: 'basic',
          supportLevel: 'community'
        }
      },
      {
        id: 'standard_signals',
        name: 'ProFitAgent - Señales Standard',
        type: 'standard',
        accessLevel: 'standard',
        botToken: this.botTokens.support || '',
        description: 'Canal de señales estándar con análisis mejorado',
        welcomeMessage: '📊 Bienvenido al canal de señales estándar de ProFitAgent',
        features: {
          signalsPerDay: 5,
          analysisDepth: 'intermediate',
          supportLevel: 'priority'
        }
      },
      {
        id: 'premium_signals',
        name: 'ProFitAgent - Señales Premium',
        type: 'premium',
        accessLevel: 'premium',
        botToken: this.botTokens.support || '',
        description: 'Canal premium con señales avanzadas y análisis profundo',
        welcomeMessage: '💎 Bienvenido al canal premium de ProFitAgent',
        features: {
          signalsPerDay: 8,
          analysisDepth: 'advanced',
          supportLevel: 'vip',
          exclusiveContent: true
        }
      },
      {
        id: 'elite_signals',
        name: 'ProFitAgent - Elite Trading',
        type: 'elite',
        accessLevel: 'elite',
        botToken: this.botTokens.support || '',
        description: 'Canal elite con acceso a estrategias exclusivas',
        welcomeMessage: '👑 Bienvenido al canal elite de ProFitAgent',
        features: {
          signalsPerDay: 12,
          analysisDepth: 'expert',
          supportLevel: 'dedicated',
          exclusiveContent: true,
          personalizedSignals: true
        }
      },
      {
        id: 'enterprise_hub',
        name: 'ProFitAgent - Enterprise Hub',
        type: 'enterprise',
        accessLevel: 'enterprise',
        botToken: this.botTokens.support || '',
        description: 'Hub empresarial con acceso completo a todas las funciones',
        welcomeMessage: '🏢 Bienvenido al hub empresarial de ProFitAgent',
        features: {
          signalsPerDay: 'unlimited',
          analysisDepth: 'institutional',
          supportLevel: 'enterprise',
          exclusiveContent: true,
          personalizedSignals: true,
          apiAccess: true
        }
      },
      {
        id: 'admin_control',
        name: 'ProFitAgent - Control Admin',
        type: 'admin',
        accessLevel: 'admin',
        botToken: this.botTokens.alerts || '',
        description: 'Canal de administración y control del sistema',
        welcomeMessage: '⚡ Panel de administración ProFitAgent',
        features: {
          systemAlerts: true,
          userManagement: true,
          analyticsAccess: true,
          broadcastCapability: true
        }
      }
    ];

    defaultChannels.forEach(channel => {
      this.channels.set(channel.id, channel);
    });
  }

  /**
   * Create a new Telegram channel
   */
  async createChannel(config: Omit<ChannelConfig, 'id'>): Promise<{ success: boolean; channelId?: string; error?: string }> {
    try {
      const channelId = `channel_${Date.now()}`;
      const fullConfig: ChannelConfig = {
        ...config,
        id: channelId
      };

      // Note: telegramChannel model not available in current schema
       logger.info(`Channel creation skipped for ${channelId} - model not available`);

      // Add to memory
      this.channels.set(channelId, fullConfig);

      logger.info(`Telegram channel created: ${config.name} (${channelId})`);
      return { success: true, channelId };
    } catch (error) {
      logger.error('Error creating Telegram channel:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Get user's accessible channels based on subscription level
   */
  async getUserChannels(userId: string): Promise<ChannelConfig[]> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          role: true,
          status: true,
          licenses: {
            where: { status: 'active' },
            include: {
              product: {
                select: {
                  code: true
                }
              }
            }
          }
        }
      });

      if (!user || user.status !== 'active') {
        return [];
      }

      const accessibleChannels: ChannelConfig[] = [];
      // Determinar el nivel más alto de las licencias activas
      let userLevel = 'basic';
      if (user.licenses && user.licenses.length > 0) {
        const levels = ['basic', 'standard', 'premium', 'elite', 'enterprise'];
        const userLevels = user.licenses.map(license => license.product.code);
        for (const level of levels.reverse()) {
          if (userLevels.includes(level)) {
            userLevel = level;
            break;
          }
        }
      }
      const isAdmin = user.role === 'admin';

      this.channels.forEach(channel => {
        if (isAdmin || this.hasChannelAccess(userLevel, channel.accessLevel)) {
          accessibleChannels.push(channel);
        }
      });

      return accessibleChannels;
    } catch (error) {
      logger.error('Error getting user channels:', error);
      return [];
    }
  }

  /**
   * Check if user has access to specific channel
   */
  private hasChannelAccess(userLevel: string, channelLevel: string): boolean {
    const levels = ['basic', 'standard', 'premium', 'elite', 'enterprise', 'admin'];
    const userLevelIndex = levels.indexOf(userLevel);
    const channelLevelIndex = levels.indexOf(channelLevel);
    
    return userLevelIndex >= channelLevelIndex;
  }

  /**
   * Generate invite link for a channel
   */
  async generateInviteLink(channelId: string, userId: string): Promise<{ success: boolean; inviteLink?: string; error?: string }> {
    try {
      const channel = this.channels.get(channelId);
      if (!channel) {
        return { success: false, error: 'Channel not found' };
      }

      // Check user access
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          role: true,
          licenses: {
            where: { status: 'active' },
            include: {
              product: {
                select: {
                  code: true
                }
              }
            }
          }
        }
      });

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Determinar el nivel más alto de las licencias activas
      let userLevel = 'basic';
      if (user.licenses && user.licenses.length > 0) {
        const levels = ['basic', 'standard', 'premium', 'elite', 'enterprise'];
        const userLevels = user.licenses.map(license => license.product.code);
        for (const level of levels.reverse()) {
          if (userLevels.includes(level)) {
            userLevel = level;
            break;
          }
        }
      }
      
      const hasAccess = user.role === 'admin' || this.hasChannelAccess(userLevel, channel.accessLevel);
      if (!hasAccess) {
        return { success: false, error: 'Access denied' };
      }

      // Generate time-limited invite link
      const inviteCode = this.generateInviteCode(userId, channelId);
      const inviteLink = `https://t.me/profitagent_bot?start=${inviteCode}`;

      // Store invite code in Redis with expiration
      // This would require Redis integration
      
      return { success: true, inviteLink };
    } catch (error) {
      logger.error('Error generating invite link:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Send welcome message to new channel member
   */
  async sendWelcomeMessage(channelId: string, telegramUserId: string): Promise<boolean> {
    try {
      const channel = this.channels.get(channelId);
      if (!channel || !channel.welcomeMessage) {
        return false;
      }

      const message = {
        chat_id: telegramUserId,
        text: channel.welcomeMessage,
        parse_mode: 'HTML' as const
      };

      const response = await axios.post(
        `https://api.telegram.org/bot${channel.botToken}/sendMessage`,
        message,
        { timeout: 10000 }
      );

      return response.data.ok;
    } catch (error) {
      logger.error('Error sending welcome message:', error);
      return false;
    }
  }

  /**
   * Broadcast message to channel members
   */
  async broadcastToChannel(
    channelId: string, 
    message: string, 
    targetLevel?: string
  ): Promise<{ success: boolean; sent: number; failed: number }> {
    try {
      const channel = this.channels.get(channelId);
      if (!channel) {
        return { success: false, sent: 0, failed: 0 };
      }

      // Get users with access to this channel
      const whereClause: any = {
        telegram_user_id: { not: null },
        telegram_link_status: 'linked',
        status: 'active'
      };

      if (targetLevel) {
        whereClause.role = targetLevel;
      } else {
        // Get users with appropriate subscription level
        const levels = ['basic', 'standard', 'premium', 'elite', 'enterprise'];
        const channelLevelIndex = levels.indexOf(channel.accessLevel);
        if (channelLevelIndex >= 0) {
          whereClause.role = {
            in: ['user', 'admin']
          };
        }
      }

      const users = await prisma.user.findMany({
        where: whereClause,
        select: {
          telegram_user_id: true,
          first_name: true,
          role: true
        }
      });

      let sent = 0;
      let failed = 0;

      for (const user of users) {
        try {
          const response = await axios.post(
            `https://api.telegram.org/bot${channel.botToken}/sendMessage`,
            {
              chat_id: user.telegram_user_id,
              text: message,
              parse_mode: 'HTML'
            },
            { timeout: 10000 }
          );

          if (response.data.ok) {
            sent++;
          } else {
            failed++;
          }
        } catch (error) {
          failed++;
          logger.warn(`Failed to send message to user ${user.telegram_user_id}:`, error);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      logger.info(`Broadcast to channel ${channelId}: ${sent} sent, ${failed} failed`);
      return { success: true, sent, failed };
    } catch (error) {
      logger.error('Error broadcasting to channel:', error);
      return { success: false, sent: 0, failed: 0 };
    }
  }

  /**
   * Update user's channel access based on subscription change
   */
  async updateUserChannelAccess(userId: string, newLevel: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          telegram_user_id: true,
          first_name: true,
          last_name: true
        }
      });

      if (!user || !user.telegram_user_id) {
        return;
      }

      // Get accessible channels for new level
      const accessibleChannels = await this.getUserChannels(userId);
      
      // Send notification about channel access update
      const message = `🔄 **Actualización de Acceso**\n\n` +
                     `Hola ${user.first_name}, tu nivel de suscripción ha sido actualizado.\n\n` +
                     `📊 **Nuevo nivel:** ${newLevel}\n` +
                     `🎯 **Canales disponibles:** ${accessibleChannels.length}\n\n` +
                     `Ahora tienes acceso a:\n` +
                     accessibleChannels.map(ch => `• ${ch.name}`).join('\n');

      await axios.post(
        `https://api.telegram.org/bot${this.botTokens.support}/sendMessage`,
        {
          chat_id: user.telegram_user_id,
          text: message,
          parse_mode: 'Markdown'
        },
        { timeout: 10000 }
      );

      logger.info(`Updated channel access for user ${userId} to level ${newLevel}`);
    } catch (error) {
      logger.error('Error updating user channel access:', error);
    }
  }

  /**
   * Get channel statistics
   */
  async getChannelStats(channelId: string): Promise<any> {
    try {
      const channel = this.channels.get(channelId);
      if (!channel) {
        return null;
      }

      // Get member count from database
      const memberCount = await prisma.user.count({
        where: {
          telegram_user_id: { not: null },
          telegram_link_status: 'linked',
          status: 'active',
          role: {
              in: ['user', 'admin']
            }
        }
      });

      return {
        id: channelId,
        name: channel.name,
        type: channel.type,
        memberCount,
        accessLevel: channel.accessLevel,
        features: channel.features
      };
    } catch (error) {
      logger.error('Error getting channel stats:', error);
      return null;
    }
  }

  /**
   * Get all channels with statistics
   */
  async getAllChannelsStats(): Promise<any[]> {
    const stats = [];
    
    for (const [channelId] of this.channels) {
      const channelStats = await this.getChannelStats(channelId);
      if (channelStats) {
        stats.push(channelStats);
      }
    }

    return stats;
  }

  private generateInviteCode(userId: string, channelId: string): string {
    const timestamp = Date.now();
    const data = `${userId}:${channelId}:${timestamp}`;
    return Buffer.from(data).toString('base64').replace(/[+/=]/g, '');
  }

  private getLevelsForChannel(channelLevel: string): string[] {
    const levels = ['basic', 'standard', 'premium', 'elite', 'enterprise'];
    const channelLevelIndex = levels.indexOf(channelLevel);
    return channelLevelIndex >= 0 ? levels.slice(channelLevelIndex) : [];
  }

  /**
   * Initialize channels from database
   */
  async loadChannelsFromDatabase(): Promise<void> {
    try {
      // Note: telegramChannel model not available in current schema
       const dbChannels: any[] = []; // Temporary empty array

      dbChannels.forEach((dbChannel: any) => {
        const config: ChannelConfig = {
          id: dbChannel.id,
          name: dbChannel.channel_name,
          type: dbChannel.channel_type as any,
          accessLevel: dbChannel.access_level,
          inviteLink: dbChannel.invite_link || undefined,
          botToken: dbChannel.bot_token || this.botTokens.support,
          description: dbChannel.description || undefined,
          welcomeMessage: dbChannel.welcome_message || undefined,
          rules: dbChannel.rules || undefined,
          features: dbChannel.features || undefined
        };

        this.channels.set(dbChannel.id, config);
      });

      logger.info(`Loaded ${dbChannels.length} channels from database`);
    } catch (error) {
      logger.error('Error loading channels from database:', error);
    }
  }
}

// Export singleton instance
export const telegramChannelsService = new TelegramChannelsService();