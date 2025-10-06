'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiBase } from '@/lib/apiBase';
import { COPY as copy } from '@/lib/copy';

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

type CardItem = {
  id: string;
  type: string;
  front: string;
  back: string;
  answer?: string | string[];
};

type GenerateResponse = {
  modules: Array<{
    id: string;
    title: string;
    lessons: CardItem[];
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

type SessionStats = {
  answered: number;
  correct: number;
  totalScore: number;
};

type AppState = 
  | { phase: 'input' }
  | { phase: 'preview'; data: PreviewResponse }
  | { phase: 'auth-gate' }
  | { phase: 'session'; sessionId: string; items: CardItem[]; currentIdx: number; stats: SessionStats };

export default function LearnPage() {
  const [state, setState] = useState<AppState>({ phase: 'input' });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [slowLoadTimeout, setSlowLoadTimeout] = useState(false);
  
  // Session state
  const [flipped, setFlipped] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [scoreData, setScoreData] = useState<ScoreResponse | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [level, setLevel] = useState<LearnerLevel>('beginner');
  
  // NL Ask state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', text: string}>>([]);
  
  const API_BASE = apiBase();

  // Check auth on mount & try to resume session
  useEffect(() => {
    // Check auth status (stub for now)
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    setIsAuthed(!!authToken);

    // Try to resume session
    const sessionId = typeof window !== 'undefined' ? localStorage.getItem('learn_session_id') : null;
    if (sessionId) {
      resumeSession(sessionId);
    }
  }, []);

  // Calculate level from stats
  useEffect(() => {
    if (state.phase === 'session') {
      const accuracy = state.stats.answered > 0 ? (state.stats.correct / state.stats.answered) * 100 : 0;
      if (accuracy >= 95) setLevel('expert');
      else if (accuracy >= 85) setLevel('advanced');
      else if (accuracy >= 70) setLevel('intermediate');
      else if (accuracy >= 50) setLevel('novice');
      else setLevel('beginner');
    }
  }, [state]);

  // Resume session from progress API
  const resumeSession = async (sessionId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/certified/progress?sid=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          // TODO: Reconstruct session from progress data
          console.log('[learn] Resume data:', data);
        }
      }
    } catch (err) {
      console.error('[learn] Failed to resume:', err);
    }
  };

  // PANE A: Topic Input & Preview
  const handlePreview = async () => {
    if (!input.trim()) {
      setError('Please enter a topic');
      return;
    }

    setLoading(true);
    setError('');
    setSlowLoadTimeout(false);

    // Show fallback content if loading takes >400ms
    const timeoutId = setTimeout(() => {
      setSlowLoadTimeout(true);
    }, 400);

    try {
      const res = await fetch(`${API_BASE}/api/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input }),
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Preview failed');
      }

      const data: PreviewResponse = await res.json();
      setState({ phase: 'preview', data });
      setSlowLoadTimeout(false);
    } catch (err: any) {
      clearTimeout(timeoutId);
      setError(err.message || copy.error.network);
      setSlowLoadTimeout(false);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!isAuthed) {
      setState({ phase: 'auth-gate' });
      return;
    }

    if (state.phase !== 'preview') return;

    setLoading(true);
    setError('');
    setSlowLoadTimeout(false);

    const timeoutId = setTimeout(() => {
      setSlowLoadTimeout(true);
    }, 400);

    try {
      // Generate items from preview
      const genRes = await fetch(`${API_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modules: state.data.proposed_modules.map(m => ({ title: m.title })),
          level: 'beginner',
        }),
      });

      clearTimeout(timeoutId);

      if (!genRes.ok) {
        throw new Error('Failed to generate content');
      }

      const genData: GenerateResponse = await genRes.json();
      
      // Flatten all lessons into items array
      const allItems: CardItem[] = [];
      genData.modules.forEach(mod => {
        mod.lessons.forEach(lesson => {
          allItems.push(lesson);
        });
      });

      // Create session
      const sessionId = `sess-${Date.now()}`;
      localStorage.setItem('learn_session_id', sessionId);

      // Schedule with retention API
      const schedRes = await fetch(`${API_BASE}/api/certified/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          plan_id: 'generated',
          items: allItems.map(item => ({
            id: item.id,
            front: item.front,
            back: item.back,
          })),
          algo: 'sm2-lite',
        }),
      });

      if (!schedRes.ok) {
        throw new Error('Failed to schedule session');
      }

      await schedRes.json();

      setState({
        phase: 'session',
        sessionId,
        items: allItems,
        currentIdx: 0,
        stats: { answered: 0, correct: 0, totalScore: 0 },
      });
      setSlowLoadTimeout(false);
    } catch (err: any) {
      clearTimeout(timeoutId);
      setError(err.message || copy.error.api);
      setSlowLoadTimeout(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = () => {
    setState({ phase: 'input' });
  };

  // PANE: Auth Gate
  const handleSignIn = () => {
    // For demo: set auth token
    localStorage.setItem('auth_token', 'demo-token');
    setIsAuthed(true);
    
    // Return to preview if we were there
    if (state.phase === 'auth-gate') {
      window.location.reload();
    }
  };

  // PANE B: Session - Flip card
  const handleFlip = async () => {
    if (state.phase !== 'session') return;
    
    setFlipped(!flipped);
    
    if (!flipped) {
      // Record flip event
      try {
        await fetch(`${API_BASE}/api/certified/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: state.sessionId,
            card_id: state.items[state.currentIdx].id,
            action: 'flip',
            at: new Date().toISOString(),
          }),
        });
      } catch (err) {
        console.error('[learn] Failed to record flip:', err);
      }
    }
  };

  // PANE B: Grade answer
  const handleGrade = async (grade: number) => {
    if (state.phase !== 'session') return;

    setLoading(true);
    const currentItem = state.items[state.currentIdx];

    try {
      // Score the answer
      const scoreRes = await fetch(`${API_BASE}/api/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: currentItem.id,
          user_answer: userAnswer || `Grade: ${grade}`,
          expected_answer: currentItem.back,
        }),
      });

      if (scoreRes.ok) {
        const scoreResult: ScoreResponse = await scoreRes.json();
        setScoreData(scoreResult);
      }

      // Record progress
      await fetch(`${API_BASE}/api/certified/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: state.sessionId,
          card_id: currentItem.id,
          action: 'grade',
          grade,
          at: new Date().toISOString(),
        }),
      });

      // Update stats
      const newStats = {
        answered: state.stats.answered + 1,
        correct: state.stats.correct + (grade >= 4 ? 1 : 0),
        totalScore: state.stats.totalScore + grade,
      };

      setState({
        ...state,
        stats: newStats,
      });

      // Move to next after delay
      setTimeout(() => {
        moveToNext();
      }, 1500);
    } catch (err) {
      console.error('[learn] Failed to grade:', err);
      setError(copy.error.api);
    } finally {
      setLoading(false);
    }
  };

  const moveToNext = () => {
    if (state.phase !== 'session') return;

    setFlipped(false);
    setUserAnswer('');
    setScoreData(null);
    setShowExplanation(false);

    if (state.currentIdx < state.items.length - 1) {
      setState({
        ...state,
        currentIdx: state.currentIdx + 1,
      });
    } else {
      // Session complete - could show completion screen
      setError(''); // Clear any errors
    }
  };

  // NL Ask handler
  const handleAsk = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);

    // Stub response
    setTimeout(() => {
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', text: 'Natural language responses will be powered by the orchestrator in the full version.' }
      ]);
    }, 500);
  };

  const currentItem = state.phase === 'session' ? state.items[state.currentIdx] : null;
  const targetCount = 10;
  const isComplete = state.phase === 'session' && state.currentIdx >= Math.min(targetCount, state.items.length) - 1;

  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100">
      {/* UAT Banner - staging only */}
      {typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && (
        <div className="bg-yellow-50 border-b-2 border-yellow-200 px-4 py-2 text-sm">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <span className="text-yellow-800">🧪 UAT Mode - Learner MVP</span>
            <span className="text-xs text-yellow-600">API: {API_BASE}</span>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-4xl px-4 py-12 relative">
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
                className="w-full min-h-[120px] rounded-lg border-2 border-zinc-300 px-4 py-3 text-lg focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
                data-testid="topic-input"
                aria-label="Topic input"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handlePreview();
                  }
                }}
              />
              
              <div className="flex gap-3">
                <button
                  onClick={handlePreview}
                  disabled={loading || !input.trim()}
                  className="rounded-lg bg-zinc-900 px-6 py-3 text-white font-medium hover:bg-zinc-800 disabled:bg-zinc-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-zinc-500"
                  data-testid="preview-button"
                  aria-label="Preview topic"
                >
                  {loading ? copy.topic.loading : copy.topic.previewCta}
                </button>
                
                <button
                  className="rounded-lg border-2 border-zinc-300 px-4 py-2 text-zinc-700 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                  data-testid="upload-button"
                  aria-label="Upload file"
                >
                  {copy.topic.uploadCta}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
                {error}
              </div>
            )}

            {/* Pane C: While you wait (slow load) */}
            {slowLoadTimeout && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-6 space-y-4">
                <h2 className="font-semibold text-blue-900">{copy.fallback.heading}</h2>
                <p className="text-sm text-blue-700">{copy.fallback.profileTeaser}</p>
                <div className="text-sm text-blue-600">
                  <p>✓ Analyzing topic scope...</p>
                  <p>✓ Identifying key concepts...</p>
                  <p>✓ Building learning plan...</p>
                </div>
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
                disabled={loading}
                className="rounded-lg bg-zinc-900 px-6 py-3 text-white font-medium hover:bg-zinc-800 disabled:bg-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                data-testid="start-button"
                aria-label="Start learning session"
              >
                {loading ? 'Starting...' : copy.preview.confirmYes}
              </button>
              
              <button
                onClick={handleRefine}
                className="rounded-lg border-2 border-zinc-300 px-4 py-2 text-zinc-700 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                data-testid="refine-button"
                aria-label="Refine topic"
              >
                {copy.preview.confirmRefine}
              </button>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
                {error}
              </div>
            )}

            {/* Pane C: While you wait */}
            {slowLoadTimeout && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-6 space-y-4">
                <h2 className="font-semibold text-blue-900">{copy.fallback.heading}</h2>
                <div className="space-y-2">
                  <p className="text-sm text-blue-700 font-medium">{copy.fallback.relatedHeading}</p>
                  {state.data.proposed_modules.map(mod => (
                    <button
                      key={mod.id}
                      className="block text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {mod.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
                className="w-full rounded-lg bg-zinc-900 px-6 py-3 text-white font-medium hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                data-testid="signin-button"
                aria-label="Sign in to continue"
              >
                {copy.auth.signInCta}
              </button>
              <button
                onClick={() => setState({ phase: 'input' })}
                className="text-sm text-zinc-500 hover:text-zinc-700 focus:outline-none focus:underline"
                aria-label="Go back"
              >
                ← Back
              </button>
            </div>
          </div>
        )}

        {/* Phase: Session */}
        {state.phase === 'session' && currentItem && (
          <div className="space-y-6">
            {/* HUD */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-zinc-900">{copy.session.heading}</h1>
                <p className="text-sm text-zinc-600">
                  {copy.session.itemProgress(state.currentIdx + 1, Math.min(targetCount, state.items.length))} • {copy.session.target(targetCount)}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-zinc-700 capitalize">{copy.level[level]}</div>
                <div className="text-xs text-zinc-500">
                  {state.stats.answered > 0 && `${Math.round((state.stats.correct / state.stats.answered) * 100)}% accuracy`}
                </div>
              </div>
            </div>

            {/* Card */}
            <div
              onClick={!flipped ? handleFlip : undefined}
              className={`rounded-2xl bg-white p-12 shadow-lg border-2 transition-all min-h-[300px] flex items-center justify-center text-center ${
                !flipped ? 'cursor-pointer border-zinc-200 hover:border-zinc-300' : 'border-zinc-300'
              }`}
              data-testid="study-card"
              role="button"
              tabIndex={!flipped ? 0 : -1}
              aria-label={!flipped ? copy.a11y.flipCard : undefined}
              onKeyDown={(e) => {
                if (!flipped && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  handleFlip();
                }
              }}
            >
              {!flipped ? (
                <div>
                  <p className="text-sm uppercase tracking-wide text-zinc-500 mb-4">Question</p>
                  <p className="text-2xl font-semibold text-zinc-900">{currentItem.front}</p>
                  <p className="text-xs text-zinc-400 mt-6">{copy.session.flipCta}</p>
                </div>
              ) : (
                <div className="w-full space-y-6">
                  <div>
                    <p className="text-sm uppercase tracking-wide text-zinc-500 mb-4">Answer</p>
                    <p className="text-xl text-zinc-800">{currentItem.back}</p>
                  </div>

                  {/* User answer input */}
                  <textarea
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Your answer (optional - helps us adapt better)"
                    className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
                    rows={2}
                    data-testid="answer-input"
                  />

                  {/* Grade buttons */}
                  {!scoreData && (
                    <div>
                      <p className="text-sm text-zinc-600 mb-3">{copy.session.gradeCta}</p>
                      <div className="flex gap-2 justify-center flex-wrap">
                        {[1, 2, 3, 4, 5].map((grade) => (
                          <button
                            key={grade}
                            onClick={() => handleGrade(grade)}
                            disabled={loading}
                            className={`rounded-lg px-4 py-2 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                              grade <= 2
                                ? 'bg-red-100 text-red-700 hover:bg-red-200 focus:ring-red-500'
                                : grade === 3
                                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 focus:ring-yellow-500'
                                : 'bg-green-100 text-green-700 hover:bg-green-200 focus:ring-green-500'
                            } disabled:opacity-50`}
                            data-testid={`grade-${grade}`}
                            aria-label={copy.a11y.gradeButton(grade, copy.session.grades[grade as keyof typeof copy.session.grades])}
                          >
                            {grade}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-center gap-4 mt-2 text-xs text-zinc-500">
                        <span>{copy.session.grades[1]}</span>
                        <span>{copy.session.grades[5]}</span>
                      </div>
                    </div>
                  )}

                  {/* Score feedback */}
                  {scoreData && (
                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-blue-900">
                          Difficulty: <span className="capitalize">{scoreData.difficulty}</span>
                        </span>
                        <span className="text-sm text-blue-700">
                          Next review: {scoreData.next_review_days} days
                        </span>
                      </div>
                      
                      {scoreData.misconceptions.length > 0 && !showExplanation && (
                        <button
                          onClick={() => setShowExplanation(true)}
                          className="text-sm text-blue-700 hover:text-blue-900 underline focus:outline-none focus:ring-2 focus:ring-blue-500"
                          data-testid="explain-button"
                          aria-label={copy.a11y.explainButton}
                        >
                          {copy.session.explainCta}
                        </button>
                      )}

                      {showExplanation && scoreData.misconceptions.length > 0 && (
                        <div className="text-sm text-blue-800 pt-2 border-t border-blue-200">
                          <p className="font-medium mb-1">Common misconceptions:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {scoreData.misconceptions.map((m, i) => (
                              <li key={i}>{m}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
                {error}
              </div>
            )}

            {/* Completion message */}
            {isComplete && (
              <div className="rounded-lg bg-green-50 border-2 border-green-200 p-6 text-center space-y-4">
                <h2 className="text-2xl font-bold text-green-900">{copy.session.completedHeading}</h2>
                <p className="text-green-700">{copy.session.completedMessage(state.stats.answered)}</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setState({ phase: 'input' })}
                    className="rounded-lg bg-green-700 px-6 py-3 text-white font-medium hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {copy.session.finishCta}
                  </button>
                  {state.currentIdx < state.items.length - 1 && (
                    <button
                      onClick={() => moveToNext()}
                      className="rounded-lg border-2 border-green-300 px-4 py-2 text-green-700 hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      {copy.session.continueCta}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* NL Ask Cerply - Right Rail */}
        {state.phase === 'session' && (
          <div className={`fixed right-0 top-0 h-full bg-white border-l-2 border-zinc-200 shadow-xl transition-transform duration-300 ${
            chatOpen ? 'translate-x-0' : 'translate-x-full'
          } w-96 z-50`}>
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center p-4 border-b border-zinc-200">
                <h3 className="font-semibold text-zinc-900">{copy.nlAsk.heading}</h3>
                <button
                  onClick={() => setChatOpen(false)}
                  className="text-zinc-500 hover:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 rounded"
                  aria-label={copy.a11y.collapseChat}
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`rounded-lg p-3 text-sm ${
                      msg.role === 'user'
                        ? 'bg-zinc-900 text-white ml-8'
                        : 'bg-zinc-100 text-zinc-800 mr-8'
                    }`}
                  >
                    {msg.text}
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-zinc-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAsk();
                      }
                    }}
                    placeholder={copy.nlAsk.placeholder}
                    className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
                    data-testid="chat-input"
                  />
                  <button
                    onClick={handleAsk}
                    disabled={!chatInput.trim()}
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-white text-sm font-medium hover:bg-zinc-800 disabled:bg-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                    data-testid="chat-send"
                  >
                    {copy.nlAsk.submitCta}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chat toggle button */}
        {state.phase === 'session' && !chatOpen && (
          <button
            onClick={() => setChatOpen(true)}
            className="fixed right-4 bottom-4 rounded-full bg-zinc-900 px-6 py-3 text-white font-medium shadow-lg hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 z-40"
            data-testid="chat-toggle"
            aria-label={copy.a11y.expandChat}
          >
            {copy.nlAsk.toggle}
          </button>
        )}
      </div>
    </main>
  );
}
