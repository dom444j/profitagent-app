const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://grow5x:grow5x@localhost:5432/grow5x?schema=public'
    }
  }
});

async function testConnection() {
  try {
    console.log('Probando conexión a la base de datos...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Conexión exitosa:', result);
    
    // Probar consulta a usuarios
    const userCount = await prisma.user.count();
    console.log('✅ Usuarios en la base de datos:', userCount);
    
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();