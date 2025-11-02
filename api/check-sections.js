import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://cerply:cerply@localhost:5432/cerply'
});

await client.connect();

// Get most recent module
const modulesResult = await client.query(`
  SELECT id, title, created_at, updated_at 
  FROM modules 
  ORDER BY updated_at DESC 
  LIMIT 5
`);

console.log('\n📦 Most recent modules:');
modulesResult.rows.forEach((m, i) => {
  console.log(`${i + 1}. ${m.title} (ID: ${m.id.substring(0, 8)}...)`);
  console.log(`   Created: ${m.created_at}, Updated: ${m.updated_at}`);
});

if (modulesResult.rows.length > 0) {
  const latestModuleId = modulesResult.rows[0].id;
  
  // Check for sections
  const sectionsResult = await client.query(`
    SELECT id, title, "order"
    FROM module_sections 
    WHERE module_id = $1
    ORDER BY "order"
  `, [latestModuleId]);
  
  console.log(`\n📄 Sections for "${modulesResult.rows[0].title}":`);
  if (sectionsResult.rows.length === 0) {
    console.log('   ❌ NO SECTIONS FOUND');
  } else {
    sectionsResult.rows.forEach(s => {
      console.log(`   ${s.order}. ${s.title}`);
    });
  }
}

await client.end();
