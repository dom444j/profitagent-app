import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Ensure .env is loaded before creating Prisma client (works for dev and dist builds)
try {
  // In dist, __dirname is backend/dist/lib -> ../../.env resolves to backend/.env
  // In src (tsx watch), this still resolves to backend/.env due to ts-node/tsx cwd
  const envPath = path.resolve(__dirname, '../../.env');
  dotenv.config({ path: envPath });
} catch {}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Function to get DATABASE_URL dynamically
function getDatabaseUrl() {
  return process.env.DATABASE_URL || 'postgresql://grow5x:password123@localhost:55432/grow5x?schema=public';
}

// Create Prisma client with dynamic URL
function createPrismaClient() {
  return new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl()
      }
    }
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;