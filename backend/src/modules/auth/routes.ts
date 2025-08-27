import { Router } from 'express';
import { authController } from './controller';
import { directRegister, directLogin } from './direct-controller';
import { dockerRegister, dockerLogin, dockerTestUsers } from './docker-controller';
import { testConnection, testUsers, simpleTest } from './test-controller';
import { authMiddleware } from '../../lib/middleware';
 
 const router = Router();
 
 // POST /api/v1/auth/register (docker DB access)
 router.post('/register', dockerRegister);
 
 // POST /api/v1/auth/login (docker DB access)
 router.post('/login', dockerLogin);
 
 // POST /api/v1/auth/admin/login (admin-specific login)
 router.post('/admin/login', dockerLogin);
 
 // Alternative routes
 router.post('/register-direct', directRegister);
 router.post('/login-direct', directLogin);
 
 // Fallback routes using Prisma (if needed)
 router.post('/register-prisma', authController.register);
 router.post('/login-prisma', authController.login);
 
 // POST /api/v1/auth/logout
 router.post('/logout', authController.logout);
 
 // POST /api/v1/auth/forgot-password
 router.post('/forgot-password', authController.forgotPassword);
 
 // GET /api/v1/auth/me
router.get('/me', authMiddleware, authController.me);
 
 // Test routes
 router.get('/test', simpleTest);
 router.post('/test', simpleTest);
 router.get('/test-db', testConnection);
 router.get('/test-users', testUsers);
 router.get('/test-docker-users', dockerTestUsers);
 
 export { router as authRoutes };