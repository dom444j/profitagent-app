const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkWallets() {
  try {
    const wallets = await prisma.adminWallet.findMany();
    console.log('Wallets found:', wallets.length);
    
    if (wallets.length === 0) {
      console.log('❌ No wallets found in database!');
      console.log('This is why order creation is failing.');
      console.log('You need to add wallets through the admin panel.');
    } else {
      wallets.forEach(w => {
        console.log(`- ${w.label}: ${w.address} (${w.status})`);
      });
      
      const activeWallets = wallets.filter(w => w.status === 'active');
      console.log(`\nActive wallets: ${activeWallets.length}`);
      
      if (activeWallets.length === 0) {
        console.log('❌ No active wallets found!');
        console.log('This is why order creation is failing.');
        console.log('You need to activate at least one wallet.');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkWallets();