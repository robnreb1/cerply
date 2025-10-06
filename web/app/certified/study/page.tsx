'use client';

import { useState, useEffect } from 'react';
import { apiBase } from '@/lib/apiBase';

// UAT Banner Component (non-prod only)
function UATBanner({ apiBaseUrl }: { apiBaseUrl: string }) {
  const buildHash = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'dev';
  const isProd = process.env.NODE_ENV === 'production' && !apiBaseUrl.includes('staging');
  
  if (isProd) return null;
  
  return (
    <div className="bg-yellow-50 border-b-2 border-yellow-200 px-4 py-2 text-sm">
      <div className="max-w-2xl mx-auto flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 text-yellow-800">
          <span className="font-semibold">🧪 UAT Mode</span>
          <span className="text-xs">|</span>
          <span className="text-xs">API: <code className="bg-yellow-100 px-1 py-0.5 rounded">{apiBaseUrl}</code></span>
          <span className="text-xs">|</span>
          <span className="text-xs">Build: <code className="bg-yellow-100 px-1 py-0.5 rounded">{buildHash}</code></span>
        </div>
        <a 
          href="https://github.com/robnreb1/cerply/blob/staging/docs/uat/M3_UAT_SCRIPT.md"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-yellow-700 hover:text-yellow-900 underline"
        >
          📋 UAT Script
        </a>
      </div>
    </div>
  );
}

type Card = {
  id: string;
  front: string;
  back: string;
  grade?: number;
};

type ScheduleResp = {
  order: Array<{ item_id: string; position: number; interval_days: number; ease_factor: number }>;
  due: string;
  meta: { algo: string; session_id: string; scheduled_at: string };
};

type ProgressSnapshot = {
  session_id: string;
  items: Array<{ card_id: string; last_seen: string; grade: number }>;
  updated_at: string;
};

export default function CertifiedStudyPage() {
  const [sessionId] = useState(() => `sess-${Date.now()}`);
  const [cards, setCards] = useState<Card[]>([
    { id: 'card-1', front: 'What is spaced repetition?', back: 'A learning technique that increases intervals of time between reviews of previously learned material.' },
    { id: 'card-2', front: 'What does SM2 stand for?', back: 'SuperMemo 2 - a spaced repetition algorithm.' },
    { id: 'card-3', front: 'What is the optimal review timing?', back: 'Just before you would naturally forget the material.' },
  ]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleResp | null>(null);
  const [progress, setProgress] = useState<ProgressSnapshot | null>(null);
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const API_BASE = apiBase();

  // Load progress snapshot on mount
  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/certified/progress?sid=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setProgress(data);
        setMessage(`Loaded ${data.items?.length || 0} previous progress items`);
      }
    } catch (err) {
      console.error('[study] Failed to load progress:', err);
    }
  };

  const startSchedule = async () => {
    setLoading(true);
    setMessage('Scheduling cards...');
    try {
      const res = await fetch(`${API_BASE}/api/certified/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          plan_id: 'demo-plan',
          items: cards.map(c => ({ id: c.id, front: c.question, back: c.answer })),
          algo: 'sm2-lite',
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setSchedule(data);
        setMessage(`Scheduled ${data.order.length} cards using ${data.meta.algo}`);
        setCurrentIdx(0);
        setFlipped(false);
      } else {
        const err = await res.json();
        setMessage(`Error: ${err.error?.message || 'Scheduling failed'}`);
      }
    } catch (err: any) {
      setMessage(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFlip = async () => {
    setFlipped(!flipped);
    if (!flipped) {
      // Record flip action
      try {
        await fetch(`${API_BASE}/api/certified/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            card_id: cards[currentIdx].id,
            action: 'flip',
          }),
        });
      } catch (err) {
        console.error('[study] Failed to record flip:', err);
      }
    }
  };

  const handleGrade = async (grade: number) => {
    setLoading(true);
    try {
      await fetch(`${API_BASE}/api/certified/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          card_id: cards[currentIdx].id,
          action: 'grade',
          grade,
        }),
      });
      
      setMessage(`Graded: ${grade}/5`);
      
      // Move to next card after short delay
      setTimeout(() => {
        if (currentIdx < cards.length - 1) {
          setCurrentIdx(currentIdx + 1);
          setFlipped(false);
          setMessage('');
        } else {
          setMessage('Session complete! All cards reviewed.');
        }
      }, 500);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetSession = () => {
    setCurrentIdx(0);
    setFlipped(false);
    setSchedule(null);
    setMessage('Session reset');
  };

  const currentCard = cards[currentIdx];

  return (
    <>
      <UATBanner apiBaseUrl={API_BASE} />
      <main className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 px-4 py-12">
        <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold text-zinc-900 mb-2">Certified Study (Preview)</h1>
        <p className="text-sm text-zinc-600 mb-8">
          Session: {sessionId.slice(0, 16)}... | Card {currentIdx + 1} of {cards.length}
        </p>

        {message && (
          <div className="mb-6 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
            {message}
          </div>
        )}

        {!schedule ? (
          <div className="text-center py-12">
            <button
              onClick={startSchedule}
              disabled={loading}
              className="rounded-lg bg-zinc-900 px-6 py-3 text-white font-medium hover:bg-zinc-800 disabled:bg-zinc-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Scheduling...' : 'Start Study Session'}
            </button>
            <p className="mt-4 text-sm text-zinc-500">
              Will schedule {cards.length} cards using SM2-lite algorithm
            </p>
          </div>
        ) : (
          <>
            <div
              onClick={handleFlip}
              className="mb-6 cursor-pointer rounded-2xl bg-white p-12 shadow-lg border-2 border-zinc-200 hover:border-zinc-300 transition-all min-h-[300px] flex items-center justify-center text-center"
            >
              {!flipped ? (
                <div>
                  <p className="text-sm uppercase tracking-wide text-zinc-500 mb-4">Question</p>
                  <p className="text-2xl font-semibold text-zinc-900">{currentCard.front}</p>
                  <p className="text-xs text-zinc-400 mt-6">Click to reveal answer</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm uppercase tracking-wide text-zinc-500 mb-4">Answer</p>
                  <p className="text-xl text-zinc-800">{currentCard.back}</p>
                </div>
              )}
            </div>

            {flipped && currentIdx < cards.length && (
              <div className="flex gap-2 justify-center mb-6">
                {[1, 2, 3, 4, 5].map((grade) => (
                  <button
                    key={grade}
                    onClick={() => handleGrade(grade)}
                    disabled={loading}
                    className={`rounded-lg px-4 py-2 font-medium transition-all ${
                      grade <= 2
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : grade <= 3
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {grade}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={resetSession}
                className="rounded-lg bg-zinc-200 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-300"
              >
                Reset
              </button>
              <button
                onClick={loadProgress}
                className="rounded-lg bg-zinc-200 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-300"
              >
                Load Progress
              </button>
            </div>

            {progress && (
              <div className="mt-6 rounded-lg bg-zinc-50 border border-zinc-200 p-4">
                <p className="text-sm font-medium text-zinc-700 mb-2">Progress Snapshot:</p>
                <p className="text-xs text-zinc-600">
                  {progress.items.length} items tracked, last updated {new Date(progress.updated_at).toLocaleTimeString()}
                </p>
              </div>
            )}
          </>
        )}

        <div className="mt-12 rounded-lg bg-zinc-50 border border-zinc-200 p-6">
          <h2 className="text-sm font-semibold text-zinc-800 mb-3">Integration Status</h2>
          <ul className="space-y-2 text-xs text-zinc-600">
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>POST /api/certified/schedule on start/reset</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>POST /api/certified/progress on flip/grade</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>GET /api/certified/progress?sid= for resume</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Console/alert feedback (preview mode)</span>
            </li>
          </ul>
          </div>
        </div>
      </main>
    </>
  );
}
