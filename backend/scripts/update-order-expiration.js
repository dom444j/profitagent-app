const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateOrderExpiration() {
  try {
    // Get current value
    const currentSetting = await prisma.setting.findUnique({
      where: { key: 'order_expiration_minutes' }
    });

    console.log('Current order expiration setting:');
    if (currentSetting) {
      console.log(`  Key: ${currentSetting.key}`);
      console.log(`  Value: ${currentSetting.value} minutes`);
    } else {
      console.log('  Setting not found');
    }

    // Get new value from command line argument
    const newValue = process.argv[2];
    
    if (!newValue) {
      console.log('\nUsage: node update-order-expiration.js <minutes>');
      console.log('Example: node update-order-expiration.js 15  # Set to 15 minutes');
      console.log('Example: node update-order-expiration.js 60  # Set to 1 hour');
      return;
    }

    const minutes = parseInt(newValue, 10);
    if (isNaN(minutes) || minutes <= 0) {
      console.error('Error: Please provide a valid positive number of minutes');
      return;
    }

    // Update the setting
    const updatedSetting = await prisma.setting.upsert({
      where: { key: 'order_expiration_minutes' },
      update: { value: minutes },
      create: {
        key: 'order_expiration_minutes',
        value: minutes
      }
    });

    console.log(`\n✅ Order expiration updated successfully!`);
    console.log(`  New value: ${updatedSetting.value} minutes`);
    console.log(`  This equals: ${Math.floor(minutes / 60)}h ${minutes % 60}m`);
    console.log('\n⚠️  Note: You need to restart the backend server for changes to take effect.');
    
  } catch (error) {
    console.error('Error updating order expiration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateOrderExpiration();