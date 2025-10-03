// Initialize SQLite test database before running tests
import fs from 'node:fs';
import path from 'node:path';

// Ensure .data directory exists for SQLite databases
const dataDir = path.join(process.cwd(), '.data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Note: Database schema is created by CI's "prisma db push" step or locally
// by the PrismaClient on first connection. This setup file just ensures the
// directory structure is in place.

