'use client';

import { useState, useEffect, useRef } from 'react';
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
  correct: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  explain: string;
  next_hint?: string;
  diagnostics: {
    latency_ms: number;
    hint_count: number;
    retry_count: number;
    confidence: string;
  };
  // Legacy fields (for backward compat)
  score?: number;
  misconceptions?: string[];
  next_review_days?: number;
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
  totalLatency: number;
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
  
  // Session state - AUTO-ASSESSMENT MODE
  const [flipped, setFlipped] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [scoreData, setScoreData] = useState<ScoreResponse | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [level, setLevel] = useState<LearnerLevel>('beginner');
  const [hintCount, setHintCount] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [adaptationFeedback, setAdaptationFeedback] = useState('');
  
  // Latency tracking
  const flipTimestamp = useRef<number | null>(null);
  
  // NL Ask state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', text: string}>>([]);
  
  const API_BASE = apiBase();

  // Check auth on mount & try to resume session
  useEffect(() => {
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    setIsAuthed(!!authToken);

    const sessionId = typeof window !== 'undefined' ? localStorage.getItem('learn_session_id') : null;
    if (sessionId) {
      resumeSession(sessionId);
    }
  }, []);

  // Calculate level from stats
  useEffect(() => {
    if (state.phase === 'session' && state.stats.answered > 0) {
      const accuracy = (state.stats.correct / state.stats.answered) * 100;
      const avgLatency = state.stats.totalLatency / state.stats.answered;
      
      if (accuracy >= 95 && avgLatency < 10000) setLevel('expert');
      else if (accuracy >= 85 && avgLatency < 15000) setLevel('advanced');
      else if (accuracy >= 70) setLevel('intermediate');
      else if (accuracy >= 50) setLevel('novice');
      else setLevel('beginner');
    }
  }, [state]);

  const resumeSession = async (sessionId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/certified/progress?sid=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
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
      
      const allItems: CardItem[] = [];
      genData.modules.forEach(mod => {
        mod.lessons.forEach(lesson => {
          allItems.push(lesson);
        });
      });

      const sessionId = `sess-${Date.now()}`;
      localStorage.setItem('learn_session_id', sessionId);

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
        stats: { answered: 0, correct: 0, totalLatency: 0 },
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

  const handleSignIn = () => {
    localStorage.setItem('auth_token', 'demo-token');
    setIsAuthed(true);
    
    if (state.phase === 'auth-gate') {
      window.location.reload();
    }
  };

  // AUTO-ASSESSMENT: Flip card starts timer
  const handleFlip = async () => {
    if (state.phase !== 'session') return;
    
    if (!flipped) {
      setFlipped(true);
      flipTimestamp.current = Date.now();
      
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

  // AUTO-ASSESSMENT: Submit answer (no self-grading!)
  const handleSubmit = async () => {
    if (state.phase !== 'session' || !flipped || !flipTimestamp.current) return;

    const latency_ms = Date.now() - flipTimestamp.current;
    const currentItem = state.items[state.currentIdx];
    
    setLoading(true);

    try {
      // Score the answer (auto-assessment)
      const scoreRes = await fetch(`${API_BASE}/api/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: currentItem.id,
          user_answer: userAnswer || '(no answer provided)',
          expected_answer: currentItem.back,
          latency_ms,
          item_difficulty: 'medium',
          hint_count: hintCount,
          retry_count: retryCount,
        }),
      });

      if (scoreRes.ok) {
        const result: ScoreResponse = await scoreRes.json();
        setScoreData(result);
        
        // Auto-show explanation if wrong or slow
        if (!result.correct || latency_ms > 20000) {
          setShowExplanation(true);
        }
        
        // Record progress with telemetry
        await fetch(`${API_BASE}/api/certified/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: state.sessionId,
            card_id: currentItem.id,
            action: 'submit',
            at: new Date().toISOString(),
            result: {
              correct: result.correct,
              latency_ms,
              item_difficulty: result.difficulty,
              item_type: currentItem.type as 'mcq' | 'free' | 'card',
              hint_count: hintCount,
              retry_count: retryCount,
            },
          }),
        });

        // Update stats
        const newStats = {
          answered: state.stats.answered + 1,
          correct: state.stats.correct + (result.correct ? 1 : 0),
          totalLatency: state.stats.totalLatency + latency_ms,
        };

        setState({
          ...state,
          stats: newStats,
        });

        // Show adaptation feedback
        if (result.difficulty === 'easy') {
          setAdaptationFeedback('🚀 Great mastery! Increasing challenge...');
        } else if (result.difficulty === 'hard') {
          setAdaptationFeedback('💡 Let\'s ease off a bit and build confidence');
        }

        // Auto-advance after delay
        setTimeout(() => {
          moveToNext();
        }, result.correct ? 1500 : 3000); // Longer delay if wrong
      }
    } catch (err) {
      console.error('[learn] Failed to submit:', err);
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
    setHintCount(0);
    setRetryCount(0);
    setAdaptationFeedback('');
    flipTimestamp.current = null;

    if (state.currentIdx < state.items.length - 1) {
      setState({
        ...state,
        currentIdx: state.currentIdx + 1,
      });
    } else {
      setError('');
    }
  };

  const handleAsk = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);

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
            <span className="text-yellow-800">🧪 UAT Mode - Learner MVP (Auto-Assessment)</span>
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

        {/* Phase: Session (AUTO-ASSESSMENT MODE) */}
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
                  {state.stats.answered > 0 && `${Math.round((state.stats.correct / state.stats.answered) * 100)}% correct`}
                </div>
              </div>
            </div>

            {/* Adaptation Feedback Chip */}
            {adaptationFeedback && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-2 text-sm text-blue-800 text-center animate-fade-in">
                {adaptationFeedback}
              </div>
            )}

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

                  {/* User answer input (auto-assessed) */}
                  {!scoreData && (
                    <div className="space-y-4">
                      <textarea
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="Type your answer here (we'll assess it automatically)..."
                        className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
                        rows={3}
                        data-testid="answer-input"
                        autoFocus
                      />
                      
                      <button
                        onClick={handleSubmit}
                        disabled={loading || !userAnswer.trim()}
                        className="w-full rounded-lg bg-zinc-900 px-6 py-3 text-white font-medium hover:bg-zinc-800 disabled:bg-zinc-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-zinc-500"
                        data-testid="submit-button"
                      >
                        {loading ? 'Assessing...' : 'Submit Answer'}
                      </button>
                    </div>
                  )}

                  {/* Score feedback (auto-assessment result) */}
                  {scoreData && (
                    <div className={`rounded-lg border p-4 space-y-2 ${
                      scoreData.correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-medium ${
                          scoreData.correct ? 'text-green-900' : 'text-red-900'
                        }`}>
                          {scoreData.correct ? '✓ Correct!' : '✗ Not quite'}
                        </span>
                        <span className={`text-xs ${
                          scoreData.correct ? 'text-green-700' : 'text-red-700'
                        }`}>
                          Difficulty: <span className="capitalize">{scoreData.difficulty}</span>
                        </span>
                      </div>
                      
                      {/* Auto-show explanation if wrong or slow */}
                      {showExplanation && scoreData.explain && (
                        <div className={`text-sm pt-2 border-t ${
                          scoreData.correct ? 'border-green-200 text-green-800' : 'border-red-200 text-red-800'
                        }`}>
                          <p className="font-medium mb-1">Explanation:</p>
                          <p>{scoreData.explain}</p>
                        </div>
                      )}
                      
                      {!showExplanation && scoreData.explain && (
                        <button
                          onClick={() => setShowExplanation(true)}
                          className={`text-sm hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                            scoreData.correct ? 'text-green-700 focus:ring-green-500' : 'text-red-700 focus:ring-red-500'
                          }`}
                          data-testid="explain-button"
                        >
                          Show explanation
                        </button>
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
                <p className="text-sm text-green-600">
                  Accuracy: {Math.round((state.stats.correct / state.stats.answered) * 100)}% • 
                  Avg time: {Math.round(state.stats.totalLatency / state.stats.answered / 1000)}s per item
                </p>
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

