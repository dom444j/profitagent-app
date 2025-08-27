import { Router } from 'express';
import { balanceController } from './controller';
import { authMiddleware } from '../../lib/middleware';

const router = Router();

// All balance routes require authentication
router.use(authMiddleware);

// GET /api/v1/balance - Get user balance
router.get('/', balanceController.getBalance);

export { router as balanceRoutes };