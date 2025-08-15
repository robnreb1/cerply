
import { Pool } from 'pg';
const connectionString = process.env.DATABASE_URL || 'postgres://cerply:cerply@db:5432/cerply';
export const pool = new Pool({ connectionString });
export async function query<T=any>(text: string, params?: any[]): Promise<{ rows: T[] }>{ return pool.query(text, params); }
