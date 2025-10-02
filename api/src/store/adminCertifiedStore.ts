import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

type Row = { type: 'source'|'item'|'audit'; data: any };

const STORE_DIR = path.join(process.cwd(), 'api', 'store');
const FILE = path.join(STORE_DIR, 'admin-certified.ndjson');

function ensureFile() {
  try { fs.mkdirSync(STORE_DIR, { recursive: true }); } catch {}
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, '');
}

export function append(row: Row): void {
  ensureFile();
  const line = JSON.stringify({ ...row, ts: new Date().toISOString() }) + '\n';
  fs.appendFileSync(FILE, line, 'utf8');
}

export function list(type?: Row['type']): any[] {
  ensureFile();
  const out: any[] = [];
  const text = fs.readFileSync(FILE, 'utf8');
  for (const line of text.split(/\n/)) {
    const s = line.trim();
    if (!s) continue;
    try {
      const obj = JSON.parse(s);
      if (!type || obj.type === type) out.push(obj.data);
    } catch {}
  }
  return out;
}

export function upsertIndex<T extends { id: string }>(type: Row['type']): Map<string, T> {
  const idx = new Map<string, T>();
  for (const row of list(type)) {
    idx.set(row.id, row);
  }
  return idx;
}

export function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function sha256Hex(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}


