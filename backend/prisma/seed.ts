import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { Decimal } from '@prisma/client/runtime/library';

// Configurar Prisma con URL del .env
const prisma = new PrismaClient();

async function main() {
  // Admin inicial (sin sponsor)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@profitagent.app' },
    update: {
      password_hash: await bcrypt.hash('Admin123!', 10),
      first_name: 'Admin',
      last_name: 'System',
      status: 'active',
      role: 'admin',
      ref_code: 'REF84I1MR'
    },
    create: {
      email: 'admin@profitagent.app',
      password_hash: await bcrypt.hash('Admin123!', 10),
      first_name: 'Admin',
      last_name: 'System',
      status: 'active',
      role: 'admin',
      ref_code: 'REF84I1MR'
    }
  });

  // Crear 2 usuarios adicionales (total 3 con admin)
  const testUser = await prisma.user.upsert({
    where: { email: 'user@profitagent.app' },
    update: {
      password_hash: await bcrypt.hash('User123!', 10),
      first_name: 'User',
      last_name: 'Test',
      status: 'active',
      role: 'user',
      ref_code: 'REFCYU89I',
      sponsor_id: admin.id
    },
    create: {
      email: 'user@profitagent.app',
      password_hash: await bcrypt.hash('User123!', 10),
      first_name: 'User',
      last_name: 'Test',
      status: 'active',
      role: 'user',
      ref_code: 'REFCYU89I',
      sponsor_id: admin.id
    }
  });

  const testUser2 = await prisma.user.upsert({
    where: { email: 'user2@profitagent.app' },
    update: {
      password_hash: await bcrypt.hash('User123!', 10),
      first_name: 'Maria',
      last_name: 'Garcia',
      status: 'active',
      role: 'user',
      ref_code: 'REFMG2024',
      sponsor_id: admin.id
    },
    create: {
      email: 'user2@profitagent.app',
      password_hash: await bcrypt.hash('User123!', 10),
      first_name: 'Maria',
      last_name: 'Garcia',
      status: 'active',
      role: 'user',
      ref_code: 'REFMG2024',
      sponsor_id: admin.id
    }
  });

  // Crear las 14 wallets del sistema
  const walletAddresses = [
    '0xcFBFc3fBA18799641f3A83Ed7D5C5b346bAf1B18',
    '0x2A9928e07Db86bfAD524BC510c42a80Fa476EeF8',
    '0x9e88170F7E7dd94a903d5A4271bE7Db6D2fDF367',
    '0x7f60A86eb28B899C2d1Ab6f6CE02236633618ed3',
    '0x9dEd7A01d9994F6e294F898ACDD4Aa3fEc60A950',
    '0x50f5faA58906301FaBad2458DcFbE6472BE30522',
    '0xfe04a160A6327e00C9004ca8c84f8C45Ec1056f5',
    '0x6F0f8963fA1F39a687f3B907e9B206F511095345',
    '0xBb9dCC2dF24C2F7e9C5dB87A9293642DD35816bd',
    '0xf5414D523610B6D2EB271F10790b70d3DA4Bb1d3',
    '0xd969B45931000ccD2F6cf3fEe94a377E6d0Ef415',
    '0x07AaCEc2Aa7B9977182b1Aa44A8EC3aC3645E877',
    '0xaD133c5122AE545AcD51d7C3d5C58BcaC8f34EdB',
    '0x39C64B6d0Bb4EA2D2085df6B081231B5733Ebf79'
  ];

  for (let i = 0; i < walletAddresses.length; i++) {
    const address = walletAddresses[i];
    if (!address) continue;
    
    await prisma.adminWallet.upsert({
      where: { address },
      update: {
        label: `Wallet ${i + 1}`,
        status: 'active'
      },
      create: {
        label: `Wallet ${i + 1}`,
        address,
        status: 'active'
      }
    });
  }

  // Create License Products - ProFitAgent Licenses (25 días, 8% diario = 200% total)
  const licenseProducts = [
    {
      name: "🟢 ProFitAgent Básica",
      code: "PFA_BASIC",
      price_usdt: new Decimal('500'),
      daily_rate: new Decimal('0.08'),
      duration_days: 25,
      max_cap_percentage: new Decimal('200.00'),
      cashback_cap: new Decimal('1.00'),
      potential_cap: new Decimal('1.00'),
      description: "Usuarios nuevos que buscan comenzar con trading automatizado. Acceso a agentes básicos de arbitraje.",
      sla_hours: 24,
      badge: null,
      target_user: "Usuarios nuevos que buscan comenzar con trading automatizado",
      active: true
    },
    {
      name: "🔵 ProFitAgent Estándar",
      code: "PFA_STANDARD",
      price_usdt: new Decimal('1000'),
      daily_rate: new Decimal('0.08'),
      duration_days: 25,
      max_cap_percentage: new Decimal('200.00'),
      cashback_cap: new Decimal('1.00'),
      potential_cap: new Decimal('1.00'),
      description: "Traders con experiencia intermedia. Agentes de arbitraje + Grid Trading. Email support.",
      sla_hours: 12,
      badge: null,
      target_user: "Traders con experiencia intermedia",
      active: true
    },
    {
      name: "🟡 ProFitAgent Premium",
      code: "PFA_PREMIUM",
      price_usdt: new Decimal('2500'),
      daily_rate: new Decimal('0.08'),
      duration_days: 25,
      max_cap_percentage: new Decimal('200.00'),
      cashback_cap: new Decimal('1.00'),
      potential_cap: new Decimal('1.00'),
      description: "Traders profesionales y empresas pequeñas. Todos los agentes + DCA avanzado. Chat en vivo + análisis de mercado.",
      sla_hours: 6,
      badge: "POPULAR",
      target_user: "Traders profesionales y empresas pequeñas",
      active: true
    },
    {
      name: "🟠 ProFitAgent Elite",
      code: "PFA_ELITE",
      price_usdt: new Decimal('5000'),
      daily_rate: new Decimal('0.08'),
      duration_days: 25,
      max_cap_percentage: new Decimal('200.00'),
      cashback_cap: new Decimal('1.00'),
      potential_cap: new Decimal('1.00'),
      description: "Inversores institucionales y traders de alto volumen. Agentes exclusivos + Machine Learning. Soporte prioritario + gestor de cuenta.",
      sla_hours: 3,
      badge: "VIP",
      target_user: "Inversores institucionales y traders de alto volumen",
      active: true
    },
    {
      name: "🔴 ProFitAgent Enterprise",
      code: "PFA_ENTERPRISE",
      price_usdt: new Decimal('10000'),
      daily_rate: new Decimal('0.08'),
      duration_days: 25,
      max_cap_percentage: new Decimal('200.00'),
      cashback_cap: new Decimal('1.00'),
      potential_cap: new Decimal('1.00'),
      description: "Empresas grandes e instituciones financieras. Personalización completa + agentes custom. Soporte 24/7 + integración personalizada.",
      sla_hours: 1,
      badge: "EXCLUSIVA",
      target_user: "Empresas grandes e instituciones financieras",
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

  // Configuraciones del sistema (comentadas hasta que se implemente el modelo Setting)
  // await prisma.setting.upsert({
  //   where: { key: 'revenue.daily_rate' },
  //   update: { value: '0.08' },
  //   create: { key: 'revenue.daily_rate', value: '0.08' }
  // });

  // Crear una licencia activa para el primer usuario
  const basicProduct = await prisma.licenseProduct.findFirst({
    where: { code: 'PFA_BASIC' }
  });

  if (basicProduct) {
    await prisma.userLicense.create({
       data: {
         user_id: testUser.id,
         product_id: basicProduct.id,
         order_id: 'ORDER_SEED_001',
         principal_usdt: basicProduct.price_usdt,
         total_earned_usdt: new Decimal('0'),
         cashback_accum: new Decimal('0'),
         potential_accum: new Decimal('0'),
         status: 'active',
         days_generated: 0,
         started_at: new Date(),
         ends_at: new Date(Date.now() + (basicProduct.duration_days * 24 * 60 * 60 * 1000))
       }
     });
  }

  console.log('✅ Usuarios creados:');
  console.log('👑 Admin:', admin.email);
  console.log('🧪 Usuario Normal:', testUser.email);
  console.log('👩 Usuario 2:', testUser2.email);
  console.log('\n💰 Wallets creadas: 14 wallets activas');
  console.log('📦 Productos de licencia: 5 niveles (Básica, Estándar, Premium, Elite, Enterprise)');
  console.log('🎯 Licencia activa: 1 licencia básica para', testUser.email);
  console.log('\n🎉 Base de datos poblada exitosamente con 3 usuarios, 14 wallets, 5 productos de licencia y 1 licencia activa!');
}

main().finally(() => prisma.$disconnect());
