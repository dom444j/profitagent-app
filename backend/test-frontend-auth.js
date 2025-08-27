const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function testFrontendAuth() {
  try {
    console.log('🔍 Testing frontend authentication flow...');
    
    // Step 1: Create a test user first
    console.log('\n1. Creating test user...');
    try {
      await axios.post('http://localhost:5000/api/v1/auth/register', {
        email: 'test@grow5x.app',
        password: 'password123',
        first_name: 'Test',
        last_name: 'User',
        sponsor_code: 'REFUQVH1'
      });
      console.log('✅ Test user created');
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error?.includes('already exists')) {
        console.log('ℹ️ Test user already exists');
      } else {
        console.log('⚠️ Could not create test user:', error.response?.data || error.message);
      }
    }
    
    // Step 2: Login to get auth cookie (like frontend does)
     console.log('\n2. Logging in to get auth cookie...');
     const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
        email: 'user@grow5x.app',
        password: 'User123!'
      }, {
        withCredentials: true // This will handle cookies
      });
    
    console.log('✅ Login successful:', loginResponse.data.user.email);
    
    // Extract cookies from login response
    const cookies = loginResponse.headers['set-cookie'];
    console.log('🍪 Cookies received:', cookies);
    
    // Step 3: Test /auth/me with cookies
    console.log('\n3. Testing /auth/me with cookies...');
    const meResponse = await axios.get('http://localhost:5000/api/v1/auth/me', {
      headers: {
        'Cookie': cookies ? cookies.join('; ') : ''
      }
    });
    
    console.log('✅ Auth/me response:', JSON.stringify(meResponse.data, null, 2));
    
    // Step 4: Test commissions endpoint with cookies
    console.log('\n4. Testing commissions endpoint with cookies...');
    const commissionsResponse = await axios.get('http://localhost:5000/api/v1/referrals/commissions', {
      headers: {
        'Cookie': cookies ? cookies.join('; ') : ''
      }
    });
    
    console.log('✅ Commissions response:', JSON.stringify(commissionsResponse.data, null, 2));
    
    // Step 5: Test what frontend API service does
    console.log('\n5. Testing frontend API service pattern...');
    
    // Simulate the frontend's API service call
    const frontendStyleResponse = await axios.get('http://localhost:5000/api/v1/referrals/commissions?page=1&limit=100', {
      headers: {
        'Cookie': cookies ? cookies.join('; ') : '',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Frontend-style response:', JSON.stringify(frontendStyleResponse.data, null, 2));
    
    // Calculate totals like frontend does
    const commissions = frontendStyleResponse.data.data.commissions;
    const totalReleased = commissions.reduce((total, commission) => {
      if (commission.status === 'released') {
        return total + parseFloat(commission.amount_usdt);
      }
      return total;
    }, 0);
    
    const totalPending = commissions.reduce((total, commission) => {
      if (commission.status === 'pending') {
        return total + parseFloat(commission.amount_usdt);
      }
      return total;
    }, 0);
    
    console.log('\n📊 Calculated totals:');
    console.log('Released commissions:', totalReleased);
    console.log('Pending commissions:', totalPending);
    console.log('Total commissions:', totalReleased + totalPending);
    
  } catch (error) {
    console.log('❌ Error:', error.response?.status, error.response?.data || error.message);
    if (error.response?.data) {
      console.log('Full error response:', JSON.stringify(error.response.data, null, 2));
    }
  } finally {
    await prisma.$disconnect();
  }
}

testFrontendAuth();