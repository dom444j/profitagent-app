import { Router } from 'express';
import { licenseController } from './controller';
import { authMiddleware } from '../../lib/middleware';

const router = Router();

// GET /api/v1/licenses/products - Get available license products (public)
router.get('/products', licenseController.getAvailableProducts);

// All other license routes require authentication
router.use(authMiddleware);

// GET /api/v1/licenses - Get user licenses
router.get('/', licenseController.getLicenses);

// GET /api/v1/licenses/:id/earnings - Get license earnings history
router.get('/:id/earnings', licenseController.getLicenseEarnings);

export { router as licenseRoutes };