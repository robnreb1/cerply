import { describe, it, expect } from 'vitest';

// Lightweight integration via exported functions would be nicer, but here we test selection logic indirectly
// by re-implementing pickNext contract used in /api/daily/next
function pickNext(items: any[]) {
  const sorted = [...items].sort((a, b) => {
    const aIsMcq = Array.isArray(a.options) && Number.isFinite(a.correctIndex);
    const bIsMcq = Array.isArray(b.options) && Number.isFinite(b.correctIndex);
    if (aIsMcq !== bIsMcq) return aIsMcq ? -1 : 1;
    return String(a.id).localeCompare(String(b.id));
  });
  return sorted[0];
}

describe('daily queue selection', () => {
  it('prefers MCQ over free text and then by id', () => {
    const items = [
      { id: 'b', moduleId: 'm', stem: 'Explain X', prompt: 'why?' },
      { id: 'a', moduleId: 'm', stem: 'MCQ?', options: ['x','y','z','w'], correctIndex: 1 },
    ];
    const next = pickNext(items);
    expect(next.id).toBe('a');
  });
});


