import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://cerply:cerply@localhost:5432/cerply'
});

await client.connect();

const result = await client.query(`
  SELECT content
  FROM module_sections
  WHERE module_id = 'a2e11d06-5db5-4a31-a0ef-cc6fbdcd7e25'
  LIMIT 1
`);

if (result.rows[0]) {
  console.log('\n📄 Content preview (first 1000 chars):');
  console.log(result.rows[0].content.substring(0, 1000));
  console.log('\n...\n');
}

await client.end();
