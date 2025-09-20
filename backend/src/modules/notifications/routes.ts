import { Router, Request, Response } from 'express';
import { authMiddleware, adminMiddleware } from '../../lib/middleware';
import { realTimeNotificationService } from '../../services/real-time-notifications';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * GET /api/v1/notifications/history
 * Get notification history for the authenticated user with pagination
 * Query params: page, limit, type, read
 */
router.get('/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN';
    
    // Pagination parameters
    const page = parseInt((req.query.page as string) ?? '', 10) || 1;
    const limit = Math.min(parseInt((req.query.limit as string) ?? '', 10) || 20, 100); // Max 100 per page
    const offset = (page - 1) * limit;
    
    // Filter parameters
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    const read = req.query.read === 'true' ? true : req.query.read === 'false' ? false : undefined;
    
    const options: any = { page, limit, offset };
    if (typeof type === 'string') options.type = type;
    if (typeof read === 'boolean') options.read = read;
    
    const result = await realTimeNotificationService.getNotificationHistoryPaginated(
      isAdmin ? undefined : userId,
      isAdmin,
      options
    );
    
    return res.json({
      success: true,
      data: result.notifications,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
        hasNext: page < Math.ceil(result.total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    logger.error('Failed to get notification history: ' + (error as Error).message + ' - userId: ' + req.user?.id);
    return res.status(500).json({
      success: false,
      error: 'Failed to get notification history'
    });
  }
});

/**
 * PUT /api/v1/notifications/:id/read
 * Mark a notification as read
 */
router.put('/:id/read', authMiddleware, async (req: Request, res: Response) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user!.id;

    if (!notificationId) {
      return res.status(400).json({ success: false, error: 'Notification ID is required' });
    }
    
    const success = await realTimeNotificationService.markAsRead(notificationId, userId);
    
    if (success) {
      return res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } else {
      return res.status(404).json({
        success: false,
        error: 'Notification not found or already read'
      });
    }
  } catch (error) {
    logger.error('Failed to mark notification as read: ' + (error as Error).message + ' - notificationId: ' + req.params.id + ' - userId: ' + req.user?.id);
    return res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
});

/**
 * POST /api/v1/notifications/test
 * Send a test notification (admin only)
 */
router.post('/test', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { type, title, message, severity, userId } = req.body;
    
    if (!type || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, title, message'
      });
    }
    
    const notification = {
      type: type || 'system',
      title,
      message,
      severity: severity || 'info'
    };
    
    if (userId) {
      await realTimeNotificationService.sendToUser(userId, notification);
    } else {
      await realTimeNotificationService.sendToAdmins(notification);
    }
    
    return res.json({
      success: true,
      message: 'Test notification sent successfully'
    });
  } catch (error) {
    logger.error('Failed to send test notification: ' + (error as Error).message + ' - body: ' + JSON.stringify(req.body));
    return res.status(500).json({
      success: false,
      error: 'Failed to send test notification'
    });
  }
});

/**
 * POST /api/v1/notifications/system-alert
 * Send a system alert (admin only)
 */
router.post('/system-alert', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { type, details, severity, count } = req.body;
    
    if (!type || !details) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, details'
      });
    }
    
    const validTypes = ['high_pending_withdrawals', 'failed_orders', 'system_error', 'security_breach'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid alert type. Must be one of: ${validTypes.join(', ')}`
      });
    }
    
    await realTimeNotificationService.sendSystemAlert({
      type,
      details,
      severity: severity || 'warning',
      count
    });
    
    return res.json({
      success: true,
      message: 'System alert sent successfully'
    });
  } catch (error) {
    logger.error('Failed to send system alert: ' + (error as Error).message + ' - body: ' + JSON.stringify(req.body));
    return res.status(500).json({
      success: false,
      error: 'Failed to send system alert'
    });
  }
});

/**
 * GET /api/v1/notifications/stats
 * Get notification statistics (admin only)
 */
router.get('/stats', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const allNotifications = await realTimeNotificationService.getNotificationHistory(undefined, true, 1000);
    
    const stats = {
      total: allNotifications.length,
      byType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      recent: allNotifications.slice(0, 10),
      last24Hours: allNotifications.filter(n => 
        new Date().getTime() - n.timestamp.getTime() < 24 * 60 * 60 * 1000
      ).length
    };
    
    // Count by type
    allNotifications.forEach(notif => {
      stats.byType[notif.type] = (stats.byType[notif.type] || 0) + 1;
      stats.bySeverity[notif.severity] = (stats.bySeverity[notif.severity] || 0) + 1;
    });
    
    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get notification stats: ' + (error as Error).message);
    return res.status(500).json({
      success: false,
      error: 'Failed to get notification stats'
    });
  }
});

export { router as notificationRoutes };