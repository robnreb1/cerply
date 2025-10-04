import crypto from 'node:crypto';

// Canonicalize JSON with stable key order and without volatile fields
export function canonicalizePlan(plan: any): { json: string; bytes: number } {
  function stable(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(stable);
    const keys = Object.keys(obj).filter(k => k !== '__meta' && k !== '_debug');
    keys.sort();
    const out: Record<string, any> = {};
    for (const k of keys) out[k] = stable(obj[k]);
    return out;
  }
  const normalized = stable(plan);
  const json = JSON.stringify(normalized);
  return { json, bytes: Buffer.byteLength(json, 'utf8') };
}

export function computeLock(plan: any): { algo: 'blake3' | 'sha256'; hash: string; canonical_bytes: number } {
  const { json, bytes } = canonicalizePlan(plan);
  // Prefer blake3 if available (node >=20 may not have it by default)
  try {
    const h = (crypto as any).createHash('blake3');
    h.update(json);
    const digest = h.digest('hex');
    return { algo: 'blake3', hash: digest, canonical_bytes: bytes };
  } catch {
    const h = crypto.createHash('sha256');
    h.update(json);
    const digest = h.digest('hex');
    return { algo: 'sha256', hash: digest, canonical_bytes: bytes };
  }
}

export function computeLockWithAlgo(plan: any, algo: 'blake3' | 'sha256'): { algo: 'blake3' | 'sha256'; hash: string; canonical_bytes: number } {
  const { json, bytes } = canonicalizePlan(plan);
  
  if (algo === 'blake3') {
    try {
      const h = (crypto as any).createHash('blake3');
      h.update(json);
      const digest = h.digest('hex');
      return { algo: 'blake3', hash: digest, canonical_bytes: bytes };
    } catch {
      // Fallback to sha256 if blake3 fails
      const h = crypto.createHash('sha256');
      h.update(json);
      const digest = h.digest('hex');
      return { algo: 'sha256', hash: digest, canonical_bytes: bytes };
    }
  } else {
    const h = crypto.createHash('sha256');
    h.update(json);
    const digest = h.digest('hex');
    return { algo: 'sha256', hash: digest, canonical_bytes: bytes };
  }
}


