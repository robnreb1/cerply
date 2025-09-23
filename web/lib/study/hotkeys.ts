export type Handlers = { flip: () => void; next: () => void; prev: () => void; reset: () => void };

export function attachHotkeys(target: Document, h: Handlers) {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); h.flip(); }
    else if (e.key === 'ArrowRight') { h.next(); }
    else if (e.key === 'ArrowLeft') { h.prev(); }
    else if (e.key?.toLowerCase() === 'r') { h.reset(); }
  };
  target.addEventListener('keydown', onKey);
  return () => target.removeEventListener('keydown', onKey);
}


