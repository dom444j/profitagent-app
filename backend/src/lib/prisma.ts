import { PrismaClient } from '@prisma/client';

// Environment variables are loaded by the main application
// No need for manual dotenv configuration here

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Function to get DATABASE_URL dynamically
function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  return databaseUrl;
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