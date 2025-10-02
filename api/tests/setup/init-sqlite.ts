// Initialize SQLite test database before running tests
import fs from 'node:fs';
import path from 'node:path';

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

// Note: Prisma will create the database file on first connection
// using the schema defined in prisma/schema.prisma

