import { Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { z } from 'zod';
import { authService } from './service';

import { logger } from '../../utils/logger';
import '../../lib/middleware';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  phone: z.string().optional(),
  sponsor_code: z.string().min(1),
  usdt_bep20_address: z.string().optional(),
  telegram_user_id: z.string().optional(),
  telegram_link_status: z.enum(['pending', 'linked', 'failed']).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const forgotPasswordSchema = z.object({
  email: z.string().email()
});

class AuthController {
  async register(req: Request, res: Response) {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      const registerData: any = { ...validatedData };
      if (!validatedData.phone) {
        delete registerData.phone;
      }
      
      const result = await authService.register(registerData);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      // Set JWT cookie
      if (!result.user) {
        return res.status(500).json({ error: 'User registration failed' });
      }
      
      const token = jwt.sign(
        { userId: result.user.id },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );
      
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      if (!result.user) {
        return res.status(500).json({ error: 'User creation failed' });
      }
      
      return res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: result.user.id,
          email: result.user.email,
          first_name: result.user.first_name,
        last_name: result.user.last_name,
          ref_code: result.user.ref_code,
          role: result.user.role,
          status: result.user.status
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.issues });
      }
      logger.error(error, 'Registration error');
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  async login(req: Request, res: Response) {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      const result = await authService.login(validatedData);
      
      if (!result.success) {
        return res.status(401).json({ error: result.error });
      }
      
      // Set JWT cookie
      if (!result.user) {
        return res.status(401).json({ error: 'Authentication failed' });
      }
      
      const token = jwt.sign(
        { userId: result.user.id },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );
      
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      return res.json({
        user: {
          id: result.user.id,
          email: result.user.email,
          first_name: result.user.first_name,
        last_name: result.user.last_name,
          ref_code: result.user.ref_code,
          role: result.user.role,
          status: result.user.status
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.issues });
      }
      logger.error(error, 'Login error');
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  async adminLogin(req: Request, res: Response) {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      const result = await authService.login(validatedData);
      
      if (!result.success) {
        return res.status(401).json({ error: result.error });
      }
      
      // Verificar que el usuario sea admin
      if (!result.user || result.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admin role required.' });
      }
      
      const token = jwt.sign(
        { userId: result.user.id },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );
      
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      return res.json({
        user: {
          id: result.user.id,
          email: result.user.email,
          first_name: result.user.first_name,
          last_name: result.user.last_name,
          ref_code: result.user.ref_code,
          role: result.user.role,
          status: result.user.status
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.issues });
      }
      logger.error(error, 'Admin login error');
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  async logout(req: Request, res: Response) {
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    });
    return res.json({ message: 'Logged out successfully' });
  }
  
  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      
      // Check if user exists and has telegram configured
      const user = await authService.getUserByEmail(email);
      
      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({ 
          message: 'Si el email está registrado y tiene Telegram configurado, recibirás las instrucciones de recuperación.' 
        });
      }
      
      if (!user.telegram_user_id) {
        return res.status(400).json({ 
          error: 'Tu cuenta no tiene Telegram configurado. Contacta al soporte para recuperar tu contraseña.' 
        });
      }
      
      // Generate password reset token (valid for 1 hour)
      const resetToken = jwt.sign(
        { userId: user.id, type: 'password_reset' },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );
      
      // TODO: Send Telegram message with reset link
      // For now, we'll log the token (in production, this should be sent via Telegram)
      logger.info(`Password reset token for ${email}: ${resetToken}`);
      
      // In a real implementation, you would:
      // 1. Send a Telegram message to user.telegram_user_id
      // 2. Include a link like: https://profitagent.app/reset-password?token=${resetToken}
      // 3. The link would lead to a form where user can set new password
      
      return res.json({ 
        message: 'Se han enviado las instrucciones de recuperaciÃ³n a tu Telegram.' 
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Email inválido' });
      }
      
      logger.error(error, 'Forgot password error');
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async me(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Get complete user information from database
      const completeUser = await authService.getUserById(req.user.id);
      if (!completeUser) {
        return res.status(401).json({ error: 'User not found' });
      }

      return res.json({
        user: {
          id: completeUser.id,
          email: completeUser.email,
          first_name: completeUser.first_name,
        last_name: completeUser.last_name,
          ref_code: completeUser.ref_code,
          usdt_bep20_address: completeUser.usdt_bep20_address,
          telegram_user_id: completeUser.telegram_user_id,
          telegram_link_status: completeUser.telegram_link_status,
          role: completeUser.role,
          status: completeUser.status
        }
      });
    } catch (error) {
      logger.error(error, 'Me endpoint error');
      return res.status(401).json({ error: 'Invalid token' });
    }
  }

  async sseToken(req: Request, res: Response) {
    try {
      // Only generate SSE tokens if SSE_AUTH_MODE is set to 'token'
      if (process.env.SSE_AUTH_MODE !== 'token') {
        return res.status(400).json({ error: 'SSE token authentication is disabled' });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Generate short-lived JWT token for SSE
      const ttl = Number(process.env.SSE_JWT_TTL_SECONDS || 900); // 15 minutes default
      const sseSecret = process.env.SSE_JWT_SECRET || process.env.JWT_SECRET!;
      
      const token = jwt.sign(
        { 
          uid: req.user.id, 
          role: req.user.role, 
          type: 'sse' 
        },
        sseSecret,
        { 
          expiresIn: ttl, 
          audience: 'sse', 
          subject: req.user.id 
        }
      );

      const expiresAt = Math.floor(Date.now() / 1000) + ttl;

      return res.json({ 
        token, 
        exp: expiresAt,
        ttl: ttl
      });
    } catch (error) {
      logger.error(error, 'SSE token generation error');
      return res.status(500).json({ error: 'Failed to generate SSE token' });
    }
  }
}

export const authController = new AuthController();
