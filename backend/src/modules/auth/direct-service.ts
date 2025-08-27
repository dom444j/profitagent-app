import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env reliably (works for ts-node-dev and dist)
try {
  const envPath = path.resolve(__dirname, '../../../.env');
  dotenv.config({ path: envPath });
} catch {}

// Build connection string from env or fallback to local docker-compose defaults
const connectionString = process.env.DATABASE_URL || 'postgresql://grow5x:password123@localhost:55432/grow5x?schema=public';

// Direct PostgreSQL connection
const pool = new Pool({
  connectionString,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  sponsor_code?: string;
}

export class DirectAuthService {
  static async register(data: RegisterData) {
    const client = await pool.connect();
    try {
      // Check if email already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [data.email]
      );
      
      if (existingUser.rows.length > 0) {
        throw new Error('Email already registered');
      }

      // Validate sponsor if provided
      let sponsorId = null;
      if (data.sponsor_code) {
        const sponsor = await client.query(
          'SELECT id FROM users WHERE ref_code = $1',
          [data.sponsor_code]
        );
        
        if (sponsor.rows.length === 0) {
          throw new Error('Invalid sponsor code');
        }
        sponsorId = sponsor.rows[0].id;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, 10);
      
      // Generate unique ref_code
      const refCode = `REF${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const userId = uuidv4();

      // Insert new user
      const result = await client.query(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, ref_code, sponsor_id, status, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW(), NOW()) 
         RETURNING id, email, first_name, last_name, ref_code`,
        [userId, data.email, passwordHash, data.first_name, data.last_name, refCode, sponsorId]
      );

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async login(email: string, password: string) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id, email, password_hash, first_name, last_name, ref_code FROM users WHERE email = $1 AND status = $2',
        [email, 'active']
      );

      if (result.rows.length === 0) {
        throw new Error('Invalid credentials');
      }

      const user = result.rows[0];
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Remove password_hash from response
      const { password_hash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } finally {
      client.release();
    }
  }
}