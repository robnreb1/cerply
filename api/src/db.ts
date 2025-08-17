import pg from 'pg';
const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://cerply:cerply@db:5432/cerply',
});

export async function query<T = any>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> {
  const res = await pool.query(sql, params as any);
  return { rows: res.rows as unknown as T[] };
}

export async function single<T = any>(sql: string, params?: unknown[]) {
  const { rows } = await query<T>(sql, params);
  return rows[0] ?? null;
}
