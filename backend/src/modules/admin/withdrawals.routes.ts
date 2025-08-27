import { Router } from 'express';
import { adminWithdrawalsController } from './withdrawals.controller';
import { authMiddleware, adminMiddleware } from '../../lib/middleware';

const router = Router();

// All admin withdrawal routes require authentication and admin role
router.use(authMiddleware);
router.use(adminMiddleware);

// GET /api/v1/admin/withdrawals - Get all withdrawals with filters
router.get('/', adminWithdrawalsController.list);

// POST /api/v1/admin/withdrawals/{id}/approve - Approve withdrawal
router.post('/:id/approve', adminWithdrawalsController.approve);

// POST /api/v1/admin/withdrawals/{id}/mark-paid - Mark withdrawal as paid
router.post('/:id/mark-paid', adminWithdrawalsController.markPaid);

// POST /api/v1/admin/withdrawals/{id}/reject - Reject withdrawal
router.post('/:id/reject', adminWithdrawalsController.reject);

// GET /api/v1/admin/withdrawals/export.json - Export approved withdrawals
router.get('/export.json', adminWithdrawalsController.exportWithdrawals);

export { router as adminWithdrawalRoutes };