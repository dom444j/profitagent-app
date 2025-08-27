const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProducts() {
  try {
    const products = await prisma.licenseProduct.findMany();
    console.log('Products in database:');
    products.forEach(p => {
      console.log(`ID: ${p.id}, Name: ${p.name}, Status: ${p.status}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProducts();