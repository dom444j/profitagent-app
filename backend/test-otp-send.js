const { telegramService } = require('./dist/services/telegram');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testOTPSend() {
  try {
    console.log('🔍 TESTING OTP SEND');
    console.log('==================');
    
    // Buscar un usuario con Telegram configurado
    const user = await prisma.user.findFirst({
      where: {
        email: 'user@grow5x.app'
      }
    });
    
    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    console.log('✅ Usuario encontrado:', {
      id: user.id,
      email: user.email,
      telegram_user_id: user.telegram_user_id
    });
    
    // Intentar enviar OTP
    console.log('\n📤 Enviando OTP de prueba...');
    const result = await telegramService.sendWithdrawalOTP(user.id, 'test-withdrawal-id', 25);
    
    console.log('Resultado del envío:', result);
    
    if (result.success) {
      console.log('✅ OTP enviado exitosamente!');
      console.log('OTP ID:', result.otpId);
      
      // Intentar verificar con un código de prueba
      console.log('\n🔐 Probando verificación con código 123456...');
      const verifyResult = await telegramService.verifyOTP(result.otpId, '123456');
      console.log('Resultado de verificación:', verifyResult);
    } else {
      console.log('❌ Falló el envío del OTP');
    }
    
  } catch (error) {
    console.error('❌ Error en test:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testOTPSend();