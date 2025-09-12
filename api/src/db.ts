import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const connectionString = process.env.DATABASE_URL || '';
export const pool = new Pool({ connectionString });
export const db = drizzle(pool);

export async function query<T = any>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> {
  const res = await pool.query(sql, params as any);
  return { rows: res.rows as unknown as T[] };
}

export async function single<T = any>(sql: string, params?: unknown[]) {
  const { rows } = await query<T>(sql, params);
  return rows[0] ?? null;
}
