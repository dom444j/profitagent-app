const axios = require('axios');

// Simple cookie storage
let cookies = '';

async function simulateBrowserFlow() {
  try {
    console.log('🌐 Simulating browser flow...');
    
    // Step 1: Login like the frontend does
    console.log('\n1. Frontend login simulation...');
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'user@grow5x.app',
      password: 'User123!'
    }, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log('✅ Login response:', loginResponse.data);
    
    // Extract cookies from response
    const setCookieHeaders = loginResponse.headers['set-cookie'];
    if (setCookieHeaders) {
      cookies = setCookieHeaders.join('; ');
      console.log('🍪 Cookies extracted:', cookies);
    }
    
    // Step 2: Test /auth/me like frontend does
    console.log('\n2. Testing /auth/me...');
    const meResponse = await axios.get('http://localhost:5000/api/v1/auth/me', {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    });
    
    console.log('✅ Auth/me response:', meResponse.data);
    
    // Step 3: Test getUserReferrals like frontend does
    console.log('\n3. Testing getUserReferrals...');
    const referralsResponse = await axios.get('http://localhost:5000/api/v1/referrals?page=1&limit=100', {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    });
    
    console.log('✅ Referrals response:', JSON.stringify(referralsResponse.data, null, 2));
    
    // Step 4: Test getUserCommissions like frontend does
    console.log('\n4. Testing getUserCommissions...');
    const commissionsResponse = await axios.get('http://localhost:5000/api/v1/referrals/commissions?page=1&limit=100', {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    });
    
    console.log('✅ Commissions response:', JSON.stringify(commissionsResponse.data, null, 2));
    
    // Step 5: Simulate frontend calculation
    console.log('\n5. Simulating frontend calculation...');
    const commissions = commissionsResponse.data.data.commissions;
    
    console.log('Commissions array:', commissions);
    console.log('Array length:', commissions.length);
    
    const calculateTotalCommissions = () => {
      return commissions.reduce((total, commission) => {
        console.log(`Processing commission: ${commission.id}, status: ${commission.status}, amount: ${commission.amount_usdt}`);
        if (commission.status === 'released') {
          console.log(`✅ Adding released commission: ${commission.amount_usdt} USDT`);
          return total + parseFloat(commission.amount_usdt);
        }
        return total;
      }, 0);
    };
    
    const calculatePendingCommissions = () => {
      return commissions.reduce((total, commission) => {
        if (commission.status === 'pending') {
          console.log(`⏳ Adding pending commission: ${commission.amount_usdt} USDT`);
          return total + parseFloat(commission.amount_usdt);
        }
        return total;
      }, 0);
    };
    
    const totalReleased = calculateTotalCommissions();
    const totalPending = calculatePendingCommissions();
    const grandTotal = totalReleased + totalPending;
    
    console.log('\n📊 Final results:');
    console.log('Total Released Commissions:', totalReleased);
    console.log('Total Pending Commissions:', totalPending);
    console.log('Grand Total:', grandTotal);
    
    // Step 6: Check if user is the correct one
    console.log('\n6. User verification:');
    console.log('Logged in user ID:', meResponse.data.user.id);
    console.log('Logged in user email:', meResponse.data.user.email);
    
  } catch (error) {
    console.log('❌ Error:', error.response?.status, error.response?.data || error.message);
    if (error.response?.data) {
      console.log('Full error response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

simulateBrowserFlow();