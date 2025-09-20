const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Script para ejecutar sincronización directamente via SSH
// Base de datos destino: profitagent_new (en VPS)

const EXPORT_FILE = 'users-export-complete-2025-08-28T12-38-21-831Z.json';

async function executeSyncDirect() {
  console.log('🚀 EJECUTANDO SINCRONIZACIÓN DIRECTA A VPS');
  console.log('🔍 Destino: profitagent_new.users en VPS');
  console.log('=' .repeat(60));
  
  try {
    // Leer archivo de exportación
    const exportPath = path.join(__dirname, EXPORT_FILE);
    const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
    const users = exportData.users;
    
    console.log(`📊 Sincronizando ${users.length} usuarios...`);
    
    // Ejecutar cada usuario individualmente
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      console.log(`\n${i + 1}. Sincronizando: ${user.email}`);
      
      const sql = `INSERT INTO users (
        id, email, password_hash, role, status, ref_code, sponsor_id,
        usdt_bep20_address, telegram_user_id, telegram_link_status,
        first_name, last_name, phone, created_at, updated_at
      ) VALUES (
        '${user.id}', '${user.email}', '${user.password_hash}', '${user.role}', '${user.status}',
        '${user.ref_code}', ${user.sponsor_id ? `'${user.sponsor_id}'` : 'NULL'},
        ${user.usdt_bep20_address ? `'${user.usdt_bep20_address}'` : 'NULL'},
        ${user.telegram_user_id ? `'${user.telegram_user_id}'` : 'NULL'},
        ${user.telegram_link_status ? `'${user.telegram_link_status}'` : 'NULL'},
        ${user.first_name ? `'${user.first_name.replace(/'/g, "''")}'` : 'NULL'},
        ${user.last_name ? `'${user.last_name.replace(/'/g, "''")}'` : 'NULL'},
        ${user.phone ? `'${user.phone}'` : 'NULL'},
        '${user.created_at}', '${user.updated_at}'
      ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        ref_code = EXCLUDED.ref_code,
        sponsor_id = EXCLUDED.sponsor_id,
        usdt_bep20_address = EXCLUDED.usdt_bep20_address,
        telegram_user_id = EXCLUDED.telegram_user_id,
        telegram_link_status = EXCLUDED.telegram_link_status,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        phone = EXCLUDED.phone,
        updated_at = EXCLUDED.updated_at;`;
      
      const sqlCommand = sql.replace(/"/g, '\\"').replace(/'/g, "\\'");
      const sshExecuteCommand = `ssh root@138.197.199.126 "sudo -u postgres psql -d profitagent_new -c \"${sqlCommand}\""`;
      
      try {
        const result = execSync(sshExecuteCommand, { encoding: 'utf8', timeout: 30000 });
        console.log(`   ✅ ${user.email} sincronizado`);
      } catch (error) {
        console.log(`   ❌ Error con ${user.email}: ${error.message}`);
      }
    }
    
    console.log('\n🔍 VERIFICANDO SINCRONIZACIÓN...');
    
    // Verificar conteo
    const sshCountCommand = `ssh root@138.197.199.126 "sudo -u postgres psql -d profitagent_new -c 'SELECT COUNT(*) FROM users;'"`;
    
    try {
      const countResult = execSync(sshCountCommand, { encoding: 'utf8' });
      console.log('\n📊 CONTEO DE USUARIOS EN VPS:');
      console.log(countResult);
    } catch (error) {
      console.log(`❌ Error verificando conteo: ${error.message}`);
    }
    
    // Verificar usuarios
    const sshListCommand = `ssh root@138.197.199.126 "sudo -u postgres psql -d profitagent_new -c 'SELECT email, role, status FROM users ORDER BY created_at;'"`;
    
    try {
      const listResult = execSync(sshListCommand, { encoding: 'utf8' });
      console.log('\n👥 USUARIOS EN VPS:');
      console.log(listResult);
    } catch (error) {
      console.log(`❌ Error listando usuarios: ${error.message}`);
    }
    
    console.log('\n✅ SINCRONIZACIÓN COMPLETADA');
    
  } catch (error) {
    console.error('❌ Error en sincronización:', error.message);
    process.exit(1);
  }
}

executeSyncDirect();
