import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { Decimal } from '@prisma/client/runtime/library';

// Configurar Prisma con URL del .env
const prisma = new PrismaClient();

async function main() {
  // Admin inicial (sin sponsor)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@grow5x.app' },
    update: {
      password_hash: await bcrypt.hash('Admin123!', 10),
      first_name: 'Admin',
      last_name: 'System',
      status: 'active',
      role: 'admin',
      ref_code: 'REF84I1MR'
    },
    create: {
      // id: '0b2593a5-aef8-4a50-a0c8-7beecab2d207', // si la BD está vacía y deseas fijar el ID, descomenta esta línea
      email: 'admin@grow5x.app',
      password_hash: await bcrypt.hash('Admin123!', 10),
      first_name: 'Admin',
      last_name: 'System',
      status: 'active',
      role: 'admin',
      ref_code: 'REF84I1MR'
    }
  });

  // Asegurar ambiente de pruebas: eliminar usuario sponsor legado si existiera
  await prisma.user.deleteMany({ where: { email: 'sponsor@grow5x.app' } });

  // Usuario de pruebas referido por admin
  const testUser = await prisma.user.upsert({
    where: { email: 'user@grow5x.app' },
    update: {
      password_hash: await bcrypt.hash('User123!', 10),
      first_name: 'User',
      last_name: 'Referred',
      status: 'active',
      role: 'user',
      ref_code: 'REFCYU89I',
      sponsor_id: admin.id
    },
    create: {
      // id: '16efc868-14de-429f-8721-e19de4a842d4', // si la BD está vacía y deseas fijar el ID, descomenta esta línea
      email: 'user@grow5x.app',
      password_hash: await bcrypt.hash('User123!', 10),
      first_name: 'User',
      last_name: 'Referred',
      status: 'active',
      role: 'user',
      ref_code: 'REFCYU89I',
      sponsor_id: admin.id
    }
  });

  // Create License Products - Las 7 Licencias de Grow5X
  const licenseProducts = [
    {
      name: "💎 Licencia Starter",
      code: "STARTER_50",
      price_usdt: new Decimal('50'),
      daily_rate: new Decimal('0.10'),
      duration_days: 20,
      max_cap_percentage: new Decimal('200.00'),
      cashback_cap: new Decimal('1.00'),
      potential_cap: new Decimal('1.00'),
      description: "Licencia de entrada perfecta para conocer la plataforma",
      sla_hours: 24,
      badge: null,
      target_user: "Usuarios nuevos que quieren probar la plataforma",
      active: true
    },
    {
      name: "🚀 Licencia Basic",
      code: "BASIC_100",
      price_usdt: new Decimal('100'),
      daily_rate: new Decimal('0.10'),
      duration_days: 20,
      max_cap_percentage: new Decimal('200.00'),
      cashback_cap: new Decimal('1.00'),
      potential_cap: new Decimal('1.00'),
      description: "Opción accesible con mejor tiempo de procesamiento",
      sla_hours: 12,
      badge: null,
      target_user: "Usuarios que buscan entrada accesible",
      active: true
    },
    {
      name: "⭐ Licencia Standard",
      code: "STANDARD_250",
      price_usdt: new Decimal('250'),
      daily_rate: new Decimal('0.10'),
      duration_days: 20,
      max_cap_percentage: new Decimal('200.00'),
      cashback_cap: new Decimal('1.00'),
      potential_cap: new Decimal('1.00'),
      description: "La opción más equilibrada y preferida por los usuarios",
      sla_hours: 6,
      badge: "POPULAR",
      target_user: "Opción más popular y equilibrada",
      active: true
    },
    {
      name: "🏆 Licencia Premium",
      code: "PREMIUM_500",
      price_usdt: new Decimal('500'),
      daily_rate: new Decimal('0.10'),
      duration_days: 20,
      max_cap_percentage: new Decimal('200.00'),
      cashback_cap: new Decimal('1.00'),
      potential_cap: new Decimal('1.00'),
      description: "Para inversores serios que buscan mayor agilidad",
      sla_hours: 3,
      badge: null,
      target_user: "Inversores con capital medio",
      active: true
    },
    {
      name: "🥇 Licencia Gold",
      code: "GOLD_1000",
      price_usdt: new Decimal('1000'),
      daily_rate: new Decimal('0.10'),
      duration_days: 20,
      max_cap_percentage: new Decimal('200.00'),
      cashback_cap: new Decimal('1.00'),
      potential_cap: new Decimal('1.00'),
      description: "Licencia premium con procesamiento prioritario",
      sla_hours: 1,
      badge: null,
      target_user: "Inversores serios con capital alto",
      active: true
    },
    {
      name: "💠 Licencia Platinum",
      code: "PLATINUM_2500",
      price_usdt: new Decimal('2500'),
      daily_rate: new Decimal('0.10'),
      duration_days: 20,
      max_cap_percentage: new Decimal('200.00'),
      cashback_cap: new Decimal('1.00'),
      potential_cap: new Decimal('1.00'),
      description: "Nivel VIP con procesamiento ultra rápido",
      sla_hours: 1,
      badge: "VIP",
      target_user: "Inversores VIP con capital muy alto",
      active: true
    },
    {
      name: "💎 Licencia Diamond",
      code: "DIAMOND_5000",
      price_usdt: new Decimal('5000'),
      daily_rate: new Decimal('0.10'),
      duration_days: 20,
      max_cap_percentage: new Decimal('200.00'),
      cashback_cap: new Decimal('1.00'),
      potential_cap: new Decimal('1.00'),
      description: "La licencia más exclusiva con máxima prioridad",
      sla_hours: 1,
      badge: "EXCLUSIVA",
      target_user: "Inversores premium con máximo capital",
      active: true
    }
  ];
  
  for (const licenseData of licenseProducts) {
    const existingProduct = await prisma.licenseProduct.findFirst({
      where: { name: licenseData.name }
    });

    if (!existingProduct) {
      await prisma.licenseProduct.create({
        data: licenseData
      });
    }
  }

  // Settings
  await prisma.setting.upsert({
    where: { key: 'revenue.daily_rate' },
    update: { value: '0.10' },
    create: { key: 'revenue.daily_rate', value: '0.10' }
  });
  await prisma.setting.upsert({
    where: { key: 'revenue.days' },
    update: { value: '20' },
    create: { key: 'revenue.days', value: '20' }
  });
  await prisma.setting.upsert({
    where: { key: 'payout.min_amount_usdt' },
    update: { value: '10' },
    create: { key: 'payout.min_amount_usdt', value: '10' }
  });
  await prisma.setting.upsert({
    where: { key: 'feature.pause_potential.global' },
    update: { value: 'false' },
    create: { key: 'feature.pause_potential.global', value: 'false' }
  });
  await prisma.setting.upsert({
    where: { key: 'system_wallet_address' },
    update: { value: '0xDEMOADMINWALLET000000000000000000000000' },
    create: { key: 'system_wallet_address', value: '0xDEMOADMINWALLET000000000000000000000000' }
  });

  console.log({ admin: admin.email, user: testUser.email });
}

main().finally(() => prisma.$disconnect());