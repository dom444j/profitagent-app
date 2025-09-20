import { Router, Request, Response } from 'express';
import { telegramCommunicationService } from '../services/telegram-communication';
import { logger } from '../utils/logger';
import { authMiddleware } from '../lib/middleware';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * Webhook endpoint for Telegram support bot
 * This endpoint receives updates from Telegram when users interact with the bot
 */
router.post('/webhook/support', async (req: Request, res: Response) => {
  try {
    const update = req.body;
    
    // Validate webhook secret if configured
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (webhookSecret) {
      const providedSecret = req.headers['x-telegram-bot-api-secret-token'];
      if (providedSecret !== webhookSecret) {
        logger.warn('Invalid webhook secret provided');
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    // Process the update
    await telegramCommunicationService.processUpdate(update);
    
    return res.status(200).json({ ok: true });
  } catch (error) {
    logger.error('Error processing Telegram webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Setup webhook for support bot
 * Admin endpoint to configure webhook URL
 */
router.post('/setup-webhook', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { webhookUrl } = req.body;
    
    if (!webhookUrl) {
      return res.status(400).json({ error: 'Webhook URL is required' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify user is admin
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true }
    });

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const success = await telegramCommunicationService.setWebhook(webhookUrl);
    
    if (success) {
      return res.json({ success: true, message: 'Webhook configured successfully' });
    } else {
      return res.status(500).json({ error: 'Failed to configure webhook' });
    }
  } catch (error) {
    logger.error('Error setting up webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete webhook for support bot
 * Admin endpoint to remove webhook configuration
 */
router.delete('/webhook', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify user is admin
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true }
    });

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const success = await telegramCommunicationService.deleteWebhook();
    
    if (success) {
      return res.json({ success: true, message: 'Webhook deleted successfully' });
    } else {
      return res.status(500).json({ error: 'Failed to delete webhook' });
    }
  } catch (error) {
    logger.error('Error deleting webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get Telegram bot information
 * Admin endpoint to check bot status and configuration
 */
router.get('/bot-info', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify user is admin
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true }
    });

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get bot information from Telegram API
    const axios = require('axios');
    const supportBotToken = process.env.TELEGRAM_SUPPORT_BOT_TOKEN;
    
    if (!supportBotToken) {
      return res.status(400).json({ error: 'Support bot token not configured' });
    }

    const [botInfo, webhookInfo] = await Promise.all([
      axios.get(`https://api.telegram.org/bot${supportBotToken}/getMe`),
      axios.get(`https://api.telegram.org/bot${supportBotToken}/getWebhookInfo`)
    ]);

    return res.json({
      bot: botInfo.data.result,
      webhook: webhookInfo.data.result,
      configured: {
        supportBot: !!process.env.TELEGRAM_SUPPORT_BOT_TOKEN,
        otpBot: !!process.env.TELEGRAM_OTP_BOT_TOKEN,
        alertsBot: !!process.env.TELEGRAM_ALERTS_BOT_TOKEN
      }
    });
  } catch (error) {
    logger.error('Error getting bot info:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Send broadcast message to all linked users
 * Admin endpoint to send announcements
 */
router.post('/broadcast', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { message, targetType, targetValue } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify user is admin
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true }
    });

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get all users with linked Telegram
    const linkedUsers = await prisma.user.findMany({
      where: {
        telegram_user_id: { not: null },
        telegram_link_status: 'linked'
      },
      select: {
        telegram_user_id: true,
        first_name: true,
        email: true
      }
    });

    const results = {
      total: linkedUsers.length,
      sent: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Send message to each user
    for (const linkedUser of linkedUsers) {
      try {
        const axios = require('axios');
        const supportBotToken = process.env.TELEGRAM_SUPPORT_BOT_TOKEN;
        
        if (!supportBotToken) {
          results.errors.push('Support bot token not configured');
          results.failed++;
          continue;
        }

        const response = await axios.post(
          `https://api.telegram.org/bot${supportBotToken}/sendMessage`,
          {
            chat_id: linkedUser.telegram_user_id,
            text: message,
            parse_mode: 'HTML'
          },
          { timeout: 10000 }
        );

        if (response.data.ok) {
          results.sent++;
        } else {
          results.failed++;
          results.errors.push(`Failed to send to ${linkedUser.email}: ${response.data.description}`);
        }
      } catch (error: any) {
        results.failed++;
        const errorMsg = error.response?.data?.description || error.message;
        results.errors.push(`Error sending to ${linkedUser.email}: ${errorMsg}`);
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return res.json({
      success: true,
      results,
      message: `Broadcast completed. Sent: ${results.sent}, Failed: ${results.failed}`
    });
  } catch (error) {
    logger.error('Error sending broadcast:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get Telegram statistics
 * Admin endpoint to view usage statistics
 */
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify user is admin
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true }
    });

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get statistics from database
    const [totalUsers, linkedUsers, activeUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          telegram_user_id: { not: null },
          telegram_link_status: 'linked'
        }
      }),
      prisma.user.count({
        where: {
          telegram_user_id: { not: null },
          telegram_link_status: 'linked',
          updated_at: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      })
    ]);

    const linkageRate = totalUsers > 0 ? (linkedUsers / totalUsers * 100).toFixed(2) : '0';
    const activityRate = linkedUsers > 0 ? (activeUsers / linkedUsers * 100).toFixed(2) : '0';

    return res.json({
      users: {
        total: totalUsers,
        linked: linkedUsers,
        active: activeUsers,
        linkageRate: `${linkageRate}%`,
        activityRate: `${activityRate}%`
      },
      bots: {
        support: !!process.env.TELEGRAM_SUPPORT_BOT_TOKEN,
        otp: !!process.env.TELEGRAM_OTP_BOT_TOKEN,
        alerts: !!process.env.TELEGRAM_ALERTS_BOT_TOKEN
      }
    });
  } catch (error) {
    logger.error('Error getting Telegram stats:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Test message endpoint
 * Admin endpoint to test bot functionality
 */
router.post('/test-message', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { chatId, message } = req.body;
    
    if (!chatId || !message) {
      return res.status(400).json({ error: 'Chat ID and message are required' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify user is admin
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true }
    });

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const axios = require('axios');
    const supportBotToken = process.env.TELEGRAM_SUPPORT_BOT_TOKEN;
    
    if (!supportBotToken) {
      return res.status(400).json({ error: 'Support bot token not configured' });
    }

    const response = await axios.post(
      `https://api.telegram.org/bot${supportBotToken}/sendMessage`,
      {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      },
      { timeout: 10000 }
    );

    if (response.data.ok) {
      return res.json({ success: true, message: 'Test message sent successfully' });
    } else {
      return res.status(500).json({ error: response.data.description });
    }
  } catch (error: any) {
    logger.error('Error sending test message:', error);
    const errorMsg = error.response?.data?.description || error.message;
    return res.status(500).json({ error: errorMsg });
  }
});

export default router;