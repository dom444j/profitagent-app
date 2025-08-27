import { Request, Response } from 'express';
import { productService } from './service';
import { logger } from '../../utils/logger';

class ProductController {
  async getProducts(req: Request, res: Response) {
    try {
      const products = await productService.getActiveProducts();
      
      res.json({
        products: products.map(product => ({
          id: product.id,
          name: product.name,
          price_usdt: product.price_usdt.toString(),
          daily_rate: product.daily_rate.toString(),
          duration_days: product.duration_days,
          max_cap_percentage: product.max_cap_percentage.toString(),
          code: product.code,
          cashback_cap: product.cashback_cap?.toString(),
          potential_cap: product.potential_cap?.toString()
        }))
      });
    } catch (error) {
      logger.error(error, 'Get products error');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const productController = new ProductController();