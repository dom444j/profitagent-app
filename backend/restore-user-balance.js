const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function restoreUserBalance() {
  try {
    console.log('ðŸ”„ RESTAURANDO SALDO DEL USUARIO');
    console.log('================================');
    
    const userId = 'cmeqyen000002um207uhb78in';
    const userEmail = 'user@profitagent.app';
    
    // 1. Mostrar estado actual
    console.log('\nðŸ“Š Estado actual del usuario:');
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        _count: {
          select: {
            withdrawals: true
          }
        }
      }
    });
    
    // Obtener balance actual del ledger
    const currentBalance = await prisma.ledgerEntry.aggregate({
      where: { user_id: userId },
      _sum: { amount: true }
    });
    
    const currentAmount = Number(currentBalance._sum.amount || 0);
    
    console.log('- Email:', currentUser.email);
    console.log('- Saldo actual:', currentAmount, 'USDT');
    console.log('- Total retiros:', currentUser._count.withdrawals);
    
    // 2. Mostrar retiros existentes
    console.log('\nðŸ“‹ Retiros existentes:');
    const withdrawals = await prisma.withdrawal.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        amount_usdt: true,
        status: true,
        created_at: true
      }
    });
    
    let totalPendingAmount = 0;
    withdrawals.forEach((w, index) => {
      console.log(`  ${index + 1}. ID: ${w.id.substring(0, 8)}... | ${w.amount_usdt} USDT | ${w.status} | ${w.created_at.toISOString().split('T')[0]}`);
      if (w.status === 'requested' || w.status === 'otp_sent' || w.status === 'otp_verified') {
        totalPendingAmount += w.amount_usdt;
      }
    });
    
    console.log('\nðŸ’° Total pendiente:', totalPendingAmount, 'USDT');
    
    // 3. Eliminar todos los retiros de prueba
    console.log('\nðŸ—‘ï¸  Eliminando retiros de prueba...');
    const deleteResult = await prisma.withdrawal.deleteMany({
      where: { user_id: userId }
    });
    
    console.log('âœ… Retiros eliminados:', deleteResult.count);
    
    // 4. Eliminar todas las entradas del ledger
    console.log('\nðŸ—‘ï¸  Eliminando entradas del ledger...');
    const deleteLedgerResult = await prisma.ledgerEntry.deleteMany({
      where: { user_id: userId }
    });
    
    console.log('âœ… Entradas del ledger eliminadas:', deleteLedgerResult.count);
    
    // 5. Crear nueva entrada para 25 USDT
    console.log('\nðŸ’³ Creando balance de 25 USDT...');
    await prisma.ledgerEntry.create({
      data: {
        user_id: userId,
        amount: 25.0,
        direction: 'credit',
        ref_type: 'admin_adjustment',
        meta: {
          description: 'RestauraciÃ³n de balance para testing'
        }
      }
    });
    
    console.log('âœ… Balance restaurado a 25 USDT');
    
    // 6. Verificar estado final
    console.log('\nðŸŽ¯ Estado final:');
    const finalUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        _count: {
          select: {
            withdrawals: true
          }
        }
      }
    });
    
    // Verificar nuevo balance
    const finalBalance = await prisma.ledgerEntry.aggregate({
      where: { user_id: userId },
      _sum: { amount: true }
    });
    
    const finalAmount = Number(finalBalance._sum.amount || 0);
    
    console.log('- Email:', finalUser.email);
    console.log('- Saldo final:', finalAmount, 'USDT');
    console.log('- Total retiros:', finalUser._count.withdrawals);
    
    console.log('\nâœ… RESTAURACIÃ“N COMPLETADA');
    console.log('- Saldo disponible: 25.00 USDT');
    console.log('- Retiros pendientes: 0.00 USDT');
    console.log('- Historial de retiros: limpio');
    
  } catch (error) {
    console.error('âŒ Error durante la restauraciÃ³n:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

restoreUserBalance();
