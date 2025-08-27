const axios = require('axios');

async function testCommissionsAPI() {
  try {
    console.log('=== TESTING COMMISSIONS API ===');
    
    // First, let's test without authentication to see the error
    console.log('\n1. Testing without authentication:');
    try {
      const response = await axios.get('http://localhost:5000/referrals/commissions');
      console.log('Response:', response.data);
    } catch (error) {
      console.log('Error (expected):', error.response?.status, error.response?.data);
    }
    
    // Now let's test with a mock token (we need to get a real one from the frontend)
    console.log('\n2. Testing endpoint structure:');
    try {
      const response = await axios.get('http://localhost:5000/referrals/commissions', {
        headers: {
          'Authorization': 'Bearer invalid_token_for_testing'
        }
      });
      console.log('Response:', response.data);
    } catch (error) {
      console.log('Error response:', error.response?.status, error.response?.data);
    }
    
    // Let's also check if the server is responding
    console.log('\n3. Testing server health:');
    try {
      const response = await axios.get('http://localhost:5000/health');
      console.log('Health check:', response.data);
    } catch (error) {
      console.log('Health check error:', error.message);
    }
    
  } catch (error) {
    console.error('General error:', error.message);
  }
}

testCommissionsAPI();