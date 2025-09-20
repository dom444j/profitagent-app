import axios from 'axios';
import crypto from 'crypto';
import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { prisma } from '../lib/prisma';

interface TelegramMessage {
  chat_id: string | number;
  text: string;
  parse_mode?: 'HTML' | 'Markdown';
}

interface TelegramResponse {
  ok: boolean;
  result?: any;
  description?: string;
}

interface OTPStats {
  total: number;
  active: number;
  expired: number;
}

interface HealthStatus {
  telegram: boolean;
  redis: boolean;
  totalOTPs?: number;
}

class TelegramService {
  private botToken: string;
  private otpChatId: string;
  private alertsChatId: string;
  private redis: Redis;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.otpChatId = process.env.TELEGRAM_OTP_CHAT_ID || '';
    this.alertsChatId = process.env.TELEGRAM_ALERTS_CHAT_ID || '';
    
    const redisConfig: any = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 3,
    };
    
    if (process.env.REDIS_PASSWORD) {
      redisConfig.password = process.env.REDIS_PASSWORD;
    }
    
    this.redis = new Redis(redisConfig);

    if (!this.botToken) {
      logger.warn('TELEGRAM_BOT_TOKEN not configured');
    }
    if (!this.otpChatId) {
      logger.warn('TELEGRAM_OTP_CHAT_ID not configured');
    }
    if (!this.alertsChatId) {
      logger.warn('TELEGRAM_ALERTS_CHAT_ID not configured');
    }
  }

  async sendMessage(message: TelegramMessage, retries = 3): Promise<boolean> {
    if (!this.botToken) {
      logger.warn('Telegram bot token not configured');
      return false;
    }

    try {
      const response = await axios.post(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
        message,
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.ok) {
        return true;
      } else {
        logger.error('Failed to send Telegram message:', response.data);
        return false;
      }
    } catch (error: any) {
      this.logTelegramError(error, 'sendMessage', message.chat_id);
      
      const errorMsg = error.response?.data?.description || error.message;
      
      // Handle rate limiting
      if (errorMsg.includes('Too Many Requests') && retries > 0) {
        const retryAfter = error.response?.data?.parameters?.retry_after || 1;
        logger.warn(`Rate limited, retrying after ${retryAfter} seconds`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return this.sendMessage(message, retries - 1);
      }
      
      return false;
    }
  }

  // Send OTP messages (withdrawal, password reset)
  private async sendOTPMessage(message: TelegramMessage, retries = 3): Promise<boolean> {
    if (!this.botToken) {
      logger.warn('Telegram bot token not configured');
      return false;
    }

    try {
      const response = await axios.post(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
        message,
        {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.ok) {
        logger.info(`OTP message sent successfully to chat ${message.chat_id}`);
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
        logger.warn(`Rate limited, retrying after ${retryAfter} seconds`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return this.sendOTPMessage(message, retries - 1);
      }
      
      return false;
    }
  }

  // Send alert messages (system notifications)
  private async sendAlertMessage(message: TelegramMessage, retries = 3): Promise<boolean> {
    if (!this.botToken) {
      logger.warn('Telegram bot token not configured');
      return false;
    }

    try {
      const response = await axios.post(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
        message,
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.ok) {
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
        logger.warn(`Rate limited, retrying after ${retryAfter} seconds`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return this.sendAlertMessage(message, retries - 1);
      }
      
      return false;
    }
  }

  // Send withdrawal OTP
  async sendWithdrawalOTP(userId: string, withdrawalId: string, amount: number): Promise<{ success: boolean; otpId?: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { first_name: true, last_name: true, email: true, telegram_user_id: true }
      });

      if (!user) {
        return { success: false };
      }

      const otpCode = crypto.randomInt(100000, 999999).toString();
      const otpId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours

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
        text: `🔐 <b>Código OTP para Retiro</b>\n\n` +
              `👤 Usuario: ${user.first_name} ${user.last_name}\n` +
              `📧 Email: ${user.email}\n` +
              `💰 Monto: ${amount} USDT\n\n` +
              `📢 <b>CÓDIGO OTP (6 dígitos):</b>\n` +
              `<code>${otpCode}</code>\n\n` +
              `⏰ Válido por: 4 horas\n\n` +
              `📋 <i>ID Retiro: ${withdrawalId}</i>\n\n` +
              `⚠️ <b>IMPORTANTE:</b> Ingresa solo el código de 6 dígitos (${otpCode}) en la plataforma.\n` +
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
          text: `🔐 <b>Código OTP para tu Retiro</b>\n\n` +
                `💰 Monto: ${amount} USDT\n\n` +
                `📢 <b>Tu código OTP:</b>\n` +
                `<code>${otpCode}</code>\n\n` +
                `⏰ Válido por: 4 horas\n\n` +
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
        text: `${emoji} <b>ProFitAgent - ${title}</b>\n\n${message}\n\n🤖 Sistema de Alertas ProFitAgent\n🕐 ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`,
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
          emoji = '💰';
          break;
        case 'approved':
          title = 'Retiro Aprobado';
          emoji = '✅';
          break;
        case 'paid':
          title = 'Retiro Pagado';
          emoji = '💸';
          break;
        case 'rejected':
          title = 'Retiro Rechazado';
          emoji = '❌';
          break;
      }

      const amount = withdrawalData.amount_usdt || withdrawalData.amount || 0;
      const message: TelegramMessage = {
        chat_id: this.alertsChatId,
        text: `${emoji} <b>ProFitAgent - ${title}</b>\n\n` +
              `👤 Usuario: ${withdrawalData.user?.first_name} ${withdrawalData.user?.last_name}\n` +
              `📧 Email: ${withdrawalData.user?.email}\n` +
              `💰 Monto: $${Number(amount).toFixed(2)} USDT\n` +
              `🏦 Dirección: ${withdrawalData.payout_address || withdrawalData.usdt_address}\n` +
              `🆔 ID: ${withdrawalData.id}\n` +
              `📅 Fecha: ${new Date(withdrawalData.created_at).toLocaleString('es-CO')}\n\n` +
              `🤖 Sistema de Alertas ProFitAgent\n` +
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
  async sendOrderAlert(type: 'new' | 'confirmed' | 'failed' | 'auto_confirmed' | 'validation_failed' | 'manual_confirmation_required', orderData: any): Promise<boolean> {
    try {
      let title = '';
      let emoji = '';
      
      switch (type) {
        case 'new':
          title = 'Nueva Orden Recibida';
          emoji = '📦';
          break;
        case 'confirmed':
          title = 'Orden Confirmada';
          emoji = '✅';
          break;
        case 'failed':
          title = 'Orden Fallida';
          emoji = '❌';
          break;
        case 'auto_confirmed':
          title = 'Orden Auto-Confirmada';
          emoji = '🤖';
          break;
        case 'validation_failed':
          title = 'Validación de Orden Fallida';
          emoji = '⚠️';
          break;
        case 'manual_confirmation_required':
          title = 'Confirmación Manual Requerida';
          emoji = '👨‍💼';
          break;
      }

      const message: TelegramMessage = {
        chat_id: this.alertsChatId,
        text: `${emoji} <b>ProFitAgent - ${title}</b>\n\n` +
              `👤 Usuario: ${orderData.user?.first_name} ${orderData.user?.last_name}\n` +
              `📧 Email: ${orderData.user?.email}\n` +
              `💰 Monto: $${orderData.amount} USDT\n` +
              `🆔 ID: ${orderData.id}\n` +
              `🔗 Hash: ${orderData.transaction_hash}\n` +
              `📅 Fecha: ${new Date(orderData.created_at).toLocaleString('es-CO')}\n\n` +
              `🤖 Sistema de Alertas ProFitAgent\n` +
              `🔗 Panel Admin: http://localhost:3000/admin/orders`,
        parse_mode: 'HTML'
      };

      return await this.sendAlertMessage(message);
    } catch (error) {
      logger.error('Error sending order alert:', error);
      return false;
    }
  }

  // Get OTP statistics
  async getOTPStats(): Promise<OTPStats> {
    try {
      const keys = await this.redis.keys('otp:*');
      const total = keys.length;
      
      let active = 0;
      let expired = 0;
      
      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl > 0) {
          active++;
        } else {
          expired++;
        }
      }
      
      return { total, active, expired };
    } catch (error) {
      logger.error('Error getting OTP stats:', error);
      return { total: 0, active: 0, expired: 0 };
    }
  }

  // Clean expired OTPs
  async cleanExpiredOTPs(): Promise<number> {
    try {
      const keys = await this.redis.keys('otp:*');
      let cleaned = 0;
      
      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl <= 0) {
          await this.redis.del(key);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        logger.info(`Cleaned ${cleaned} expired OTPs`);
      }
      
      return cleaned;
    } catch (error) {
      logger.error('Error cleaning expired OTPs:', error);
      return 0;
    }
  }

  // Test Telegram connection
  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(
        `https://api.telegram.org/bot${this.botToken}/getMe`,
        { timeout: 5000 }
      );
      
      return response.data.ok;
    } catch (error) {
      logger.error('Telegram connection test failed:', error);
      return false;
    }
  }

  // Send account linking success message
  async sendAccountLinkingSuccess(telegramUserId: string, userEmail: string): Promise<boolean> {
    try {
      const messageText = `🎉 <b>¡Cuenta vinculada exitosamente!</b>\n\n` +
                          `📧 Email: ${userEmail}\n\n` +
                          `✅ Tu cuenta de Telegram ha sido vinculada correctamente.\n` +
                          `🔐 Ahora recibirás códigos OTP directamente aquí.\n\n` +
                          `🔒 Beneficios de la vinculación:\n` +
                          `• Códigos OTP instantáneos\n` +
                          `• Notificaciones de seguridad\n` +
                          `🔍 Tu cuenta ahora está más segura con la verificación en dos pasos.\n\n` +
                          `📱 <i>profitagent - Investor Panel</i>`;

      const message: TelegramMessage = {
        chat_id: telegramUserId,
        text: messageText,
        parse_mode: 'HTML'
      };

      const sent = await this.sendMessage(message);
      
      if (!sent) {
        // If direct message fails, try sending to admin chat as fallback
        logger.warn(`Failed to send direct message to user ${telegramUserId}, sending to admin chat`);
        
        const fallbackMessage: TelegramMessage = {
          chat_id: this.alertsChatId,
          text: `⚠️ <b>Vinculación exitosa pero mensaje no entregado</b>\n\n` +
                `📧 Usuario: ${userEmail}\n` +
                `👤 Telegram ID: ${telegramUserId}\n\n` +
                `✅ La cuenta fue vinculada correctamente pero no se pudo enviar el mensaje de confirmación al usuario.`
        };
        
        await this.sendAlertMessage(fallbackMessage);
        
        // Also try with username format if numeric ID failed
        const fallbackMessageText = `🎉 <b>¡Cuenta vinculada exitosamente!</b>\n\n` +
                                    `📧 Email: ${userEmail}\n\n` +
                                    `✅ Tu cuenta de Telegram ha sido vinculada correctamente.\n` +
                                    `🔐 Ahora recibirás códigos OTP directamente aquí.\n\n` +
                                    `🔒 Beneficios de la vinculación:\n` +
                                    `• Códigos OTP instantáneos\n` +
                                    `• Notificaciones de seguridad\n` +
                                    `🔍 Para mayor seguridad, actualiza a ID numérico cuando sea posible.\n\n` +
                                    `📱 <i>profitagent - Investor Panel</i>`;
        
        const fallbackDirectMessage: TelegramMessage = {
          chat_id: `@${telegramUserId}`,
          text: fallbackMessageText,
          parse_mode: 'HTML'
        };
        
        return await this.sendMessage(fallbackDirectMessage);
      }
      
      return sent;
    } catch (error) {
      logger.error('Error sending account linking success message:', error);
      return false;
    }
  }

  // Send test message
  async sendTestMessage(chatId: string, message: string): Promise<boolean> {
    try {
      const testMessage: TelegramMessage = {
        chat_id: chatId,
        text: `🧪 <b>Mensaje de Prueba</b>\n\n${message}\n\n🕐 ${new Date().toLocaleString('es-CO')}`,
        parse_mode: 'HTML'
      };

      return await this.sendMessage(testMessage);
    } catch (error) {
      logger.error('Error sending test message:', error);
      return false;
    }
  }

  // Get service health status
  async getHealthStatus(): Promise<HealthStatus> {
    const health: HealthStatus = {
      telegram: false,
      redis: false
    };

    // Test Telegram
    try {
      health.telegram = await this.testConnection();
    } catch (error) {
      logger.error('Telegram health check failed:', error);
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

  async sendTelegramLinkConfirmation(telegramIdentifier: string, userName: string, fallbackUsername?: string): Promise<boolean> {
    try {
      const messageText = `🎉 <b>¡Cuenta vinculada exitosamente!</b>\n\n` +
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
        logger.warn(`Failed to send confirmation to ${telegramIdentifier}`);
        return false;
      }
    } catch (error) {
      this.logTelegramError(error, 'sendTelegramLinkConfirmation', telegramIdentifier);
      return false;
    }
  }

  // Log Telegram error with context
  private logTelegramError(error: any, context: string, chatId?: string | number): void {
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