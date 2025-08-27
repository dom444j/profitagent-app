const axios = require('axios');

async function testFrontendAPI() {
  try {
    console.log('🔍 Testing Frontend API calls...');
    
    // Step 1: Login to get cookies
    console.log('\n1. Logging in...');
    const loginResponse = await axios.post('http://localhost:3000/api/v1/auth/login', {
      email: 'user@grow5x.app',
      password: 'User123!'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Login response:', loginResponse.data);
    
    // Extract cookies
    const setCookieHeaders = loginResponse.headers['set-cookie'];
    let cookies = '';
    if (setCookieHeaders) {
      cookies = setCookieHeaders.join('; ');
      console.log('🍪 Cookies extracted:', cookies);
    }
    
    // Step 2: Test frontend API endpoint for commissions
    console.log('\n2. Testing frontend /api/v1/referrals/commissions...');
    const commissionsResponse = await axios.get('http://localhost:3000/api/v1/referrals/commissions?page=1&limit=100', {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    });
    
    console.log('✅ Frontend commissions response:', JSON.stringify(commissionsResponse.data, null, 2));
    
    // Step 3: Test backend API endpoint directly
    console.log('\n3. Testing backend /api/v1/referrals/commissions...');
    const backendResponse = await axios.get('http://localhost:5000/api/v1/referrals/commissions?page=1&limit=100', {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    });
    
    console.log('✅ Backend commissions response:', JSON.stringify(backendResponse.data, null, 2));
    
    // Compare responses
    console.log('\n📊 Comparison:');
    console.log('Frontend commissions count:', commissionsResponse.data?.data?.commissions?.length || 0);
    console.log('Backend commissions count:', backendResponse.data?.data?.commissions?.length || 0);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

testFrontendAPI();