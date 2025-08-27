import { exec } from 'child_process';
import { promisify } from 'util';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';

const execAsync = promisify(exec);

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  sponsor_code?: string;
}

export class DockerAuthService {
  static async executeSQL(query: string, params: any[] = []): Promise<any> {
    try {
      // Escape parameters for SQL injection protection
      const escapedParams = params.map(param => {
        if (typeof param === 'string') {
          return `'${param.replace(/'/g, "''")}'`;
        }
        return param;
      });
      
      // Replace $1, $2, etc. with actual parameters
      let finalQuery = query;
      escapedParams.forEach((param, index) => {
        finalQuery = finalQuery.replace(new RegExp(`\\$${index + 1}`, 'g'), param);
      });
      
      const command = `docker exec -i grow5x_pg psql -U grow5x -d grow5x -t -A -F"|" -c "${finalQuery}"`;
      logger.info(`Executing SQL: ${finalQuery}`);
      
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr) {
        logger.error('SQL Error:', stderr);
        throw new Error(stderr);
      }
      
      // Parse the result - handle multi-line output properly
      const output = stdout.trim();
      if (!output) {
        return [];
      }
      
      // Split by lines and filter out empty lines
      const lines = output.split('\n').filter(line => line.trim());
      
      // For queries that return structured data, we need to handle line wrapping
      // If a line doesn't contain the expected number of pipes, it might be wrapped
      const processedLines: string[] = [];
      let currentLine = '';
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (currentLine) {
          // Continue building the current line
          currentLine += trimmedLine;
        } else {
          currentLine = trimmedLine;
        }
        
        // Check if this looks like a complete record by counting pipes
        // For user queries, we expect 9 pipes (10 fields)
        const pipeCount = (currentLine.match(/\|/g) || []).length;
        if (pipeCount >= 9 || !trimmedLine.includes('|')) {
          processedLines.push(currentLine);
          currentLine = '';
        }
      }
      
      // Add any remaining line
      if (currentLine) {
        processedLines.push(currentLine);
      }
      
      return processedLines;
    } catch (error: any) {
      logger.error('Docker SQL execution failed:', error);
      throw error;
    }
  }
  
  static async register(data: RegisterData) {
    try {
      // Check if email already exists
      const existingUsers = await this.executeSQL(
        'SELECT id FROM users WHERE email = $1',
        [data.email]
      );
      
      if (existingUsers.length > 0) {
        throw new Error('Email already registered');
      }

      // Validate sponsor if provided
      let sponsorId = null;
      if (data.sponsor_code) {
        const sponsors = await this.executeSQL(
          'SELECT id FROM users WHERE ref_code = $1',
          [data.sponsor_code]
        );
        
        if (sponsors.length === 0) {
          throw new Error('Invalid sponsor code');
        }
        sponsorId = sponsors[0];
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, 10);
      
      // Generate unique ref_code
      const refCode = `REF${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const userId = uuidv4();

      // Insert new user
      const insertQuery = `INSERT INTO users (id, email, password_hash, first_name, last_name, ref_code, sponsor_id, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW(), NOW())`;
      
      await this.executeSQL(insertQuery, [
        userId, 
        data.email, 
        passwordHash, 
        data.first_name, 
        data.last_name, 
        refCode, 
        sponsorId
      ]);

      // Get the created user
      const users = await this.executeSQL(
        'SELECT id, email, first_name, last_name, ref_code, usdt_bep20_address, telegram_link_status, status, role FROM users WHERE id = $1',
        [userId]
      );
      
      if (users.length === 0) {
        throw new Error('Failed to create user');
      }
      
      // Parse the user data (assuming pipe-separated format)
      const userData = users[0].split('|').map((s: string) => s.trim());
      
      return {
        id: userData[0],
        email: userData[1],
        first_name: userData[2],
        last_name: userData[3],
        ref_code: userData[4],
        usdt_bep20_address: userData[5] || null,
        telegram_link_status: userData[6] || 'not_linked',
        status: userData[7] || 'active',
        role: userData[8] || 'user'
      };
    } catch (error: any) {
      logger.error('Docker registration failed:', error);
      throw error;
    }
  }

  static async login(email: string, password: string) {
    try {
      const users = await this.executeSQL(
        'SELECT id, email, password_hash, first_name, last_name, ref_code, usdt_bep20_address, telegram_link_status, status, role FROM users WHERE email = $1 AND status = $2',
        [email, 'active']
      );

      if (users.length === 0) {
        throw new Error('Invalid credentials');
      }

      // Parse the user data (assuming pipe-separated format)
      const userData = users[0].split('|').map((s: string) => s.trim());
      const user = {
        id: userData[0],
        email: userData[1],
        password_hash: userData[2],
        first_name: userData[3],
        last_name: userData[4],
        ref_code: userData[5],
        usdt_bep20_address: userData[6] || null,
        telegram_link_status: userData[7] || 'not_linked',
        status: userData[8] || 'active',
        role: userData[9] || 'user'
      };
      
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Remove password_hash from response
      const { password_hash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error: any) {
      logger.error('Docker login failed:', error);
      throw error;
    }
  }

  static async getUserById(userId: string) {
    try {
      const users = await this.executeSQL(
        'SELECT id, email, first_name, last_name, ref_code, usdt_bep20_address, telegram_link_status, status, role FROM users WHERE id = $1',
        [userId]
      );

      if (users.length === 0) {
        return null;
      }

      // Parse the user data (assuming pipe-separated format)
      const userData = users[0].split('|').map((s: string) => s.trim());
      return {
        id: userData[0],
        email: userData[1],
        first_name: userData[2],
        last_name: userData[3],
        ref_code: userData[4],
        usdt_bep20_address: userData[5] || null,
        telegram_link_status: userData[6] || 'not_linked',
        status: userData[7] || 'active',
        role: userData[8] || 'user'
      };
    } catch (error: any) {
      logger.error('Docker getUserById failed:', error);
      return null;
    }
  }
}