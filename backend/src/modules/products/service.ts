import { prisma } from '../../lib/prisma';
import { logger } from '../../utils/logger';

class ProductService {
  async getActiveProducts() {
    try {
      const products = await prisma.licenseProduct.findMany({
        where: {
          status: 'active'
        },
        orderBy: {
          created_at: 'desc'
        }
      });
      
      return products.map(product => ({
        id: product.id,
        name: product.name,
        price_usdt: Number(product.price_usdt),
        daily_rate: Number(product.daily_rate),
        duration_days: product.duration_days,
        max_cap_percentage: Number(product.max_cap_percentage),
        status: product.status,
        code: product.code,
        cashback_cap: Number(product.cashback_cap),
        potential_cap: Number(product.potential_cap)
      }));
    } catch (error) {
      logger.error('Get active products error: ' + (error as Error).message);
      throw error;
    }
  }
  
  async getProductById(id: string) {
    try {
      // Use Prisma directly instead of Docker service for better reliability
      const product = await prisma.licenseProduct.findUnique({
        where: { id }
      });
      
      if (!product) {
        return null;
      }
      
      return {
        id: product.id,
        name: product.name,
        price_usdt: Number(product.price_usdt),
        daily_rate: Number(product.daily_rate),
        duration_days: product.duration_days,
        max_cap_percentage: Number(product.max_cap_percentage),
        status: product.status,
        code: product.code,
        days: product.duration_days,
        cashback_cap: Number(product.cashback_cap),
        potential_cap: Number(product.potential_cap)
      };
    } catch (error) {
      logger.error('Get product by id error: ' + (error as Error).message);
      throw error;
    }
  }
}

export const productService = new ProductService();