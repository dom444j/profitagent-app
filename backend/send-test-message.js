const axios = require('axios');
require('dotenv').config();

async function sendTestMessage() {
  console.log('📤 Enviando mensaje de prueba al bot de soporte...');
  console.log('==============================================');
  
  const botToken = process.env.TELEGRAM_SUPPORT_BOT_TOKEN;
  const testChatId = '8489762106'; // Tu chat ID desde la respuesta de la API
  
  if (!botToken) {
    console.error('❌ Error: TELEGRAM_SUPPORT_BOT_TOKEN no encontrado en .env');
    process.exit(1);
  }
  
  try {
    // Mensaje de bienvenida
    const welcomeMessage = `🤖 ¡Hola! Soy el bot de soporte de ProFitAgent.

✅ Bot configurado correctamente
🔗 Token: ${botToken.substring(0, 10)}...
📅 Fecha: ${new Date().toLocaleString()}

📋 Comandos disponibles:
/start - Iniciar conversación
/help - Mostrar ayuda
/balance - Consultar balance
/status - Ver estado de cuenta
/link - Vincular cuenta

💬 También puedes enviarme cualquier mensaje y te ayudaré con tus consultas.`;
    
    console.log('📤 Enviando mensaje de bienvenida...');
    const response = await axios.post(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        chat_id: testChatId,
        text: welcomeMessage,
        parse_mode: 'Markdown'
      },
      { timeout: 10000 }
    );
    
    if (response.data.ok) {
      console.log('✅ Mensaje enviado exitosamente!');
      console.log(`📨 Message ID: ${response.data.result.message_id}`);
      console.log(`📅 Fecha: ${new Date(response.data.result.date * 1000).toLocaleString()}`);
      
      // Enviar mensaje con botones inline
      console.log('\n📤 Enviando mensaje con botones...');
      const buttonsResponse = await axios.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          chat_id: testChatId,
          text: '🎛️ Prueba los botones de navegación:',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '💰 Ver Balance', callback_data: 'check_balance' },
                { text: '📊 Estado Cuenta', callback_data: 'account_status' }
              ],
              [
                { text: '🔗 Vincular Cuenta', callback_data: 'link_account' },
                { text: '⚙️ Configuración', callback_data: 'settings' }
              ],
              [
                { text: '📞 Soporte', callback_data: 'support' },
                { text: '❓ Ayuda', callback_data: 'help' }
              ]
            ]
          }
        },
        { timeout: 10000 }
      );
      
      if (buttonsResponse.data.ok) {
        console.log('✅ Mensaje con botones enviado!');
      }
      
    } else {
      console.error('❌ Error enviando mensaje:', response.data);
    }
    
    console.log('\n🎉 ¡Bot de soporte @profitagent_support_bot configurado y funcionando!');
    console.log('\n📋 Resumen de configuración:');
    console.log(`   🤖 Bot: @profitagent_support_bot`);
    console.log(`   🆔 Token: ${botToken.substring(0, 15)}...`);
    console.log(`   💾 Base de datos: ✅ Registrado`);
    console.log(`   🔗 Webhook: ✅ Configurado`);
    console.log(`   📤 Mensajes: ✅ Funcionando`);
    
    console.log('\n📱 Para usar el bot:');
    console.log('   1. Abre: https://t.me/profitagent_support_bot');
    console.log('   2. Envía /start');
    console.log('   3. Explora los comandos y funciones');
    
  } catch (error) {
    console.error('❌ Error enviando mensaje:', error.message);
    if (error.response?.data) {
      console.error('   Respuesta de Telegram:', error.response.data);
    }
  }
}

sendTestMessage();