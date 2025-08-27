const axios = require('axios');

async function testUserLicenses() {
  try {
    // Login with regular user
    console.log('Logging in as regular user...');
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'user@grow5x.app',
      password: 'User123!'
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
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testUserLicenses();