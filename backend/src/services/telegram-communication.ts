import axios from 'axios';
import { logger } from '../utils/logger';
import { prisma } from '../lib/prisma';
import { telegramService } from './telegram';
import { aiSupportService } from './ai-support';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text?: string;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    data: string;
  };
}

interface BotCommand {
  command: string;
  description: string;
  handler: (chatId: number, userId: number, args?: string[]) => Promise<void>;
}

class TelegramCommunicationService {
  private supportBotToken: string;
  private commands: Map<string, BotCommand> = new Map();

  constructor() {
    this.supportBotToken = process.env.TELEGRAM_SUPPORT_BOT_TOKEN || '';
    this.initializeCommands();

    if (!this.supportBotToken) {
      logger.warn('TELEGRAM_SUPPORT_BOT_TOKEN not configured');
    }
  }

  private initializeCommands(): void {
    const commands: BotCommand[] = [
      {
        command: '/start',
        description: 'Iniciar conversación con el bot',
        handler: this.handleStartCommand.bind(this)
      },
      {
        command: '/help',
        description: 'Mostrar ayuda y comandos disponibles',
        handler: this.handleHelpCommand.bind(this)
      },
      {
        command: '/balance',
        description: 'Consultar balance actual',
        handler: this.handleBalanceCommand.bind(this)
      },
      {
        command: '/status',
        description: 'Ver estado de la cuenta',
        handler: this.handleStatusCommand.bind(this)
      },
      {
        command: '/link',
        description: 'Vincular cuenta de Telegram',
        handler: this.handleLinkCommand.bind(this)
      },
      {
        command: '/notifications',
        description: 'Configurar notificaciones',
        handler: this.handleNotificationsCommand.bind(this)
      },
      {
        command: '/support',
        description: 'Contactar soporte técnico',
        handler: this.handleSupportCommand.bind(this)
      }
    ];

    commands.forEach(cmd => {
      this.commands.set(cmd.command, cmd);
    });
  }

  async processUpdate(update: TelegramUpdate): Promise<void> {
    try {
      if (update.message) {
        await this.handleMessage(update.message);
      } else if (update.callback_query) {
        await this.handleCallbackQuery(update.callback_query);
      }
    } catch (error) {
      logger.error('Error processing Telegram update:', error);
    }
  }

  private async handleMessage(message: any): Promise<void> {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = message.text || '';

    // Log interaction
    await this.logInteraction(userId.toString(), 'message', text);

    if (text.startsWith('/')) {
      const [command, ...args] = text.split(' ');
      const commandHandler = this.commands.get(command);
      
      if (commandHandler) {
        await commandHandler.handler(chatId, userId, args);
      } else {
        await this.sendMessage(chatId, '❓ Comando no reconocido. Usa /help para ver los comandos disponibles.');
      }
    } else {
      // Handle regular messages
      await this.handleRegularMessage(chatId, userId, text);
    }
  }

  private async handleCallbackQuery(callbackQuery: any): Promise<void> {
    const chatId = callbackQuery.from.id;
    const data = callbackQuery.data;

    // Log interaction
    await this.logInteraction(chatId.toString(), 'callback', data);

    // Handle different callback actions
    if (data.startsWith('command:')) {
      const command = data.split(':')[1];
      const commandHandler = this.commands.get(command);
      
      if (commandHandler) {
        await commandHandler.handler(chatId, callbackQuery.from.id, []);
      } else {
        await this.sendMessage(chatId, '❓ Comando no reconocido.');
      }
    } else if (data.startsWith('action:')) {
      const action = data.split(':')[1];
      await this.handleActionCallback(chatId, action);
    } else if (data.startsWith('link_account:')) {
      const email = data.split(':')[1];
      await this.handleAccountLinking(chatId, email);
    } else if (data.startsWith('notifications:')) {
      const action = data.split(':')[1];
      await this.handleNotificationSettings(chatId, action);
    }

    // Answer callback query
    await this.answerCallbackQuery(callbackQuery.id);
  }

  private async handleStartCommand(chatId: number, userId: number): Promise<void> {
    const user = await this.findUserByTelegramId(userId);
    
    let message = '🎉 ¡Bienvenido a ProFitAgent!\n\n';
    
    if (user) {
      message += `Hola ${user.first_name}, tu cuenta ya está vinculada.\n\n`;
    } else {
      message += 'Para comenzar, necesitas vincular tu cuenta de ProFitAgent.\n\n';
    }
    
    message += '📋 Comandos disponibles:\n';
    message += '/help - Ver todos los comandos\n';
    message += '/balance - Consultar balance\n';
    message += '/status - Estado de la cuenta\n';
    message += '/link - Vincular cuenta\n';
    message += '/support - Contactar soporte\n\n';
    message += '💬 También puedes escribirme directamente para recibir ayuda.';

    await this.sendMessage(chatId, message);
  }

  private async handleHelpCommand(chatId: number, userId: number): Promise<void> {
    let message = '📚 **Ayuda de ProFitAgent Bot**\n\n';
    message += '🤖 **Comandos disponibles:**\n\n';
    
    this.commands.forEach((cmd, command) => {
      message += `${command} - ${cmd.description}\n`;
    });
    
    message += '\n💡 **Consejos:**\n';
    message += '• Vincula tu cuenta para acceder a todas las funciones\n';
    message += '• Usa /notifications para configurar alertas\n';
    message += '• Escribe directamente para contactar soporte\n\n';
    message += '🔗 **Enlaces útiles:**\n';
    message += '• Panel de control: https://profitagent.app\n';
      message += '• Documentación: https://docs.profitagent.app';

    await this.sendMessage(chatId, message, 'Markdown');
  }

  private async handleBalanceCommand(chatId: number, userId: number): Promise<void> {
    const user = await this.findUserByTelegramId(userId);
    
    if (!user) {
      await this.sendMessage(chatId, '❌ Cuenta no vinculada. Usa /link para vincular tu cuenta.');
      return;
    }

    try {
      // Import BalanceService
      const { BalanceService } = await import('../modules/balance/service');
      const balanceService = new BalanceService();
      
      // Get user info and balance
      const [userInfo, balanceData] = await Promise.all([
        prisma.user.findUnique({
          where: { id: user.id },
          select: {
            first_name: true,
            last_name: true
          }
        }),
        balanceService.getUserBalance(user.id)
      ]);

      if (userInfo && balanceData) {
        const message = `💰 **Balance de ${userInfo.first_name}**\n\n` +
                       `💵 Balance disponible: **$${balanceData.available} USDT**\n` +
                       `⏳ Retiros pendientes: **$${balanceData.pendingWithdrawals} USDT**\n` +
                       `📈 Total ganado: **$${balanceData.totalEarned} USDT**\n` +
                       `⌛ Comisiones pendientes: **$${balanceData.pending_commissions} USDT**\n\n` +
                       `📊 Para más detalles, visita tu panel de control.`;
        
        await this.sendMessage(chatId, message, 'Markdown');
      } else {
        await this.sendMessage(chatId, '❌ Error al consultar balance. Intenta más tarde.');
      }
    } catch (error) {
      logger.error('Error getting user balance:', error);
      await this.sendMessage(chatId, '❌ Error al consultar balance. Intenta más tarde.');
    }
  }

  private async handleStatusCommand(chatId: number, userId: number): Promise<void> {
    const user = await this.findUserByTelegramId(userId);
    
    if (!user) {
      await this.sendMessage(chatId, '❌ Cuenta no vinculada. Usa /link para vincular tu cuenta.');
      return;
    }

    try {
      const userStatus = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          first_name: true,
          last_name: true,
          email: true,
          status: true,
          telegram_link_status: true,
          created_at: true
        }
      });

      if (userStatus) {
        const message = `👤 **Estado de cuenta de ${userStatus.first_name}**\n\n` +
                       `📧 Email: ${userStatus.email}\n` +
                       `📊 Estado: ${userStatus.status}\n` +
                       `🔗 Telegram: ${userStatus.telegram_link_status}\n` +
                       `📅 Miembro desde: ${userStatus.created_at.toLocaleDateString()}\n\n` +
                       `✅ Todo funcionando correctamente.`;
        
        await this.sendMessage(chatId, message, 'Markdown');
      }
    } catch (error) {
      logger.error('Error getting user status:', error);
      await this.sendMessage(chatId, '❌ Error al consultar estado. Intenta más tarde.');
    }
  }

  private async handleLinkCommand(chatId: number, userId: number): Promise<void> {
    const existingUser = await this.findUserByTelegramId(userId);
    
    if (existingUser) {
      await this.sendMessage(chatId, '✅ Tu cuenta ya está vinculada correctamente.');
      return;
    }

    const message = '🔗 **Vincular cuenta de ProFitAgent**\n\n' +
                   '📝 Para vincular tu cuenta, necesito tu email registrado.\n\n' +
                   '💬 Responde con tu email en el siguiente formato:\n' +
                   '`email: tu@email.com`\n\n' +
                   '⚠️ Asegúrate de usar el mismo email de tu cuenta ProFitAgent.';
    
    await this.sendMessage(chatId, message, 'Markdown');
  }

  private async handleNotificationsCommand(chatId: number, userId: number): Promise<void> {
    const user = await this.findUserByTelegramId(userId);
    
    if (!user) {
      await this.sendMessage(chatId, '❌ Cuenta no vinculada. Usa /link para vincular tu cuenta.');
      return;
    }

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔔 Activar todas', callback_data: 'notifications:enable_all' },
          { text: '🔕 Desactivar todas', callback_data: 'notifications:disable_all' }
        ],
        [
          { text: '💰 Solo retiros', callback_data: 'notifications:withdrawals_only' },
          { text: '📊 Solo trading', callback_data: 'notifications:trading_only' }
        ]
      ]
    };

    await this.sendMessage(
      chatId, 
      '🔔 **Configuración de Notificaciones**\n\nSelecciona qué tipo de notificaciones quieres recibir:', 
      'Markdown',
      keyboard
    );
  }

  private async handleSupportCommand(chatId: number, userId: number): Promise<void> {
    const message = '🆘 **Soporte Técnico ProFitAgent**\n\n' +
                   '📞 **Canales de soporte:**\n' +
                   '• 💬 Chat directo: Escribe tu consulta aquí\n' +
                   '• 📧 Email: support@profitagent.app\n' +
                   '• 🌐 Panel web: Sección de soporte\n\n' +
                   '⏰ **Horarios de atención:**\n' +
                   '• Lunes a Viernes: 9:00 AM - 6:00 PM (COT)\n' +
                   '• Sábados: 10:00 AM - 2:00 PM (COT)\n\n' +
                   '💬 **Para soporte inmediato, describe tu problema aquí.**';
    
    await this.sendMessage(chatId, message, 'Markdown');
  }

  private async handleRegularMessage(chatId: number, userId: number, text: string): Promise<void> {
    // Check if it's an email for account linking
    if (text.toLowerCase().startsWith('email:')) {
      const email = text.substring(6).trim();
      await this.handleAccountLinking(chatId, email);
      return;
    }

    try {
      // Generate AI response
      const aiResponse = await aiSupportService.generateResponse(text, userId);
      
      // Send AI response to user
      let replyMarkup = undefined;
      if (aiResponse.suggestedActions && aiResponse.suggestedActions.length > 0) {
        // Create inline keyboard with suggested actions
        const buttons = aiResponse.suggestedActions.map(action => {
          if (action.startsWith('/')) {
            return [{ text: action, callback_data: `command:${action}` }];
          } else {
            return [{ text: action, callback_data: `action:${action}` }];
          }
        });
        
        replyMarkup = {
          inline_keyboard: buttons
        };
      }
      
      await this.sendMessage(chatId, aiResponse.message, 'HTML', replyMarkup);
      
      // Log AI interaction
      await aiSupportService.logAIInteraction(userId, text, aiResponse);
      
      // If requires human support, also log as support message
      if (aiResponse.requiresHuman) {
        const user = await this.findUserByTelegramId(userId);
        const userName = user ? `${user.first_name} ${user.last_name}` : 'Usuario no vinculado';
        
        // Log support message for human follow-up
        await this.logInteraction(userId.toString(), 'support_message', text, aiResponse.message);
        
        // Forward to support team
        logger.info(`Support message requiring human attention from ${userName} (${userId}): ${text}`);
      }
      
    } catch (error) {
      logger.error('Error processing message with AI:', error);
      
      // Fallback to original behavior
      const user = await this.findUserByTelegramId(userId);
      const userName = user ? `${user.first_name} ${user.last_name}` : 'Usuario no vinculado';
      
      await this.logInteraction(userId.toString(), 'support_message', text);
      
      await this.sendMessage(
        chatId, 
        '📨 Mensaje recibido. Nuestro equipo de soporte te responderá pronto.\n\n' +
        '⏱️ Tiempo estimado de respuesta: 2-4 horas hábiles.'
      );
      
      logger.info(`Support message from ${userName} (${userId}): ${text}`);
    }
  }

  private async handleAccountLinking(chatId: number, email: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          telegram_user_id: true
        }
      });

      if (!user) {
        await this.sendMessage(chatId, '❌ Email no encontrado. Verifica que sea el email correcto de tu cuenta ProFitAgent.');
        return;
      }

      if (user.telegram_user_id && user.telegram_user_id !== chatId.toString()) {
        await this.sendMessage(chatId, '⚠️ Esta cuenta ya está vinculada a otro usuario de Telegram.');
        return;
      }

      // Link account
      await prisma.user.update({
        where: { id: user.id },
        data: {
          telegram_user_id: chatId.toString(),
          telegram_link_status: 'linked'
        }
      });

      await this.sendMessage(
        chatId,
        `✅ **¡Cuenta vinculada exitosamente!**\n\n` +
        `Hola ${user.first_name}, tu cuenta de ProFitAgent ha sido vinculada.\n\n` +
        `🎉 **Beneficios activados:**\n` +
        `• 🔐 Códigos OTP para retiros\n` +
        `• 📊 Notificaciones de trading\n` +
        `• 💰 Alertas de balance\n` +
        `• 🆘 Soporte prioritario\n\n` +
        `Usa /help para ver todos los comandos disponibles.`,
        'Markdown'
      );

      logger.info(`Account linked successfully: ${email} -> Telegram ${chatId}`);
    } catch (error) {
      logger.error('Error linking account:', error);
      await this.sendMessage(chatId, '❌ Error al vincular cuenta. Intenta más tarde.');
    }
  }

  private async handleActionCallback(chatId: number, action: string): Promise<void> {
    switch (action) {
      case 'Ver panel':
        await this.sendMessage(
          chatId,
          '🌐 **Panel de Control:**\n\n' +
          '🔗 Accede a tu panel: https://profitagent.app\n\n' +
          '📊 En el panel puedes:\n' +
          '• Ver balance detallado\n' +
          '• Realizar retiros\n' +
          '• Configurar estrategias\n' +
          '• Ver historial de operaciones'
        );
        break;
      case 'Ver planes':
        await this.sendMessage(
          chatId,
          '💎 **Planes Disponibles:**\n\n' +
          '🔹 **Plan Básico** - $99/mes\n' +
          '   • 1 estrategia activa\n' +
          '   • Soporte por email\n' +
          '   • Retiros ilimitados\n\n' +
          '🔸 **Plan Pro** - $199/mes\n' +
          '   • 3 estrategias activas\n' +
          '   • Soporte prioritario\n' +
          '   • Análisis avanzado\n\n' +
          '🔶 **Plan Premium** - $399/mes\n' +
          '   • Estrategias ilimitadas\n' +
          '   • Soporte 24/7\n' +
          '   • Asesoría personalizada\n\n' +
          '🌐 Más detalles: https://profitagent.app/planes'
        );
        break;
      default:
        await this.sendMessage(chatId, '❓ Acción no reconocida.');
    }
  }

  private async handleNotificationSettings(chatId: number, action: string): Promise<void> {
    const user = await this.findUserByTelegramId(chatId);
    
    if (!user) {
      await this.sendMessage(chatId, '❌ Cuenta no vinculada.');
      return;
    }

    try {
      let notificationSettings = {};
      let message = '';
      
      switch (action) {
        case 'enable_all':
          notificationSettings = {
            telegram_notifications_enabled: true,
            telegram_withdrawal_notifications: true,
            telegram_trading_notifications: true,
            telegram_general_notifications: true
          };
          message = '🔔 Todas las notificaciones han sido activadas.';
          break;
        case 'disable_all':
          notificationSettings = {
            telegram_notifications_enabled: false,
            telegram_withdrawal_notifications: false,
            telegram_trading_notifications: false,
            telegram_general_notifications: false
          };
          message = '🔕 Todas las notificaciones han sido desactivadas.';
          break;
        case 'withdrawals_only':
          notificationSettings = {
            telegram_notifications_enabled: true,
            telegram_withdrawal_notifications: true,
            telegram_trading_notifications: false,
            telegram_general_notifications: false
          };
          message = '💰 Solo recibirás notificaciones de retiros.';
          break;
        case 'trading_only':
          notificationSettings = {
            telegram_notifications_enabled: true,
            telegram_withdrawal_notifications: false,
            telegram_trading_notifications: true,
            telegram_general_notifications: false
          };
          message = '📊 Solo recibirás notificaciones de trading.';
          break;
        default:
          message = '❓ Opción no válida.';
          await this.sendMessage(chatId, message);
          return;
      }

      // Update user notification preferences
      await prisma.user.update({
        where: { id: user.id },
        data: notificationSettings
      });

      await this.sendMessage(chatId, message);
      
      logger.info(`Notification settings updated for user ${user.id}: ${action}`);
    } catch (error) {
      logger.error('Error updating notification settings:', error);
      await this.sendMessage(chatId, '❌ Error al actualizar configuración. Intenta más tarde.');
    }
  }

  private async findUserByTelegramId(telegramId: number): Promise<any> {
    try {
      return await prisma.user.findFirst({
        where: {
          telegram_user_id: telegramId.toString(),
          telegram_link_status: 'linked'
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true
        }
      });
    } catch (error) {
      logger.error('Error finding user by Telegram ID:', error);
      return null;
    }
  }

  private async sendMessage(
    chatId: number, 
    text: string, 
    parseMode: 'HTML' | 'Markdown' = 'HTML',
    replyMarkup?: any
  ): Promise<boolean> {
    if (!this.supportBotToken) {
      logger.warn('Support bot token not configured');
      return false;
    }

    try {
      const payload: any = {
        chat_id: chatId,
        text: text,
        parse_mode: parseMode
      };

      if (replyMarkup) {
        payload.reply_markup = replyMarkup;
      }

      const response = await axios.post(
        `https://api.telegram.org/bot${this.supportBotToken}/sendMessage`,
        payload,
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.ok;
    } catch (error: any) {
      logger.error('Error sending support message:', error.response?.data || error.message);
      return false;
    }
  }

  private async answerCallbackQuery(callbackQueryId: string): Promise<void> {
    if (!this.supportBotToken) return;

    try {
      await axios.post(
        `https://api.telegram.org/bot${this.supportBotToken}/answerCallbackQuery`,
        { callback_query_id: callbackQueryId },
        { timeout: 5000 }
      );
    } catch (error) {
      logger.error('Error answering callback query:', error);
    }
  }

  private async logInteraction(
    userId: string, 
    type: string, 
    content: string, 
    response?: string
  ): Promise<void> {
    try {
      // This would require the TelegramInteraction model to be properly set up
      // For now, we'll just log it
      logger.info(`Telegram interaction: User ${userId}, Type: ${type}, Content: ${content}`);
    } catch (error) {
      logger.error('Error logging interaction:', error);
    }
  }

  async setWebhook(webhookUrl: string): Promise<boolean> {
    if (!this.supportBotToken) {
      logger.warn('Support bot token not configured');
      return false;
    }

    try {
      const response = await axios.post(
        `https://api.telegram.org/bot${this.supportBotToken}/setWebhook`,
        { url: webhookUrl },
        { timeout: 10000 }
      );

      logger.info('Webhook set successfully:', response.data);
      return response.data.ok;
    } catch (error) {
      logger.error('Error setting webhook:', error);
      return false;
    }
  }

  async deleteWebhook(): Promise<boolean> {
    if (!this.supportBotToken) {
      logger.warn('Support bot token not configured');
      return false;
    }

    try {
      const response = await axios.post(
        `https://api.telegram.org/bot${this.supportBotToken}/deleteWebhook`,
        {},
        { timeout: 10000 }
      );

      logger.info('Webhook deleted successfully:', response.data);
      return response.data.ok;
    } catch (error) {
      logger.error('Error deleting webhook:', error);
      return false;
    }
  }
}

// Export singleton instance
export const telegramCommunicationService = new TelegramCommunicationService();