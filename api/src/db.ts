import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const rawUrl = process.env.DATABASE_URL || '';
// Normalize scheme for node-postgres and enable SSL for Render external DBs
const connectionString = rawUrl.replace(/^postgresql:\/\//i, 'postgres://');
const isExternalRender = /render\.com/i.test(connectionString);
const poolOpts: any = { connectionString };
if (isExternalRender) {
  poolOpts.ssl = { rejectUnauthorized: false };
}
export const pool = new Pool(poolOpts);
export const db = drizzle(pool);

export async function query<T = any>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> {
  const res = await pool.query(sql, params as any);
  return { rows: res.rows as unknown as T[] };
}

export async function single<T = any>(sql: string, params?: unknown[]) {
  const { rows } = await query<T>(sql, params);
  return rows[0] ?? null;
}
