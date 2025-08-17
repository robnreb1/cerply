'use client';
import { useMemo, useRef, useState } from 'react';

type MCQItem = {
  id: string;
  stem: string;
  options: string[];      // length 4
  correctIndex: number;   // 0..3
  objectiveId?: string;   // optional for later rollups
};

type HistoryEntry = {
  itemId: string;
  chosenIndex: number;
  correct: boolean;
  ts: number;
};

export default function LearnPage() {
  // Seed input (so you can start fast), or paste your own chunks.
  const [chunks, setChunks] = useState<string>([
    'Cerply turns complex rules into simple habits — and proves it. Policies are decomposed into evidence collection steps.',
    'Adaptive learning: micro-quizzes reinforce key objectives, focusing on recent and weak areas.',
  ].join('\n'));

  const [countObjectives, setCountObjectives] = useState<number>(2);
  const [itemsPerObjective, setItemsPerObjective] = useState<number>(3);

  type Phase = 'idle' | 'loading' | 'practice';
const [phase, setPhase] = useState<Phase>('idle');
  
const isLoading = (phase as Phase) === 'loading';
const [items, setItems] = useState<MCQItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const lastItemId = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    setPhase('loading');
    setItems([]);
    setHistory([]);
    setPicked(null);
    lastItemId.current = null;

    try {
      const body = {
        chunks: chunks.split('\n').map(s => s.trim()).filter(Boolean),
        count_objectives: countObjectives,
        items_per_objective: itemsPerObjective,
      };
      const res = await fetch('http://localhost:8080/api/items/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? 'Request failed');
      const generated: MCQItem[] = data.items ?? [];
      setItems(generated);
      // Start on the best next item
      const idx = pickNextIndex(generated, history, lastItemId.current);
      setCurrentIdx(idx ?? 0);
      setPhase('practice');
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
      setPhase('idle');
    }
  }

  // Simple adaptive ranker:
  // score = base + wrongCount*3 + notSeenBonus + recencyDecay/bonus
  function pickNextIndex(pool: MCQItem[], hist: HistoryEntry[], prevId: string | null) {
    if (pool.length === 0) return 0;

    const byItem = new Map<string, HistoryEntry[]>();
    hist.forEach(h => {
      if (!byItem.has(h.itemId)) byItem.set(h.itemId, []);
      byItem.get(h.itemId)!.push(h);
    });

    const now = Date.now();

    const scores = pool.map((it, idx) => {
      const h = byItem.get(it.id) ?? [];
      const wrongCount = h.filter(x => !x.correct).length;
      const seen = h.length > 0;
      const lastTs = h.length ? h[h.length - 1].ts : 0;

      // recency factor (prefer revisiting after a bit, not immediately)
      const secondsSince = lastTs ? (now - lastTs) / 1000 : 999999;
      const recencyBonus = Math.min(secondsSince / 10, 10); // up to +10

      const notSeenBonus = seen ? 0 : 5;
      const avoidRepeatPenalty = it.id === prevId ? -10 : 0;

      const score = 1 + wrongCount * 3 + notSeenBonus + recencyBonus + avoidRepeatPenalty;
      return { idx, score };
    });

    scores.sort((a, b) => b.score - a.score);
    return scores[0]?.idx ?? 0;
  }

  const current = items[currentIdx];

  const progress = useMemo(() => {
    if (!items.length) return { correct: 0, total: 0 };
    const latestByItem = new Map<string, HistoryEntry>();
    history.forEach(h => latestByItem.set(h.itemId, h));
    let correct = 0;
    items.forEach(it => {
      const last = latestByItem.get(it.id);
      if (last?.correct) correct += 1;
    });
    return { correct, total: items.length };
  }, [items, history]);

  function submitAnswer() {
    if (picked == null || !current) return;
    const correct = picked === current.correctIndex;
    const entry: HistoryEntry = {
      itemId: current.id,
      chosenIndex: picked,
      correct,
      ts: Date.now(),
    };
    setHistory(h => [...h, entry]);
  }

  function nextQuestion() {
    if (!current) return;
    lastItemId.current = current.id;
    setPicked(null);
    const idx = pickNextIndex(items, history, lastItemId.current);
    if (idx != null) setCurrentIdx(idx);
  }

  return (
    <div style={{ maxWidth: 840, margin: '40px auto', padding: 16 }}>
      <h1>Learn</h1>

      {phase === 'idle' && (
        <>
          <p style={{ color: '#444' }}>
            Paste source chunks (one per line). We will generate objectives and MCQs,
            then start an adaptive practice loop that focuses on recent & weak areas.
          </p>

          <label style={{ display: 'block', margin: '16px 0 8px' }}>Chunks</label>
          <textarea
            value={chunks}
            onChange={e => setChunks(e.target.value)}
            rows={8}
            style={{ width: '100%' }}
            placeholder={`Line 1...\nLine 2...`}
          />

          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            <label>
              Objectives:&nbsp;
              <input
                type="number"
                min={1}
                max={20}
                value={countObjectives}
                onChange={e => setCountObjectives(parseInt(e.target.value || '1', 10))}
                style={{ width: 80 }}
              />
            </label>

            <label>
              Items / objective:&nbsp;
              <input
                type="number"
                min={1}
                max={10}
                value={itemsPerObjective}
                onChange={e => setItemsPerObjective(parseInt(e.target.value || '1', 10))}
                style={{ width: 80 }}
              />
            </label>

            <button onClick={start} disabled={isLoading}>
              {isLoading ? 'Starting…' : 'Start Practice'}
            </button>
          </div>

          {error && <div style={{ color: 'crimson', marginTop: 12 }}>{error}</div>}
        </>
      )}

      {phase === 'practice' && current && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <strong>Progress:</strong> {progress.correct}/{progress.total} mastered
            </div>
            <a href="/curate">Edit/Generate in Curate →</a>
          </div>

          <hr style={{ margin: '16px 0' }} />

          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
            {current.stem}
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {current.options.map((opt, idx) => {
              const chosen = picked === idx;
              return (
                <li key={idx} style={{ marginBottom: 8 }}>
                  <label style={{ cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="opt"
                      checked={chosen}
                      onChange={() => setPicked(idx)}
                      style={{ marginRight: 8 }}
                    />
                    {opt}
                  </label>
                </li>
              );
            })}
          </ul>

          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <button onClick={submitAnswer} disabled={picked == null}>Submit</button>
            <button onClick={nextQuestion}>Next</button>
          </div>

          {/* Feedback panel */}
          <FeedbackPanel
            item={current}
            picked={picked}
            last={history[history.length - 1]}
          />
        </>
      )}
    </div>
  );
}

function FeedbackPanel({
  item,
  picked,
  last,
}: {
  item?: MCQItem;
  picked: number | null;
  last?: HistoryEntry;
}) {
  if (!item) return null;

  const lastIsForThis = last && last.itemId === item.id;
  if (!lastIsForThis || picked == null) {
    return <div style={{ marginTop: 16, color: '#666' }}>Pick an option and submit to see feedback.</div>;
  }

  const correct = last.correct;
  const correctText = item.options[item.correctIndex];

  return (
    <div style={{
      marginTop: 16,
      padding: 12,
      border: '1px solid #ddd',
      borderRadius: 8,
      background: correct ? '#f0fff4' : '#fff5f5'
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>
        {correct ? '✅ Correct' : '❌ Not quite'}
      </div>
      <div>
        Correct answer: <strong>{correctText}</strong>
      </div>
      <div style={{ color: '#666', marginTop: 6 }}>
        {/* Placeholder explainer – later we’ll generate real explanations */}
        We’ll add tailored explanations per objective here.
      </div>
    </div>
  );
}
