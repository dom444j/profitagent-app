const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
require('dotenv').config();

const prisma = new PrismaClient();

/**
 * Script para mejorar el proceso de vinculación de Telegram
 * 
 * 1. Busca usuarios con problemas de vinculación
 * 2. Intenta detectar conversaciones activas con los bots
 * 3. Actualiza el estado de vinculación según el resultado
 */

async function improveTelegramLinking() {
  try {
    console.log('🔧 MEJORANDO PROCESO DE VINCULACIÓN DE TELEGRAM\n');
    
    // 1. Encontrar usuarios con problemas de vinculación
    console.log('🔍 BUSCANDO USUARIOS CON PROBLEMAS DE VINCULACIÓN:');
    
    const problematicUsers = await prisma.user.findMany({
      where: {
        OR: [
          {
            telegram_user_id: { not: null },
            telegram_linked: false
          },
          {
            telegram_user_id: { not: null },
            telegram_linked: null
          }
        ]
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        telegram_user_id: true,
        telegram_username: true,
        telegram_linked: true
      }
    });
    
    console.log(`   📊 Encontrados ${problematicUsers.length} usuarios con problemas de vinculación\n`);
    
    if (problematicUsers.length === 0) {
      console.log('✅ No hay usuarios con problemas de vinculación');
      return;
    }
    
    // 2. Procesar cada usuario
    for (const user of problematicUsers) {
      console.log(`\n🔍 Procesando: ${user.email}`);
      console.log(`   Telegram ID: ${user.telegram_user_id}`);
      console.log(`   Username: @${user.telegram_username || 'N/A'}`);
      console.log(`   Estado actual: ${user.telegram_linked ? 'vinculado' : 'no vinculado'}`);
      
      // Intentar detectar conversación activa
      const hasActiveConversation = await checkActiveConversation(user.telegram_user_id);
      
      if (hasActiveConversation) {
        console.log(`   ✅ Conversación activa detectada`);
        
        // Actualizar estado de vinculación
        await prisma.user.update({
          where: { id: user.id },
          data: {
            telegram_linked: true,
            updated_at: new Date()
          }
        });
        
        console.log(`   ✅ Usuario actualizado - Vinculación completa`);
        
        // Enviar mensaje de confirmación
        try {
          await sendTelegramMessage(user.telegram_user_id, {
            text: `🎉 ¡Vinculación completada automáticamente!\n\nHola ${user.first_name}, hemos detectado que ya tienes una conversación activa con nuestro bot.\n\n✅ Tu cuenta ahora está completamente vinculada y puedes recibir:\n• Códigos OTP para retiros\n• Notificaciones de transacciones\n• Alertas del sistema\n\n🔐 profitagent - Investor Panel`,
            parse_mode: 'HTML'
          });
          
          console.log(`   📨 Mensaje de confirmación enviado`);
          
        } catch (msgError) {
          console.log(`   ⚠️  No se pudo enviar mensaje de confirmación`);
        }
        
      } else {
        console.log(`   ⚠️  No se detectó conversación activa`);
        console.log(`   💡 El usuario debe escribir /start al bot primero`);
        
        // Mantener estado como no vinculado
        await prisma.user.update({
          where: { id: user.id },
          data: {
            telegram_linked: false,
            updated_at: new Date()
          }
        });
      }
      
      console.log(); // Línea en blanco
    }
    
    // 3. Resumen final
    const updatedUsers = await prisma.user.findMany({
      where: {
        telegram_user_id: { not: null },
        telegram_linked: true
      }
    });
    
    console.log('\n📋 RESUMEN FINAL:');
    console.log(`✅ Usuarios con vinculación completa: ${updatedUsers.length}`);
    console.log(`⚠️  Usuarios que necesitan acción: ${problematicUsers.length - updatedUsers.length}`);
    
    // 4. Instrucciones para usuarios pendientes
    const pendingUsers = problematicUsers.filter(u => 
      !updatedUsers.find(updated => updated.id === u.id)
    );
    
    if (pendingUsers.length > 0) {
      console.log('\n💡 USUARIOS QUE NECESITAN ACCIÓN MANUAL:');
      pendingUsers.forEach(user => {
        console.log(`   • ${user.email} (ID: ${user.telegram_user_id})`);
      });
      
      console.log('\n📝 INSTRUCCIONES PARA COMPLETAR VINCULACIÓN:');
      console.log('   1. El usuario debe abrir Telegram');
      console.log('   2. Buscar @profitagentOTPBot');
      console.log('   3. Enviar el comando /start');
      console.log('   4. El sistema detectará automáticamente la conversación');
    }
    
  } catch (error) {
    console.error('❌ Error mejorando vinculación:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Verificar si existe una conversación activa con el bot
 */
async function checkActiveConversation(telegramUserId) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.log('   ⚠️  Token de bot no configurado');
      return false;
    }
    
    // Intentar enviar un mensaje de prueba (que no se enviará realmente)
    const response = await axios.post(
      `https://api.telegram.org/bot${botToken}/sendChatAction`,
      {
        chat_id: telegramUserId,
        action: 'typing'
      }
    );
    
    return response.data.ok;
    
  } catch (error) {
    // Si hay error, probablemente no hay conversación activa
    return false;
  }
}

/**
 * Enviar mensaje de Telegram
 */
async function sendTelegramMessage(chatId, messageData) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  const response = await axios.post(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      chat_id: chatId,
      ...messageData
    }
  );
  
  return response.data;
}

// Ejecutar el script
if (require.main === module) {
  improveTelegramLinking();
}

module.exports = { improveTelegramLinking };
