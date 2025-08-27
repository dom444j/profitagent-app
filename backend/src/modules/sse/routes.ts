import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { sseService } from '../../services/sse';
import { authMiddleware, adminMiddleware } from '../../lib/middleware';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * SSE endpoint for authenticated users
 * GET /api/v1/sse/events
 */
router.get('/events', authMiddleware, (req, res) => {
  const clientId = uuidv4();
  const userId = req.user?.id;
  const isAdmin = req.user?.role === 'admin';

  logger.info({ clientId, userId, isAdmin }, 'New SSE connection request');

  // Add client to SSE service
  sseService.addClient(clientId, res, userId, isAdmin);

  // The response is handled by the SSE service
  // Connection will be closed when client disconnects
});

/**
 * Get SSE service status (admin only)
 * GET /api/v1/sse/status
 */
router.get('/status', authMiddleware, adminMiddleware, (req, res) => {
  const stats = sseService.getStats();
  res.json(stats);
});

export { router as sseRoutes };