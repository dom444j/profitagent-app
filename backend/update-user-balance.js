const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');

const prisma = new PrismaClient();

async function updateUserBalance() {
  try {
    console.log('🔍 Buscando usuarios...');
    
    // Buscar el usuario regular y el admin
    const user = await prisma.user.findUnique({
      where: { email: 'user@grow5x.app' }
    });
    
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@grow5x.app' }
    });
    
    if (!user) {
      console.error('❌ Usuario user@grow5x.app no encontrado');
      return;
    }
    
    if (!admin) {
      console.error('❌ Admin admin@grow5x.app no encontrado');
      return;
    }
    
    console.log(`✅ Usuario encontrado: ${user.email} (ID: ${user.id})`);
    console.log(`✅ Admin encontrado: ${admin.email} (ID: ${admin.id})`);
    
    // Obtener balance actual
    const currentBalance = await prisma.ledgerEntry.aggregate({
      where: { user_id: user.id },
      _sum: { amount: true }
    });
    
    const currentAmount = Number(currentBalance._sum.amount || 0);
    console.log(`💰 Balance actual: ${currentAmount} USDT`);
    
    // Calcular cuánto necesitamos agregar para llegar a 25 USDT
    const targetBalance = 25;
    const amountToAdd = targetBalance - currentAmount;
    
    if (amountToAdd <= 0) {
      console.log(`✅ El usuario ya tiene ${currentAmount} USDT, que es >= ${targetBalance} USDT`);
      return;
    }
    
    console.log(`📈 Agregando ${amountToAdd} USDT para llegar a ${targetBalance} USDT`);
    
    // Crear el bono usando transacción
    const bonus = await prisma.$transaction(async (tx) => {
      // Crear registro de bono
      const bonus = await tx.bonus.create({
        data: {
          user_id: user.id,
          amount_usdt: new Decimal(amountToAdd),
          reason: 'Ajuste de balance para testing - corrección de dígitos',
          status: 'released',
          created_by_admin_id: admin.id
        }
      });
      
      // Crear entrada en el ledger
      await tx.ledgerEntry.create({
        data: {
          user_id: user.id,
          direction: 'credit',
          amount: new Decimal(amountToAdd),
          ref_type: 'bonus',
          ref_id: bonus.id,
          meta: {
            description: `Ajuste de balance para testing: ${amountToAdd} USDT`
          }
        }
      });
      
      // Crear log de auditoría
      await tx.auditLog.create({
        data: {
          action: 'bonus_created',
          entity: 'bonus',
          entity_id: bonus.id,
          actor_user_id: admin.id,
          new_values: {
            user_id: user.id,
            amount_usdt: amountToAdd,
            reason: 'Ajuste de balance para testing - corrección de dígitos'
          }
        }
      });
      
      return bonus;
    });
    
    // Verificar nuevo balance
    const newBalance = await prisma.ledgerEntry.aggregate({
      where: { user_id: user.id },
      _sum: { amount: true }
    });
    
    const newAmount = Number(newBalance._sum.amount || 0);
    
    console.log(`✅ Bono creado exitosamente:`);
    console.log(`   - ID del bono: ${bonus.id}`);
    console.log(`   - Cantidad agregada: ${amountToAdd} USDT`);
    console.log(`   - Balance anterior: ${currentAmount} USDT`);
    console.log(`   - Balance nuevo: ${newAmount} USDT`);
    console.log(`🎉 Balance actualizado correctamente!`);
    
  } catch (error) {
    console.error('❌ Error actualizando balance:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
updateUserBalance();