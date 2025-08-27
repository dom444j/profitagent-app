import { Router } from 'express';
import { adminController } from './controller';
import { adminSettingsRoutes } from './settings.routes';
import { adminMetricsController } from './metrics.controller';
import { auditLogsController } from './audit-logs.controller';
import { authMiddleware, adminMiddleware } from '../../lib/middleware';

const router = Router();

// All admin routes require authentication and admin privileges
router.use(authMiddleware);
router.use(adminMiddleware);

// GET /api/v1/admin/orders - Get all orders with filters and pagination
router.get('/orders', adminController.getAllOrders);

// GET /api/v1/admin/orders/pending
router.get('/orders/pending', adminController.getPendingOrders);

// POST /api/v1/admin/orders/:id/confirm
router.post('/orders/:id/confirm', adminController.confirmOrder);

// POST /api/v1/admin/orders/:id/reject
router.post('/orders/:id/reject', adminController.rejectOrder);

// GET /api/v1/admin/users
router.get('/users', adminController.getUsers);

// GET /api/v1/admin/users/:id/profile - Get detailed user profile
router.get('/users/:id/profile', adminController.getUserProfile);

// POST /api/v1/admin/users/:id/status - Update user status (activate/disable/delete)
router.post('/users/:id/status', adminController.updateUserStatus);

// PUT /api/v1/admin/users/:id - Update user information
router.put('/users/:id', adminController.updateUser);

// POST /api/v1/admin/users/:id/pause-potential - Pause/unpause user potential
router.post('/users/:id/pause-potential', adminController.pauseUserPotential);

// GET /api/v1/admin/bonuses - Get bonuses list
router.get('/bonuses', adminController.getBonuses);

// POST /api/v1/admin/bonuses - Create bonus for user
router.post('/bonuses', adminController.createBonus);

// GET /api/v1/admin/stats
router.get('/stats', adminController.getStats);

// GET /api/v1/admin/licenses - Get all licenses with filters
router.get('/licenses', adminController.getLicenses);

// POST /api/v1/admin/licenses/:id/pause-potential - Pause/unpause license potential
router.post('/licenses/:id/pause-potential', adminController.pauseLicensePotential);

// GET /api/v1/admin/overview - Get admin overview dashboard
router.get('/overview', adminController.getOverview);

// Product management routes
// GET /api/v1/admin/products - Get all products with pagination
router.get('/products', adminController.getProducts);

// POST /api/v1/admin/products - Create new product
router.post('/products', adminController.createProduct);

// PUT /api/v1/admin/products/:id - Update product
router.put('/products/:id', adminController.updateProduct);

// DELETE /api/v1/admin/products/:id - Delete product
router.delete('/products/:id', adminController.deleteProduct);

// Wallet management routes
// GET /api/v1/admin/wallets - Get all admin wallets
router.get('/wallets', adminController.getWallets);

// POST /api/v1/admin/wallets - Create new admin wallet
router.post('/wallets', adminController.createWallet);

// PUT /api/v1/admin/wallets/:id - Update admin wallet
router.put('/wallets/:id', adminController.updateWallet);

// DELETE /api/v1/admin/wallets/:id - Delete wallet
router.delete('/wallets/:id', adminController.deleteWallet);

// GET /api/v1/admin/notification-settings/stats - Get notification settings statistics
router.get('/notification-settings/stats', adminController.getNotificationStats);

// GET /api/v1/admin/metrics - Get admin metrics and analytics
router.get('/metrics', adminMetricsController.getMetrics);

// GET /api/v1/admin/audit-logs - Get audit logs
router.get('/audit-logs', auditLogsController.getAuditLogs);

// GET /api/v1/admin/audit-logs/stats - Get audit logs statistics
router.get('/audit-logs/stats', auditLogsController.getAuditLogStats);

// Admin settings routes
router.use('/settings', adminSettingsRoutes);

export { router as adminRoutes };