import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function checkAdminPassword() {
  try {
    console.log('=== CHECKING ADMIN PASSWORD ===\n');
    
    // Find admin user
    const adminUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { contains: 'admin' } },
          { role: 'admin' },
          { first_name: { contains: 'admin', mode: 'insensitive' } },
          { last_name: { contains: 'admin', mode: 'insensitive' } }
        ]
      }
    });
    
    if (!adminUser) {
      console.log('❌ No admin user found');
      return;
    }
    
    console.log(`👤 Admin user found: ${adminUser.email}`);
    console.log(`🔑 Password hash: ${adminUser.password_hash}`);
    console.log(`👤 Role: ${adminUser.role}`);
    console.log(`🟢 Status: ${adminUser.status}\n`);
    
    // Test common passwords including the documented one
    const commonPasswords = [
      'Admin123!',  // From documentation
      'admin123',
      'password123',
      'admin',
      'password',
      '123456',
      'profitagent123',
      'admin@123'
    ];
    
    console.log('🔍 Testing common passwords...');
    
    for (const password of commonPasswords) {
      try {
        const isMatch = await bcrypt.compare(password, adminUser.password_hash);
        if (isMatch) {
          console.log(`✅ FOUND CORRECT PASSWORD: "${password}"`);
          return password;
        } else {
          console.log(`❌ "${password}" - No match`);
        }
      } catch (error) {
        console.log(`❌ "${password}" - Error comparing: ${error}`);
      }
    }
    
    console.log('\n❌ None of the common passwords worked');
    console.log('💡 You may need to reset the admin password or check the seeding script');
    return null;
    
  } catch (error) {
    console.error('Error checking admin password:', error);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkAdminPassword().catch(console.error);