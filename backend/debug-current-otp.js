const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugCurrentOTP() {
  try {
    console.log('🔍 Debugging OTP Issue - Code: 575783');
    console.log('=' .repeat(50));

    // Find the most recent withdrawal
    const recentWithdrawal = await prisma.withdrawal.findFirst({
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true
          }
        }
      }
    });

    if (!recentWithdrawal) {
      console.log('❌ No withdrawals found');
      return;
    }

    console.log('📋 Most Recent Withdrawal:');
    console.log(`   ID: ${recentWithdrawal.id}`);
    console.log(`   User: ${recentWithdrawal.user.first_name} ${recentWithdrawal.user.last_name} (${recentWithdrawal.user.email})`);
    console.log(`   Amount: $${recentWithdrawal.amount_usdt} USDT`);
    console.log(`   Status: ${recentWithdrawal.status}`);
    console.log(`   Created: ${recentWithdrawal.created_at}`);
    console.log(`   OTP ID: ${recentWithdrawal.otp_id || 'None'}`);
    console.log('');

    // Check OTP details from withdrawal record
    if (recentWithdrawal.otp_id) {
      console.log('🔐 OTP Details from Withdrawal:');
      console.log(`   OTP ID: ${recentWithdrawal.otp_id}`);
      console.log(`   OTP Code Hash: ${recentWithdrawal.otp_code_hash || 'None'}`);
      console.log(`   OTP Sent At: ${recentWithdrawal.otp_sent_at || 'Not sent'}`);
      console.log(`   OTP Verified At: ${recentWithdrawal.otp_verified_at || 'Not verified'}`);
      console.log('');

      // Check if OTP was sent but not verified
      if (recentWithdrawal.otp_sent_at && !recentWithdrawal.otp_verified_at) {
        console.log('⏰ OTP Status Check:');
        const now = new Date();
        const sentAt = new Date(recentWithdrawal.otp_sent_at);
        const timeDiff = (now.getTime() - sentAt.getTime()) / (1000 * 60); // minutes
        console.log(`   Current time: ${now.toISOString()}`);
        console.log(`   Sent at: ${sentAt.toISOString()}`);
        console.log(`   Minutes since sent: ${timeDiff.toFixed(2)}`);
        
        // OTP typically expires after 4 hours (240 minutes)
        const isExpired = timeDiff > 240;
        console.log(`   Is expired (>240 min): ${isExpired}`);
        console.log('');
        
        // Test the provided code by checking with Telegram service
        console.log('🧪 Testing provided code: 575783');
        console.log('   Note: OTP codes are managed by Telegram service');
        console.log('   Checking with Telegram service...');
        
        try {
          const axios = require('axios');
          const response = await axios.get(`http://localhost:5000/api/v1/telegram/otp-status/${recentWithdrawal.otp_id}`);
          console.log('   Telegram OTP Status:', response.data);
        } catch (error) {
          console.log('   ❌ Could not check with Telegram service:', error.message);
        }
        
        if (isExpired) {
          console.log('❌ OTP likely expired - this could be why it\'s invalid');
        } else {
          console.log('✅ OTP should still be valid - check Telegram service');
        }
      } else if (recentWithdrawal.otp_verified_at) {
        console.log('✅ OTP already verified at:', recentWithdrawal.otp_verified_at);
      } else {
        console.log('❌ OTP not sent yet');
      }
    } else {
      console.log('❌ No OTP ID associated with this withdrawal');
    }

  } catch (error) {
    console.error('❌ Error debugging OTP:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugCurrentOTP();