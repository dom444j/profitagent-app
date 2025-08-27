const axios = require('axios');
require('dotenv').config();

const API_BASE = 'http://localhost:5000/api/v1';

// Test credentials (you'll need to get a valid JWT token)
let authToken = null;

// Function to login and get auth token
async function login() {
  try {
    console.log('🔐 Iniciando sesión para obtener token...');
    
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@grow5x.com',
      password: 'admin123'
    });
    
    if (response.data.success) {
      authToken = response.data.token;
      console.log('✅ Login exitoso');
      return true;
    } else {
      console.log('❌ Error en login:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Error en login:', error.message);
    return false;
  }
}

// Function to test OTP message
async function testOTPMessage() {
  try {
    console.log('\n📱 Probando envío de mensaje OTP...');
    
    const response = await axios.post(`${API_BASE}/telegram/test/otp`, {
      userId: 'test-user-123',
      amount: 100
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📤 Respuesta OTP:', response.data);
    return response.data;
  } catch (error) {
    console.log('❌ Error en OTP:', error.response?.data || error.message);
    return null;
  }
}

// Function to test alert message
async function testAlertMessage() {
  try {
    console.log('\n🚨 Probando envío de mensaje de alerta...');
    
    const response = await axios.post(`${API_BASE}/telegram/test/alert`, {
      title: 'Prueba de Sistema',
      message: 'Este es un mensaje de prueba del sistema Grow5x',
      level: 'info'
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📤 Respuesta Alerta:', response.data);
    return response.data;
  } catch (error) {
    console.log('❌ Error en Alerta:', error.response?.data || error.message);
    return null;
  }
}

// Function to test withdrawal alert
async function testWithdrawalAlert() {
  try {
    console.log('\n💰 Probando alerta de retiro...');
    
    const withdrawalData = {
      id: 'test-withdrawal-123',
      amount: 250,
      usdt_address: '0x1234567890abcdef1234567890abcdef12345678',
      created_at: new Date().toISOString(),
      user: {
        first_name: 'Usuario',
        last_name: 'Prueba',
        email: 'usuario@test.com'
      }
    };
    
    const response = await axios.post(`${API_BASE}/telegram/test/withdrawal-alert`, {
      type: 'new',
      withdrawalData
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📤 Respuesta Retiro:', response.data);
    return response.data;
  } catch (error) {
    console.log('❌ Error en Retiro:', error.response?.data || error.message);
    return null;
  }
}

// Function to test OTP verification
async function testOTPVerification(otpId) {
  try {
    console.log('\n🔍 Probando verificación de OTP...');
    
    const response = await axios.post(`${API_BASE}/telegram/verify-otp`, {
      otpId: otpId,
      code: '123456' // Test code
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📤 Respuesta Verificación:', response.data);
    return response.data;
  } catch (error) {
    console.log('❌ Error en Verificación:', error.response?.data || error.message);
    return null;
  }
}

// Function to get OTP stats
async function getOTPStats() {
  try {
    console.log('\n📊 Obteniendo estadísticas de OTP...');
    
    const response = await axios.get(`${API_BASE}/telegram/stats`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log('📤 Estadísticas:', response.data);
    return response.data;
  } catch (error) {
    console.log('❌ Error en Estadísticas:', error.response?.data || error.message);
    return null;
  }
}

// Main test function
async function runTests() {
  console.log('🧪 PRUEBAS DE API TELEGRAM - GROW5X');
  console.log('====================================');
  
  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ No se pudo obtener token de autenticación');
    console.log('💡 Asegúrate de que:');
    console.log('   - El servidor backend esté ejecutándose');
    console.log('   - Las credenciales admin@grow5x.com / admin123 sean correctas');
    return;
  }
  
  // Step 2: Test OTP message
  const otpResult = await testOTPMessage();
  
  // Step 3: Test alert message
  const alertResult = await testAlertMessage();
  
  // Step 4: Test withdrawal alert
  const withdrawalResult = await testWithdrawalAlert();
  
  // Step 5: Test OTP verification (if we got an OTP ID)
  if (otpResult && otpResult.otpId) {
    await testOTPVerification(otpResult.otpId);
  }
  
  // Step 6: Get OTP stats
  await getOTPStats();
  
  // Summary
  console.log('\n📋 RESUMEN DE PRUEBAS');
  console.log('=====================');
  console.log(`🔐 OTP Message: ${otpResult?.success ? '✅ ÉXITO' : '❌ ERROR'}`);
  console.log(`🚨 Alert Message: ${alertResult?.success ? '✅ ÉXITO' : '❌ ERROR'}`);
  console.log(`💰 Withdrawal Alert: ${withdrawalResult?.success ? '✅ ÉXITO' : '❌ ERROR'}`);
  
  if (otpResult?.success || alertResult?.success || withdrawalResult?.success) {
    console.log('\n🎉 ¡Al menos una prueba fue exitosa!');
    console.log('💡 Si no recibiste mensajes en Telegram, verifica:');
    console.log('   - Los Chat IDs en el archivo .env');
    console.log('   - Que hayas enviado /start a los bots');
    console.log('   - Que los bots no estén bloqueados');
  } else {
    console.log('\n⚠️  Todas las pruebas fallaron');
    console.log('🔧 Revisa la configuración de Telegram');
  }
}

// Run the tests
runTests().catch(console.error);