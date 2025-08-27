const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:5000/api/v1';

async function testWithdrawalsWithLogin() {
  try {
    console.log('🔍 PROBANDO HISTORIAL DE RETIROS CON LOGIN');
    console.log('==========================================');
    
    // 1. Hacer login para obtener token válido
    console.log('\n🔐 Haciendo login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'user@grow5x.app',
      password: 'User123!'
    });
    
    if (!loginResponse.data.user) {
      console.log('❌ Error en login:', loginResponse.data);
      return;
    }
    
    const token = loginResponse.data.accessToken;
    const userId = loginResponse.data.user.id;
    console.log('✅ Login exitoso para:', loginResponse.data.user.email);
    console.log('- User ID:', userId);
    
    // 2. Verificar retiros en la base de datos
    console.log('\n📊 Retiros en la base de datos:');
    const withdrawals = await prisma.withdrawal.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });
    
    console.log(`- Total retiros encontrados: ${withdrawals.length}`);
    withdrawals.forEach((w, index) => {
      console.log(`  ${index + 1}. ID: ${w.id.substring(0, 8)}... | ${w.amount_usdt} USDT | ${w.status} | ${w.created_at.toISOString().split('T')[0]}`);
    });
    
    // 3. Probar el endpoint con token válido
    console.log('\n🌐 Probando endpoint /api/v1/withdrawals:');
    try {
      const response = await axios.get(`${API_BASE}/withdrawals`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Respuesta del endpoint:');
      console.log('- Status:', response.status);
      console.log('- Data:', JSON.stringify(response.data, null, 2));
      
      if (response.data && response.data.data) {
        console.log(`- Retiros devueltos por API: ${response.data.data.length}`);
        
        // Comparar con base de datos
        if (response.data.data.length === withdrawals.length) {
          console.log('✅ La cantidad coincide con la base de datos');
        } else {
          console.log('⚠️  La cantidad NO coincide con la base de datos');
          console.log(`   - DB: ${withdrawals.length}, API: ${response.data.data.length}`);
        }
      } else {
        console.log('⚠️  Respuesta sin campo data o data vacío');
      }
      
    } catch (apiError) {
      console.log('❌ Error del endpoint:');
      console.log('- Status:', apiError.response?.status);
      console.log('- Message:', apiError.response?.data?.error || apiError.message);
      console.log('- Full response:', JSON.stringify(apiError.response?.data, null, 2));
    }
    
    // 4. Crear un retiro de prueba si no hay ninguno
    if (withdrawals.length === 0) {
      console.log('\n💰 No hay retiros. Creando uno de prueba...');
      try {
        const createResponse = await axios.post(`${API_BASE}/withdrawals`, {
          amount: 10,
          wallet_address: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE'
        }, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('✅ Retiro de prueba creado:', createResponse.data);
        
        // Probar endpoint nuevamente
        console.log('\n🔄 Probando endpoint nuevamente...');
        const response2 = await axios.get(`${API_BASE}/withdrawals`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('✅ Respuesta después de crear retiro:');
        console.log('- Status:', response2.status);
        console.log('- Data:', JSON.stringify(response2.data, null, 2));
        
      } catch (createError) {
        console.log('❌ Error creando retiro de prueba:');
        console.log('- Status:', createError.response?.status);
        console.log('- Message:', createError.response?.data?.error || createError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testWithdrawalsWithLogin();