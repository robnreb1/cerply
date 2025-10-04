import { PrismaClient } from '@prisma/client';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

// Helper function to create Prisma client with fallback DATABASE_URL
export function createPrismaClient(): PrismaClient | null {
  try {
    let databaseUrl = process.env.DATABASE_URL;
    
    // If DATABASE_URL is not set or empty, use a default SQLite path for staging
    // Only fallback when DATABASE_URL is missing, not when it's a valid non-file URL
    if (!databaseUrl || databaseUrl.trim() === '') {
      databaseUrl = 'file:./.data/staging.sqlite';
      process.env.DATABASE_URL = databaseUrl;
    }
    
    // Ensure the directory exists (only for SQLite files)
    if (databaseUrl.startsWith('file:')) {
      try {
        const filePath = databaseUrl.replace('file:', '');
        const dir = dirname(filePath);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
      } catch (dirError) {
        console.warn('Could not create database directory:', dirError);
      }
    }
    
    return new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl
        }
      }
    });
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
