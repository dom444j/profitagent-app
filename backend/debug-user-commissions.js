const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugUserCommissions() {
  try {
    console.log('=== DEBUGGING USER COMMISSIONS ===');
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: 'user@grow5x.app' }
    });
    
    if (!user) {
      console.log('User not found!');
      return;
    }
    
    console.log(`User found: ${user.email} (ID: ${user.id})`);
    
    // Get commissions where this user is the sponsor (should receive commissions)
    const commissionsAsSponsor = await prisma.referralCommission.findMany({
      where: {
        sponsor_id: user.id
      },
      include: {
        referred_user: {
          select: {
            email: true,
            ref_code: true
          }
        }
      }
    });
    
    console.log(`\nCommissions where user is SPONSOR: ${commissionsAsSponsor.length}`);
    commissionsAsSponsor.forEach(commission => {
      console.log(`- Amount: ${commission.amount_usdt} USDT`);
      console.log(`- Status: ${commission.status}`);
      console.log(`- From: ${commission.referred_user.email}`);
      console.log(`- Created: ${commission.created_at}`);
      console.log('---');
    });
    
    // Calculate totals for this user
    const totalPending = commissionsAsSponsor
      .filter(c => c.status === 'pending')
      .reduce((sum, c) => sum + parseFloat(c.amount_usdt), 0);
      
    const totalReleased = commissionsAsSponsor
      .filter(c => c.status === 'released')
      .reduce((sum, c) => sum + parseFloat(c.amount_usdt), 0);
    
    console.log(`\nTotals for user ${user.email}:`);
    console.log(`- Pending: ${totalPending} USDT`);
    console.log(`- Released: ${totalReleased} USDT`);
    console.log(`- Total: ${totalPending + totalReleased} USDT`);
    
    // Also check commissions where this user is the referred user
    const commissionsAsReferred = await prisma.referralCommission.findMany({
      where: {
        referred_user_id: user.id
      },
      include: {
        sponsor: {
          select: {
            email: true,
            ref_code: true
          }
        }
      }
    });
    
    console.log(`\nCommissions where user is REFERRED: ${commissionsAsReferred.length}`);
    commissionsAsReferred.forEach(commission => {
      console.log(`- Amount: ${commission.amount_usdt} USDT`);
      console.log(`- Status: ${commission.status}`);
      console.log(`- To sponsor: ${commission.sponsor.email}`);
      console.log(`- Created: ${commission.created_at}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugUserCommissions();