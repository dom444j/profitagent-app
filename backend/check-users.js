const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('👥 USUARIOS EN LA BASE DE DATOS');
    console.log('===============================');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        status: true,
        created_at: true
      },
      orderBy: { created_at: 'desc' }
    });
    
    console.log(`Total usuarios: ${users.length}\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   - Nombre: ${user.first_name} ${user.last_name}`);
      console.log(`   - Rol: ${user.role}`);
      console.log(`   - Estado: ${user.status}`);
      console.log(`   - ID: ${user.id}`);
      console.log(`   - Creado: ${user.created_at.toISOString().split('T')[0]}`);
      console.log('');
    });
    
    if (users.length === 0) {
      console.log('⚠️  No hay usuarios en la base de datos');
      console.log('💡 Necesitas crear un usuario primero');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();