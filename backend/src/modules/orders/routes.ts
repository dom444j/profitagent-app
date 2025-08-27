import { Router } from 'express';
import { orderController } from './controller';
import { authMiddleware } from '../../lib/middleware';

const router = Router();

// All order routes require authentication
router.use(authMiddleware);

// GET /api/v1/orders
router.get('/', orderController.getUserOrders);

// POST /api/v1/orders
router.post('/', orderController.createOrder);

// GET /api/v1/orders/:id
router.get('/:id', orderController.getOrder);

// POST /api/v1/orders/:id/submit-tx
router.post('/:id/submit-tx', orderController.submitTransaction);

// POST /api/v1/orders/:id/reassign
router.post('/:id/reassign', orderController.reassignOrder);

export { router as orderRoutes };