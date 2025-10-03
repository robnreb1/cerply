// NDJSON-backed Admin Certified Store (original v0 implementation)
// EPIC #55: Refactored to implement common interface

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  AdminCertifiedStore,
  AdminSource,
  AdminItem,
  AdminAuditEvent,
  ListItemsOptions,
  ListSourcesOptions,
  ListItemsResult,
  ListSourcesResult,
} from './adminCertifiedStore.interface';

type Row = { type: 'source' | 'item' | 'audit'; data: any };

const STORE_DIR = path.join(process.cwd(), 'api', 'store');
const FILE = path.join(STORE_DIR, 'admin-certified.ndjson');

function ensureFile() {
  try {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  } catch {}
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, '');
}

function append(row: Row): void {
  ensureFile();
  const line = JSON.stringify({ ...row, ts: new Date().toISOString() }) + '\n';
  fs.appendFileSync(FILE, line, 'utf8');
}

function list(type?: Row['type']): any[] {
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

function upsertIndex<T extends { id: string }>(type: Row['type']): Map<string, T> {
  const idx = new Map<string, T>();
  for (const row of list(type)) {
    idx.set(row.id, row);
  }
  return idx;
}

export class NDJsonAdminCertifiedStore implements AdminCertifiedStore {
  async createSource(data: Omit<AdminSource, 'id' | 'createdAt'>): Promise<AdminSource> {
    const id = makeId('src');
    const row: AdminSource = { id, ...data, createdAt: new Date().toISOString() };
    append({ type: 'source', data: row });
    return row;
  }

  async listSources(options?: ListSourcesOptions): Promise<ListSourcesResult> {
    const { q, page, limit } = options || {};
    const idx = upsertIndex<AdminSource>('source');
    let sources = Array.from(idx.values());

    // Filter by search query
    if (q) {
      const lowerQ = q.toLowerCase();
      sources = sources.filter(
        (s) => s.name.toLowerCase().includes(lowerQ) || s.url?.toLowerCase().includes(lowerQ)
      );
    }

    // Pagination
    const hasPage = typeof page === 'number' && page > 0;
    if (hasPage) {
      const take = Math.min(Math.max(1, limit || 20), 100);
      const skip = (page! - 1) * take;
      const total = sources.length;
      sources = sources.slice(skip, skip + take);
      return { sources, total, page: page!, limit: take };
    }

    return { sources };
  }

  async getSource(id: string): Promise<AdminSource | null> {
    const idx = upsertIndex<AdminSource>('source');
    return idx.get(id) || null;
  }

  async createItem(data: Omit<AdminItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<AdminItem> {
    const id = makeId('itm');
    const now = new Date().toISOString();
    const row: AdminItem = { id, ...data, createdAt: now, updatedAt: now };
    append({ type: 'item', data: row });
    return row;
  }

  async listItems(options?: ListItemsOptions): Promise<ListItemsResult> {
    const { status, sourceId, q, page, limit } = options || {};
    const idx = upsertIndex<AdminItem>('item');
    let items = Array.from(idx.values());

    // Filter by status
    if (status) {
      items = items.filter((i) => i.status === status);
    }

    // Filter by sourceId
    if (sourceId) {
      items = items.filter((i) => i.sourceId === sourceId);
    }

    // Filter by search query
    if (q) {
      const lowerQ = q.toLowerCase();
      items = items.filter(
        (i) => i.title?.toLowerCase().includes(lowerQ) || i.url.toLowerCase().includes(lowerQ)
      );
    }

    // Pagination
    const hasPage = typeof page === 'number' && page > 0;
    if (hasPage) {
      const take = Math.min(Math.max(1, limit || 20), 100);
      const skip = (page! - 1) * take;
      const total = items.length;
      items = items.slice(skip, skip + take);
      return { items, total, page: page!, limit: take };
    }

    return { items };
  }

  async getItem(id: string): Promise<AdminItem | null> {
    const idx = upsertIndex<AdminItem>('item');
    return idx.get(id) || null;
  }

  async updateItemStatus(id: string, status: AdminItem['status']): Promise<AdminItem | null> {
    const idx = upsertIndex<AdminItem>('item');
    const row = idx.get(id);
    if (!row) return null;

    const next = { ...row, status, updatedAt: new Date().toISOString() };
    append({ type: 'item', data: next });
    return next;
  }

  async logAudit(event: AdminAuditEvent): Promise<void> {
    append({ type: 'audit', data: event });
  }
}

function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function sha256Hex(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// Legacy exports for backward compatibility (will be deprecated)
export { append, list, upsertIndex, makeId };

