#!/usr/bin/env node

/**
 * Create a test user for Epic 8 chat testing with admin token
 */

const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

function isRenderHost(urlString) {
  try {
    const parsed = new URL(urlString);
    const hostname = parsed.hostname;
    // Check if hostname is exactly 'render.com' or ends with '.render.com'
    return hostname === 'render.com' || hostname.endsWith('.render.com');
  } catch (e) {
    return false;
  }
}

async function createTestUser() {
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: isRenderHost(databaseUrl) ? {
      rejectUnauthorized: false
    } : undefined
  });

  try {
    console.log('🔧 Creating test user for Epic 8 chat...');
    
    const testUserId = '00000000-0000-0000-0000-000000000001';
    const testEmail = 'test-epic8@cerply.local';
    
    // Check if user already exists
    const checkResult = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [testUserId]
    );
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Test user already exists:', testUserId);
      return;
    }
    
    // Insert test user
    await pool.query(`
      INSERT INTO users (id, email, created_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (id) DO NOTHING
    `, [testUserId, testEmail]);
    
    console.log('✅ Test user created successfully!');
    console.log('   ID:', testUserId);
    console.log('   Email:', testEmail);
    
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

createTestUser()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

