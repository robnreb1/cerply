// Initialize SQLite test database before running tests
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Ensure .data directory exists
const dataDir = path.join(process.cwd(), '.data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const testDbPath = path.join(dataDir, 'admin-test.sqlite');

// Remove old test DB if exists
try {
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  // Also remove journal files
  ['.sqlite-journal', '.sqlite-shm', '.sqlite-wal'].forEach(ext => {
    const file = testDbPath + ext;
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  });
} catch {}

// Create empty test DB by running Prisma push
try {
  execSync('npx prisma db push --skip-generate', { 
    cwd: process.cwd(),
    env: { 
      ...process.env,
      NODE_ENV: 'test'
    },
    stdio: 'pipe'
  });
} catch (error) {
  // Ignore errors - will be created on first use
}

