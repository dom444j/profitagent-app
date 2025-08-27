const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function testCorrectAPI() {
  try {
    console.log('🔍 Testing correct API endpoint with authentication...');
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: 'user@grow5x.app' }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', user.id);
    
    // Create JWT token (same way as backend does)
    const token = jwt.sign(
      { 
        userId: user.id  // Note: middleware expects 'userId', not 'id'
      }, 
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '24h' }
    );
    
    console.log('✅ JWT token created');
    
    // Test the correct endpoint
    const response = await axios.get('http://localhost:5000/api/v1/referrals/commissions', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ API Response Status:', response.status);
    console.log('✅ API Response Data:', JSON.stringify(response.data, null, 2));
    
    // Test auth/me endpoint too
    const meResponse = await axios.get('http://localhost:5000/api/v1/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Auth/me Response:', JSON.stringify(meResponse.data, null, 2));
    
  } catch (error) {
    console.log('❌ Error:', error.response?.status, error.response?.data || error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testCorrectAPI();