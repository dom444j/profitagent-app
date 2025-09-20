import { Router } from 'express';
import { withdrawalController } from './controller';
import { authMiddleware } from '../../lib/middleware';

const router = Router();

// All withdrawal routes require authentication
router.use(authMiddleware);

// GET /api/v1/withdrawals - Get user withdrawals
router.get('/', withdrawalController.getWithdrawals);

// POST /api/v1/withdrawals - Create withdrawal request
router.post('/', withdrawalController.createWithdrawal);



// DELETE /api/v1/withdrawals/{id} - Cancel withdrawal
router.delete('/:id', withdrawalController.cancelWithdrawal);

export { router as withdrawalRoutes };