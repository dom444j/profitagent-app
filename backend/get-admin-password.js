const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getAdminPassword() {
  try {
    console.log('Obteniendo credenciales del administrador...');
    
    const adminUser = await prisma.user.findFirst({
      where: {
        role: 'admin',
        email: 'admin@profitagent.app'
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        password_hash: true,
        created_at: true
      }
    });
    
    if (adminUser) {
      console.log('\n=== CREDENCIALES DEL ADMINISTRADOR ===');
      console.log(`Email: ${adminUser.email}`);
      console.log(`Nombre: ${adminUser.first_name} ${adminUser.last_name}`);
      console.log(`Password Hash: ${adminUser.password_hash}`);
      console.log(`ID: ${adminUser.id}`);
      console.log(`Creado: ${adminUser.created_at}`);      console.log('\nNOTA: La contraseña está hasheada. Para login usar la contraseña original.');
    } else {
      console.log('No se encontró usuario administrador.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getAdminPassword();
