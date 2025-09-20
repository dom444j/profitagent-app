const axios = require('axios');
require('dotenv').config();

console.log('ðŸ¤– ACTIVACIÃ“N DE BOTS DE TELEGRAM - profitagent');
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
      text: `ðŸ”§ Test de conectividad - ${botName}\n\nâœ… Bot funcionando correctamente\nðŸ• ${new Date().toLocaleString('es-CO')}`,
      parse_mode: 'HTML'
    };
    
    const response = await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, testMessage);
    return response.data.ok;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('ðŸ“‹ ESTADO ACTUAL DE LOS BOTS:');
  console.log('==============================');
  
  // Check OTP Bot
  console.log('\nðŸ” OTP BOT:');
  if (OTP_BOT_TOKEN) {
    const otpStatus = await checkBotStatus(OTP_BOT_TOKEN, 'OTP Bot');
    if (otpStatus.success) {
      console.log(`âœ… Token vÃ¡lido: @${otpStatus.username}`);
      console.log(`ðŸ“ Nombre: ${otpStatus.name}`);
      console.log(`ðŸ†” Bot ID: ${otpStatus.id}`);
      
      if (OTP_CHAT_ID) {
        console.log(`ðŸ’¬ Chat ID configurado: ${OTP_CHAT_ID}`);
        const canSend = await testChatConnectivity(OTP_BOT_TOKEN, OTP_CHAT_ID, 'OTP Bot');
        console.log(`ðŸ“¤ EnvÃ­o de mensajes: ${canSend ? 'âœ… FUNCIONANDO' : 'âŒ ERROR'}`);
      } else {
        console.log(`âŒ Chat ID no configurado`);
      }
    } else {
      console.log(`âŒ Token invÃ¡lido: ${otpStatus.error}`);
    }
  } else {
    console.log(`âŒ Token no configurado`);
  }
  
  // Check Alerts Bot
  console.log('\nðŸš¨ ALERTS BOT:');
  if (ALERTS_BOT_TOKEN) {
    const alertsStatus = await checkBotStatus(ALERTS_BOT_TOKEN, 'Alerts Bot');
    if (alertsStatus.success) {
      console.log(`âœ… Token vÃ¡lido: @${alertsStatus.username}`);
      console.log(`ðŸ“ Nombre: ${alertsStatus.name}`);
      console.log(`ðŸ†” Bot ID: ${alertsStatus.id}`);
      
      if (ALERTS_CHAT_ID) {
        console.log(`ðŸ’¬ Chat ID configurado: ${ALERTS_CHAT_ID}`);
        const canSend = await testChatConnectivity(ALERTS_BOT_TOKEN, ALERTS_CHAT_ID, 'Alerts Bot');
        console.log(`ðŸ“¤ EnvÃ­o de mensajes: ${canSend ? 'âœ… FUNCIONANDO' : 'âŒ ERROR'}`);
      } else {
        console.log(`âŒ Chat ID no configurado`);
      }
    } else {
      console.log(`âŒ Token invÃ¡lido: ${alertsStatus.error}`);
    }
  } else {
    console.log(`âŒ Token no configurado`);
  }
  
  console.log('\nðŸ”§ INSTRUCCIONES PARA ACTIVAR LOS BOTS:');
  console.log('========================================');
  console.log('');
  console.log('ðŸ“± PASO 1: Iniciar conversaciÃ³n con los bots');
  console.log('   1. Abre Telegram en tu dispositivo');
  console.log('   2. Busca: @profitagent_otp_bot');
  console.log('   3. Haz clic en el bot y envÃ­a: /start');
  console.log('   4. Busca: @profitagent_alerts_bot');
  console.log('   5. Haz clic en el bot y envÃ­a: /start');
  console.log('');
  console.log('ðŸ†” PASO 2: Obtener tu Chat ID');
  console.log('   1. Busca: @userinfobot en Telegram');
  console.log('   2. EnvÃ­a: /start');
  console.log('   3. Copia tu Chat ID (nÃºmero que aparece)');
  console.log('');
  console.log('âš™ï¸  PASO 3: Actualizar configuraciÃ³n');
  console.log('   1. Abre el archivo: backend/.env');
  console.log('   2. Actualiza estas lÃ­neas con tu Chat ID:');
  console.log('      TELEGRAM_OTP_CHAT_ID=tu_chat_id_aqui');
  console.log('      TELEGRAM_ALERTS_CHAT_ID=tu_chat_id_aqui');
  console.log('   3. Guarda el archivo');
  console.log('');
  console.log('ðŸ”„ PASO 4: Reiniciar el servidor');
  console.log('   1. DetÃ©n el servidor backend (Ctrl+C)');
  console.log('   2. Ejecuta: npm run dev');
  console.log('   3. Ejecuta este script nuevamente para verificar');
  console.log('');
  console.log('âœ… PASO 5: Verificar funcionamiento');
  console.log('   - Ejecuta: node test-telegram-bots.js');
  console.log('   - DeberÃ­as recibir mensajes de prueba en Telegram');
  console.log('');
  console.log('ðŸŽ¯ NOTAS IMPORTANTES:');
  console.log('   â€¢ Usa el MISMO Chat ID para ambos bots si quieres recibir');
  console.log('     todos los mensajes en el mismo chat');
  console.log('   â€¢ Los bots pueden enviar mensajes a grupos tambiÃ©n');
  console.log('   â€¢ AsegÃºrate de que los bots no estÃ©n bloqueados');
  console.log('');
}

main().catch(console.error);
