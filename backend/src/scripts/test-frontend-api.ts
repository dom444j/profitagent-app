import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

async function testFrontendAPI() {
  try {
    console.log('=== TEST: Frontend API Endpoint ===\n');
    
    // 1. Find admin user
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
    
    console.log(`👤 Testing with admin user: ${adminUser.email}\n`);
    
    // 2. Test login to get token
    try {
      console.log('🔐 Testing login...');
      const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
        email: adminUser.email,
        password: 'admin123' // Assuming this is the password
      });
      
      const token = loginResponse.data.token;
      console.log('✅ Login successful, token obtained\n');
      
      // 3. Test licenses endpoint without status filter
      console.log('📋 Testing /licenses endpoint (all licenses)...');
      const allLicensesResponse = await axios.get('http://localhost:3001/api/v1/licenses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(`Total licenses returned: ${allLicensesResponse.data.licenses?.length || 0}`);
      console.log('Response structure:', {
        total: allLicensesResponse.data.total,
        page: allLicensesResponse.data.page,
        totalPages: allLicensesResponse.data.totalPages
      });
      
      if (allLicensesResponse.data.licenses?.length > 0) {
        console.log('\n📄 First license details:');
        const firstLicense = allLicensesResponse.data.licenses[0];
        console.log(JSON.stringify(firstLicense, null, 2));
      }
      
      // 4. Test licenses endpoint with 'active' status filter
      console.log('\n🟢 Testing /licenses?status=active endpoint...');
      const activeLicensesResponse = await axios.get('http://localhost:3001/api/v1/licenses?status=active', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(`Active licenses returned: ${activeLicensesResponse.data.licenses?.length || 0}`);
      
      if (activeLicensesResponse.data.licenses?.length > 0) {
        console.log('\n✅ Active licenses found:');
        activeLicensesResponse.data.licenses.forEach((license: any, index: number) => {
          console.log(`   ${index + 1}. ${license.product?.name || 'Unknown'} - $${license.principal_usdt || license.principalUSDT} - Status: ${license.status}`);
        });
        
        // Check for $500 license specifically
        const license500 = activeLicensesResponse.data.licenses.find((license: any) => {
          const price = parseFloat(license.principal_usdt || license.principalUSDT || license.product?.price_usdt || '0');
          return price === 500;
        });
        
        if (license500) {
          console.log('\n🎯 $500 Active License Found in API Response!');
          console.log('License details:');
          console.log(JSON.stringify(license500, null, 2));
        } else {
          console.log('\n❌ No $500 active license found in API response');
          console.log('Available prices:', activeLicensesResponse.data.licenses.map((l: any) => {
            return parseFloat(l.principal_usdt || l.principalUSDT || l.product?.price_usdt || '0');
          }));
        }
      } else {
        console.log('❌ No active licenses returned from API');
      }
      
    } catch (loginError: any) {
      console.log('❌ Login failed:', loginError.response?.data || loginError.message);
      
      // Try with different password
      console.log('\n🔄 Trying with different password...');
      try {
        const loginResponse2 = await axios.post('http://localhost:3001/api/v1/auth/login', {
          email: adminUser.email,
          password: 'password123'
        });
        
        const token = loginResponse2.data.token;
        console.log('✅ Login successful with alternative password\n');
        
        // Test with this token
        const activeLicensesResponse = await axios.get('http://localhost:3001/api/v1/licenses?status=active', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log(`Active licenses returned: ${activeLicensesResponse.data.licenses?.length || 0}`);
        
      } catch (secondLoginError: any) {
        console.log('❌ Second login attempt failed:', secondLoginError.response?.data || secondLoginError.message);
      }
    }
    
  } catch (error) {
    console.error('Error in test script:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testFrontendAPI().catch(console.error);