
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://cerply:cerply@db:5432/cerply' });
(async () => {
  const dir = join(process.cwd(), 'migrations');
  const files = (await readdir(dir)).filter(f => f.endsWith('.sql')).sort();
  for (const f of files) {
    const sql = await readFile(join(dir, f), 'utf-8');
    console.log('Applying migration:', f);
    await pool.query(sql);
  }
  await pool.end();
  console.log('Migrations complete.');
})().catch(e => { console.error(e); process.exit(1); });
