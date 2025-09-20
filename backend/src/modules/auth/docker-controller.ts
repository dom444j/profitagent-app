import { Request, Response } from 'express';
import { DockerAuthService } from './docker-service';
import * as jwt from 'jsonwebtoken';
import { logger } from '../../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('JWT_SECRET and JWT_REFRESH_SECRET environment variables are required');
}

export const dockerRegister = async (req: Request, res: Response) => {
  try {
    const { email, password, first_name, last_name, sponsor_code } = req.body;

    // Validate required fields (sponsor_code is now mandatory)
    if (!email || !password || !first_name || !last_name || !sponsor_code) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'email, password, first_name, last_name, and sponsor_code are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const user = await DockerAuthService.register({
      email,
      password,
      first_name: first_name,
      last_name: last_name,
      sponsor_code
    });

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // NEW: set short-lived access token cookie for SSE and auth by cookie
    res.cookie('auth_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    logger.info(`User registered successfully: ${user.email}`);

    return res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        ref_code: user.ref_code,
        usdt_bep20_address: user.usdt_bep20_address,
        telegram_link_status: user.telegram_link_status,
        status: user.status,
        role: user.role
      },
      accessToken
    });
  } catch (error: any) {
    logger.error('Docker registration error:', error);
    
    if (error.message === 'Email already registered') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    if (error.message === 'Invalid sponsor code') {
      return res.status(400).json({ error: 'Invalid sponsor code' });
    }

    return res.status(500).json({ error: 'Registration failed', details: error.message });
  }
};

export const dockerLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await DockerAuthService.login(email, password);

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // NEW: set short-lived access token cookie for SSE and auth by cookie
    res.cookie('auth_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    logger.info(`User logged in: ${user.email}`);

    return res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        ref_code: user.ref_code,
        usdt_bep20_address: user.usdt_bep20_address,
        telegram_link_status: user.telegram_link_status,
        status: user.status,
        role: user.role
      },
      accessToken
    });
  } catch (error: any) {
    logger.error('Docker login error:', error);
    
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    return res.status(500).json({ error: 'Login failed', details: error.message });
  }
};

export const dockerTestUsers = async (req: Request, res: Response) => {
  try {
    const users = await DockerAuthService.executeSQL(
      'SELECT id, email, first_name, last_name, ref_code FROM users LIMIT 5'
    );
    
    return res.json({
      success: true,
      message: `Found ${users.length} users`,
      users: users
    });
  } catch (error: any) {
    logger.error('Docker test users failed:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Test users failed',
      error: error.message
    });
  }
};