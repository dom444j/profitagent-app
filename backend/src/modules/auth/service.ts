import * as bcrypt from 'bcrypt';
import { prisma } from '../../lib/prisma';
import { generateRefCode } from '../../lib/utils';

interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  sponsor_code: string;
}

interface LoginData {
  email: string;
  password: string;
}

class AuthService {
  async register(data: RegisterData) {
    try {
      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email }
      });
      
      if (existingUser) {
        return { success: false, error: 'Email already registered' };
      }
      
      // Find sponsor by ref_code
      const sponsor = await prisma.user.findUnique({
        where: { ref_code: data.sponsor_code }
      });
      
      if (!sponsor) {
        return { success: false, error: 'Invalid sponsor code' };
      }
      
      // Hash password
      const password_hash = await bcrypt.hash(data.password, 12);
      
      // Generate unique ref_code
      let ref_code: string;
      let isUnique = false;
      
      do {
        ref_code = generateRefCode();
        const existing = await prisma.user.findUnique({
          where: { ref_code }
        });
        isUnique = !existing;
      } while (!isUnique);
      
      // Create user
      const user = await prisma.user.create({
        data: {
          email: data.email,
          password_hash,
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone || null,
          ref_code,
          sponsor_id: sponsor.id
        }
      });
      
      return { success: true, user };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed' };
    }
  }
  
  async login(data: LoginData) {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: data.email }
      });
      
      if (!user) {
        return { success: false, error: 'Invalid credentials' };
      }
      
      // Check password
      const isValidPassword = await bcrypt.compare(data.password, user.password_hash);
      
      if (!isValidPassword) {
        return { success: false, error: 'Invalid credentials' };
      }
      
      // Check if user is active
      if (user.status !== 'active') {
        return { success: false, error: 'Account is suspended' };
      }
      
      return { success: true, user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  }
  
  async getUserById(id: string) {
    try {
      return await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          ref_code: true,
          status: true
        }
      });
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  async getUserByEmail(email: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { email }
      });
      
      return user;
    } catch (error) {
      console.error('Get user by email error:', error);
      return null;
    }
  }
}

export const authService = new AuthService();