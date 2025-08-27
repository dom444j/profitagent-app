import { Router } from 'express';
import { adminSettingsController } from './settings.controller';
import { authMiddleware, adminMiddleware } from '../../lib/middleware';

const router = Router();

// All admin settings routes require authentication and admin privileges
router.use(authMiddleware);
router.use(adminMiddleware);

// GET /api/v1/admin/settings - Get all admin settings
router.get('/', adminSettingsController.getSettings);

// PUT /api/v1/admin/settings/system - Update system settings
router.put('/system', adminSettingsController.updateSystemSettings);

// PUT /api/v1/admin/settings/security - Update security settings
router.put('/security', adminSettingsController.updateSecuritySettings);

// PUT /api/v1/admin/settings/notifications - Update notification settings
router.put('/notifications', adminSettingsController.updateNotificationSettings);

// POST /api/v1/admin/settings/change-password - Change admin password
router.post('/change-password', adminSettingsController.changePassword);

export { router as adminSettingsRoutes };