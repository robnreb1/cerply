#!/usr/bin/env node

/**
 * Manually apply Epic 8 migration
 * This script applies only the Epic 8 conversational UI migration
 * without re-running previous migrations
 */

const fs = require('fs');
const path = require('path');

async function applyMigration() {
  // Read the migration file
  const migrationPath = path.join(__dirname, '../drizzle/014_conversational_ui.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  console.log('📋 Epic 8 Migration SQL:');
  console.log('─'.repeat(80));
  console.log(migrationSQL);
  console.log('─'.repeat(80));
  console.log('\n✅ Migration SQL ready to apply');
  console.log('\nTo apply this migration manually:');
  console.log('1. Connect to your PostgreSQL database');
  console.log('2. Copy and paste the SQL above');
  console.log('3. Or run: psql $DATABASE_URL < api/drizzle/014_conversational_ui.sql');
  console.log('\nAlternatively, use Drizzle push (skips migration tracking):');
  console.log('   cd api && npm run db:push');
}

applyMigration().catch(console.error);

