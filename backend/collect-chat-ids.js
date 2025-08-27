const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

// Configuración de los bots
const OTP_BOT_TOKEN = process.env.TELEGRAM_OTP_BOT_TOKEN;
const ALERTS_BOT_TOKEN = process.env.TELEGRAM_ALERTS_BOT_TOKEN;

if (!OTP_BOT_TOKEN || !ALERTS_BOT_TOKEN) {
  console.error('❌ Error: Tokens de Telegram no encontrados en .env');
  console.log('Asegúrate de tener:');
  console.log('TELEGRAM_OTP_BOT_TOKEN=tu_token_otp');
  console.log('TELEGRAM_ALERTS_BOT_TOKEN=tu_token_alerts');
  process.exit(1);
}

async function collectChatIds() {
  console.log('🤖 Recolectando Chat IDs de los bots de Telegram...');
  console.log('=' .repeat(60));

  try {
    // Inicializar bots
    const otpBot = new TelegramBot(OTP_BOT_TOKEN, { polling: false });
    const alertsBot = new TelegramBot(ALERTS_BOT_TOKEN, { polling: false });

    console.log('\n📋 INFORMACIÓN DE LOS BOTS:');
    console.log('-'.repeat(40));

    // Obtener información del OTP Bot
    try {
      const otpBotInfo = await otpBot.getMe();
      console.log(`✅ OTP Bot: @${otpBotInfo.username} (ID: ${otpBotInfo.id})`);
    } catch (error) {
      console.log('❌ Error obteniendo info del OTP Bot:', error.message);
    }

    // Obtener información del Alerts Bot
    try {
      const alertsBotInfo = await alertsBot.getMe();
      console.log(`✅ Alerts Bot: @${alertsBotInfo.username} (ID: ${alertsBotInfo.id})`);
    } catch (error) {
      console.log('❌ Error obteniendo info del Alerts Bot:', error.message);
    }

    console.log('\n🔍 BUSCANDO MENSAJES RECIENTES...');
    console.log('-'.repeat(40));

    // Obtener updates del OTP Bot
    let otpChatId = null;
    try {
      const otpUpdates = await otpBot.getUpdates({ limit: 10 });
      if (otpUpdates.length > 0) {
        const lastUpdate = otpUpdates[otpUpdates.length - 1];
        if (lastUpdate.message) {
          otpChatId = lastUpdate.message.chat.id;
          console.log(`✅ OTP Bot Chat ID encontrado: ${otpChatId}`);
          console.log(`   Último mensaje de: ${lastUpdate.message.from.first_name || 'Usuario'}`);
        }
      } else {
        console.log('⚠️  No se encontraron mensajes en OTP Bot');
      }
    } catch (error) {
      console.log('❌ Error obteniendo updates del OTP Bot:', error.message);
    }

    // Obtener updates del Alerts Bot
    let alertsChatId = null;
    try {
      const alertsUpdates = await alertsBot.getUpdates({ limit: 10 });
      if (alertsUpdates.length > 0) {
        const lastUpdate = alertsUpdates[alertsUpdates.length - 1];
        if (lastUpdate.message) {
          alertsChatId = lastUpdate.message.chat.id;
          console.log(`✅ Alerts Bot Chat ID encontrado: ${alertsChatId}`);
          console.log(`   Último mensaje de: ${lastUpdate.message.from.first_name || 'Usuario'}`);
        }
      } else {
        console.log('⚠️  No se encontraron mensajes en Alerts Bot');
      }
    } catch (error) {
      console.log('❌ Error obteniendo updates del Alerts Bot:', error.message);
    }

    console.log('\n📝 CONFIGURACIÓN PARA .env:');
    console.log('=' .repeat(60));

    if (otpChatId || alertsChatId) {
      console.log('\n# Agregar estas líneas a tu archivo backend/.env:');
      if (otpChatId) {
        console.log(`TELEGRAM_OTP_CHAT_ID=${otpChatId}`);
      } else {
        console.log('# TELEGRAM_OTP_CHAT_ID=PENDIENTE');
      }
      if (alertsChatId) {
        console.log(`TELEGRAM_ALERTS_CHAT_ID=${alertsChatId}`);
      } else {
        console.log('# TELEGRAM_ALERTS_CHAT_ID=PENDIENTE');
      }
    } else {
      console.log('\n⚠️  NO SE ENCONTRARON CHAT IDS');
      console.log('\n📱 INSTRUCCIONES PARA ACTIVAR LOS BOTS:');
      console.log('-'.repeat(50));
      console.log('1. Abre Telegram en tu teléfono/computadora');
      console.log('2. Busca y abre una conversación con @grow5x_otp_bot');
      console.log('3. Envía el mensaje: /start');
      console.log('4. Busca y abre una conversación con @grow5x_alerts_bot');
      console.log('5. Envía el mensaje: /start');
      console.log('6. Ejecuta este script nuevamente: node collect-chat-ids.js');
      console.log('\n💡 Alternativamente, puedes usar @userinfobot para obtener tu Chat ID:');
      console.log('   - Busca @userinfobot en Telegram');
      console.log('   - Envía /start');
      console.log('   - Copia el número que te envíe como Chat ID');
    }

    console.log('\n🔄 PRÓXIMOS PASOS:');
    console.log('-'.repeat(30));
    console.log('1. Actualizar el archivo backend/.env con los Chat IDs');
    console.log('2. Reiniciar el servidor backend');
    console.log('3. Ejecutar: node test-telegram-bots.js para verificar');

  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// Ejecutar el script
collectChatIds().then(() => {
  console.log('\n✅ Script completado.');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error ejecutando script:', error.message);
  process.exit(1);
});