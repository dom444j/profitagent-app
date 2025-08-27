import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { DockerAuthService } from '../modules/auth/docker-service';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        first_name: string;
        last_name: string;
        ref_code: string;
        role: string;
      };
    }
  }
}

// Ensure the same fallback secret used when signing tokens in controllers
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Try to get token from Authorization header first, then from cookies
    let token = req.cookies.auth_token;
    
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await DockerAuthService.getUserById(decoded.userId);
    
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