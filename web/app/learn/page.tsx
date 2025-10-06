'use client';

import { useState, useEffect } from 'react';
import { apiBase } from '@/lib/apiBase';
import { copy } from '@/lib/copy';

// Types matching M3 API contracts
type PreviewResponse = {
  summary: string;
  proposed_modules: Array<{
    id: string;
    title: string;
    estimated_items: number;
  }>;
  clarifying_questions: string[];
};

type GenerateResponse = {
  modules: Array<{
    id: string;
    title: string;
    lessons: Array<{
      id: string;
      type: string;
      front: string;
      back: string;
    }>;
  }>;
};

type ScoreResponse = {
  score: number;
  difficulty: 'easy' | 'medium' | 'hard';
  misconceptions: string[];
  next_review_days: number;
  explanation?: string;
};

type ScheduleResponse = {
  session_id: string;
  plan_id: string;
  order: string[];
  due: string;
  meta: { algo: string; version: string };
};

type LearnerLevel = 'beginner' | 'novice' | 'intermediate' | 'advanced' | 'expert' | 'worldClass';

type AppState = 
  | { phase: 'input' }
  | { phase: 'preview'; data: PreviewResponse }
  | { phase: 'auth-gate' }
  | { phase: 'session'; sessionId: string; items: any[]; currentIdx: number };

export default function LearnPage() {
  const [state, setState] = useState<AppState>({ phase: 'input' });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAuthed, setIsAuthed] = useState(false); // TODO: wire real auth
  
  const API_BASE = apiBase();

  // Check auth on mount
  useEffect(() => {
    // TODO: Check real auth status
    // For now, check if we have a session cookie or token
    setIsAuthed(false); // Stub: always require sign-in
  }, []);

  // PANE A: Topic Input & Preview
  const handlePreview = async () => {
    if (!input.trim()) {
      setError('Please enter a topic');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Preview failed');
      }

      const data: PreviewResponse = await res.json();
      setState({ phase: 'preview', data });
    } catch (err: any) {
      setError(err.message || copy.error.network);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    if (!isAuthed) {
      setState({ phase: 'auth-gate' });
      return;
    }
    
    // TODO: Start session
    // For now, just show message
    alert('Session start - implementation pending');
  };

  const handleRefine = () => {
    setState({ phase: 'input' });
  };

  // PANE: Auth Gate
  const handleSignIn = () => {
    // TODO: Route to actual sign-in
    window.location.href = '/login'; // Stub
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100">
      <div className="mx-auto max-w-4xl px-4 py-12">
        {/* Phase: Input */}
        {state.phase === 'input' && (
          <div className="space-y-6">
            <h1 className="text-4xl font-bold text-zinc-900">
              {copy.topic.heading}
            </h1>
            
            <div className="space-y-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={copy.topic.placeholder}
                className="w-full min-h-[120px] rounded-lg border-2 border-zinc-300 px-4 py-3 text-lg focus:border-zinc-500 focus:outline-none"
                data-testid="topic-input"
                autoFocus
              />
              
              <div className="flex gap-3">
                <button
                  onClick={handlePreview}
                  disabled={loading || !input.trim()}
                  className="rounded-lg bg-zinc-900 px-6 py-3 text-white font-medium hover:bg-zinc-800 disabled:bg-zinc-400 disabled:cursor-not-allowed"
                  data-testid="preview-button"
                >
                  {loading ? copy.topic.loading : copy.topic.previewCta}
                </button>
                
                <button
                  className="rounded-lg border-2 border-zinc-300 px-4 py-2 text-zinc-700 hover:bg-zinc-50"
                  data-testid="upload-button"
                >
                  {copy.topic.uploadCta}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Phase: Preview */}
        {state.phase === 'preview' && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-zinc-900">
              {copy.preview.heading}
            </h1>

            <div className="rounded-lg bg-white border-2 border-zinc-200 p-6 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                  {copy.preview.summary}
                </h2>
                <p className="text-lg text-zinc-800">{state.data.summary}</p>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                  {copy.preview.modules}
                </h2>
                <div className="space-y-2">
                  {state.data.proposed_modules.map((mod) => (
                    <div key={mod.id} className="flex justify-between items-center text-sm">
                      <span className="text-zinc-700">{mod.title}</span>
                      <span className="text-zinc-500">{mod.estimated_items} {copy.preview.estimatedItems}</span>
                    </div>
                  ))}
                </div>
              </div>

              {state.data.clarifying_questions.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                    {copy.preview.clarifying}
                  </h2>
                  <ul className="space-y-1 text-sm text-zinc-600">
                    {state.data.clarifying_questions.map((q, i) => (
                      <li key={i}>• {q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleStart}
                className="rounded-lg bg-zinc-900 px-6 py-3 text-white font-medium hover:bg-zinc-800"
                data-testid="start-button"
              >
                {copy.preview.confirmYes}
              </button>
              
              <button
                onClick={handleRefine}
                className="rounded-lg border-2 border-zinc-300 px-4 py-2 text-zinc-700 hover:bg-zinc-50"
                data-testid="refine-button"
              >
                {copy.preview.confirmRefine}
              </button>
            </div>
          </div>
        )}

        {/* Phase: Auth Gate */}
        {state.phase === 'auth-gate' && (
          <div className="space-y-6">
            <div className="rounded-lg bg-white border-2 border-zinc-200 p-8 text-center space-y-4 max-w-md mx-auto">
              <h2 className="text-2xl font-bold text-zinc-900">
                {copy.auth.gateHeading}
              </h2>
              <p className="text-zinc-600">
                {copy.auth.gateMessage}
              </p>
              <button
                onClick={handleSignIn}
                className="w-full rounded-lg bg-zinc-900 px-6 py-3 text-white font-medium hover:bg-zinc-800"
                data-testid="signin-button"
              >
                {copy.auth.signInCta}
              </button>
              <button
                onClick={() => setState({ phase: 'input' })}
                className="text-sm text-zinc-500 hover:text-zinc-700"
              >
                ← Back
              </button>
            </div>
          </div>
        )}

        {/* Phase: Session - TODO */}
        {state.phase === 'session' && (
          <div className="text-center py-12">
            <p className="text-zinc-600">Session implementation pending...</p>
          </div>
        )}
      </div>
    </main>
  );
}
