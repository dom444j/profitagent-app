const axios = require('axios');
require('dotenv').config();

// Bot tokens from environment
const OTP_BOT_TOKEN = process.env.TELEGRAM_OTP_BOT_TOKEN;
const ALERTS_BOT_TOKEN = process.env.TELEGRAM_ALERTS_BOT_TOKEN;

console.log('🔍 Obteniendo Chat IDs de Telegram...');
console.log('=====================================');

// Function to get updates and find chat IDs
async function getChatIds(botToken, botName) {
  try {
    console.log(`\n📱 Analizando ${botName}...`);
    
    if (!botToken) {
      console.log(`❌ Token no configurado para ${botName}`);
      return;
    }
    
    // Get bot info
    const botInfoUrl = `https://api.telegram.org/bot${botToken}/getMe`;
    const botInfoResponse = await axios.get(botInfoUrl);
    
    if (botInfoResponse.data.ok) {
      const botInfo = botInfoResponse.data.result;
      console.log(`✅ Bot: @${botInfo.username}`);
      console.log(`📝 Nombre: ${botInfo.first_name}`);
    }
    
    // Get recent updates to find chat IDs
    const updatesUrl = `https://api.telegram.org/bot${botToken}/getUpdates`;
    const updatesResponse = await axios.get(updatesUrl);
    
    if (updatesResponse.data.ok) {
      const updates = updatesResponse.data.result;
      console.log(`📨 Actualizaciones encontradas: ${updates.length}`);
      
      if (updates.length === 0) {
        console.log(`⚠️  No hay mensajes recientes.`);
        console.log(`💡 Para obtener el Chat ID:`);
        console.log(`   1. Busca @${botInfo?.username || 'el_bot'} en Telegram`);
        console.log(`   2. Envía el comando /start`);
        console.log(`   3. Ejecuta este script nuevamente`);
        return;
      }
      
      // Extract unique chat IDs
      const chatIds = new Set();
      const chatInfo = new Map();
      
      updates.forEach(update => {
        if (update.message && update.message.chat) {
          const chat = update.message.chat;
          chatIds.add(chat.id);
          chatInfo.set(chat.id, {
            type: chat.type,
            title: chat.title || `${chat.first_name || ''} ${chat.last_name || ''}`.trim(),
            username: chat.username
          });
        }
      });
      
      console.log(`\n💬 Chat IDs encontrados:`);
      chatIds.forEach(chatId => {
        const info = chatInfo.get(chatId);
        console.log(`   📍 Chat ID: ${chatId}`);
        console.log(`      Tipo: ${info.type}`);
        console.log(`      Nombre: ${info.title}`);
        if (info.username) {
          console.log(`      Username: @${info.username}`);
        }
        console.log('');
      });
      
      // Show the most recent chat ID as recommendation
      if (chatIds.size > 0) {
        const recentChatId = Array.from(chatIds)[chatIds.size - 1];
        console.log(`🎯 Chat ID recomendado para ${botName}: ${recentChatId}`);
      }
      
    } else {
      console.log(`❌ Error obteniendo actualizaciones:`, updatesResponse.data);
    }
    
  } catch (error) {
    console.log(`❌ Error en ${botName}:`, error.message);
    if (error.response) {
      console.log(`📄 Respuesta del servidor:`, error.response.data);
    }
  }
}

// Main function
async function main() {
  console.log('🚀 Iniciando análisis de Chat IDs...');
  
  await getChatIds(OTP_BOT_TOKEN, 'OTP Bot (@grow5x_otp_bot)');
  await getChatIds(ALERTS_BOT_TOKEN, 'Alerts Bot (@grow5x_alerts_bot)');
  
  console.log('\n📋 INSTRUCCIONES PARA CONFIGURAR:');
  console.log('==================================');
  console.log('1. Si no aparecen Chat IDs, envía /start a ambos bots:');
  console.log('   - Busca @grow5x_otp_bot en Telegram');
  console.log('   - Busca @grow5x_alerts_bot en Telegram');
  console.log('   - Envía /start a cada uno');
  console.log('');
  console.log('2. Ejecuta este script nuevamente para obtener los Chat IDs');
  console.log('');
  console.log('3. Actualiza el archivo .env con los Chat IDs correctos:');
  console.log('   TELEGRAM_OTP_CHAT_ID=tu_chat_id_aqui');
  console.log('   TELEGRAM_ALERTS_CHAT_ID=tu_chat_id_aqui');
  console.log('');
  console.log('4. Reinicia el servidor backend para aplicar los cambios');
}

// Run the script
main().catch(console.error);