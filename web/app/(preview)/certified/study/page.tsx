"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { apiBase } from '../../../../lib/apiBase';
import { postCertifiedPlan, type PlanResponse } from '../../../../lib/api/generated';
import { toDeck } from '../../../../lib/study/presenter';
import { hashInput } from '../../../../lib/study/hash';
import { attachHotkeys } from '../../../../lib/study/hotkeys';
import * as session from '../../../../lib/study/session';
import { schedule as retentionSchedule, getProgress as retentionGet, postProgress as retentionPost, type ScheduleRequest, type ProgressEvent } from '../../../../lib/study/retentionClient';

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
  const [showSettings, setShowSettings] = useState(false);
  const [dailyTarget, setDailyTarget] = useState<number>(() => {
    try { const v = localStorage.getItem('study:dailyTarget'); return v ? Math.max(1, Math.min(200, Number(v))) : 20; } catch { return 20; }
  });

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
      // Try resume from server snapshot if available
      (async () => {
        try {
          const r = await retentionGet(hash);
          const snap = r.status === 200 ? r.json : null;
          if (snap && Array.isArray(snap.items) && snap.items.length === deck.cards.length) {
            const idToIdx = new Map(deck.cards.map((c, i) => [c.id, i] as any));
            const ord = snap.items
              .slice()
              .sort((a:any,b:any)=> new Date(a.dueISO).getTime() - new Date(b.dueISO).getTime())
              .map((p:any)=> idToIdx.get(p.card_id) ?? 0);
            setOrder(ord); setIdx(0); setFlipped(false);
            session.save(hash, { idx: 0, flipped: false, order: ord, snapshot: snap });
            return;
          }
        } catch {}
        setIdx(0); setFlipped(false); setOrder(Array.from({ length: deck.cards.length }, (_, i) => i));
      })();
    }
  }, [hash, deck.cards.length]);

  // Persist session
  useEffect(() => {
    if (deck.cards.length === 0) return;
    session.save(hash, { idx, flipped, order });
  }, [hash, deck.cards.length, idx, flipped, order]);

  // Persist settings
  useEffect(() => { try { localStorage.setItem('study:dailyTarget', String(dailyTarget)); } catch {} }, [dailyTarget]);

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
      // After planning, request schedule ordering from retention (preview)
      try {
        const plan = (r.json as any);
        const items = plan?.plan?.items?.map((it: any) => ({ id: it.id, front: it.front, back: it.back })) || [];
        const now = new Date().toISOString();
        const req: ScheduleRequest = { session_id: hash, plan_id: plan?.plan?.title || 'plan', items, algo: 'sm2-lite', now };
        const s = await retentionSchedule(req);
        if (s.status === 200 && Array.isArray(s.json?.order) && s.json.order.length === items.length) {
          // map card ids to local indices
          const idToIdx = new Map(items.map((c: any, i: number) => [c.id, i]));
          const ord = s.json.order.map((cid: string) => idToIdx.get(cid) ?? 0);
          setOrder(ord); setIdx(0); setFlipped(false);
          session.save(hash, { idx: 0, flipped: false, order: ord, snapshot: s.json });
          await retentionPost({ session_id: hash, card_id: items[0]?.id || 'na', action: 'flip', at: now } as ProgressEvent);
        }
      } catch {}
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
      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 180px 1fr auto auto' }}>
        <input aria-label="Topic" value={inp.topic} onChange={(e)=>setInp(v=>({...v, topic:e.target.value}))} placeholder="Topic (required)" style={{ padding:'8px 10px', border:'1px solid #ccc', borderRadius:8 }} />
        <select aria-label="Level" value={inp.level} onChange={(e)=>setInp(v=>({...v, level:e.target.value as any}))} style={{ padding:'8px 10px', border:'1px solid #ccc', borderRadius:8 }}>
          <option value="">Level (optional)</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <input aria-label="Goals" value={inp.goals} onChange={(e)=>setInp(v=>({...v, goals:e.target.value}))} placeholder="Goals (comma-separated)" style={{ padding:'8px 10px', border:'1px solid #ccc', borderRadius:8 }} />
        <button aria-label="Submit" onClick={onSubmit} disabled={loading || !inp.topic.trim()} style={{ padding:'8px 12px', border:'1px solid #ccc', borderRadius:8 }}>{loading?'Submitting…':'Start'}</button>
        <button aria-label="Settings" onClick={()=>setShowSettings(x=>!x)} style={{ padding:'8px 12px', border:'1px solid #ccc', borderRadius:8 }}>Settings</button>
      </div>
      {error && <div role="alert" style={{ padding: 8, background: '#fff3cd', border:'1px solid #ffe2a1', borderRadius:8 }}>{error}</div>}

      {/* Runner */}
      {deck.cards.length > 0 && (
        <div style={{ display:'grid', gap:12 }}>
          {showSettings && (
            <div aria-label="Settings" style={{ display:'flex', gap:12, alignItems:'center', border:'1px solid #ddd', borderRadius:8, padding:8 }}>
              <div>Algo: <code>sm2-lite</code></div>
              <label style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span>Daily target</span>
                <input type="number" min={1} max={200} value={dailyTarget} onChange={(e)=>setDailyTarget(Math.max(1, Math.min(200, Number(e.target.value||'0'))))} style={{ width:80, padding:'6px 8px', border:'1px solid #ccc', borderRadius:6 }} />
              </label>
            </div>
          )}
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


