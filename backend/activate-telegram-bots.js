const axios = require('axios');
require('dotenv').config();

console.log('🤖 ACTIVACIÓN DE BOTS DE TELEGRAM - GROW5X');
console.log('==========================================');
console.log('');

const OTP_BOT_TOKEN = process.env.TELEGRAM_OTP_BOT_TOKEN;
const ALERTS_BOT_TOKEN = process.env.TELEGRAM_ALERTS_BOT_TOKEN;
const OTP_CHAT_ID = process.env.TELEGRAM_OTP_CHAT_ID;
const ALERTS_CHAT_ID = process.env.TELEGRAM_ALERTS_CHAT_ID;

// Function to check bot status
async function checkBotStatus(token, botName) {
  try {
    const response = await axios.get(`https://api.telegram.org/bot${token}/getMe`);
    if (response.data.ok) {
      const bot = response.data.result;
      return {
        success: true,
        username: bot.username,
        name: bot.first_name,
        id: bot.id
      };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Function to test chat connectivity
async function testChatConnectivity(token, chatId, botName) {
  try {
    const testMessage = {
      chat_id: chatId,
      text: `🔧 Test de conectividad - ${botName}\n\n✅ Bot funcionando correctamente\n🕐 ${new Date().toLocaleString('es-CO')}`,
      parse_mode: 'HTML'
    };
    
    const response = await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, testMessage);
    return response.data.ok;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('📋 ESTADO ACTUAL DE LOS BOTS:');
  console.log('==============================');
  
  // Check OTP Bot
  console.log('\n🔐 OTP BOT:');
  if (OTP_BOT_TOKEN) {
    const otpStatus = await checkBotStatus(OTP_BOT_TOKEN, 'OTP Bot');
    if (otpStatus.success) {
      console.log(`✅ Token válido: @${otpStatus.username}`);
      console.log(`📝 Nombre: ${otpStatus.name}`);
      console.log(`🆔 Bot ID: ${otpStatus.id}`);
      
      if (OTP_CHAT_ID) {
        console.log(`💬 Chat ID configurado: ${OTP_CHAT_ID}`);
        const canSend = await testChatConnectivity(OTP_BOT_TOKEN, OTP_CHAT_ID, 'OTP Bot');
        console.log(`📤 Envío de mensajes: ${canSend ? '✅ FUNCIONANDO' : '❌ ERROR'}`);
      } else {
        console.log(`❌ Chat ID no configurado`);
      }
    } else {
      console.log(`❌ Token inválido: ${otpStatus.error}`);
    }
  } else {
    console.log(`❌ Token no configurado`);
  }
  
  // Check Alerts Bot
  console.log('\n🚨 ALERTS BOT:');
  if (ALERTS_BOT_TOKEN) {
    const alertsStatus = await checkBotStatus(ALERTS_BOT_TOKEN, 'Alerts Bot');
    if (alertsStatus.success) {
      console.log(`✅ Token válido: @${alertsStatus.username}`);
      console.log(`📝 Nombre: ${alertsStatus.name}`);
      console.log(`🆔 Bot ID: ${alertsStatus.id}`);
      
      if (ALERTS_CHAT_ID) {
        console.log(`💬 Chat ID configurado: ${ALERTS_CHAT_ID}`);
        const canSend = await testChatConnectivity(ALERTS_BOT_TOKEN, ALERTS_CHAT_ID, 'Alerts Bot');
        console.log(`📤 Envío de mensajes: ${canSend ? '✅ FUNCIONANDO' : '❌ ERROR'}`);
      } else {
        console.log(`❌ Chat ID no configurado`);
      }
    } else {
      console.log(`❌ Token inválido: ${alertsStatus.error}`);
    }
  } else {
    console.log(`❌ Token no configurado`);
  }
  
  console.log('\n🔧 INSTRUCCIONES PARA ACTIVAR LOS BOTS:');
  console.log('========================================');
  console.log('');
  console.log('📱 PASO 1: Iniciar conversación con los bots');
  console.log('   1. Abre Telegram en tu dispositivo');
  console.log('   2. Busca: @grow5x_otp_bot');
  console.log('   3. Haz clic en el bot y envía: /start');
  console.log('   4. Busca: @grow5x_alerts_bot');
  console.log('   5. Haz clic en el bot y envía: /start');
  console.log('');
  console.log('🆔 PASO 2: Obtener tu Chat ID');
  console.log('   1. Busca: @userinfobot en Telegram');
  console.log('   2. Envía: /start');
  console.log('   3. Copia tu Chat ID (número que aparece)');
  console.log('');
  console.log('⚙️  PASO 3: Actualizar configuración');
  console.log('   1. Abre el archivo: backend/.env');
  console.log('   2. Actualiza estas líneas con tu Chat ID:');
  console.log('      TELEGRAM_OTP_CHAT_ID=tu_chat_id_aqui');
  console.log('      TELEGRAM_ALERTS_CHAT_ID=tu_chat_id_aqui');
  console.log('   3. Guarda el archivo');
  console.log('');
  console.log('🔄 PASO 4: Reiniciar el servidor');
  console.log('   1. Detén el servidor backend (Ctrl+C)');
  console.log('   2. Ejecuta: npm run dev');
  console.log('   3. Ejecuta este script nuevamente para verificar');
  console.log('');
  console.log('✅ PASO 5: Verificar funcionamiento');
  console.log('   - Ejecuta: node test-telegram-bots.js');
  console.log('   - Deberías recibir mensajes de prueba en Telegram');
  console.log('');
  console.log('🎯 NOTAS IMPORTANTES:');
  console.log('   • Usa el MISMO Chat ID para ambos bots si quieres recibir');
  console.log('     todos los mensajes en el mismo chat');
  console.log('   • Los bots pueden enviar mensajes a grupos también');
  console.log('   • Asegúrate de que los bots no estén bloqueados');
  console.log('');
}

main().catch(console.error);