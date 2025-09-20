import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as jwt from 'jsonwebtoken';
import { sseService } from '../../services/sse';
import { authMiddleware, adminMiddleware } from '../../lib/middleware';
import { DirectAuthService } from '../auth/direct-service';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * SSE endpoint for authenticated users with mixed authentication
 * GET /api/v1/sse/events
 * Supports both cookie authentication (local) and token authentication (VPS)
 */
router.get('/events', async (req: Request, res: Response) => {
  const clientId = uuidv4();
  let user: any = null;
  
  try {
    // 1) If VPS mode with token authentication is enabled
    if (process.env.SSE_AUTH_MODE === 'token') {
      const token = String(req.query.token || '');
      if (!token) {
        return res.status(401).json({ error: 'SSE token required' });
      }
      
      try {
        const sseSecret = process.env.SSE_JWT_SECRET || process.env.JWT_SECRET!;
        const payload = jwt.verify(token, sseSecret, { audience: 'sse' }) as any;
        
        // Get user from database
        const dbUser = await DirectAuthService.getUserById(payload.uid);
        if (!dbUser || dbUser.status !== 'active') {
          return res.status(401).json({ error: 'Invalid user or inactive account' });
        }
        
        user = { id: payload.uid, role: payload.role };
        logger.info({ clientId, userId: user.id, mode: 'token' }, 'SSE token authentication successful');
      } catch (error: any) {
        logger.error({ error: error.message }, 'SSE token verification failed');
        return res.status(401).json({ error: 'Invalid SSE token' });
      }
    } else {
      // 2) Cookie mode (local development) - use existing middleware logic
      const JWT_SECRET = process.env.JWT_SECRET;
      if (!JWT_SECRET) {
        return res.status(500).json({ error: 'JWT_SECRET environment variable is required' });
      }
      let token = req.cookies.auth_token;
      
      if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }
      
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const dbUser = await DirectAuthService.getUserById(decoded.userId);
      
      if (!dbUser || dbUser.status !== 'active') {
        return res.status(401).json({ error: 'User not found or inactive' });
      }
      
      user = dbUser;
      logger.info({ clientId, userId: user.id, mode: 'cookie' }, 'SSE cookie authentication successful');
    }
    
    const userId = user.id;
    const isAdmin = user.role === 'admin';
    const origin = req.headers.origin as string | undefined;

    logger.info({ clientId, userId, isAdmin }, 'New SSE connection request');

    // Add client to SSE service (pass origin for proper CORS headers)
    sseService.addClient(clientId, res, userId, isAdmin, origin);

    // The response is handled by the SSE service
    // Connection will be closed when client disconnects
    return; // Explicit return for TypeScript
  } catch (error: any) {
    logger.error({ error: error.message }, 'SSE authentication error');
    return res.status(401).json({ error: 'Authentication failed' });
  }
});

/**
 * Get SSE service status (admin only)
 * GET /api/v1/sse/status
 */
router.get('/status', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const stats = sseService.getStats();
  res.json(stats);
});

export { router as sseRoutes };