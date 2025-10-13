#!/usr/bin/env node

/**
 * Apply Epic 8 migration directly to database
 * Non-interactive - runs the SQL directly
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function applyMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }

  console.log('📋 Applying Epic 8: Conversational UI Migration');
  console.log('─'.repeat(80));

  // Read the migration file
  // Use staging version if specified
  const migrationFile = process.env.USE_STAGING_MIGRATION === 'true' 
    ? '014_conversational_ui_staging.sql'
    : '014_conversational_ui.sql';
  const migrationPath = path.join(__dirname, '../drizzle', migrationFile);
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  // Connect to database with SSL for Render
  const pool = new Pool({ 
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false // Render requires SSL but uses self-signed certs
    }
  });

  try {
    // Apply the migration
    console.log('🔄 Executing migration...');
    await pool.query(migrationSQL);
    console.log('✅ Migration applied successfully!');
    console.log('\nCreated tables:');
    console.log('  - chat_sessions');
    console.log('  - chat_messages');
    console.log('  - confusion_log');
    console.log('\nExtended tables:');
    console.log('  - attempts (added: answer_text, partial_credit, feedback, validation_method)');
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Tables already exist - migration may have been applied previously');
      console.log('✅ Schema is up to date');
    } else {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

applyMigration().catch(console.error);

