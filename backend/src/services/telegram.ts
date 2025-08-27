import axios from 'axios';
import { logger } from '../utils/logger';
import { prisma } from '../lib/prisma';
import * as crypto from 'crypto';

interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode?: 'HTML' | 'Markdown';
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
  private otpStorage: Map<string, OTPData> = new Map();

  constructor() {
    this.otpBotToken = process.env.TELEGRAM_OTP_BOT_TOKEN!;
    this.otpChatId = process.env.TELEGRAM_OTP_CHAT_ID!;
    this.alertsBotToken = process.env.TELEGRAM_ALERTS_BOT_TOKEN!;
    this.alertsChatId = process.env.TELEGRAM_ALERTS_CHAT_ID!;

    if (!this.otpBotToken || !this.alertsBotToken) {
      logger.error('Telegram bot tokens not configured');
      throw new Error('Telegram bot tokens not configured');
    }
  }

  // Send message using OTP bot
  private async sendOTPMessage(message: TelegramMessage): Promise<boolean> {
    try {
      const url = `https://api.telegram.org/bot${this.otpBotToken}/sendMessage`;
      const response = await axios.post(url, message);
      
      if (response.data.ok) {
        logger.info('OTP message sent successfully');
        return true;
      } else {
        logger.error('Failed to send OTP message:', response.data);
        return false;
      }
    } catch (error) {
      logger.error('Error sending OTP message:', error);
      return false;
    }
  }

  // Send message using Alerts bot
  private async sendAlertMessage(message: TelegramMessage): Promise<boolean> {
    try {
      const url = `https://api.telegram.org/bot${this.alertsBotToken}/sendMessage`;
      const response = await axios.post(url, message);
      
      if (response.data.ok) {
        logger.info('Alert message sent successfully');
        return true;
      } else {
        logger.error('Failed to send alert message:', response.data);
        return false;
      }
    } catch (error) {
      logger.error('Error sending alert message:', error);
      return false;
    }
  }

  // Generate and send OTP for withdrawal
  async sendWithdrawalOTP(userId: string, withdrawalId: string, amount: number): Promise<{ success: boolean; otpId?: string }> {
    try {
      // Get user info
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, first_name: true, last_name: true, telegram_user_id: true }
      });

      if (!user) {
        logger.error('User not found for withdrawal OTP');
        return { success: false };
      }

      // Generate 6-digit OTP
      const otpCode = crypto.randomInt(100000, 999999).toString();
      const otpId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours

      // Store OTP
      this.otpStorage.set(otpId, {
        userId,
        code: otpCode,
        type: 'withdrawal',
        expiresAt
      });

      // Prepare message
      const message: TelegramMessage = {
        chat_id: this.otpChatId,
        text: `🔐 <b>Código OTP para Retiro</b>\n\n` +
              `👤 Usuario: ${user.first_name} ${user.last_name}\n` +
              `📧 Email: ${user.email}\n` +
              `💰 Monto: $${amount} USDT\n\n` +
              `🔢 <b>CÓDIGO OTP (6 dígitos):</b>\n` +
              `<code>${otpCode}</code>\n\n` +
              `⏰ Válido por: 4 horas\n\n` +
              `📋 <i>ID Retiro: ${withdrawalId}</i>\n\n` +
              `⚠️ <b>IMPORTANTE:</b> Ingresa solo el código de 6 dígitos (${otpCode}) en la plataforma.\n` +
              `❌ NO uses el ID de retiro como código OTP.`,
        parse_mode: 'HTML'
      };

      const sent = await this.sendOTPMessage(message);
      
      if (sent) {
        logger.info(`Withdrawal OTP sent for user ${userId}, withdrawal ${withdrawalId}`);
        return { success: true, otpId };
      } else {
        this.otpStorage.delete(otpId);
        return { success: false };
      }
    } catch (error) {
      logger.error('Error sending withdrawal OTP:', error);
      return { success: false };
    }
  }

  // Verify OTP code
  async verifyOTP(otpId: string, code: string): Promise<{ valid: boolean; userId?: string; type?: string }> {
    try {
      const otpData = this.otpStorage.get(otpId);
      
      if (!otpData) {
        logger.warn('OTP not found or expired');
        return { valid: false };
      }

      // Check expiration
      if (new Date() > otpData.expiresAt) {
        this.otpStorage.delete(otpId);
        logger.warn('OTP expired');
        return { valid: false };
      }

      // Verify code
      if (otpData.code === code) {
        this.otpStorage.delete(otpId); // Remove after successful verification
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

      this.otpStorage.set(otpId, {
        userId,
        code: otpCode,
        type: 'password_reset',
        expiresAt
      });

      const message: TelegramMessage = {
        chat_id: this.otpChatId,
        text: `🔑 <b>Código de Recuperación de Contraseña</b>\n\n` +
              `👤 Usuario: ${user.first_name} ${user.last_name}\n` +
              `📧 Email: ${email}\n` +
              `🔢 Código: <code>${otpCode}</code>\n` +
              `⏰ Válido por: 15 minutos\n\n` +
              `⚠️ Si no solicitaste este código, ignora este mensaje.`,
        parse_mode: 'HTML'
      };

      const sent = await this.sendOTPMessage(message);
      
      if (sent) {
        return { success: true, otpId };
      } else {
        this.otpStorage.delete(otpId);
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
          emoji = '✅';
          break;
        case 'validation_failed':
          title = 'Validación de Orden Fallida';
          emoji = '❌';
          break;
        case 'manual_review':
          title = 'Orden Requiere Revisión Manual';
          emoji = '⚠️';
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

  // Send Telegram account linking confirmation
  async sendTelegramLinkConfirmation(telegramUserId: string, userName: string): Promise<boolean> {
    try {
      const message: TelegramMessage = {
        chat_id: telegramUserId,
        text: `🎉 <b>¡Cuenta vinculada exitosamente!</b>\n\n` +
              `Hola ${userName}, tu cuenta de Telegram ha sido vinculada correctamente a tu perfil de Grow5x.\n\n` +
              `✅ <b>Beneficios activados:</b>\n` +
              `• Códigos OTP para retiros seguros\n` +
              `• Notificaciones de transacciones\n` +
              `• Alertas del sistema\n` +
              `• Confirmaciones de órdenes\n\n` +
              `🔐 Tu cuenta ahora está más segura con la verificación en dos pasos.\n\n` +
              `📱 <i>Grow5x - Investor Panel</i>`,
        parse_mode: 'HTML'
      };

      return await this.sendOTPMessage(message);
    } catch (error) {
      logger.error('Error sending Telegram link confirmation:', error);
      return false;
    }
  }

  // Clean expired OTPs (should be called periodically)
  cleanExpiredOTPs(): void {
    const now = new Date();
    for (const [otpId, otpData] of this.otpStorage.entries()) {
      if (now > otpData.expiresAt) {
        this.otpStorage.delete(otpId);
      }
    }
  }

  // Get OTP statistics
  getOTPStats(): { total: number; byType: Record<string, number> } {
    const stats = { total: 0, byType: {} as Record<string, number> };
    
    for (const otpData of this.otpStorage.values()) {
      stats.total++;
      stats.byType[otpData.type] = (stats.byType[otpData.type] || 0) + 1;
    }
    
    return stats;
  }
}

// Export singleton instance
export const telegramService = new TelegramService();

// Clean expired OTPs every 5 minutes
setInterval(() => {
  telegramService.cleanExpiredOTPs();
}, 5 * 60 * 1000);