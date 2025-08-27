const axios = require('axios');

async function testLicenses() {
  try {
    // Login first
    console.log('Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'admin@grow5x.app',
      password: 'NewAdmin123!'
    });
    
    const token = loginResponse.data.accessToken;
    console.log('Login successful, token:', token ? token.substring(0, 20) + '...' : 'No token received');
    
    // Get user licenses
    console.log('Getting user licenses...');
    const licensesResponse = await axios.get('http://localhost:5000/api/v1/licenses', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('User licenses response:');
    console.log(JSON.stringify(licensesResponse.data, null, 2));
    
    // Get admin licenses
    console.log('\nGetting admin licenses...');
    const adminLicensesResponse = await axios.get('http://localhost:5000/api/v1/admin/licenses', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Admin licenses response:');
    console.log(JSON.stringify(adminLicensesResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testLicenses();