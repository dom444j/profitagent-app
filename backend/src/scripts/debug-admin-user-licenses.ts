import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

async function debugAdminUserLicenses() {
  try {
    console.log('=== DEBUG: Admin User Licenses ===\n');
    
    // 1. Find admin user
    const adminUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { contains: 'admin' } },
          { role: 'admin' },
          { first_name: { contains: 'admin', mode: 'insensitive' } },
          { last_name: { contains: 'admin', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        created_at: true
      }
    });
    
    if (!adminUser) {
      console.log('❌ No admin user found');
      return;
    }
    
    console.log('👤 Admin User Found:');
    console.log(`   ID: ${adminUser.id}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Name: ${adminUser.first_name} ${adminUser.last_name}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   Created: ${adminUser.created_at}\n`);
    
    // 2. Get ALL licenses for this user (no filters)
    const allLicenses = await prisma.userLicense.findMany({
      where: {
        user_id: adminUser.id
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price_usdt: true,
            daily_rate: true,
            duration_days: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    
    console.log(`📋 Total Licenses Found: ${allLicenses.length}\n`);
    
    if (allLicenses.length === 0) {
      console.log('❌ No licenses found for admin user');
      return;
    }
    
    // 3. Show all licenses with details
    allLicenses.forEach((license, index) => {
      console.log(`🎫 License ${index + 1}:`);
      console.log(`   ID: ${license.id}`);
      console.log(`   Product: ${license.product.name}`);
      console.log(`   Price: $${license.product.price_usdt} USDT`);
      console.log(`   Status: ${license.status}`);
      console.log(`   Days Generated: ${license.days_generated || 0}`);
      console.log(`   Started At: ${license.started_at}`);
      console.log(`   Ends At: ${license.ends_at}`);
      console.log(`   Created At: ${license.created_at}`);
      console.log(`   Flags: ${JSON.stringify(license.flags)}`);
      console.log(`   Cashback Accum: ${license.cashback_accum}`);
      console.log(`   Total Earned: ${license.total_earned_usdt}\n`);
    });
    
    // 4. Filter specifically for $500 licenses
    const license500 = allLicenses.filter(license => 
      Number(license.product.price_usdt) === 500
    );
    
    console.log(`💰 $500 Licenses Found: ${license500.length}\n`);
    
    if (license500.length > 0) {
      license500.forEach((license, index) => {
        console.log(`💵 $500 License ${index + 1}:`);
        console.log(`   ID: ${license.id}`);
        console.log(`   Status: ${license.status}`);
        console.log(`   Product Name: ${license.product.name}`);
        console.log(`   Is Active?: ${license.status === 'active' ? '✅ YES' : '❌ NO'}`);
        console.log(`   Days Generated: ${license.days_generated || 0}`);
        console.log(`   Started: ${license.started_at}`);
        console.log(`   Created: ${license.created_at}\n`);
      });
    }
    
    // 5. Filter for active licenses only
    const activeLicenses = allLicenses.filter(license => license.status === 'active');
    console.log(`🟢 Active Licenses: ${activeLicenses.length}\n`);
    
    if (activeLicenses.length > 0) {
      activeLicenses.forEach((license, index) => {
        console.log(`✅ Active License ${index + 1}:`);
        console.log(`   Product: ${license.product.name}`);
        console.log(`   Price: $${license.product.price_usdt} USDT`);
        console.log(`   Days: ${license.days_generated || 0}`);
        console.log(`   Started: ${license.started_at}\n`);
      });
    }
    
    // 6. Check if there's a $500 active license
    const active500License = activeLicenses.find(license => 
      Number(license.product.price_usdt) === 500
    );
    
    if (active500License) {
      console.log('🎯 FOUND: Active $500 License!');
      console.log(`   ID: ${active500License.id}`);
      console.log(`   Status: ${active500License.status}`);
      console.log(`   Product: ${active500License.product.name}`);
      console.log(`   This should appear in the frontend!\n`);
    } else {
      console.log('❌ NO Active $500 License Found');
      console.log('   This explains why it doesn\'t appear in the frontend\n');
    }
    
    // 7. Check all products available
    const allProducts = await prisma.licenseProduct.findMany({
      where: {
        active: true
      },
      select: {
        id: true,
        name: true,
        price_usdt: true,
        active: true
      },
      orderBy: {
        price_usdt: 'asc'
      }
    });
    
    console.log(`🛍️ Available Products: ${allProducts.length}\n`);
    allProducts.forEach(product => {
      console.log(`   ${product.name}: $${product.price_usdt} USDT (Active: ${product.active})`);
    });
    
    const product500 = allProducts.find(p => Number(p.price_usdt) === 500);
    if (product500) {
      console.log(`\n✅ $500 Product exists: ${product500.name}`);
    } else {
      console.log(`\n❌ No $500 Product found`);
    }
    
  } catch (error) {
    console.error('Error in debug script:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug script
debugAdminUserLicenses().catch(console.error);