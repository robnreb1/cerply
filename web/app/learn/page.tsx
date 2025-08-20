'use client';

import { useState } from 'react';

type Phase = 'idle' | 'loading' | 'practice';

type MCQItem = {
  id: string;
  stem: string;
  options: string[];
  correctIndex: number;
};

type NextResp = { sessionId: string; item: MCQItem };
type SubmitResp = { correct: boolean; correctIndex: number; explainer: string };

const API = 'http://localhost:8080';

export default function LearnPage() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [item, setItem] = useState<MCQItem | null>(null);
  const [answerIdx, setAnswerIdx] = useState<number | null>(null);
  const [result, setResult] = useState<SubmitResp | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setPhase('loading');
    setError(null);
    setResult(null);
    setAnswerIdx(null);
    try {
      const res = await fetch('/api/learn/next', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data: any = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? 'Request failed');
      setSessionId((data as NextResp).sessionId);
      setItem((data as NextResp).item);
      setPhase('practice');
    } catch (e: any) {
      setError(e.message || 'Failed to start');
      setPhase('idle');
    }
  }

  async function submit(idx: number) {
    if (!sessionId || !item) return;
    setAnswerIdx(idx);
    setError(null);

    try {
      const res = await fetch('/api/learn/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, itemId: item.id, answerIndex: idx }),
      });
      const data: any = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? 'Submit failed');
      setResult(data as SubmitResp);
    } catch (e: any) {
      setError(e.message || 'Submit failed');
    }
  }

  async function nextQuestion() {
    if (!sessionId) return;
    setResult(null);
    setAnswerIdx(null);
    try {
      const res = await fetch('/api/learn/next', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const data: any = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? 'Next failed');
      setItem((data as NextResp).item);
    } catch (e: any) {
      setError(e.message || 'Next failed');
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: '40px auto', padding: 16 }}>
      <h1>Learn</h1>

      {error && (
        <div style={{ color: 'crimson', margin: '8px 0 16px' }}>{error}</div>
      )}

      {(phase === 'idle' || phase === 'loading') && (
        <button onClick={start} disabled={phase === 'loading'}>
          {phase === 'loading' ? 'Starting…' : 'Start Practice'}
        </button>
      )}

      {phase === 'practice' && item && (
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, margin: '12px 0' }}>
            {item.stem}
          </div>
          <ol type="A" style={{ paddingLeft: 18 }}>
            {item.options.map((opt, idx) => {
              const isChosen = answerIdx === idx;
              const isCorrect = result?.correctIndex === idx;
              const showCorrect = result && isCorrect;
              const showWrong = result && isChosen && !result.correct;
              return (
                <li key={idx} style={{ marginBottom: 8 }}>
                  <button
                    onClick={() => submit(idx)}
                    disabled={answerIdx !== null}
                    style={{
                      cursor: answerIdx === null ? 'pointer' : 'default',
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: '1px solid #ddd',
                      width: '100%',
                      textAlign: 'left',
                      background:
                        showCorrect ? '#e6ffed' : showWrong ? '#ffecec' : 'white',
                    }}
                  >
                    {opt}
                    {showCorrect && <strong>  (correct)</strong>}
                    {showWrong && <strong>  (your choice)</strong>}
                  </button>
                </li>
              );
            })}
          </ol>

          {result && (
            <div style={{ marginTop: 12 }}>
              <div>{result.explainer}</div>
              <button onClick={nextQuestion} style={{ marginTop: 12 }}>
                Next question
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}