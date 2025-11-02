import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://cerply:cerply@localhost:5432/cerply'
});

await client.connect();

const result = await client.query(`
  SELECT title, content, "order"
  FROM module_sections
  WHERE module_id = 'a2e11d06-5db5-4a31-a0ef-cc6fbdcd7e25'
  ORDER BY "order"
`);

console.log(`\n📄 Found ${result.rows.length} sections:\n`);
result.rows.forEach(row => {
  console.log(`Section ${row.order}: "${row.title}"`);
  console.log(`Content length: ${row.content?.length || 0} chars`);
  if (row.content) {
    console.log(`First 500 chars:`);
    console.log(row.content.substring(0, 500));
  }
  console.log('\n---\n');
});

await client.end();
