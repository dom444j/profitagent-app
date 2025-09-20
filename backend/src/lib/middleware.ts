import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { logger } from '../utils/logger'; 
import { authService } from '../modules/auth/service';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        first_name: string | null;
        last_name: string | null;
        ref_code: string;
        role: string;
        status: string;
        usdt_bep20_address: string | null;
        telegram_user_id: string | null;
      };
    }
  }
}

// Get JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Debug logging
    logger.info(`Auth middleware - cookies: ${JSON.stringify(req.cookies)}`);
    logger.info(`Auth middleware - headers: ${req.headers.cookie}`);
    
    // Try to get token from Authorization header first, then from cookies
    let token = req.cookies.auth_token;
    
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    logger.info(`Auth middleware - token found: ${!!token}`);
    
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    const decoded = jwt.verify(token, JWT_SECRET as string) as { userId: string };
    const user = await authService.getUserById(decoded.userId);
    
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    
    if (user.status !== 'active') {
      res.status(401).json({ error: 'Account suspended' });
      return;
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  
  next();
}