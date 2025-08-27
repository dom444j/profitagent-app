const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkOTP() {
  try {
    // Buscar el retiro con el otp_id
    const withdrawal = await prisma.withdrawal.findFirst({
      where: { otp_id: '8f3cb0f0-e029-4a58-bc95-df3c8682536e' }
    });
    
    console.log('Retiro con OTP:', withdrawal);
    
    if (withdrawal) {
      console.log('\nDetalles del retiro:');
      console.log('- ID:', withdrawal.id);
      console.log('- OTP ID:', withdrawal.otp_id);
      console.log('- Hash del código OTP:', withdrawal.otp_code_hash);
      console.log('- OTP enviado en:', withdrawal.otp_sent_at);
      console.log('- OTP verificado en:', withdrawal.otp_verified_at);
      console.log('- Estado:', withdrawal.status);
    }
    
    // También buscar en la tabla de Telegram OTPs si existe
    console.log('\n🔍 Buscando en servicio de Telegram...');
    const axios = require('axios');
    try {
      const response = await axios.get('http://localhost:5000/api/v1/telegram/otp-stats');
      console.log('Stats de OTP:', response.data);
    } catch (error) {
      console.log('No se pudo obtener stats de OTP:', error.message);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkOTP();