const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestLicense() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'user@profitagent.app' }
    });
    
    const product = await prisma.licenseProduct.findFirst({
      where: { code: 'PFA_BASIC' }
    });
    
    if (!user || !product) {
      console.log('User or product not found');
      console.log('User:', user ? 'Found' : 'Not found');
      console.log('Product:', product ? 'Found' : 'Not found');
      return;
    }
    
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 25);
    
    const license = await prisma.userLicense.create({
      data: {
        user_id: user.id,
        product_id: product.id,
        status: 'active',
        started_at: startDate,
        ends_at: endDate,
        days_generated: 0,
        cashback_accum: 0,
        potential_accum: 0,
        total_earned_usdt: 0,
        flags: {}
      }
    });
    
    console.log('License created successfully:', license);
  } catch (error) {
    console.error('Error creating license:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestLicense();