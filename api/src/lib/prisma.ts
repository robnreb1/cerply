import { PrismaClient } from '@prisma/client';

// Helper function to create Prisma client with fallback DATABASE_URL
export function createPrismaClient(): PrismaClient | null {
  try {
    // If DATABASE_URL is not set, use a default SQLite path for staging
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = 'file:./.data/staging.sqlite';
    }
    
    return new PrismaClient();
  } catch (error) {
    console.error('Failed to initialize Prisma client:', error);
    return null;
  }
}

// Helper function to safely execute Prisma operations
export async function withPrisma<T>(
  operation: (prisma: PrismaClient) => Promise<T>,
  fallback: T
): Promise<T> {
  const prisma = createPrismaClient();
  if (!prisma) {
    return fallback;
  }
  
  try {
    return await operation(prisma);
  } catch (error) {
    console.error('Prisma operation failed:', error);
    return fallback;
  } finally {
    await prisma.$disconnect();
  }
}
