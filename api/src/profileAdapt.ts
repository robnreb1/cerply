export type AdaptModule = { id: string; title: string; estMinutes: number };

/**
 * Apply simple, deterministic adaptations to a planned module list
 * based on learner preferences. Keeps ordering stable and avoids
 * introducing template-y output by only tweaking titles or appending
 * one clearly named module where helpful.
 */
export function adaptModulesForProfile(
  modules: AdaptModule[],
  prefs?: Record<string, any>
): AdaptModule[] {
  if (!Array.isArray(modules) || modules.length === 0) return modules;
  const out: AdaptModule[] = modules.map(m => ({ id: m.id, title: m.title, estMinutes: clamp(m.estMinutes, 5, 25) }));

  const level = String(prefs?.level ?? '').toLowerCase();
  const preferRefresher = !!prefs?.preferRefresher || !!prefs?.prefersRefresher;
  const focus = typeof prefs?.focus === 'string' && prefs!.focus!.trim().length > 0 ? String(prefs!.focus).trim() : '';

  // Beginner: nudge first module toward Foundations
  if (level === 'beginner') {
    const first = out[0];
    if (first && !/foundations|basics|intro/i.test(first.title)) {
      first.title = `Foundations: ${first.title}`.slice(0, 96);
    }
  }

  // Prefer refresher: ensure a Review & Practice module exists at the end
  if (preferRefresher) {
    const exists = out.some(m => /review\s*&\s*practice|review|practice/i.test(m.title));
    if (!exists) {
      out.push({ id: nextId(out, 'mod'), title: 'Review & Practice', estMinutes: 10 });
    }
  }

  // Explicit focus: add a Focus module if missing
  if (focus) {
    const focusTitle = `Focus: ${focus[0].toUpperCase()}${focus.slice(1)}`.slice(0, 96);
    const exists = out.some(m => m.title.toLowerCase() === focusTitle.toLowerCase());
    if (!exists) {
      out.push({ id: nextId(out, 'mod'), title: focusTitle, estMinutes: 10 });
    }
  }

  return out;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo));
}

function nextId(arr: AdaptModule[], prefix: string): string {
  const max = arr.reduce((acc, m) => {
    const mnum = String(m.id || '').startsWith(`${prefix}-`) ? parseInt(String(m.id).split('-')[1] || '0', 10) : 0;
    return Number.isFinite(mnum) ? Math.max(acc, mnum) : acc;
  }, 0);
  const next = String((max || 0) + 1).padStart(2, '0');
  return `${prefix}-${next}`;
}


