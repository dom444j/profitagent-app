const axios = require('axios');

// Create axios instance with cookie jar
const axiosInstance = axios.create({
  withCredentials: true,
  timeout: 30000
});

async function triggerDailyEarnings() {
  try {
    console.log('=== Activando Procesamiento Manual de Ganancias Diarias ===\n');
    
    // 1. Login como admin
    console.log('🔐 Haciendo login como admin...');
    const loginResponse = await axiosInstance.post('http://localhost:5000/api/v1/auth/admin/login', {
      email: 'admin@profitagent.app',
      password: 'Admin123!'
    });
    
    console.log('✅ Login exitoso, cookies establecidas');
    console.log('Usuario:', loginResponse.data.user.email, '- Rol:', loginResponse.data.user.role);
    
    // 2. Activar procesamiento de ganancias diarias
    console.log('\n🚀 Activando procesamiento de ganancias diarias...');
    const triggerResponse = await axiosInstance.post(
      'http://localhost:5000/api/v1/admin/daily-earnings/trigger',
      {}
    );
    
    console.log('✅ Procesamiento activado exitosamente:');
    console.log(JSON.stringify(triggerResponse.data, null, 2));
    
    // 3. Esperar un momento y verificar resultados
    console.log('\n⏳ Esperando 5 segundos para que se procesen las ganancias...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 4. Verificar licencias nuevamente
    console.log('\n📋 Verificando licencias después del procesamiento...');
    const licensesResponse = await axiosInstance.get('http://localhost:5000/api/v1/admin/licenses');
    
    const licenses = licensesResponse.data.licenses || [];
    console.log(`Total de licencias: ${licenses.length}`);
    
    licenses.forEach((license, index) => {
      console.log(`\nLicencia ${index + 1}:`);
      console.log(`  - ID: ${license.id}`);
      console.log(`  - Estado: ${license.status}`);
      console.log(`  - Precio: ${license.principalUSDT} USDT`);
      console.log(`  - Días generados: ${license.daysGenerated}`);
      console.log(`  - Total ganado: ${license.accruedUSDT} USDT`);
      console.log(`  - Fecha de inicio: ${license.startedAt}`);
    });
    
    console.log('\n✅ Proceso completado exitosamente');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

triggerDailyEarnings();