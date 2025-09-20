const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listCurrentBots() {
  try {
    console.log('📊 BOTS ACTUALES EN BASE DE DATOS:');
    console.log('===================================');
    
    const bots = await prisma.telegramBot.findMany({
      orderBy: { created_at: 'asc' }
    });
    
    if (bots.length === 0) {
      console.log('❌ No hay bots registrados en la base de datos');
      return;
    }
    
    bots.forEach((bot, index) => {
      console.log(`${index + 1}. ${bot.bot_username} (${bot.bot_name})`);
      console.log(`   - Tipo: ${bot.bot_type}`);
      console.log(`   - Estado: ${bot.status}`);
      console.log(`   - ID en DB: ${bot.id}`);
      console.log(`   - Token: ${bot.bot_token.substring(0, 20)}...`);
      console.log(`   - Creado: ${bot.created_at}`);
      console.log('');
    });
    
    console.log(`✅ Total de bots: ${bots.length}`);
    
  } catch (error) {
    console.error('❌ Error listando bots:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listCurrentBots();