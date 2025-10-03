// Initialize SQLite test database before running tests
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

// Ensure .data directory exists for SQLite databases
const dataDir = path.join(process.cwd(), '.data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const testDbPath = path.join(dataDir, 'admin-test.sqlite');

// Clean up old test DB and journal files for a fresh start
try {
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  // Also remove journal files
  ['-journal', '-shm', '-wal'].forEach(ext => {
    const file = testDbPath + ext;
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  });
} catch (err) {
  // Ignore cleanup errors
}

// Create the database schema using Prisma Client's $executeRawUnsafe
// This creates the tables defined in the schema
async function initializeTestDatabase() {
  const prisma = new PrismaClient({
    datasources: {
      db: { url: 'file:./.data/admin-test.sqlite' }
    },
    log: []
  });

  try {
    // Connect to create the database file
    await prisma.$connect();
    
    // Create tables
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "admin_sources" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL UNIQUE,
        "url" TEXT,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "admin_items" (
        "id" TEXT PRIMARY KEY,
        "source_id" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'queued',
        "title" TEXT,
        "url" TEXT NOT NULL,
        "sha256" TEXT NOT NULL,
        "size_bytes" INTEGER,
        "meta" TEXT,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("source_id") REFERENCES "admin_sources"("id") ON DELETE CASCADE
      );
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "admin_items_status_created_at_idx" ON "admin_items"("status", "created_at" DESC);
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "admin_items_source_id_created_at_idx" ON "admin_items"("source_id", "created_at" DESC);
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "admin_events" (
        "id" TEXT PRIMARY KEY,
        "item_id" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "payload" TEXT,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("item_id") REFERENCES "admin_items"("id") ON DELETE CASCADE
      );
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "admin_events_item_id_created_at_idx" ON "admin_events"("item_id", "created_at" DESC);
    `);
    
    await prisma.$disconnect();
  } catch (err) {
    console.error('Failed to initialize test database:', err);
    await prisma.$disconnect();
    throw err;
  }
}

// Run synchronously (Vitest's setup files are awaited)
await initializeTestDatabase();

