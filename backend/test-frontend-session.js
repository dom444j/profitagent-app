const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testFrontendSession() {
  try {
    console.log('🔍 Testing frontend session and commission data...');
    
    // Step 1: Login to establish session
    console.log('\n1. Logging in to establish session...');
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'user@grow5x.app',
      password: 'User123!'
    }, {
      withCredentials: true
    });
    
    console.log('✅ Login successful:', loginResponse.data.user.email);
    
    // Extract cookies
    const cookies = loginResponse.headers['set-cookie'];
    console.log('🍪 Cookies received:', cookies);
    
    // Step 2: Test auth/me to verify session
    console.log('\n2. Verifying session with /auth/me...');
    const meResponse = await axios.get('http://localhost:5000/api/v1/auth/me', {
      headers: {
        'Cookie': cookies ? cookies.join('; ') : ''
      }
    });
    
    console.log('✅ Current user:', meResponse.data.user.email, '- ID:', meResponse.data.user.id);
    
    // Step 3: Test referrals endpoint
    console.log('\n3. Testing referrals endpoint...');
    const referralsResponse = await axios.get('http://localhost:5000/api/v1/referrals?page=1&limit=100', {
      headers: {
        'Cookie': cookies ? cookies.join('; ') : ''
      }
    });
    
    console.log('✅ Referrals response:', JSON.stringify(referralsResponse.data, null, 2));
    
    // Step 4: Test commissions endpoint with exact frontend parameters
    console.log('\n4. Testing commissions endpoint with frontend parameters...');
    const commissionsResponse = await axios.get('http://localhost:5000/api/v1/referrals/commissions?page=1&limit=20', {
      headers: {
        'Cookie': cookies ? cookies.join('; ') : '',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Commissions response:', JSON.stringify(commissionsResponse.data, null, 2));
    
    // Step 5: Simulate frontend calculation
    const commissions = commissionsResponse.data.data.commissions;
    console.log('\n5. Frontend calculation simulation:');
    console.log('Raw commissions array:', commissions);
    
    const calculateTotalCommissions = () => {
      return commissions.reduce((total, commission) => {
        if (commission.status === 'released') {
          console.log(`Adding released commission: ${commission.amount_usdt} USDT`);
          return total + parseFloat(commission.amount_usdt);
        }
        return total;
      }, 0);
    };
    
    const calculatePendingCommissions = () => {
      return commissions.reduce((total, commission) => {
        if (commission.status === 'pending') {
          console.log(`Adding pending commission: ${commission.amount_usdt} USDT`);
          return total + parseFloat(commission.amount_usdt);
        }
        return total;
      }, 0);
    };
    
    const totalReleased = calculateTotalCommissions();
    const totalPending = calculatePendingCommissions();
    const grandTotal = totalReleased + totalPending;
    
    console.log('\n📊 Final calculations:');
    console.log('Total Released:', totalReleased);
    console.log('Total Pending:', totalPending);
    console.log('Grand Total:', grandTotal);
    
    // Step 6: Check if there are any authentication issues
    console.log('\n6. Checking for potential authentication issues...');
    
    // Test without cookies to see the difference
    try {
      const noCookieResponse = await axios.get('http://localhost:5000/api/v1/referrals/commissions?page=1&limit=20');
      console.log('⚠️ No cookie request succeeded (this should not happen):', noCookieResponse.data);
    } catch (error) {
      console.log('✅ No cookie request failed as expected:', error.response?.status, error.response?.data?.error);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.response?.status, error.response?.data || error.message);
    if (error.response?.data) {
      console.log('Full error response:', JSON.stringify(error.response.data, null, 2));
    }
  } finally {
    await prisma.$disconnect();
  }
}

testFrontendSession();