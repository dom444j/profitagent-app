import axios from 'axios';
import { logger } from '../utils/logger';
import { prisma } from '../lib/prisma';
import * as crypto from 'crypto';
import Redis from 'ioredis';

interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode?: 'HTML' | 'Markdown';
}

interface UserData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
  language_code?: string;
}

interface OTPData {
  userId: string;
  code: string;
  type: 'withdrawal' | 'password_reset' | '2fa';
  expiresAt: Date;
}

export class TelegramService {
  private otpBotToken: string;
  private otpChatId: string;
  private alertsBotToken: string;
  private alertsChatId: string;
  private redis: Redis;

  constructor() {
    this.otpBotToken = process.env.TELEGRAM_OTP_BOT_TOKEN!;
    this.otpChatId = process.env.TELEGRAM_OTP_CHAT_ID!;
    this.alertsBotToken = process.env.TELEGRAM_ALERTS_BOT_TOKEN!;
    this.alertsChatId = process.env.TELEGRAM_ALERTS_CHAT_ID!;
    
    // Initialize Redis connection
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true
    });

    if (!this.otpBotToken || !this.alertsBotToken) {
      logger.error('Telegram bot tokens not configured');
      throw new Error('Telegram bot tokens not configured');
    }
  }

  // Resolve username to user ID
  private async resolveUsername(username: string, botToken: string): Promise<string | null> {
    try {
      // Remove @ if present
      const cleanUsername = username.replace('@', '');
      
      // Try to get chat info using username
      const url = `https://api.telegram.org/bot${botToken}/getChat`;
      const response = await axios.post(url, {
        chat_id: `@${cleanUsername}`
      });
      
      if (response.data.ok && response.data.result) {
        return response.data.result.id.toString();
      } else {
        logger.warn(`Failed to resolve username @${cleanUsername}:`, response.data);
        return null;
      }
    } catch (error) {
      logger.error(`Error resolving username @${username}:`, error);
      return null;
    }
  }

  // Validate Telegram ID in real-time
  private async validateTelegramId(chatId: string, botToken: string): Promise<boolean> {
    try {
      const url = `https://api.telegram.org/bot${botToken}/getChat`;
      const response = await axios.post(url, { chat_id: chatId });
      return response.data.ok;
    } catch (error: any) {
      const errorMsg = error.response?.data?.description || error.message;
      if (errorMsg.includes('chat not found') || errorMsg.includes('user not found')) {
        logger.warn(`Invalid Telegram ID: ${chatId}`);
        return false;
      }
      if (errorMsg.includes('bot was blocked')) {
        logger.warn(`Bot blocked by user: ${chatId}`);
        return false;
      }
      logger.error(`Error validating Telegram ID ${chatId}:`, errorMsg);
      return false;
    }
  }

  // Send message using OTP bot with retry logic
  private async sendOTPMessage(message: TelegramMessage, retries: number = 3): Promise<boolean> {
    try {
      // If chat_id starts with @, try to resolve username first
      let chatId = message.chat_id;
      if (chatId.startsWith('@')) {
        const resolvedId = await this.resolveUsername(chatId, this.otpBotToken);
        if (resolvedId) {
          chatId = resolvedId;
        } else {
          logger.error(`Could not resolve username: ${chatId}`);
          return false;
        }
      }

      // Validate ID before sending
      const isValid = await this.validateTelegramId(chatId, this.otpBotToken);
      if (!isValid) {
        logger.error(`Invalid or blocked Telegram ID: ${chatId}`);
        return false;
      }

      const url = `https://api.telegram.org/bot${this.otpBotToken}/sendMessage`;
      const response = await axios.post(url, {
        ...message,
        chat_id: chatId
      });
      
      if (response.data.ok) {
        logger.info('OTP message sent successfully');
        return true;
      } else {
        logger.error('Failed to send OTP message:', response.data);
        return false;
      }
    } catch (error: any) {
      this.logTelegramError(error, 'sendOTPMessage', message.chat_id);
      
      const errorMsg = error.response?.data?.description || error.message;
      
      // Handle rate limiting
      if (errorMsg.includes('Too Many Requests') && retries > 0) {
        const retryAfter = error.response?.data?.parameters?.retry_after || 1;
        logger.warn(`Rate limited, retrying after ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return this.sendOTPMessage(message, retries - 1);
      }
      
      // Handle temporary network errors
      if ((errorMsg.includes('network') || errorMsg.includes('timeout')) && retries > 0) {
        logger.warn(`Network error, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.sendOTPMessage(message, retries - 1);
      }
      
      return false;
    }
  }

  // Send message using Alerts bot with retry logic
  private async sendAlertMessage(message: TelegramMessage, retries: number = 3): Promise<boolean> {
    try {
      // If chat_id starts with @, try to resolve username first
      let chatId = message.chat_id;
      if (chatId.startsWith('@')) {
        const resolvedId = await this.resolveUsername(chatId, this.alertsBotToken);
        if (resolvedId) {
          chatId = resolvedId;
        } else {
          logger.error(`Could not resolve username: ${chatId}`);
          return false;
        }
      }

      // Validate ID before sending
      const isValid = await this.validateTelegramId(chatId, this.alertsBotToken);
      if (!isValid) {
        logger.error(`Invalid or blocked Telegram ID: ${chatId}`);
        return false;
      }

      const url = `https://api.telegram.org/bot${this.alertsBotToken}/sendMessage`;
      const response = await axios.post(url, {
        ...message,
        chat_id: chatId
      });
      
      if (response.data.ok) {
        logger.info('Alert message sent successfully');
        return true;
      } else {
        logger.error('Failed to send alert message:', response.data);
        return false;
      }
    } catch (error: any) {
      this.logTelegramError(error, 'sendAlertMessage', message.chat_id);
      
      const errorMsg = error.response?.data?.description || error.message;
      
      // Handle rate limiting
      if (errorMsg.includes('Too Many Requests') && retries > 0) {
        const retryAfter = error.response?.data?.parameters?.retry_after || 1;
        logger.warn(`Rate limited, retrying after ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return this.sendAlertMessage(message, retries - 1);
      }
      
      // Handle temporary network errors
      if ((errorMsg.includes('network') || errorMsg.includes('timeout')) && retries > 0) {
        logger.warn(`Network error, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.sendAlertMessage(message, retries - 1);
      }
      
      return false;
    }
  }

  // Generate and send OTP for withdrawal
  async sendWithdrawalOTP(userId: string, withdrawalId: string, amount: number): Promise<{ success: boolean; otpId?: string }> {
    try {
      // Get user info
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, first_name: true, last_name: true, telegram_user_id: true, telegram_username: true }
      });

      if (!user) {
        logger.error('User not found for withdrawal OTP');
        return { success: false };
      }

      // Generate 6-digit OTP
      const otpCode = crypto.randomInt(100000, 999999).toString();
      const otpId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours

      // Store OTP in Redis with expiration
      const otpData = {
        userId,
        code: otpCode,
        type: 'withdrawal',
        expiresAt: expiresAt.toISOString()
      };
      await this.redis.setex(`otp:${otpId}`, 4 * 60 * 60, JSON.stringify(otpData)); // 4 hours TTL

      // Prepare message for admin (always sent)
      const adminMessage: TelegramMessage = {
        chat_id: this.otpChatId,
        text: `🔍 <b>Código OTP para Retiro</b>

 ` +
               `👤 Usuario: ${user.first_name} ${user.last_name}
 ` +
               `📧 Email: ${user.email}
 ` +
              `💰 Monto: ${amount} USDT

 ` +
              `📢 <b>CÓDIGO OTP (6 dígitos):</b>
 ` +
              `<code>${otpCode}</code>

 ` +
              `⏰ Válido por: 4 horas

 ` +
              `📋 <i>ID Retiro: ${withdrawalId}</i>

 ` +
              `⚠️ <b>IMPORTANTE:</b> Ingresa solo el código de 6 dígitos (${otpCode}) en la plataforma.
 ` +
              `❌ NO uses el ID de retiro como código OTP.`,
        parse_mode: 'HTML'
      };

      // Send to admin (always)
      const adminSent = await this.sendOTPMessage(adminMessage);
      let userSent = false;

      // Send to user if they have Telegram configured
      if (user.telegram_user_id) {
        const userMessage: TelegramMessage = {
          chat_id: user.telegram_user_id,
          text: `🔐 <b>Código OTP para tu Retiro</b>

 ` +
                `💰 Monto: ${amount} USDT

 ` +
                `📢 <b>Tu código OTP:</b>
 ` +
                `<code>${otpCode}</code>

 ` +
                `⏰ Válido por: 4 horas

 ` +
                `⚠️ Ingresa este código en la plataforma para confirmar tu retiro.`,
          parse_mode: 'HTML'
        };
        
        try {
          userSent = await this.sendOTPMessage(userMessage);
        } catch (error) {
          logger.warn(`Failed to send OTP to user ${userId} via Telegram: ${(error as Error).message}`);
        }
      }
      
      if (adminSent) {
        logger.info(`Withdrawal OTP sent for user ${userId}, withdrawal ${withdrawalId}. Admin: ${adminSent}, User: ${userSent}`);
        return { success: true, otpId };
      } else {
        await this.redis.del(`otp:${otpId}`);
        return { success: false };
      }
    } catch (error) {
      logger.error('Error sending withdrawal OTP:', error);
      return { success: false };
    }
  }
  async verifyOTP(otpId: string, code: string): Promise<{ valid: boolean; userId?: string; type?: string }> {
    try {
      const otpDataStr = await this.redis.get(`otp:${otpId}`);
      
      if (!otpDataStr) {
        logger.warn('OTP not found or expired');
        return { valid: false };
      }

      const otpData = JSON.parse(otpDataStr);
      
      // Check expiration (Redis TTL should handle this, but double-check)
      if (new Date() > new Date(otpData.expiresAt)) {
        await this.redis.del(`otp:${otpId}`);
        logger.warn('OTP expired');
        return { valid: false };
      }

      // Verify code
      if (otpData.code === code) {
        await this.redis.del(`otp:${otpId}`); // Remove after successful verification
        logger.info(`OTP verified successfully for user ${otpData.userId}`);
        return { valid: true, userId: otpData.userId, type: otpData.type };
      } else {
        logger.warn('Invalid OTP code provided');
        return { valid: false };
      }
    } catch (error) {
      logger.error('Error verifying OTP:', error);
      return { valid: false };
    }
  }

  // Send password reset OTP
  async sendPasswordResetOTP(userId: string, email: string): Promise<{ success: boolean; otpId?: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { first_name: true, last_name: true }
      });

      if (!user) {
        return { success: false };
      }

      const otpCode = crypto.randomInt(100000, 999999).toString();
      const otpId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      const otpData = {
        userId,
        code: otpCode,
        type: 'password_reset',
        expiresAt: expiresAt.toISOString()
      };
      await this.redis.setex(`otp:${otpId}`, 15 * 60, JSON.stringify(otpData)); // 15 minutes TTL

      const message: TelegramMessage = {
        chat_id: this.otpChatId,
        text: `🔒 <b>Código de Recuperación de Contraseña</b>\n\n` +
              `👤 Usuario: ${user.first_name} ${user.last_name}\n` +
              `📧 Email: ${email}\n` +
              `📢 Código: <code>${otpCode}</code>\n` +
              `⏰ Válido por: 15 minutos\n\n` +
              `⚠️ Si no solicitaste este código, ignora este mensaje.`,
        parse_mode: 'HTML'
      };

      const sent = await this.sendOTPMessage(message);
      
      if (sent) {
        return { success: true, otpId };
      } else {
        await this.redis.del(`otp:${otpId}`);
        return { success: false };
      }
    } catch (error) {
      logger.error('Error sending password reset OTP:', error);
      return { success: false };
    }
  }

  // Send system alerts
  async sendSystemAlert(title: string, message: string, level: 'info' | 'warning' | 'error' = 'info'): Promise<boolean> {
    try {
      const emoji = level === 'error' ? '🚨' : level === 'warning' ? '⚠️' : 'ℹ️';
      
      const alertMessage: TelegramMessage = {
        chat_id: this.alertsChatId,
        text: `${emoji} <b>${title}</b>\n\n${message}\n\n🕐 ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`,
        parse_mode: 'HTML'
      };

      return await this.sendAlertMessage(alertMessage);
    } catch (error) {
      logger.error('Error sending system alert:', error);
      return false;
    }
  }

  // Send withdrawal status alerts to admin
  async sendWithdrawalAlert(type: 'new' | 'approved' | 'paid' | 'rejected', withdrawalData: any): Promise<boolean> {
    try {
      let title = '';
      let emoji = '';
      
      switch (type) {
        case 'new':
          title = 'Nuevo Retiro Solicitado';
          emoji = 'ðŸ’°';
          break;
        case 'approved':
          title = 'Retiro Aprobado';
          emoji = 'âœ…';
          break;
        case 'paid':
          title = 'Retiro Pagado';
          emoji = 'ðŸ’¸';
          break;
        case 'rejected':
          title = 'Retiro Rechazado';
          emoji = 'âŒ';
          break;
      }

      const amount = withdrawalData.amount_usdt || withdrawalData.amount || 0;
      const message: TelegramMessage = {
        chat_id: this.alertsChatId,
        text: `${emoji} <b>${title}</b>\n\n` +
              `👤 Usuario: ${withdrawalData.user?.first_name} ${withdrawalData.user?.last_name}\n` +
              `📧 Email: ${withdrawalData.user?.email}\n` +
              `💰 Monto: $${Number(amount).toFixed(2)} USDT\n` +
              `🏦 Dirección: ${withdrawalData.payout_address || withdrawalData.usdt_address}\n` +
              `🆔 ID: ${withdrawalData.id}\n` +
              `📅 Fecha: ${new Date(withdrawalData.created_at).toLocaleString('es-CO')}\n\n` +
              `🔗 Panel Admin: http://localhost:3000/admin/withdrawals`,
        parse_mode: 'HTML'
      };

      return await this.sendAlertMessage(message);
    } catch (error) {
      logger.error('Error sending withdrawal alert:', error);
      return false;
    }
  }

  // Send order status alerts to admin
  async sendOrderAlert(type: 'auto_confirmed' | 'validation_failed' | 'manual_review', orderData: any): Promise<boolean> {
    try {
      let title = '';
      let emoji = '';
      
      switch (type) {
        case 'auto_confirmed':
          title = 'Orden Auto-Confirmada';
          emoji = 'âœ…';
          break;
        case 'validation_failed':
          title = 'ValidaciÃ³n de Orden Fallida';
          emoji = 'âŒ';
          break;
        case 'manual_review':
          title = 'Orden Requiere RevisiÃ³n Manual';
          emoji = 'âš ï¸';
          break;
      }

      const message: TelegramMessage = {
        chat_id: this.alertsChatId,
        text: `${emoji} <b>${title}</b>\n\n` +
              `👤 Usuario: ${orderData.user?.first_name} ${orderData.user?.last_name}\n` +
              `📧 Email: ${orderData.user?.email}\n` +
              `💰 Monto: $${orderData.amount} USDT\n` +
              `🆔 ID: ${orderData.id}\n` +
              `🔗 Hash: ${orderData.transaction_hash}\n` +
              `📅 Fecha: ${new Date(orderData.created_at).toLocaleString('es-CO')}\n\n` +
              `🔗 Panel Admin: http://localhost:3000/admin/orders`,
        parse_mode: 'HTML'
      };

      return await this.sendAlertMessage(message);
    } catch (error) {
      logger.error('Error sending order alert:', error);
      return false;
    }
  }

  // Send notification to user with fallback support (supports both ID and username)
  async sendUserNotification(userId: string, messageText: string, useOTPBot: boolean = true): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { telegram_user_id: true, telegram_username: true, first_name: true }
      });

      if (!user) {
        logger.error(`User not found: ${userId}`);
        return false;
      }

      // First attempt: Try with numeric ID if available
      if (user.telegram_user_id) {
        logger.info(`Attempting to send notification to user ${userId} via ID: ${user.telegram_user_id}`);
        
        const isValidId = await this.validateTelegramId(user.telegram_user_id, useOTPBot ? this.otpBotToken : this.alertsBotToken);
        if (isValidId) {
          const message: TelegramMessage = {
            chat_id: user.telegram_user_id,
            text: messageText,
            parse_mode: 'HTML'
          };

          const result = useOTPBot ? await this.sendOTPMessage(message) : await this.sendAlertMessage(message);
          if (result) {
            logger.info(`Notification sent successfully to user ${userId} via ID`);
            return true;
          } else {
            logger.warn(`Failed to send notification via ID ${user.telegram_user_id}, attempting fallback...`);
          }
        } else {
          logger.warn(`Invalid Telegram ID for user ${userId}: ${user.telegram_user_id}. Attempting fallback...`);
        }
      }

      // Second attempt: Try with username as fallback
      if (user.telegram_username) {
        const usernameIdentifier = user.telegram_username.startsWith('@') ? user.telegram_username : `@${user.telegram_username}`;
        logger.info(`Attempting fallback notification to user ${userId} via username: ${usernameIdentifier}`);
        
        const fallbackMessage: TelegramMessage = {
          chat_id: usernameIdentifier,
          text: messageText,
          parse_mode: 'HTML'
        };

        const fallbackResult = useOTPBot ? await this.sendOTPMessage(fallbackMessage) : await this.sendAlertMessage(fallbackMessage);
        if (fallbackResult) {
          logger.info(`Notification sent successfully to user ${userId} via fallback username: ${usernameIdentifier}`);
          return true;
        } else {
          logger.error(`Failed to send notification to user ${userId} via both ID (${user.telegram_user_id || 'none'}) and username (${usernameIdentifier})`);
        }
      } else {
        logger.error(`No fallback username available for user ${userId}`);
      }

      logger.warn(`No valid Telegram contact method found for user ${userId}`);
      return false;
    } catch (error: any) {
      this.logTelegramError(error, 'sendUserNotification', userId);
      return false;
    }
  }

  // Send Telegram account linking confirmation with fallback support
  async sendTelegramLinkConfirmation(telegramIdentifier: string, userName: string, fallbackUsername?: string): Promise<boolean> {
    try {
      // First attempt: Try with the primary identifier (usually numeric ID)
      logger.info(`Attempting to send confirmation to Telegram ID: ${telegramIdentifier}`);
      
      const isValidId = await this.validateTelegramId(telegramIdentifier, this.otpBotToken);
      if (isValidId) {
        const messageText = `ðŸŽ‰ <b>Â¡Cuenta vinculada exitosamente!</b>\n\n` +
              `Hola ${userName}, tu cuenta de Telegram ha sido vinculada correctamente a tu perfil de profitagent.\n\n` +
              `✅ <b>Beneficios activados:</b>\n` +
              `• Códigos OTP para retiros seguros\n` +
              `• Notificaciones de transacciones\n` +
              `• Alertas del sistema\n` +
              `• Confirmaciones de órdenes\n\n` +
              `🔐 Tu cuenta ahora está más segura con la verificación en dos pasos.\n\n` +
              `📱 <i>profitagent - Investor Panel</i>`;

        const message: TelegramMessage = {
          chat_id: telegramIdentifier,
          text: messageText,
          parse_mode: 'HTML'
        };

        const result = await this.sendOTPMessage(message);
        if (result) {
          logger.info(`Telegram confirmation sent successfully to ${telegramIdentifier}`);
          return true;
        } else {
          logger.warn(`Failed to send via primary identifier ${telegramIdentifier}, attempting fallback...`);
        }
      } else {
        logger.warn(`Invalid Telegram ID detected: ${telegramIdentifier}. Attempting fallback...`);
      }
      
      // Second attempt: Try with fallback username if available
      if (fallbackUsername) {
        logger.info(`Attempting fallback confirmation to username: @${fallbackUsername}`);
        
        // For username, we need to use @ prefix
        const usernameIdentifier = fallbackUsername.startsWith('@') ? fallbackUsername : `@${fallbackUsername}`;
        
        const fallbackMessageText = `ðŸŽ‰ <b>Â¡Cuenta vinculada exitosamente!</b>\n\n` +
              `Hola ${userName}, tu cuenta de Telegram ha sido vinculada correctamente a tu perfil de profitagent.\n\n` +
              `⚠️ <b>Nota importante:</b> Se usó tu username como método de respaldo. Para recibir códigos OTP y notificaciones completas, te recomendamos obtener tu ID numérico desde @userinfobot y actualizar tu vinculación.\n\n` +
              `✅ <b>Beneficios parciales activados:</b>\n` +
              `• Confirmaciones básicas\n` +
              `• Alertas del sistema\n\n` +
              `🔐 Para mayor seguridad, actualiza a ID numérico cuando sea posible.\n\n` +
              `📱 <i>profitagent - Investor Panel</i>`;

        const fallbackMessage: TelegramMessage = {
          chat_id: usernameIdentifier,
          text: fallbackMessageText,
          parse_mode: 'HTML'
        };

        const fallbackResult = await this.sendOTPMessage(fallbackMessage);
        if (fallbackResult) {
          logger.info(`Telegram confirmation sent successfully via fallback username: ${usernameIdentifier}`);
          return true;
        } else {
          logger.error(`Failed to send Telegram confirmation via both primary (${telegramIdentifier}) and fallback (${usernameIdentifier}) methods`);
        }
      } else {
        logger.error(`Failed to send Telegram confirmation to ${telegramIdentifier} and no fallback username available`);
      }
      
      return false;
    } catch (error: any) {
      this.logTelegramError(error, 'sendTelegramLinkConfirmation', telegramIdentifier);
      return false;
    }
  }

  // Clean expired OTPs (Redis TTL handles this automatically, but this method can be used for manual cleanup)
  async cleanExpiredOTPs(): Promise<void> {
    try {
      const keys = await this.redis.keys('otp:*');
      const now = new Date();
      
      for (const key of keys) {
        const otpDataStr = await this.redis.get(key);
        if (otpDataStr) {
          const otpData = JSON.parse(otpDataStr);
          if (now > new Date(otpData.expiresAt)) {
            await this.redis.del(key);
          }
        }
      }
    } catch (error) {
      logger.error('Error cleaning expired OTPs:', error);
    }
  }

  // Get OTP statistics
  async getOTPStats(): Promise<{ total: number; byType: Record<string, number> }> {
    try {
      const keys = await this.redis.keys('otp:*');
      const stats = { total: 0, byType: {} as Record<string, number> };
      
      for (const key of keys) {
        const otpDataStr = await this.redis.get(key);
        if (otpDataStr) {
          const otpData = JSON.parse(otpDataStr);
          stats.total++;
          stats.byType[otpData.type] = (stats.byType[otpData.type] || 0) + 1;
        }
      }
      
      return stats;
    } catch (error) {
      logger.error('Error getting OTP stats:', error);
      return { total: 0, byType: {} };
    }
  }

  // Check if bot is blocked by user
  async isBotBlocked(chatId: string): Promise<boolean> {
    try {
      const response = await axios.get(`https://api.telegram.org/bot${this.otpBotToken}/getChat`, {
        params: { chat_id: chatId }
      });
      return false; // If we can get chat info, bot is not blocked
    } catch (error: any) {
      if (error.response?.data?.description?.includes('bot was blocked')) {
        logger.warn(`Bot blocked by user: ${chatId}`);
        return true;
      }
      return false;
    }
  }

  // Get Telegram service health status
  async getServiceHealth(): Promise<{
    otpBot: boolean;
    alertBot: boolean;
    redis: boolean;
    totalOTPs: number;
  }> {
    const health = {
      otpBot: false,
      alertBot: false,
      redis: false,
      totalOTPs: 0
    };

    try {
      // Test OTP bot
      const otpResponse = await axios.get(`https://api.telegram.org/bot${this.otpBotToken}/getMe`);
      health.otpBot = otpResponse.data.ok;
    } catch (error) {
      logger.error('OTP bot health check failed:', error);
    }

    try {
      // Test Alert bot
      const alertResponse = await axios.get(`https://api.telegram.org/bot${this.alertsBotToken}/getMe`);
      health.alertBot = alertResponse.data.ok;
    } catch (error) {
      logger.error('Alert bot health check failed:', error);
    }

    try {
      // Test Redis
      await this.redis.ping();
      health.redis = true;
      
      // Get OTP count
      const stats = await this.getOTPStats();
      health.totalOTPs = stats.total;
    } catch (error) {
      logger.error('Redis health check failed:', error);
    }

    return health;
  }

  // Log Telegram error with context
  private logTelegramError(error: any, context: string, chatId?: string): void {
    const errorInfo = {
      context,
      chatId,
      error: error.message,
      response: error.response?.data,
      status: error.response?.status
    };
    
    if (error.response?.data?.description?.includes('chat not found')) {
      logger.warn('Telegram chat not found:', errorInfo);
    } else if (error.response?.data?.description?.includes('bot was blocked')) {
      logger.warn('Telegram bot blocked by user:', errorInfo);
    } else if (error.response?.status === 429) {
      logger.warn('Telegram rate limit exceeded:', errorInfo);
    } else {
      logger.error('Telegram API error:', errorInfo);
    }
  }
}

// Export singleton instance
export const telegramService = new TelegramService();

// Clean expired OTPs every 5 minutes
setInterval(async () => {
  await telegramService.cleanExpiredOTPs();
}, 5 * 60 * 1000);
