#!/usr/bin/env node

const { Pool } = require('pg');

async function checkUsersTable() {
  const databaseUrl = process.env.DATABASE_URL;
  const pool = new Pool({ 
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('users table structure:');
    result.rows.forEach(c => {
      console.log(`  ${c.column_name}: ${c.data_type} ${c.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Check for primary key
    const pkResult = await pool.query(`
      SELECT a.attname
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = 'users'::regclass AND i.indisprimary
    `);
    
    console.log('\nPrimary key:',pkResult.rows.map(r => r.attname).join(', '));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsersTable();

