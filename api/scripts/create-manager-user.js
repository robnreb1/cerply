#!/usr/bin/env node

/**
 * Create a test manager user for Epic 14 UAT testing
 */

const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not set');
  console.error('Usage: DATABASE_URL=postgresql://... node create-manager-user.js');
  process.exit(1);
}

function isRenderHost(urlString) {
  try {
    const parsed = new URL(urlString);
    const hostname = parsed.hostname;
    return hostname === 'render.com' || hostname.endsWith('.render.com');
  } catch (e) {
    return false;
  }
}

async function createManagerUser() {
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: isRenderHost(databaseUrl) ? {
      rejectUnauthorized: false
    } : undefined
  });

  try {
    console.log('🔧 Creating test manager user for Epic 14...');
    
    const managerId = '00000000-0000-0000-0000-000000000002';
    const managerEmail = 'manager@cerply-staging.local';
    
    // Check if user already exists
    const checkResult = await pool.query(
      'SELECT id, email, role FROM users WHERE id = $1',
      [managerId]
    );
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Manager user already exists:');
      console.log('   ID:', checkResult.rows[0].id);
      console.log('   Email:', checkResult.rows[0].email);
      console.log('   Role:', checkResult.rows[0].role);
      
      // Update role to manager if needed
      if (checkResult.rows[0].role !== 'manager') {
        await pool.query(
          'UPDATE users SET role = $1 WHERE id = $2',
          ['manager', managerId]
        );
        console.log('✅ Updated role to manager');
      }
      
      await pool.end();
      return;
    }

    // Create new manager user
    await pool.query(
      `INSERT INTO users (id, email, role, created_at, updated_at) 
       VALUES ($1, $2, $3, NOW(), NOW())`,
      [managerId, managerEmail, 'manager']
    );
    
    console.log('✅ Manager user created successfully!');
    console.log('');
    console.log('📋 Login Credentials:');
    console.log('   Email:', managerEmail);
    console.log('   ID:', managerId);
    console.log('   Role: manager');
    console.log('');
    console.log('🌐 Use this email to login at: https://stg.cerply.com');
    console.log('');
    console.log('⚠️  Note: For Clerk authentication, you may need to:');
    console.log('   1. Create this user in Clerk dashboard first');
    console.log('   2. Or use SSO bypass if configured');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error creating manager user:', error.message);
    await pool.end();
    process.exit(1);
  }
}

createManagerUser();

