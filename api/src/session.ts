import type { FastifyRequest } from 'fastify';
import crypto from 'node:crypto';

type SessionRecord = {
  id: string;
  csrfToken: string;
  createdAt: number;
  expiresAt: number;
};

const DEFAULT_TTL_SECONDS = parseInt(process.env.AUTH_SESSION_TTL_SECONDS || '604800', 10) || 604800;

// In-memory store fallback
const MEM: Map<string, SessionRecord> = new Map();

// Optional Redis (ioredis) backing store
let redis: any = null as any;
try {
  const url = process.env.REDIS_URL || '';
  if (url) {
    const Redis = require('ioredis');
    redis = new Redis(url);
  }
} catch {
  redis = null;
}

function nowSec(): number { return Math.floor(Date.now() / 1000); }

export function generateId(bytes = 24): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export async function createSession(ttlSeconds: number = DEFAULT_TTL_SECONDS): Promise<SessionRecord> {
  const id = generateId(24);
  const csrfToken = generateId(16);
  const createdAt = Date.now();
  const expiresAt = createdAt + ttlSeconds * 1000;
  const rec: SessionRecord = { id, csrfToken, createdAt, expiresAt };
  if (redis) {
    try {
      await redis.setex(`sess:${id}`, ttlSeconds, JSON.stringify(rec));
    } catch {
      MEM.set(id, rec);
    }
  } else {
    MEM.set(id, rec);
  }
  return rec;
}

export async function getSession(id: string | undefined | null): Promise<SessionRecord | null> {
  if (!id) return null;
  const t = Date.now();
  if (redis) {
    try {
      const txt = await redis.get(`sess:${id}`);
      if (!txt) return null;
      const rec = JSON.parse(txt) as SessionRecord;
      if (rec.expiresAt <= t) return null;
      return rec;
    } catch {
      /* fallthrough to memory */
    }
  }
  const rec = MEM.get(id) || null;
  if (!rec) return null;
  if (rec.expiresAt <= t) { MEM.delete(id); return null; }
  return rec;
}

export async function deleteSession(id: string | undefined | null): Promise<boolean> {
  if (!id) return false;
  let ok = false;
  if (redis) {
    try { const n = await redis.del(`sess:${id}`); ok = ok || n > 0; } catch {}
  }
  if (MEM.delete(id)) ok = true;
  return ok;
}

export function readCookie(req: FastifyRequest, name: string): string | undefined {
  const parsed = (req as any).cookies?.[name];
  if (typeof parsed === 'string') return parsed;
  const raw = String((req.headers as any)['cookie'] || '');
  const parts = raw.split(/;\s*/).map(s => s.trim()).filter(Boolean);
  for (const p of parts) {
    const idx = p.indexOf('=');
    if (idx > 0) {
      const k = p.slice(0, idx);
      const v = p.slice(idx + 1);
      if (k === name) return v;
    }
  }
  return undefined;
}

export type { SessionRecord };


