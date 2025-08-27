const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteOrder() {
  try {
    const result = await prisma.orderDeposit.delete({
      where: { id: 'order_1756100152217_m5p13yw8x' }
    });
    console.log('Orden eliminada:', result.id);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

deleteOrder();