const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:5000/api/v1';

async function testFinalOTP() {
  try {
    console.log('🔍 PRUEBA FINAL DE OTP');
    console.log('====================');
    
    // 1. Login como usuario
    console.log('🔐 Iniciando sesión...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'user@grow5x.app',
      password: 'User123!'
    });
    
    const userToken = loginResponse.data.accessToken;
    console.log('✅ Sesión iniciada exitosamente');
    
    // 2. Usar el retiro más reciente
    const withdrawal = await prisma.withdrawal.findFirst({
      where: {
        user_id: 'cmeqyen000002um207uhb78in',
        otp_id: { not: null }
      },
      orderBy: { created_at: 'desc' }
    });
    
    if (!withdrawal) {
      console.log('❌ No se encontró retiro con OTP');
      return;
    }
    
    console.log('✅ Retiro encontrado:', {
      id: withdrawal.id,
      otp_id: withdrawal.otp_id,
      amount: withdrawal.amount_usdt,
      status: withdrawal.status
    });
    
    // 3. Probar con el código de Telegram (540101)
    console.log('\n🔐 Probando verificación con código 540101...');
    try {
      const otpResponse = await axios.post(`${BASE_URL}/withdrawals/${withdrawal.id}/confirm-otp`, {
        otp_code: '540101',
        otp_id: withdrawal.otp_id
      }, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      
      console.log('✅ ¡OTP verificado exitosamente!', otpResponse.data);
      
      // Verificar el estado actualizado del retiro
      const updatedWithdrawal = await prisma.withdrawal.findUnique({
        where: { id: withdrawal.id }
      });
      
      console.log('\n📊 Estado actualizado del retiro:', {
        id: updatedWithdrawal.id,
        status: updatedWithdrawal.status,
        otp_verified_at: updatedWithdrawal.otp_verified_at
      });
      
    } catch (otpError) {
      console.log('❌ Error en verificación OTP:', otpError.response?.data || otpError.message);
      
      // Probar verificación directa con Telegram service
      console.log('\n🔍 Probando verificación directa...');
      try {
        const directResponse = await axios.post(`${BASE_URL}/telegram/verify-otp`, {
          otpId: withdrawal.otp_id,
          code: '540101'
        }, {
          headers: { 'Authorization': `Bearer ${userToken}` }
        });
        
        console.log('✅ Verificación directa exitosa:', directResponse.data);
      } catch (directError) {
        console.log('❌ Error en verificación directa:', directError.response?.data || directError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.response?.data || error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testFinalOTP();