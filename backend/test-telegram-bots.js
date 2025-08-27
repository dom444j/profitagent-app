const axios = require('axios');
require('dotenv').config();

// Bot tokens from environment
const OTP_BOT_TOKEN = process.env.TELEGRAM_OTP_BOT_TOKEN;
const ALERTS_BOT_TOKEN = process.env.TELEGRAM_ALERTS_BOT_TOKEN;
const OTP_CHAT_ID = process.env.TELEGRAM_OTP_CHAT_ID;
const ALERTS_CHAT_ID = process.env.TELEGRAM_ALERTS_CHAT_ID;

console.log('🤖 Probando Bots de Telegram...');
console.log('================================');

// Test function for sending messages
async function testBot(botToken, chatId, botName, testMessage) {
  try {
    console.log(`\n📱 Probando ${botName}...`);
    
    if (!botToken) {
      console.log(`❌ Token no configurado para ${botName}`);
      return false;
    }
    
    if (!chatId) {
      console.log(`❌ Chat ID no configurado para ${botName}`);
      return false;
    }
    
    console.log(`🔑 Token: ${botToken.substring(0, 10)}...`);
    console.log(`💬 Chat ID: ${chatId}`);
    
    // Get bot info first
    const botInfoUrl = `https://api.telegram.org/bot${botToken}/getMe`;
    const botInfoResponse = await axios.get(botInfoUrl);
    
    if (botInfoResponse.data.ok) {
      const botInfo = botInfoResponse.data.result;
      console.log(`✅ Bot conectado: @${botInfo.username}`);
      console.log(`📝 Nombre: ${botInfo.first_name}`);
    } else {
      console.log(`❌ Error obteniendo info del bot:`, botInfoResponse.data);
      return false;
    }
    
    // Send test message
    const messageUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const messageData = {
      chat_id: chatId,
      text: testMessage,
      parse_mode: 'HTML'
    };
    
    const messageResponse = await axios.post(messageUrl, messageData);
    
    if (messageResponse.data.ok) {
      console.log(`✅ Mensaje enviado exitosamente`);
      console.log(`📨 Message ID: ${messageResponse.data.result.message_id}`);
      return true;
    } else {
      console.log(`❌ Error enviando mensaje:`, messageResponse.data);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Error en ${botName}:`, error.message);
    if (error.response) {
      console.log(`📄 Respuesta del servidor:`, error.response.data);
    }
    return false;
  }
}

// Main test function
async function testTelegramBots() {
  console.log('🚀 Iniciando pruebas de bots...');
  
  const otpTestMessage = `🔐 <b>Prueba Bot OTP - Grow5x</b>\n\n` +
    `✅ Bot OTP funcionando correctamente\n` +
    `🕐 ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}\n\n` +
    `Este es un mensaje de prueba para verificar la conectividad.`;
  
  const alertsTestMessage = `🚨 <b>Prueba Bot Alertas - Grow5x</b>\n\n` +
    `✅ Bot de Alertas funcionando correctamente\n` +
    `🕐 ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}\n\n` +
    `Este es un mensaje de prueba para verificar la conectividad.`;
  
  // Test OTP Bot
  const otpResult = await testBot(
    OTP_BOT_TOKEN, 
    OTP_CHAT_ID, 
    'OTP Bot (@grow5x_otp_bot)', 
    otpTestMessage
  );
  
  // Test Alerts Bot
  const alertsResult = await testBot(
    ALERTS_BOT_TOKEN, 
    ALERTS_CHAT_ID, 
    'Alerts Bot (@grow5x_alerts_bot)', 
    alertsTestMessage
  );
  
  // Summary
  console.log('\n📊 RESUMEN DE PRUEBAS');
  console.log('=====================');
  console.log(`🔐 OTP Bot: ${otpResult ? '✅ FUNCIONANDO' : '❌ ERROR'}`);
  console.log(`🚨 Alerts Bot: ${alertsResult ? '✅ FUNCIONANDO' : '❌ ERROR'}`);
  
  if (otpResult && alertsResult) {
    console.log('\n🎉 ¡Todos los bots están funcionando correctamente!');
    console.log('✅ Los bots están listos para usar en producción.');
  } else {
    console.log('\n⚠️  Algunos bots tienen problemas.');
    console.log('🔧 Revisa la configuración de tokens y chat IDs.');
  }
}

// Run tests
testTelegramBots().catch(console.error);