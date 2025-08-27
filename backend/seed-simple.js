const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { Decimal } = require('@prisma/client/runtime/library');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');
  
  // Create admin user
  console.log('Creating admin user...');
  const adminPassword = await bcrypt.hash('admin123!', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@grow5x.com' },
    update: {},
    create: {
      email: 'admin@grow5x.com',
      password_hash: adminPassword,
      first_name: 'System',
      last_name: 'Administrator',
      ref_code: 'ADMIN001',
      status: 'active'
    }
  });
  
  console.log(`✅ Created admin user: ${adminUser.email}`);
  
  // Create demo users for testing
  console.log('Creating demo users...');
  const demoPassword = await bcrypt.hash('demo123!', 10);
  
  const demoUser1 = await prisma.user.upsert({
    where: { email: 'demo1@example.com' },
    update: {},
    create: {
      email: 'demo1@example.com',
      password_hash: demoPassword,
      first_name: 'Demo',
      last_name: 'User One',
      ref_code: 'DEMO001',
      status: 'active'
    }
  });
  
  console.log(`✅ Created demo user: ${demoUser1.email}`);
  
  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });