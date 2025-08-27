import { Router } from 'express';
import { userController } from './controller';
import { authMiddleware } from '../../lib/middleware';

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

// GET /api/v1/user/profile - Get current user's profile
router.get('/profile', userController.getProfile);

// PUT /api/v1/user/profile - Update current user's profile
router.put('/profile', userController.updateProfile);

// POST /api/v1/user/telegram/link - Link Telegram account
router.post('/telegram/link', userController.linkTelegram);

// POST /api/v1/user/telegram/unlink - Unlink Telegram account
router.post('/telegram/unlink', userController.unlinkTelegram);

// GET /api/v1/user/notification-settings - Get notification settings
router.get('/notification-settings', userController.getNotificationSettings);

// PUT /api/v1/user/notification-settings - Update notification settings
router.put('/notification-settings', userController.updateNotificationSettings);

// GET /api/v1/user/settings - Get user settings
router.get('/settings', userController.getSettings);

// PUT /api/v1/user/settings/security - Update security settings
router.put('/settings/security', userController.updateSecuritySettings);

// PUT /api/v1/user/settings/notifications - Update notification settings (v2)
router.put('/settings/notifications', userController.updateNotificationSettingsV2);

// PUT /api/v1/user/settings/privacy - Update privacy settings
router.put('/settings/privacy', userController.updatePrivacySettings);

// POST /api/v1/user/settings/change-password - Change password
router.post('/settings/change-password', userController.changePassword);

// DELETE /api/v1/user/settings/delete-account - Delete account
router.delete('/settings/delete-account', userController.deleteAccount);

export { router as userRoutes };