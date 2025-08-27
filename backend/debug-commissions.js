const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugCommissions() {
  try {
    console.log('=== DEBUGGING COMMISSIONS ===');
    
    // Get all commissions
    const allCommissions = await prisma.referralCommission.findMany({
      include: {
        sponsor: {
          select: {
            email: true,
            ref_code: true
          }
        },
        referred_user: {
          select: {
            email: true,
            ref_code: true
          }
        }
      }
    });
    
    console.log('Total commissions found:', allCommissions.length);
    console.log('\nAll commissions:');
    allCommissions.forEach(commission => {
      console.log(`ID: ${commission.id}`);
      console.log(`Amount: ${commission.amount_usdt}`);
      console.log(`Status: ${commission.status}`);
      console.log(`Sponsor: ${commission.sponsor.email}`);
      console.log(`Referred: ${commission.referred_user.email}`);
      console.log(`Created: ${commission.created_at}`);
      console.log('---');
    });
    
    // Get commissions by status
    const pendingCommissions = await prisma.referralCommission.findMany({
      where: { status: 'pending' }
    });
    
    const releasedCommissions = await prisma.referralCommission.findMany({
      where: { status: 'released' }
    });
    
    console.log(`\nPending commissions: ${pendingCommissions.length}`);
    console.log(`Released commissions: ${releasedCommissions.length}`);
    
    // Calculate totals
    const totalPending = pendingCommissions.reduce((sum, c) => sum + parseFloat(c.amount_usdt), 0);
    const totalReleased = releasedCommissions.reduce((sum, c) => sum + parseFloat(c.amount_usdt), 0);
    
    console.log(`\nTotal pending amount: ${totalPending}`);
    console.log(`Total released amount: ${totalReleased}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugCommissions();