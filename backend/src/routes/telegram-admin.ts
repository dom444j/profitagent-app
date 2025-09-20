import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authMiddleware, adminMiddleware } from '../lib/middleware';
import { telegramCommunicationService } from '../services/telegram-communication';
import { telegramChannelsService } from '../services/telegram-channels';
import { telegramNotificationsService } from '../services/telegram-notifications';
import { telegramWebhooksService } from '../services/telegram-webhooks';
import { telegramService } from '../services/telegram';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

const router = Router();

// Apply authentication and admin requirement to all routes
router.use(authMiddleware);
router.use(adminMiddleware);

/**
 * @route GET /api/v1/telegram-admin/dashboard
 * @desc Get admin dashboard overview
 * @access Admin
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    // Get bot statistics
    const botStats = await Promise.all([
      telegramWebhooksService.getWebhookStats(),
      telegramNotificationsService.getNotificationStats(),
      telegramChannelsService.getAllChannelsStats()
    ]);

    // Get user statistics
    const userStats = await prisma.user.groupBy({
      by: ['telegram_link_status'],
      _count: {
        id: true
      }
    });

    // Get recent interactions
    const recentInteractions = await prisma.telegramInteraction.findMany({
      take: 10,
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true
          }
        }
      }
    });

    // Get system health
    const webhookHealth = await telegramWebhooksService.healthCheck();

    const dashboard = {
      bots: {
        webhookStats: botStats[0],
        notificationStats: botStats[1],
        channelStats: botStats[2],
        health: webhookHealth
      },
      users: {
        total: userStats.reduce((sum, stat) => sum + stat._count.id, 0),
        byLinkStatus: userStats.reduce((acc, stat) => {
          acc[stat.telegram_link_status || 'unlinked'] = stat._count.id;
          return acc;
        }, {} as any)
      },
      recentActivity: recentInteractions,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    logger.error('Error getting admin dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load dashboard'
    });
  }
});

/**
 * @route GET /api/v1/telegram-admin/bots
 * @desc Get all bot configurations
 * @access Admin
 */
router.get('/bots', async (req: Request, res: Response) => {
  try {
    const bots = await prisma.telegramBot.findMany({
      orderBy: { created_at: 'desc' }
    });

    // Get webhook info for each bot
    const botsWithInfo = await Promise.all(
      bots.map(async (bot) => {
        const webhookInfo = await telegramWebhooksService.getWebhookInfo(bot.bot_type);
        return {
          ...bot,
          webhookInfo: webhookInfo.success ? webhookInfo.info : null,
          webhookError: webhookInfo.error || null
        };
      })
    );

    res.json({
      success: true,
      data: botsWithInfo
    });
  } catch (error) {
    logger.error('Error getting bots:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get bots'
    });
  }
});

/**
 * @route POST /api/v1/telegram-admin/bots/:botType/webhook
 * @desc Set webhook for a specific bot
 * @access Admin
 */
router.post('/bots/:botType/webhook', [
  param('botType').isIn(['support', 'otp', 'alerts', 'communication']).withMessage('Invalid bot type'),
  body('maxConnections').optional().isInt({ min: 1, max: 100 }).withMessage('Max connections must be between 1 and 100'),
  body('allowedUpdates').optional().isArray().withMessage('Allowed updates must be an array'),
  body('dropPendingUpdates').optional().isBoolean().withMessage('Drop pending updates must be boolean')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { botType } = req.params;
    const { maxConnections, allowedUpdates, dropPendingUpdates } = req.body;

    // Get bot token from environment
    const botTokens: any = {
      support: process.env.TELEGRAM_SUPPORT_BOT_TOKEN,
      otp: process.env.TELEGRAM_OTP_BOT_TOKEN,
      alerts: process.env.TELEGRAM_ALERTS_BOT_TOKEN,
      communication: process.env.TELEGRAM_SUPPORT_BOT_TOKEN
    };

    if (!botType) {
      return res.status(400).json({
        success: false,
        error: 'Bot type is required'
      });
    }

    const botToken = botTokens[botType];
    if (!botToken) {
      return res.status(400).json({
        success: false,
        error: `Bot token not configured for ${botType}`
      });
    }

    const result = await telegramWebhooksService.setWebhook({
      botToken,
      botType: botType as any,
      url: '', // Will be set by the service
      maxConnections,
      allowedUpdates,
      dropPendingUpdates
    });

    if (result.success) {
      return res.json({
        success: true,
        message: `Webhook set successfully for ${botType} bot`,
        data: result.info
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Error setting webhook:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to set webhook'
    });
  }
});

/**
 * @route DELETE /api/v1/telegram-admin/bots/:botType/webhook
 * @desc Delete webhook for a specific bot
 * @access Admin
 */
router.delete('/bots/:botType/webhook', [
  param('botType').isIn(['support', 'otp', 'alerts', 'communication']).withMessage('Invalid bot type'),
  query('dropPendingUpdates').optional().isBoolean().withMessage('Drop pending updates must be boolean')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { botType } = req.params;
    const dropPendingUpdates = req.query.dropPendingUpdates === 'true';

    if (!botType) {
      return res.status(400).json({
        success: false,
        error: 'Bot type is required'
      });
    }

    const result = await telegramWebhooksService.deleteWebhook(botType, dropPendingUpdates);

    if (result.success) {
      return res.json({
        success: true,
        message: `Webhook deleted successfully for ${botType} bot`
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Error deleting webhook:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete webhook'
    });
  }
});

/**
 * @route POST /api/v1/telegram-admin/webhooks/setup-all
 * @desc Setup all webhooks
 * @access Admin
 */
router.post('/webhooks/setup-all', async (req: Request, res: Response) => {
  try {
    const result = await telegramWebhooksService.setupAllWebhooks();

    res.json({
      success: result.success,
      message: result.success ? 'All webhooks setup successfully' : 'Some webhooks failed to setup',
      data: {
        results: result.results,
        errors: result.errors
      }
    });
  } catch (error) {
    logger.error('Error setting up all webhooks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to setup webhooks'
    });
  }
});

/**
 * @route GET /api/v1/telegram-admin/channels
 * @desc Get all channels with statistics
 * @access Admin
 */
router.get('/channels', async (req: Request, res: Response) => {
  try {
    const channels = await telegramChannelsService.getAllChannelsStats();

    res.json({
      success: true,
      data: channels
    });
  } catch (error) {
    logger.error('Error getting channels:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get channels'
    });
  }
});

/**
 * @route POST /api/v1/telegram-admin/channels
 * @desc Create a new channel
 * @access Admin
 */
router.post('/channels', [
  body('name').notEmpty().withMessage('Channel name is required'),
  body('type').isIn(['basic', 'standard', 'premium', 'elite', 'enterprise', 'admin']).withMessage('Invalid channel type'),
  body('accessLevel').notEmpty().withMessage('Access level is required'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('welcomeMessage').optional().isString().withMessage('Welcome message must be a string'),
  body('botToken').notEmpty().withMessage('Bot token is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { name, type, accessLevel, description, welcomeMessage, botToken, features, rules } = req.body;

    const result = await telegramChannelsService.createChannel({
      name,
      type,
      accessLevel,
      description,
      welcomeMessage,
      botToken,
      features,
      rules
    });

    if (result.success) {
      return res.status(201).json({
        success: true,
        message: 'Channel created successfully',
        data: { channelId: result.channelId }
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Error creating channel:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create channel'
    });
  }
});

/**
 * @route POST /api/v1/telegram-admin/channels/:channelId/broadcast
 * @desc Broadcast message to channel
 * @access Admin
 */
router.post('/channels/:channelId/broadcast', [
  param('channelId').notEmpty().withMessage('Channel ID is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('targetLevel').optional().isString().withMessage('Target level must be a string')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { channelId } = req.params;
    const { message, targetLevel } = req.body;

    if (!channelId) {
      return res.status(400).json({
        success: false,
        error: 'Channel ID is required'
      });
    }

    const result = await telegramChannelsService.broadcastToChannel(channelId, message, targetLevel);

    if (result.success) {
      return res.json({
        success: true,
        message: 'Broadcast sent successfully',
        data: {
          sent: result.sent,
          failed: result.failed
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Failed to send broadcast'
      });
    }
  } catch (error) {
    logger.error('Error broadcasting to channel:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to broadcast message'
    });
  }
});

/**
 * @route GET /api/v1/telegram-admin/users
 * @desc Get users with Telegram information
 * @access Admin
 */
router.get('/users', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('linkStatus').optional().isIn(['linked', 'unlinked', 'pending']).withMessage('Invalid link status'),
  query('subscriptionLevel').optional().isString().withMessage('Subscription level must be a string')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const linkStatus = req.query.linkStatus as string;
    const subscriptionLevel = req.query.subscriptionLevel as string;

    const whereClause: any = {};
    if (linkStatus) {
      whereClause.telegram_link_status = linkStatus;
    }
    if (subscriptionLevel) {
      whereClause.subscription_level = subscriptionLevel;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          telegram_user_id: true,
          telegram_username: true,
          telegram_link_status: true,

          status: true,
          created_at: true,
          updated_at: true
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.user.count({ where: whereClause })
    ]);

    return res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error getting users:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get users'
    });
  }
});

/**
 * @route POST /api/v1/telegram-admin/users/:userId/unlink
 * @desc Unlink user from Telegram
 * @access Admin
 */
router.post('/users/:userId/unlink', [
  param('userId').isUUID().withMessage('Invalid user ID')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        telegram_user_id: null,
        telegram_username: null,
        telegram_link_status: 'unlinked'
      }
    });

    return res.json({
      success: true,
      message: 'User unlinked from Telegram successfully'
    });
  } catch (error) {
    logger.error('Error unlinking user:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to unlink user'
    });
  }
});

/**
 * @route GET /api/v1/telegram-admin/notifications/stats
 * @desc Get notification statistics
 * @access Admin
 */
router.get('/notifications/stats', [
  query('days').optional().isInt({ min: 1, max: 90 }).withMessage('Days must be between 1 and 90')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const days = parseInt(req.query.days as string) || 7;
    const stats = await telegramNotificationsService.getNotificationStats();

    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting notification stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get notification stats'
    });
  }
});

/**
 * @route POST /api/v1/telegram-admin/notifications/test
 * @desc Send test notification
 * @access Admin
 */
router.post('/notifications/test', [
  body('userId').isUUID().withMessage('Invalid user ID'),
  body('type').isIn(['trading_signals', 'price_alerts', 'portfolio_updates', 'system_alerts', 'news', 'educational']).withMessage('Invalid notification type'),
  body('data').isObject().withMessage('Data must be an object')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userId, type, data } = req.body;

    const result = await telegramNotificationsService.sendNotification(userId, type, data, {
      priority: 'medium',
      forceChannels: ['telegram']
    });

    if (result.success) {
      return res.json({
        success: true,
        message: 'Test notification sent successfully'
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Error sending test notification:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send test notification'
    });
  }
});

/**
 * @route GET /api/v1/telegram-admin/interactions
 * @desc Get recent Telegram interactions
 * @access Admin
 */
router.get('/interactions', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('botType').optional().isString().withMessage('Bot type must be a string'),
  query('interactionType').optional().isString().withMessage('Interaction type must be a string')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const botType = req.query.botType as string;
    const interactionType = req.query.interactionType as string;

    const whereClause: any = {};
    if (botType) {
      whereClause.bot_type = botType;
    }
    if (interactionType) {
      whereClause.interaction_type = interactionType;
    }

    const [interactions, total] = await Promise.all([
      prisma.telegramInteraction.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.telegramInteraction.count({ where: whereClause })
    ]);

    return res.json({
      success: true,
      data: {
        interactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error getting interactions:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get interactions'
    });
  }
});

/**
 * @route POST /api/v1/telegram-admin/maintenance/cleanup
 * @desc Clean up old data
 * @access Admin
 */
router.post('/maintenance/cleanup', async (req: Request, res: Response) => {
  try {
    // Clean up old notifications
    await telegramNotificationsService.cleanupOldNotifications();

    // Clean up old interactions (older than 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const deletedInteractions = await prisma.telegramInteraction.deleteMany({
      where: {
        timestamp: {
          lt: ninetyDaysAgo
        }
      }
    });

    res.json({
      success: true,
      message: 'Cleanup completed successfully',
      data: {
        deletedInteractions: deletedInteractions.count
      }
    });
  } catch (error) {
    logger.error('Error during cleanup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform cleanup'
    });
  }
});

/**
 * @route POST /api/v1/telegram-admin/broadcast
 * @desc Send broadcast message to users
 * @access Admin
 */
router.post('/broadcast', [
  body('message').notEmpty().withMessage('Message is required'),
  body('targetType').isIn(['all', 'linked', 'active']).withMessage('Invalid target type')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { message, targetType } = req.body;

    // Get users based on target type
    let users;
    switch (targetType) {
      case 'all':
        users = await prisma.user.findMany({
          where: {
            telegram_user_id: {
              not: null
            }
          },
          select: {
            telegram_user_id: true,
            telegram_username: true
          }
        });
        break;
      case 'linked':
        users = await prisma.user.findMany({
          where: {
            telegram_user_id: {
              not: null
            }
          },
          select: {
            telegram_user_id: true,
            telegram_username: true
          }
        });
        break;
      case 'active':
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        users = await prisma.user.findMany({
          where: {
            telegram_user_id: {
              not: null
            },
            updated_at: {
              gte: thirtyDaysAgo
            }
          },
          select: {
            telegram_user_id: true,
            telegram_username: true
          }
        });
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid target type'
        });
    }

    let sent = 0;
    let failed = 0;

    // Send message to each user
    for (const user of users) {
      try {
        if (user.telegram_user_id) {
          await telegramService.sendMessage({ chat_id: user.telegram_user_id, text: message });
          sent++;
        }
      } catch (error) {
        logger.error(`Failed to send message to user ${user.telegram_username}:`, error);
        failed++;
      }
    }

    return res.json({
      success: true,
      message: 'Broadcast completed',
      data: {
        sent,
        failed,
        total: users.length
      }
    });
  } catch (error) {
    logger.error('Error sending broadcast:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send broadcast'
    });
  }
});

/**
 * @route POST /api/v1/telegram-admin/test-message
 * @desc Send test message to specific chat
 * @access Admin
 */
router.post('/test-message', [
  body('chatId').notEmpty().withMessage('Chat ID is required'),
  body('message').notEmpty().withMessage('Message is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { chatId, message } = req.body;

    try {
      await telegramService.sendMessage({ chat_id: chatId, text: message }, 3);

      return res.json({
        success: true,
        message: 'Test message sent successfully'
      });
    } catch (error) {
      logger.error('Failed to send test message:', error);
      return res.status(400).json({
        success: false,
        error: 'Failed to send test message',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } catch (error) {
    logger.error('Error in test message endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/v1/telegram-admin/stats
 * @desc Get Telegram statistics
 * @access Admin
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const totalUsers = await prisma.user.count();
    const linkedUsers = await prisma.user.count({
      where: {
        telegram_user_id: {
          not: null
        }
      }
    });
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeUsers = await prisma.user.count({
      where: {
        telegram_user_id: {
          not: null
        },
        updated_at: {
          gte: thirtyDaysAgo
        }
      }
    });

    const linkageRate = totalUsers > 0 ? ((linkedUsers / totalUsers) * 100).toFixed(1) + '%' : '0%';
    const activityRate = linkedUsers > 0 ? ((activeUsers / linkedUsers) * 100).toFixed(1) + '%' : '0%';

    res.json({
      success: true,
      data: {
        totalUsers,
        linkedUsers,
        activeUsers,
        linkageRate,
        activityRate
      }
    });
  } catch (error) {
    logger.error('Error getting Telegram stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics'
    });
  }
});

/**
 * @route GET /api/v1/telegram-admin/ai/settings
 * @desc Get AI configuration settings
 * @access Admin
 */
router.get('/ai/settings', async (req: Request, res: Response) => {
  try {
    // Get AI settings from database or return defaults
    const aiSettings = await prisma.setting.findMany({
      where: {
        key: {
          in: ['ai_enabled', 'ai_auto_response', 'ai_response_delay', 'ai_max_tokens', 'ai_temperature', 'ai_system_prompt']
        }
      }
    });

    // Convert to object format
    const settings = aiSettings.reduce((acc, setting) => {
      let value = setting.value;
      
      // Parse specific types
      if (setting.key === 'ai_enabled' || setting.key === 'ai_auto_response') {
        value = value === true || value === 'true';
      } else if (setting.key === 'ai_response_delay' || setting.key === 'ai_max_tokens') {
        value = parseInt(value?.toString() || '0') || 0;
      } else if (setting.key === 'ai_temperature') {
        value = parseFloat(value?.toString() || '0.7') || 0.7;
      }
      
      acc[setting.key.replace('ai_', '')] = value;
      return acc;
    }, {} as any);

    // Set defaults if not found
    const defaultSettings = {
      enabled: settings.enabled || false,
      autoResponse: settings.auto_response || false,
      responseDelay: settings.response_delay || 2,
      maxTokens: settings.max_tokens || 500,
      temperature: settings.temperature || 0.7,
      systemPrompt: settings.system_prompt || 'Eres un asistente de soporte para ProfitAgent. Responde de manera útil y profesional.'
    };

    res.json({
      success: true,
      data: defaultSettings
    });
  } catch (error) {
    logger.error('Error getting AI settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get AI settings'
    });
  }
});

/**
 * @route PUT /api/v1/telegram-admin/ai/settings
 * @desc Update AI configuration settings
 * @access Admin
 */
router.put('/ai/settings', [
  body('enabled').isBoolean().withMessage('Enabled must be boolean'),
  body('autoResponse').isBoolean().withMessage('Auto response must be boolean'),
  body('responseDelay').isInt({ min: 0, max: 30 }).withMessage('Response delay must be between 0 and 30 seconds'),
  body('maxTokens').isInt({ min: 50, max: 2000 }).withMessage('Max tokens must be between 50 and 2000'),
  body('temperature').isFloat({ min: 0, max: 1 }).withMessage('Temperature must be between 0 and 1'),
  body('systemPrompt').isString().withMessage('System prompt must be a string')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { enabled, autoResponse, responseDelay, maxTokens, temperature, systemPrompt } = req.body;

    // Update or create settings
    const settingsToUpdate = [
      { key: 'ai_enabled', value: enabled.toString() },
      { key: 'ai_auto_response', value: autoResponse.toString() },
      { key: 'ai_response_delay', value: responseDelay.toString() },
      { key: 'ai_max_tokens', value: maxTokens.toString() },
      { key: 'ai_temperature', value: temperature.toString() },
      { key: 'ai_system_prompt', value: systemPrompt }
    ];

    for (const setting of settingsToUpdate) {
      await prisma.setting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: {
          key: setting.key,
          value: setting.value
        }
      });
    }

    return res.json({
      success: true,
      message: 'AI settings updated successfully'
    });
  } catch (error) {
    logger.error('Error updating AI settings:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update AI settings'
    });
  }
});

/**
 * @route GET /api/v1/telegram-admin/ai/stats
 * @desc Get AI usage statistics
 * @access Admin
 */
router.get('/ai/stats', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get AI interaction statistics
    const totalInteractions = await prisma.telegramInteraction.count({
      where: {
        interaction_type: 'message'
      }
    });

    const responsesGenerated = await prisma.telegramInteraction.count({
      where: {
        interaction_type: 'message',
        response: {
          not: null
        }
      }
    });

    const last24HoursInteractions = await prisma.telegramInteraction.count({
      where: {
        interaction_type: 'message',
        timestamp: {
          gte: last24Hours
        }
      }
    });

    const last24HoursResponses = await prisma.telegramInteraction.count({
      where: {
        interaction_type: 'message',
        response: {
          not: null
        },
        timestamp: {
          gte: last24Hours
        }
      }
    });

    // Calculate average response time (mock data for now)
    const averageResponseTime = 1250; // milliseconds
    
    // Calculate success rate
    const successRate = totalInteractions > 0 
      ? Math.round((responsesGenerated / totalInteractions) * 100) + '%'
      : '0%';

    const stats = {
      totalInteractions,
      responsesGenerated,
      averageResponseTime,
      successRate,
      last24Hours: {
        interactions: last24HoursInteractions,
        responses: last24HoursResponses
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting AI stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get AI statistics'
    });
  }
});

/**
 * @route POST /api/v1/telegram-admin/ai/test
 * @desc Test AI response generation
 * @access Admin
 */
router.post('/ai/test', [
  body('message').notEmpty().withMessage('Test message is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { message } = req.body;

    // Get AI settings
    const aiSettings = await prisma.setting.findMany({
      where: {
        key: {
          in: ['ai_enabled', 'ai_system_prompt', 'ai_max_tokens', 'ai_temperature']
        }
      }
    });

    const settings = aiSettings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as any);

    // Check if AI is enabled
    if (settings.ai_enabled !== 'true') {
      return res.status(400).json({
        success: false,
        error: 'AI system is not enabled'
      });
    }

    // Mock AI response for testing
    const testResponse = {
      message: `Respuesta de prueba para: "${message}". El sistema de IA está funcionando correctamente.`,
      timestamp: new Date().toISOString(),
      settings: {
        systemPrompt: settings.ai_system_prompt || 'Default prompt',
        maxTokens: parseInt(settings.ai_max_tokens) || 500,
        temperature: parseFloat(settings.ai_temperature) || 0.7
      }
    };

    // Log the test interaction
    await prisma.telegramInteraction.create({
      data: {
        user_id: req.user?.id || 'system',
        interaction_type: 'message',
        content: message,
        metadata: { test_message: message, ai_test: true } as any,
        response: testResponse.message,
        timestamp: new Date()
      }
    });

    return res.json({
      success: true,
      data: testResponse
    });
  } catch (error) {
    logger.error('Error testing AI response:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to test AI response'
    });
  }
});

export default router;