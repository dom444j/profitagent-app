const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

async function testWithdrawalsEndpoint() {
  try {
    console.log('🔍 PROBANDO ENDPOINT DE RETIROS');
    console.log('================================');
    
    const userId = 'cmeqyen000002um207uhb78in';
    const userEmail = 'user@grow5x.app';
    
    // 1. Verificar retiros en la base de datos
    console.log('\n📊 Retiros en la base de datos:');
    const withdrawals = await prisma.withdrawal.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });
    
    console.log(`- Total retiros encontrados: ${withdrawals.length}`);
    withdrawals.forEach((w, index) => {
      console.log(`  ${index + 1}. ID: ${w.id.substring(0, 8)}... | ${w.amount_usdt} USDT | ${w.status} | ${w.created_at.toISOString().split('T')[0]}`);
    });
    
    // 2. Probar el endpoint directamente
    console.log('\n🌐 Probando endpoint /api/v1/withdrawals:');
    try {
      const response = await axios.get('http://localhost:5000/api/v1/withdrawals', {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWVxeWVuMDAwMDAydW0yMDd1aGI3OGluIiwiaWF0IjoxNzI0NzA0NzI5LCJleHAiOjE3MjQ3OTE1Mjl9.example'
        }
      });
      
      console.log('✅ Respuesta del endpoint:');
      console.log('- Status:', response.status);
      console.log('- Data:', JSON.stringify(response.data, null, 2));
      
      if (response.data && response.data.data) {
        console.log(`- Retiros devueltos: ${response.data.data.length}`);
      }
      
    } catch (apiError) {
      console.log('❌ Error del endpoint:');
      console.log('- Status:', apiError.response?.status);
      console.log('- Message:', apiError.response?.data?.error || apiError.message);
      console.log('- Full response:', JSON.stringify(apiError.response?.data, null, 2));
    }
    
    // 3. Verificar el usuario existe
    console.log('\n👤 Verificando usuario:');
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true }
    });
    
    if (user) {
      console.log('✅ Usuario encontrado:', user.email);
    } else {
      console.log('❌ Usuario no encontrado');
    }
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testWithdrawalsEndpoint();