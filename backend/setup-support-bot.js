const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
require('dotenv').config();

const prisma = new PrismaClient();

async function setupSupportBot() {
  console.log('🤖 Configurando bot de soporte @profitagent_support_bot...');
  console.log('================================================');
  
  const botToken = process.env.TELEGRAM_SUPPORT_BOT_TOKEN;
  
  if (!botToken) {
    console.error('❌ Error: TELEGRAM_SUPPORT_BOT_TOKEN no encontrado en .env');
    process.exit(1);
  }
  
  try {
    // 1. Obtener información del bot desde Telegram
    console.log('📡 Obteniendo información del bot desde Telegram...');
    const botInfoResponse = await axios.get(`https://api.telegram.org/bot${botToken}/getMe`);
    
    if (!botInfoResponse.data.ok) {
      throw new Error(`Error al obtener info del bot: ${botInfoResponse.data.description}`);
    }
    
    const botInfo = botInfoResponse.data.result;
    console.log(`✅ Bot encontrado: @${botInfo.username} (${botInfo.first_name})`);
    
    // 2. Registrar o actualizar el bot en la base de datos
    console.log('💾 Registrando bot en la base de datos...');
    const bot = await prisma.telegramBot.upsert({
      where: { bot_token: botToken },
      update: {
        bot_username: botInfo.username,
        bot_name: botInfo.first_name,
        status: 'active',
        updated_at: new Date()
      },
      create: {
        bot_token: botToken,
        bot_username: botInfo.username,
        bot_name: botInfo.first_name,
        bot_type: 'support',
        status: 'active',
        description: 'Bot de soporte y comunicación con usuarios'
      }
    });
    
    console.log(`✅ Bot registrado en BD con ID: ${bot.id}`);
    
    // 3. Configurar webhook (opcional - se puede hacer desde el admin panel)
    const webhookUrl = `${process.env.BASE_URL || 'https://profitagent.app'}/api/v1/telegram/webhook/support`;
    console.log(`🔗 Configurando webhook: ${webhookUrl}`);
    
    const webhookResponse = await axios.post(
      `https://api.telegram.org/bot${botToken}/setWebhook`,
      {
        url: webhookUrl,
        max_connections: 40,
        allowed_updates: ['message', 'edited_message', 'callback_query', 'inline_query'],
        drop_pending_updates: true
      }
    );
    
    if (webhookResponse.data.ok) {
      console.log('✅ Webhook configurado correctamente');
      
      // Actualizar URL del webhook en la BD
      await prisma.telegramBot.update({
        where: { id: bot.id },
        data: { webhook_url: webhookUrl }
      });
    } else {
      console.log(`⚠️  Webhook no configurado: ${webhookResponse.data.description}`);
      console.log('   Puedes configurarlo manualmente desde el panel de admin');
    }
    
    // 4. Verificar configuración
    console.log('\n🔍 Verificando configuración...');
    const webhookInfo = await axios.get(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    
    if (webhookInfo.data.ok) {
      const info = webhookInfo.data.result;
      console.log(`📡 Webhook URL: ${info.url || 'No configurado'}`);
      console.log(`🔄 Pending updates: ${info.pending_update_count}`);
      console.log(`📅 Última actualización: ${info.last_error_date ? new Date(info.last_error_date * 1000).toLocaleString() : 'N/A'}`);
      
      if (info.last_error_message) {
        console.log(`❌ Último error: ${info.last_error_message}`);
      }
    }
    
    console.log('\n✅ ¡Bot de soporte configurado exitosamente!');
    console.log('\n📋 Próximos pasos:');
    console.log('   1. El bot ya está registrado en la base de datos');
    console.log('   2. Los usuarios pueden encontrarlo en @profitagent_support_bot');
    console.log('   3. Configura el webhook desde el panel de admin si es necesario');
    console.log('   4. Prueba enviando /start al bot');
    
  } catch (error) {
    console.error('❌ Error configurando el bot:', error.message);
    if (error.response?.data) {
      console.error('   Respuesta de Telegram:', error.response.data);
    }
  } finally {
    await prisma.$disconnect();
  }
}

setupSupportBot();