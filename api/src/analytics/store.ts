import { mkdirSync, appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AnalyticsEvent } from '../schemas/analytics';

export interface AnalyticsStore {
  insertMany(events: AnalyticsEvent[]): Promise<void>;
  aggregate(from?: string, to?: string): Promise<{ by_event: Record<string, number>; by_day: Array<{ day: string, count: number }>; engines?: Record<string, number>; topics?: Record<string, number> }>;
}

const DATA_DIR = join(__dirname, '..', '..', '.data');
const NDJSON = join(DATA_DIR, 'analytics.ndjson');

function dayKey(iso: string): string { return new Date(iso).toISOString().slice(0,10); }

class NdjsonStore implements AnalyticsStore {
  constructor() { mkdirSync(DATA_DIR, { recursive: true }); if (!existsSync(NDJSON)) writeFileSync(NDJSON, ''); }
  async insertMany(events: AnalyticsEvent[]): Promise<void> {
    const lines = events.map(e => JSON.stringify(e)).join('\n') + '\n';
    appendFileSync(NDJSON, lines, 'utf8');
  }
  async aggregate(from?: string, to?: string) {
    const fromMs = from ? Date.parse(from) : 0;
    const toMs = to ? Date.parse(to) : Number.MAX_SAFE_INTEGER;
    const by_event: Record<string, number> = {};
    const by_day: Array<{ day: string, count: number }> = [];
    const byDayMap: Record<string, number> = {};
    const engines: Record<string, number> = {};
    const topics: Record<string, number> = {};
    const raw = existsSync(NDJSON) ? readFileSync(NDJSON, 'utf8') : '';
    for (const ln of raw.split(/\r?\n/)) {
      if (!ln.trim()) continue;
      try {
        const e = JSON.parse(ln) as AnalyticsEvent;
        const t = Date.parse(e.ts);
        if (Number.isNaN(t) || t < fromMs || t > toMs) continue;
        by_event[e.event] = (by_event[e.event] || 0) + 1;
        const dk = dayKey(e.ts);
        byDayMap[dk] = (byDayMap[dk] || 0) + 1;
        if (e.context?.engine) engines[e.context.engine] = (engines[e.context.engine] || 0) + 1;
        if (e.context?.topic) topics[e.context.topic] = (topics[e.context.topic] || 0) + 1;
      } catch {}
    }
    for (const [day, count] of Object.entries(byDayMap).sort()) by_day.push({ day, count });
    const out: any = { by_event, by_day };
    if (Object.keys(engines).length) out.engines = engines;
    if (Object.keys(topics).length) out.topics = topics;
    return out;
  }
}

export function createAnalyticsStore(): AnalyticsStore {
  // SQLite path can be added later; default to NDJSON for preview/CI
  return new NdjsonStore();
}
