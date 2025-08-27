import { Router } from 'express';
import { referralController } from './controller';
import { authMiddleware, adminMiddleware } from '../../lib/middleware';

const router = Router();

// User routes - require authentication
router.get('/referrals', authMiddleware, referralController.getUserReferrals);
router.get('/referrals/commissions', authMiddleware, referralController.getUserCommissions);

// Admin routes - require authentication and admin role
router.get('/admin/referrals', authMiddleware, adminMiddleware, referralController.getPendingCommissions);
router.post('/admin/referrals/:id/release', authMiddleware, adminMiddleware, referralController.releaseCommission);
router.post('/admin/referrals/:id/cancel', authMiddleware, adminMiddleware, referralController.cancelCommission);

export default router;