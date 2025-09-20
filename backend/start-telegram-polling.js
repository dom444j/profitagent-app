const axios = require('axios');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { aiSupportService } = require('./dist/services/ai-support');

const prisma = new PrismaClient();

class TelegramPollingBot {
  constructor() {
    this.botToken = process.env.TELEGRAM_SUPPORT_BOT_TOKEN;
    this.isRunning = false;
    this.lastUpdateId = 0;
    this.pollInterval = 1000; // 1 segundo
  }

  async start() {
    if (!this.botToken) {
      console.error('❌ Error: TELEGRAM_SUPPORT_BOT_TOKEN no encontrado en .env');
      process.exit(1);
    }

    console.log('🤖 Iniciando bot de Telegram en modo polling...');
    console.log('===============================================');

    // Eliminar webhook si existe
    try {
      await axios.post(`https://api.telegram.org/bot${this.botToken}/deleteWebhook`);
      console.log('🗑️  Webhook eliminado (modo polling activado)');
    } catch (error) {
      console.log('⚠️  No se pudo eliminar webhook:', error.message);
    }

    // Obtener información del bot
    try {
      const botInfo = await axios.get(`https://api.telegram.org/bot${this.botToken}/getMe`);
      if (botInfo.data.ok) {
        const bot = botInfo.data.result;
        console.log(`✅ Bot conectado: @${bot.username} (${bot.first_name})`);
      }
    } catch (error) {
      console.error('❌ Error obteniendo información del bot:', error.message);
      process.exit(1);
    }

    this.isRunning = true;
    console.log('🔄 Iniciando polling...');
    console.log('💡 Envía mensajes al bot para probar el sistema de IA');
    console.log('🛑 Presiona Ctrl+C para detener\n');

    this.poll();
  }

  async poll() {
    while (this.isRunning) {
      try {
        const response = await axios.get(
          `https://api.telegram.org/bot${this.botToken}/getUpdates`,
          {
            params: {
              offset: this.lastUpdateId + 1,
              limit: 10,
              timeout: 10
            },
            timeout: 15000
          }
        );

        if (response.data.ok && response.data.result.length > 0) {
          for (const update of response.data.result) {
            await this.processUpdate(update);
            this.lastUpdateId = update.update_id;
          }
        }
      } catch (error) {
        if (error.code !== 'ECONNABORTED') {
          console.error('⚠️  Error en polling:', error.message);
        }
      }

      await new Promise(resolve => setTimeout(resolve, this.pollInterval));
    }
  }

  async processUpdate(update) {
    try {
      console.log(`\n📨 Nuevo update recibido (ID: ${update.update_id})`);

      if (update.message) {
        await this.handleMessage(update.message);
      } else if (update.callback_query) {
        await this.handleCallbackQuery(update.callback_query);
      }
    } catch (error) {
      console.error('❌ Error procesando update:', error.message);
    }
  }

  async handleMessage(message) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = message.text || '';
    const userName = message.from.first_name || 'Usuario';

    console.log(`👤 Mensaje de: ${userName} (${userId})`);
    console.log(`💬 Texto: "${text}"`);

    try {
      // Buscar usuario en la base de datos
      const user = await prisma.user.findFirst({
        where: {
          telegram_user_id: chatId.toString()
        }
      });

      if (!user) {
        console.log('⚠️  Usuario no encontrado en la base de datos');
        await this.sendMessage(chatId, 
          '👋 ¡Hola! Para usar este bot de soporte, primero debes vincular tu cuenta desde la aplicación ProfitAgent.\n\n' +
          '📱 Ve a Configuración > Notificaciones > Vincular Telegram'
        );
        return;
      }

      console.log(`✅ Usuario encontrado: ${user.email}`);

      // Generar respuesta con IA
      console.log('🧠 Generando respuesta con IA...');
      const aiResponse = await aiSupportService.generateResponse(text, user.id);

      console.log(`🎯 Categoría detectada: ${aiResponse.category}`);
      console.log(`📊 Confianza: ${(aiResponse.confidence * 100).toFixed(1)}%`);
      console.log(`🤖 Respuesta: ${aiResponse.response.substring(0, 100)}...`);

      // Enviar respuesta
      await this.sendMessage(chatId, aiResponse.response);

      // Enviar botones de acciones sugeridas si existen
      if (aiResponse.suggestedActions && aiResponse.suggestedActions.length > 0) {
        const keyboard = {
          inline_keyboard: aiResponse.suggestedActions.map(action => [{
            text: action.text,
            callback_data: `action:${action.action}`
          }])
        };

        await this.sendMessage(chatId, '¿Te gustaría realizar alguna de estas acciones?', keyboard);
      }

      // Registrar interacción
      await prisma.telegramInteraction.create({
        data: {
          user_id: user.id,
          interaction_type: 'message',
          message_text: text,
          response_text: aiResponse.response,
          ai_confidence: aiResponse.confidence,
          category: aiResponse.category,
          requires_human_attention: aiResponse.requiresHumanAttention,
          timestamp: new Date(),
          metadata: {
            telegram_message_id: message.message_id,
            chat_id: chatId,
            user_telegram_id: userId
          }
        }
      });

      if (aiResponse.requiresHumanAttention) {
        console.log('🚨 Mensaje marcado para atención humana');
      }

    } catch (error) {
      console.error('❌ Error procesando mensaje:', error.message);
      await this.sendMessage(chatId, 
        '😅 Disculpa, hubo un problema procesando tu mensaje. Por favor, inténtalo de nuevo en unos momentos.'
      );
    }
  }

  async handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    const userName = callbackQuery.from.first_name || 'Usuario';

    console.log(`🔘 Callback de: ${userName}`);
    console.log(`📋 Data: ${data}`);

    try {
      // Responder al callback query
      await axios.post(`https://api.telegram.org/bot${this.botToken}/answerCallbackQuery`, {
        callback_query_id: callbackQuery.id,
        text: 'Procesando...'
      });

      if (data.startsWith('action:')) {
        const action = data.replace('action:', '');
        await this.handleAction(chatId, action);
      }
    } catch (error) {
      console.error('❌ Error procesando callback:', error.message);
    }
  }

  async handleAction(chatId, action) {
    const responses = {
      'view_dashboard': '📊 Puedes acceder a tu panel desde: https://profitagent.app/dashboard',
    'view_plans': '💎 Conoce nuestros planes en: https://profitagent.app/plans',
    'contact_support': '🆘 Nuestro equipo de soporte te contactará pronto. También puedes escribirnos a support@profitagent.app',
      'check_balance': '💰 Para ver tu balance actualizado, ingresa a tu panel de control.',
      'withdrawal_help': '💸 Para realizar un retiro, ve a Panel > Retiros y sigue las instrucciones.',
      'otp_help': '🔐 Si no recibes el código OTP, verifica tu conexión y solicita uno nuevo.'
    };

    const response = responses[action] || 'Acción no reconocida.';
    await this.sendMessage(chatId, response);
  }

  async sendMessage(chatId, text, replyMarkup = null) {
    try {
      const payload = {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      };

      if (replyMarkup) {
        payload.reply_markup = replyMarkup;
      }

      const response = await axios.post(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
        payload
      );

      if (response.data.ok) {
        console.log(`✅ Mensaje enviado (ID: ${response.data.result.message_id})`);
      }
    } catch (error) {
      console.error('❌ Error enviando mensaje:', error.message);
    }
  }

  stop() {
    console.log('\n🛑 Deteniendo bot...');
    this.isRunning = false;
  }
}

// Iniciar bot
const bot = new TelegramPollingBot();

// Manejar señales de terminación
process.on('SIGINT', () => {
  bot.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  bot.stop();
  process.exit(0);
});

// Iniciar
bot.start().catch(error => {
  console.error('❌ Error iniciando bot:', error.message);
  process.exit(1);
});