"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { apiBase } from '../../../../lib/apiBase';
import { postCertifiedPlan, type PlanResponse } from '../../../../lib/api/generated';
import { toDeck } from '../../../../lib/study/presenter';
import { hashInput } from '../../../../lib/study/hash';
import { attachHotkeys } from '../../../../lib/study/hotkeys';
import * as session from '../../../../lib/study/session';

type FormInput = { topic: string; level?: 'beginner'|'intermediate'|'advanced'|''; goals?: string };

export default function StudyRunnerPage() {
  if (process.env.NEXT_PUBLIC_PREVIEW_CERTIFIED_UI !== 'true') {
    return (
      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>Certified Study Runner</h1>
        <p>Preview disabled. Set NEXT_PUBLIC_PREVIEW_CERTIFIED_UI=true to enable.</p>
      </div>
    );
  }

  const [inp, setInp] = useState<FormInput>({ topic: '', level: '', goals: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resp, setResp] = useState<PlanResponse | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [idx, setIdx] = useState(0);
  const [order, setOrder] = useState<number[]>([]);
  const flipBtnRef = useRef<HTMLButtonElement | null>(null);

  const hash = useMemo(() => hashInput({ topic: inp.topic, level: inp.level || undefined, goals: (inp.goals || '').split(',').map(s=>s.trim()).filter(Boolean) }), [inp.topic, inp.level, inp.goals]);
  const deck = useMemo(() => resp ? toDeck(resp) : { title: '', cards: [] }, [resp]);

  // Restore session when deck changes
  useEffect(() => {
    if (deck.cards.length === 0) return;
    const s = session.load(hash);
    if (s) {
      setIdx(Math.min(Math.max(0, s.idx), deck.cards.length - 1));
      setFlipped(!!s.flipped);
      if (Array.isArray(s.order) && s.order.length === deck.cards.length) setOrder(s.order);
    } else {
      setIdx(0); setFlipped(false); setOrder(Array.from({ length: deck.cards.length }, (_, i) => i));
    }
  }, [hash, deck.cards.length]);

  // Persist session
  useEffect(() => {
    if (deck.cards.length === 0) return;
    session.save(hash, { idx, flipped, order });
  }, [hash, deck.cards.length, idx, flipped, order]);

  // Hotkeys
  useEffect(() => {
    const detach = attachHotkeys(document, {
      flip: () => setFlipped((x) => !x),
      next: () => nextCard(),
      prev: () => prevCard(),
      reset: () => onReset(),
    });
    return detach;
  }, [idx, order, deck.cards.length]);

  const onSubmit = async () => {
    setLoading(true); setError(null); setResp(null);
    try {
      const goalsArr = (inp.goals || '').split(',').map((s) => s.trim()).filter(Boolean);
      const r = await postCertifiedPlan(apiBase(), { topic: inp.topic, level: (inp.level || undefined) as any, goals: goalsArr.length ? goalsArr : undefined });
      setResp(r.json as any);
      if (r.status === 415) setError('Unsupported media type: send JSON (application/json).');
      else if (r.status === 400) setError('Bad request: include a non-empty topic.');
      else if (r.status === 501) setError('Certified is enabled but not implemented yet.');
      else if (r.status === 503) setError('Cerply Certified is disabled.');
    } catch (e) {
      setError(String((e as any)?.message || e));
    } finally { setLoading(false); }
  };

  const nextCard = () => {
    if (deck.cards.length === 0) return;
    setFlipped(false);
    setIdx((i) => Math.min(order.length - 1, i + 1));
    setTimeout(() => flipBtnRef.current?.focus(), 0);
  };
  const prevCard = () => {
    if (deck.cards.length === 0) return;
    setFlipped(false);
    setIdx((i) => Math.max(0, i - 1));
    setTimeout(() => flipBtnRef.current?.focus(), 0);
  };
  const onReset = () => {
    session.reset(hash);
    setIdx(0); setFlipped(false); setOrder(Array.from({ length: deck.cards.length }, (_, i) => i));
    setTimeout(() => flipBtnRef.current?.focus(), 0);
  };
  const onShuffle = () => {
    const arr = Array.from({ length: deck.cards.length }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    setOrder(arr); setIdx(0); setFlipped(false);
  };

  const progressPct = deck.cards.length ? Math.round(((idx + 1) / deck.cards.length) * 100) : 0;

  return (
    <div style={{ padding: 16, display: 'grid', gap: 16 }}>
      <h1 style={{ fontSize: 18, fontWeight: 600 }}>Certified Study Runner</h1>
      {/* Form */}
      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 180px 1fr auto' }}>
        <input aria-label="Topic" value={inp.topic} onChange={(e)=>setInp(v=>({...v, topic:e.target.value}))} placeholder="Topic (required)" style={{ padding:'8px 10px', border:'1px solid #ccc', borderRadius:8 }} />
        <select aria-label="Level" value={inp.level} onChange={(e)=>setInp(v=>({...v, level:e.target.value as any}))} style={{ padding:'8px 10px', border:'1px solid #ccc', borderRadius:8 }}>
          <option value="">Level (optional)</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <input aria-label="Goals" value={inp.goals} onChange={(e)=>setInp(v=>({...v, goals:e.target.value}))} placeholder="Goals (comma-separated)" style={{ padding:'8px 10px', border:'1px solid #ccc', borderRadius:8 }} />
        <button aria-label="Submit" onClick={onSubmit} disabled={loading || !inp.topic.trim()} style={{ padding:'8px 12px', border:'1px solid #ccc', borderRadius:8 }}>{loading?'Submitting…':'Start'}</button>
      </div>
      {error && <div role="alert" style={{ padding: 8, background: '#fff3cd', border:'1px solid #ffe2a1', borderRadius:8 }}>{error}</div>}

      {/* Runner */}
      {deck.cards.length > 0 && (
        <div style={{ display:'grid', gap:12 }}>
          <div aria-label="Progress" style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ flex:1, height:8, background:'#eee', borderRadius:8 }}>
              <div style={{ width:`${progressPct}%`, height:8, background:'#4ade80', borderRadius:8 }} />
            </div>
            <div style={{ fontSize:12 }}>{idx+1}/{deck.cards.length} ({progressPct}%)</div>
          </div>
          <div style={{ border:'1px solid #ddd', borderRadius:12, padding:16, minHeight:120 }} aria-live="polite">
            <div style={{ fontWeight:600, marginBottom:8 }}>{deck.title}</div>
            <div>
              {!flipped ? (
                <div aria-label="Card front">{deck.cards[order[idx]]?.front}</div>
              ) : (
                <div aria-label="Card back">{deck.cards[order[idx]]?.back}</div>
              )}
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button aria-label="Prev" onClick={prevCard} style={{ padding:'6px 10px', border:'1px solid #ccc', borderRadius:8 }}>Prev ←</button>
            <button aria-label="Flip" ref={flipBtnRef} onClick={()=>setFlipped(x=>!x)} style={{ padding:'6px 10px', border:'1px solid #ccc', borderRadius:8 }}>Flip ⎵</button>
            <button aria-label="Next" onClick={nextCard} style={{ padding:'6px 10px', border:'1px solid #ccc', borderRadius:8 }}>Next →</button>
            <button aria-label="Reset" onClick={onReset} style={{ padding:'6px 10px', border:'1px solid #ccc', borderRadius:8 }}>Reset (R)</button>
            <button aria-label="Shuffle" onClick={onShuffle} style={{ padding:'6px 10px', border:'1px solid #ccc', borderRadius:8 }}>Shuffle</button>
          </div>
        </div>
      )}
    </div>
  );
}


