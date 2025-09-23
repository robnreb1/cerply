export type StudyState = { idx: number; flipped: boolean; order: number[] };

function keyFromHash(hash: string) { return `cert:plan:${hash}`; }

export function load(hash: string): StudyState | null {
  if (typeof window === 'undefined') return null;
  try { const s = window.localStorage.getItem(keyFromHash(hash)); return s ? JSON.parse(s) as StudyState : null; } catch { return null; }
}

export function save(hash: string, state: StudyState) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(keyFromHash(hash), JSON.stringify(state)); } catch {}
}

export function reset(hash: string) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(keyFromHash(hash)); } catch {}
}


