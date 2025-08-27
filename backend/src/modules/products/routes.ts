import { Router } from 'express';
import { productController } from './controller';

const router = Router();

// GET /api/v1/products
router.get('/', productController.getProducts);

export { router as productRoutes };