const { PrismaClient } = require('@prisma/client');
const { processDailyEarnings } = require('./dist/jobs/dailyEarnings');

const prisma = new PrismaClient();

async function runDailyEarnings() {
  try {
    console.log('🚀 Ejecutando procesamiento de ganancias diarias...');
    
    // Create a mock job object
    const mockJob = {
      id: 'manual-run',
      name: 'daily-earnings',
      data: {},
      opts: {},
      progress: () => {},
      log: (message) => console.log(`[JOB LOG] ${message}`)
    };
    
    await processDailyEarnings(mockJob);
    console.log('✅ Procesamiento completado exitosamente');
    
  } catch (error) {
    console.error('❌ Error durante el procesamiento:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

runDailyEarnings();