/**
 * Canon Store - Content Canonization and Reuse System
 * 
 * Quality-first content generation: Generate once with high quality, then reuse.
 * In-memory LRU cache with optional JSON persistence.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export type ContentBody = {
  title: string;
  summary: string;
  modules?: Array<{
    id: string;
    title: string;
    description?: string;
    items?: Array<{ id: string; prompt: string; type?: string }>;
  }>;
  items?: Array<{ id: string; prompt: string; answer?: string }>;
};

export type QualityMetrics = {
  coherence: number;
  coverage: number;
  factualAccuracy: number;
  pedagogicalSoundness: number;
  overall: number;
};

export type CanonRecord = {
  id: string;
  key: string;
  artifact: ContentBody;
  sha256: string;
  model: string;
  quality_score: number;
  quality_metrics?: QualityMetrics;
  created_at: string;
  accessed_at: string;
  access_count: number;
};

/**
 * Generate stable key from request payload
 */
export function keyFrom(payload: any): string {
  const normalized = {
    prompt: String(payload.content || payload.topic || payload.brief || '').trim().toLowerCase(),
    policy_id: payload.policy_id || 'default',
    type: payload.type || 'module',
  };
  
  const canonical = JSON.stringify(normalized, Object.keys(normalized).sort());
  return crypto.createHash('sha256').update(canonical).digest('hex').substring(0, 16);
}

/**
 * In-memory LRU Canon Store
 */
class CanonStore {
  private store: Map<string, CanonRecord>;
  private maxSize: number;
  private persistPath?: string;
  private enabled: boolean;

  constructor(maxSize = 1000) {
    this.store = new Map();
    this.maxSize = maxSize;
    this.enabled = process.env.CANON_ENABLED === 'true';
    this.persistPath = process.env.CANON_PERSIST_PATH;
    
    if (this.persistPath && this.enabled) {
      this.load();
    }
  }

  private load() {
    if (!this.persistPath) return;
    
    try {
      if (fs.existsSync(this.persistPath)) {
        const data = fs.readFileSync(this.persistPath, 'utf-8');
        const records: CanonRecord[] = JSON.parse(data);
        records.forEach(rec => this.store.set(rec.key, rec));
        console.log(`[canon] Loaded ${records.length} records from ${this.persistPath}`);
      }
    } catch (err) {
      console.error('[canon] Failed to load persisted store:', err);
    }
  }

  private persist() {
    if (!this.persistPath || !this.enabled) return;
    
    try {
      const dir = path.dirname(this.persistPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const records = Array.from(this.store.values());
      fs.writeFileSync(this.persistPath, JSON.stringify(records, null, 2));
    } catch (err) {
      console.error('[canon] Failed to persist store:', err);
    }
  }

  private evict() {
    if (this.store.size <= this.maxSize) return;
    
    // LRU eviction: remove oldest accessed
    const sorted = Array.from(this.store.entries())
      .sort((a, b) => new Date(a[1].accessed_at).getTime() - new Date(b[1].accessed_at).getTime());
    
    const toRemove = sorted.slice(0, this.store.size - this.maxSize);
    toRemove.forEach(([key]) => this.store.delete(key));
    
    console.log(`[canon] Evicted ${toRemove.length} LRU entries`);
  }

  getByKey(key: string): CanonRecord | null {
    if (!this.enabled) return null;
    
    const record = this.store.get(key);
    if (!record) return null;
    
    // Update access tracking
    record.accessed_at = new Date().toISOString();
    record.access_count += 1;
    this.store.set(key, record);
    
    return record;
  }

  put(record: Omit<CanonRecord, 'id' | 'accessed_at' | 'access_count'>): CanonRecord {
    if (!this.enabled) {
      // Return a mock record even when disabled so callers don't break
      return {
        ...record,
        id: crypto.randomUUID(),
        accessed_at: record.created_at,
        access_count: 0,
      };
    }
    
    const full: CanonRecord = {
      ...record,
      id: crypto.randomUUID(),
      accessed_at: record.created_at,
      access_count: 0,
    };
    
    this.store.set(record.key, full);
    this.evict();
    this.persist();
    
    return full;
  }

  getStats() {
    return {
      size: this.store.size,
      maxSize: this.maxSize,
      enabled: this.enabled,
      persistPath: this.persistPath,
    };
  }

  // Test helpers
  clear() {
    this.store.clear();
  }

  getAllKeys(): string[] {
    return Array.from(this.store.keys());
  }
}

// Singleton instance
export const canonStore = new CanonStore();

/**
 * Retrieve canonical content by key
 */
export function retrieveCanonicalContent(key: string): CanonRecord | null {
  return canonStore.getByKey(key);
}

/**
 * Search for canonical content (for now, exact key match; future: semantic search)
 */
export function searchCanonicalContent(query: string): CanonRecord[] {
  const key = keyFrom({ content: query });
  const record = canonStore.getByKey(key);
  return record ? [record] : [];
}

/**
 * Store content as canonical
 */
export function canonizeContent(
  artifact: ContentBody,
  metadata: { model: string; quality_score: number; quality_metrics?: QualityMetrics },
  payload: any
): CanonRecord {
  const key = keyFrom(payload);
  const sha256 = crypto.createHash('sha256').update(JSON.stringify(artifact)).digest('hex');
  
  return canonStore.put({
    key,
    artifact,
    sha256,
    model: metadata.model,
    quality_score: metadata.quality_score,
    quality_metrics: metadata.quality_metrics,
    created_at: new Date().toISOString(),
  });
}

/**
 * Check if content exists in canon
 */
export function contentExists(key: string): boolean {
  return canonStore.getByKey(key) !== null;
}

/**
 * Evaluate content quality (heuristic)
 */
export function evaluateContentQuality(artifact: ContentBody): QualityMetrics {
  let coherence = 0.85;
  let coverage = 0.85;
  let factualAccuracy = 0.85;
  let pedagogicalSoundness = 0.85;

  // Check for required fields
  if (artifact.title && artifact.title.length > 10) coverage += 0.05;
  if (artifact.summary && artifact.summary.length > 50) coverage += 0.05;
  if (artifact.modules && artifact.modules.length >= 3) coverage += 0.05;

  // Penalize forbidden/template phrases
  const forbiddenPhrases = [
    'getting started',
    'key principles',
    'practical applications',
    'introduction to',
    'basic concepts',
  ];
  
  const fullText = JSON.stringify(artifact).toLowerCase();
  const hasForbidden = forbiddenPhrases.some(phrase => fullText.includes(phrase));
  if (hasForbidden) {
    coherence -= 0.15;
    pedagogicalSoundness -= 0.15;
  }

  // Reward specificity (unique tokens)
  const tokens = fullText.split(/\s+/);
  const uniqueRatio = new Set(tokens).size / tokens.length;
  if (uniqueRatio > 0.6) {
    coherence += 0.05;
    factualAccuracy += 0.05;
  }

  const overall = (coherence + coverage + factualAccuracy + pedagogicalSoundness) / 4;

  return {
    coherence: Math.max(0, Math.min(1, coherence)),
    coverage: Math.max(0, Math.min(1, coverage)),
    factualAccuracy: Math.max(0, Math.min(1, factualAccuracy)),
    pedagogicalSoundness: Math.max(0, Math.min(1, pedagogicalSoundness)),
    overall: Math.max(0, Math.min(1, overall)),
  };
}

/**
 * Get canon statistics
 */
export function getCanonStats() {
  return canonStore.getStats();
}

// Test helper: clear canon store
export function clearCanonStore() {
  canonStore.clear();
}
