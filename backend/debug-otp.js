const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:5000/api/v1';

async function debugOTPProcess() {
  try {
    console.log('🔍 DEBUGGING OTP PROCESS');
    console.log('========================');
    
    // 1. Login as user
    console.log('🔐 Logging in as user...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'user@grow5x.app',
      password: 'User123!'
    });
    
    const userToken = loginResponse.data.accessToken;
    console.log('✅ User logged in successfully');
    
    // 2. Check current withdrawals
    console.log('\n📋 Checking current withdrawals...');
    const withdrawalsResponse = await axios.get(`${BASE_URL}/withdrawals`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    
    console.log('Current withdrawals:', withdrawalsResponse.data.data.length);
    
    // 3. Create a new withdrawal
    console.log('\n💰 Creating new withdrawal...');
    const withdrawalResponse = await axios.post(`${BASE_URL}/withdrawals`, {
      amount_usdt: 10,
      payout_address: '0xf904370892bb386f3ea036da628396e6d642c8de'
    }, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    
    const withdrawal = withdrawalResponse.data.data;
    console.log('✅ Withdrawal created:', {
      id: withdrawal.id,
      amount: withdrawal.amount_usdt,
      status: withdrawal.status,
      otp_id: withdrawal.otp_id
    });
    
    // 4. Get the withdrawal from database to see OTP ID
    console.log('\n🔍 Checking withdrawal in database...');
    const dbWithdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawal.id }
    });
    
    console.log('Database withdrawal:', {
      id: dbWithdrawal.id,
      otp_id: dbWithdrawal.otp_id,
      status: dbWithdrawal.status
    });
    
    // 5. Try to verify with the OTP from Telegram (540101)
    console.log('\n🔐 Testing OTP verification with 540101...');
    try {
      const otpResponse = await axios.post(`${BASE_URL}/withdrawals/${withdrawal.id}/confirm-otp`, {
        otp_code: '540101',
        otp_id: dbWithdrawal.otp_id
      }, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      
      console.log('✅ OTP verification successful:', otpResponse.data);
    } catch (otpError) {
      console.log('❌ OTP verification failed:', otpError.response?.data || otpError.message);
      
      // 6. Test the Telegram service directly
      console.log('\n🔍 Testing Telegram service directly...');
      try {
        const directOtpResponse = await axios.post(`${BASE_URL}/telegram/verify-otp`, {
          otpId: dbWithdrawal.otp_id,
          code: '540101'
        });
        
        console.log('Direct Telegram verification:', directOtpResponse.data);
      } catch (directError) {
        console.log('❌ Direct Telegram verification failed:', directError.response?.data || directError.message);
      }
    }
    
    console.log('\n🎯 Debug process completed!');
    
  } catch (error) {
    console.error('❌ Error in debug process:', error.response?.data || error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugOTPProcess();