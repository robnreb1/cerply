#!/usr/bin/env node
/**
 * Run Epic 9 migration against Render database
 * Usage: node scripts/run-migration.js
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL environment variable not set');
  console.error('');
  console.error('Usage:');
  console.error('  DATABASE_URL="postgresql://..." node scripts/run-migration.js');
  process.exit(1);
}

async function runMigration() {
  console.log('🔄 Connecting to database...');
  
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Required for Render
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Read migration file
    const migrationPath = join(__dirname, '../drizzle/018_adaptive_difficulty.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('🔄 Running Epic 9 migration...');
    console.log('   - Creating learner_profiles table');
    console.log('   - Creating topic_comprehension table');
    console.log('   - Extending attempts table');
    
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('Verifying tables...');
    
    // Verify tables exist
    const result = await client.query(`
      SELECT 
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'learner_profiles') as learner_profiles_exists,
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'topic_comprehension') as topic_comprehension_exists,
        EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'attempts' AND column_name = 'response_time_ms') as attempts_response_time_exists,
        EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'attempts' AND column_name = 'difficulty_level') as attempts_difficulty_exists;
    `);

    const checks = result.rows[0];
    console.log('');
    console.log('✅ learner_profiles table:', checks.learner_profiles_exists ? 'EXISTS' : 'MISSING');
    console.log('✅ topic_comprehension table:', checks.topic_comprehension_exists ? 'EXISTS' : 'MISSING');
    console.log('✅ attempts.response_time_ms column:', checks.attempts_response_time_exists ? 'EXISTS' : 'MISSING');
    console.log('✅ attempts.difficulty_level column:', checks.attempts_difficulty_exists ? 'EXISTS' : 'MISSING');
    console.log('');
    console.log('🎉 Epic 9 database migration complete!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Ensure FF_ADAPTIVE_DIFFICULTY_V1=true is set in Render');
    console.log('  2. Deploy your API code');
    console.log('  3. Run smoke tests: bash api/scripts/smoke-adaptive.sh');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('');
      console.log('ℹ️  Tables may already exist. Verifying...');
      
      const result = await client.query(`
        SELECT 
          EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'learner_profiles') as learner_profiles_exists,
          EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'topic_comprehension') as topic_comprehension_exists;
      `);
      
      if (result.rows[0].learner_profiles_exists && result.rows[0].topic_comprehension_exists) {
        console.log('✅ Epic 9 tables already exist - migration not needed!');
        process.exit(0);
      }
    }
    
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();

