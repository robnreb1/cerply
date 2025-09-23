// web/lib/study/session.ts
const KEY = 'study:session:';

export type SessionState = { idx: number; flipped: boolean; order: number[]; snapshot?: any };

export function load(hash: string): SessionState | null {
  try {
    const raw = localStorage.getItem(KEY + hash);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function save(hash: string, state: SessionState) {
  try { localStorage.setItem(KEY + hash, JSON.stringify(state)); } catch {}
}

export function reset(hash: string) {
  try { localStorage.removeItem(KEY + hash); } catch {}
}


