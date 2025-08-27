const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://grow5x:password123@localhost:5432/grow5x?schema=public'
    }
  }
});

async function testBackfill() {
  try {
    console.log('Testing database connection...');
    const licenses = await prisma.userLicense.findMany({
      take: 1
    });
    console.log('✅ Connection successful!');
    console.log('Found', licenses.length, 'licenses');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testBackfill();