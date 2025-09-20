import { Request, Response } from 'express';
import { Pool } from 'pg';
import { logger } from '../../utils/logger';

// Test PostgreSQL connection
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const testConnection = async (req: Request, res: Response) => {
  try {
    logger.info('Testing database connection...');
    
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    client.release();
    
    logger.info('Database connection successful');
    
    res.json({
      success: true,
      message: 'Database connection successful',
      data: result.rows[0]
    });
  } catch (error: any) {
    logger.error('Database connection failed:', error);
    
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
};

export const testUsers = async (req: Request, res: Response) => {
  try {
    logger.info('Testing users query...');
    
    const client = await pool.connect();
    const result = await client.query('SELECT id, email, first_name, last_name, ref_code FROM users LIMIT 5');
    client.release();
    
    logger.info(`Found ${result.rows.length} users`);
    
    res.json({
      success: true,
      message: `Found ${result.rows.length} users`,
      users: result.rows
    });
  } catch (error: any) {
    logger.error('Users query failed:', error);
    
    res.status(500).json({
      success: false,
      message: 'Users query failed',
      error: error.message
    });
  }
};

export const simpleTest = async (req: Request, res: Response) => {
  try {
    logger.info('Simple test endpoint called');
    
    res.json({
      success: true,
      message: 'Simple test successful',
      timestamp: new Date().toISOString(),
      body: req.body
    });
  } catch (error: any) {
    logger.error('Simple test failed:', error);
    
    res.status(500).json({
      success: false,
      message: 'Simple test failed',
      error: error.message
    });
  }
};