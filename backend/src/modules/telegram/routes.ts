import { Router } from 'express';
import { authMiddleware } from '../../lib/middleware';
import {
  testOTPMessage,
  testAlertMessage,
  testWithdrawalAlert,
  verifyOTP,
  getOTPStats
} from './controller';

const router = Router();

// Test endpoints (require authentication)
router.post('/test/otp', authMiddleware, testOTPMessage);
router.post('/test/alert', authMiddleware, testAlertMessage);
router.post('/test/withdrawal-alert', authMiddleware, testWithdrawalAlert);

// OTP verification
router.post('/verify-otp', authMiddleware, verifyOTP);

// OTP statistics
router.get('/stats', authMiddleware, getOTPStats);

export default router;