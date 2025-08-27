const { telegramService } = require('./dist/services/telegram');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getRealOTP() {
  try {
    console.log('🔍 OBTENIENDO OTP REAL');
    console.log('=====================');
    
    // Buscar el usuario
    const user = await prisma.user.findFirst({
      where: { email: 'user@grow5x.app' }
    });
    
    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    console.log('✅ Usuario encontrado:', user.email);
    
    // Crear un nuevo retiro para obtener un OTP fresco
    console.log('\n💰 Creando retiro de prueba...');
    const withdrawal = await prisma.withdrawal.create({
      data: {
        user_id: user.id,
        amount_usdt: 15,
        payout_address: '0xf904370892bb386f3ea036da628396e6d642c8de',
        status: 'requested'
      }
    });
    
    console.log('✅ Retiro creado:', withdrawal.id);
    
    // Enviar OTP
    console.log('\n📤 Enviando OTP...');
    const otpResult = await telegramService.sendWithdrawalOTP(user.id, withdrawal.id, 15);
    
    if (otpResult.success) {
      console.log('✅ OTP enviado exitosamente!');
      console.log('OTP ID:', otpResult.otpId);
      
      // Actualizar el retiro con el OTP ID
      await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: { otp_id: otpResult.otpId }
      });
      
      // Acceder al almacenamiento interno del OTP (esto es solo para debug)
      console.log('\n🔍 Información del OTP generado:');
      console.log('- OTP ID:', otpResult.otpId);
      console.log('- Retiro ID:', withdrawal.id);
      console.log('\n⚠️  IMPORTANTE: Revisa el mensaje de Telegram para obtener el código de 6 dígitos.');
      console.log('\n🧪 Para probar, usa este comando:');
      console.log(`curl -X POST http://localhost:5000/api/v1/withdrawals/${withdrawal.id}/confirm-otp \\`);
      console.log(`  -H "Content-Type: application/json" \\`);
      console.log(`  -H "Authorization: Bearer [TU_TOKEN]" \\`);
      console.log(`  -d '{"otp_code": "[CODIGO_DE_TELEGRAM]", "otp_id": "${otpResult.otpId}"}'`);
      
    } else {
      console.log('❌ Falló el envío del OTP');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

getRealOTP();