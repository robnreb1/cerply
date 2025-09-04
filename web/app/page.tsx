'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

type Msg = { role: 'user' | 'assistant'; text: string; id: string };
type ModuleStub = { id: string; title: string };
type Phase = 'idle' | 'clarify' | 'planned' | 'locked' | 'generating';

/** Opener: each sentence on its own line */
const OPENER = [
  'What will you master today?',
  'Tell me your goal in one line, for example, “GCSE German (AQA Higher) by May” or “remember the key points from a podcast I listened to”.',
  'I will plan the modules, then we can generate the daily practice.',
].join('\n');
const OPENER_LINES = OPENER.split('\n');

/** API base helper (web :3000 → api :8080 in dev) */
const ENV_API_BASE = (process.env.NEXT_PUBLIC_API_BASE as string) || '';
function computeApiBase(): string {
  if (ENV_API_BASE) return ENV_API_BASE;
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    if (
      (hostname === 'localhost' || hostname === '127.0.0.1') &&
      (port === '' || port === '3000')
    ) {
      return `${protocol}//${hostname}:8080`;
    }
  }
  return '';
}
const API_BASE = computeApiBase();
const withBase = (url: string) =>
  url.startsWith('/') && API_BASE ? `${API_BASE}${url}` : url;

function uid() {
  return Math.random().toString(36).slice(2);
}

async function getJSON(url: string, opts?: RequestInit) {
  try {
    const res = await fetch(withBase(url), {
      ...opts,
      headers: { 'content-type': 'application/json', ...(opts?.headers || {}) },
      credentials: 'include',
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, json };
  } catch (e) {
    return { ok: false, status: 0, json: { error: String(e) } };
  }
}

export default function Page() {
  /** Seed opener messages (one bubble per line) */
  const [messages, setMessages] = useState<Msg[]>(
    OPENER_LINES.map((line, i) => ({ id: `opener-${i}`, role: 'assistant', text: line }))
  );

  /** Typewriter state: we render only a slice of the opener text */
  const [typedCount, setTypedCount] = useState(0);
  const [openerIndex, setOpenerIndex] = useState(0);
  const openerIdxRef = useRef(0);
  const typedRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const cancelledRef = useRef(false);
  const openerStarted = useRef(false);

  /** Start typing after first paint; Strict-Mode safe; has a failsafe */
  useEffect(() => {
    if (openerStarted.current) return;
    openerStarted.current = true;
    openerIdxRef.current = 0;
    typedRef.current = 0;

    // Fail-safe: only for the FIRST line. If typing never starts, reveal it.
    const fail = setTimeout(() => {
      if (openerIdxRef.current !== 0) return;
      const current = OPENER_LINES[0] ?? '';
      setTypedCount((c) => (c === 0 ? current.length : c));
      typedRef.current = current.length;
    }, 800);

    // Smooth typing loop via chained timeouts (avoids interval bursts)
    cancelledRef.current = false;
    const schedule = (fn: () => void, ms: number) => {
      const id = window.setTimeout(fn, ms) as unknown as number;
      timersRef.current.push(id);
    };
    const typeCurrent = () => {
      if (cancelledRef.current) return;
      const idx = openerIdxRef.current;
      const current = OPENER_LINES[idx] ?? '';
      if (!current) return;
      if (typedRef.current < current.length) {
        typedRef.current = Math.min(typedRef.current + 1, current.length);
        setTypedCount(typedRef.current);
        schedule(typeCurrent, 30);
        return;
      }
      if (idx < OPENER_LINES.length - 1) {
        schedule(() => {
          openerIdxRef.current = idx + 1;
          setOpenerIndex(idx + 1);
          typedRef.current = 0;
          setTypedCount(0);
          typeCurrent();
        }, 180);
      }
    };
    schedule(typeCurrent, 30);

    return () => {
      // Reset guard so React Strict Mode (dev) second mount can re-init timers
      openerStarted.current = false;
      openerIdxRef.current = 0;
      typedRef.current = 0;
      setOpenerIndex(0);
      setTypedCount(0);
      clearTimeout(fail);
      cancelledRef.current = true;
      for (const id of timersRef.current) clearTimeout(id);
      timersRef.current = [];
    };
  }, []);

  /** Chat state */
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [brief, setBrief] = useState<string>('');
  const [chips, setChips] = useState<string[]>([]);
  const [plan, setPlan] = useState<ModuleStub[] | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Live typewriter for all assistant messages (non-opener)
  const [liveTypingId, setLiveTypingId] = useState<string | null>(null);
  const [liveTypedCount, setLiveTypedCount] = useState(0);
  const liveDoneRef = useRef(new Set<string>());
  const liveTimersRef = useRef<number[]>([]);
  const liveCancelledRef = useRef(false);

  // Thinking indicator (adds/removes a temporary assistant bubble)
  const [thinkingId, setThinkingId] = useState<string | null>(null);
  const addThinking = useCallback(() => {
    const id = `thinking-${Date.now()}`;
    setThinkingId(id);
    setMessages((m) => [...m, { id, role: 'assistant', text: 'Thinking…' }]);
    return id;
  }, []);
  const clearThinking = useCallback((id?: string | null) => {
    const tid = id ?? thinkingId;
    if (!tid) return;
    setMessages((m) => m.filter((x) => x.id !== tid));
    if (!id) setThinkingId(null);
  }, [thinkingId]);

  /** autoscroll: use requestAnimationFrame to avoid race conditions */
  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
    return () => cancelAnimationFrame(id);
  }, [messages, typedCount, openerIndex, liveTypedCount, liveTypingId]);

  /** Start typing any new assistant message (excluding openers) */
  useEffect(() => {
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === 'assistant' && !m.id.startsWith('opener'));
    if (!lastAssistant) return;
    if (liveDoneRef.current.has(lastAssistant.id)) return;
    if (liveTypingId === lastAssistant.id) return;

    // Cancel previous typing cycle
    liveCancelledRef.current = true;
    for (const t of liveTimersRef.current) clearTimeout(t);
    liveTimersRef.current = [];

    setLiveTypingId(lastAssistant.id);
    setLiveTypedCount(0);
    liveCancelledRef.current = false;

    const schedule = (fn: () => void, ms: number) => {
      const id = window.setTimeout(fn, ms) as unknown as number;
      liveTimersRef.current.push(id);
    };
    const tick = () => {
      if (liveCancelledRef.current) return;
      const current = messages.find((m) => m.id === lastAssistant.id)?.text || '';
      if (liveTypedCount < current.length) {
        setLiveTypedCount((c) => Math.min(c + 1, current.length));
        schedule(tick, 30);
      } else {
        liveDoneRef.current.add(lastAssistant.id);
        setLiveTypingId(null);
      }
    };
    schedule(tick, 30);

    return () => {
      liveCancelledRef.current = true;
      for (const t of liveTimersRef.current) clearTimeout(t);
      liveTimersRef.current = [];
    };
  }, [messages]);

  const appendUser = useCallback((text: string) => {
    setMessages((m) => [...m, { id: uid(), role: 'user', text }]);
  }, []);

  const renderPlanText = (mods: ModuleStub[]) =>
    `Plan preview:\n${mods
      .map((m, i) => ` ${i + 1}. ${m.title}`)
      .join('\n')}\n\nSay “looks good” to generate, or “add X / remove Y” to adjust.`;

  // NL confirmations
  const isLooksGood = (t: string) =>
    /\b(looks good|confirm|generate)\b/i.test(t);
  const isAdd = (t: string) => /^(please\s*)?(add|include)\b/i.test(t);
  const isRemove = (t: string) => /^(please\s*)?(remove|drop|exclude)\b/i.test(t);

  const handleSubmit = useCallback(
    async (raw?: string) => {
      const text = (raw ?? input).trim();
      if (!text) return;
      setInput('');
      appendUser(text);

      // If the user likely wants to learn from proprietary materials, prompt upload early
      const looksLikeUpload = /\b(upload|attach|transcript|meeting notes?|minutes|recording|slides?|pdf|docx|pptx?|policy|handbook|internal|proprietary|my\s+notes?)\b/i.test(text);
      const isChangeTopic = /\b(something else|another topic|not that|different topic|change (topic|subject)|start over|restart)\b/i.test(text);
      if (phase === 'idle' && looksLikeUpload) {
        setMessages((m) => [
          ...m,
          { id: uid(), role: 'assistant', text: 'You can upload a file or paste text. Tap the ⬆︎ button to choose a file.' },
        ]);
        // gently open the picker after a short delay so the message renders first
        setTimeout(() => onUploadClick(), 300);
      }

      if (phase === 'idle') {
        setBrief(text);
        const tId = addThinking();
        const r = await getJSON('/api/ingest/clarify', {
          method: 'POST',
          body: JSON.stringify({ text }),
        });
        clearThinking(tId);
        if (!r.ok || !(r.json as any)?.ok) {
          setMessages((m) => [
            ...m,
            {
              id: uid(),
              role: 'assistant',
              text:
                "I couldn't reach the planner. Make sure the API is running on :8080, then try again with your goal (e.g., exam, level, date).",
            },
          ]);
          setPhase('idle');
          return;
        }
        const { question, chips: c } = r.json as {
          question?: string;
          chips?: string[];
        };
        setChips(Array.isArray(c) ? c : []);
        setMessages((m) => [
          ...m,
          {
            id: uid(),
            role: 'assistant',
            text: `${question ?? 'Can you share one more detail?'}${
              Array.isArray(c) && c.length
                ? `\n\nQuick picks: ${c.map((x: string) => `“${x}”`).join(' · ')}`
                : ''
            }`,
          },
        ]);
        setPhase('clarify');
        return;
      }

      if (phase === 'clarify') {
        // If the user says "something else" or similar, do NOT plan yet. Ask for a new topic.
        if (isChangeTopic) {
          setMessages((m) => [
            ...m,
            {
              id: uid(),
              role: 'assistant',
              text:
                'Okay — what would you like to focus on instead? You can also upload a file (⬆︎) or paste text.',
            },
          ]);
          setPhase('idle');
          return;
        }
        const enriched = `${brief} — ${text}`;
        setBrief(enriched);

        // 1) Try KB lookup first
        try {
          const key = enriched.trim().toLowerCase().slice(0, 240);
          if (key.length > 0) {
            const tId0 = addThinking();
            const r0 = await getJSON(`/api/materials/lookup?key=${encodeURIComponent(key)}`);
            clearThinking(tId0);
            const rec: any = r0.json as any;
            if (r0.ok && rec?.ok && rec?.found && Array.isArray(rec?.record?.modules)) {
              const modules = rec.record.modules as ModuleStub[];
              setPlan(modules);
              setMessages((m) => [
                ...m,
                { id: uid(), role: 'assistant', text: renderPlanText(modules) },
              ]);
              setPhase('locked');
              return;
            }
          }
        } catch {}

        // 2) Fall back to planner preview
        const tId = addThinking();
        const r = await getJSON('/api/ingest/preview', {
          method: 'POST',
          body: JSON.stringify({ text: enriched }),
        });
        clearThinking(tId);
        if (!r.ok) {
          setMessages((m) => [
            ...m,
            {
              id: uid(),
              role: 'assistant',
              text:
                'Preview failed. Try a simpler brief (goal, level/syllabus, target date).',
            },
          ]);
          setPhase('idle');
          return;
        }
        const modules: ModuleStub[] =
          (r.json as any)?.modules ?? (r.json as any)?.plan ?? [];
        setPlan(modules);
        setMessages((m) => [
          ...m,
          { id: uid(), role: 'assistant', text: renderPlanText(modules) },
          { id: uid(), role: 'assistant', text: 'Does this plan look right? Say “looks good” to proceed, or propose changes.' },
        ]);
        setPhase('locked');
        return;
      }

      if (phase === 'locked' && plan) {
        if (isLooksGood(text)) {
          const tId = addThinking();
          const me = await getJSON('/api/auth/me');
          if (!me.ok) {
            clearThinking(tId);
            setMessages((m) => [
              ...m,
              {
                id: uid(),
                role: 'assistant',
                text:
                  'To generate lessons, please log in first: open /login, complete the magic link, then say “generate”.',
              },
            ]);
            return;
          }
          const r = await getJSON('/api/ingest/generate', {
            method: 'POST',
            body: JSON.stringify({ plan }),
          });
          clearThinking(tId);
          if (!r.ok) {
            setMessages((m) => [
              ...m,
              {
                id: uid(),
                role: 'assistant',
                text: 'Generate failed. If you just logged in, say “generate” again.',
              },
            ]);
            return;
          }
          setMessages((m) => [
            ...m,
            {
              id: uid(),
              role: 'assistant',
              text: 'Lessons generated. You can start daily practice now.',
            },
          ]);
          return;
        }

        if (isAdd(text) || isRemove(text)) {
          const r = await getJSON('/api/ingest/followup', {
            method: 'POST',
            body: JSON.stringify({ brief, plan, message: text }),
          });
          if (!r.ok) {
            setMessages((m) => [
              ...m,
              {
                id: uid(),
                role: 'assistant',
                text:
                  'Could not apply that change. Try “add <topic>” or “remove <topic>”.',
              },
            ]);
            return;
          }
          const { action } = (r.json as any) || {};
          if (action === 'append' && Array.isArray((r.json as any)?.modules)) {
            const next = (r.json as any).modules as ModuleStub[];
            setPlan(next);
            setMessages((m) => [
              ...m,
              { id: uid(), role: 'assistant', text: renderPlanText(next) },
            ]);
            return;
          }
          if (action === 'revise' && Array.isArray((r.json as any)?.modules)) {
            const next = (r.json as any).modules as ModuleStub[];
            setPlan(next);
            setMessages((m) => [
              ...m,
              {
                id: uid(),
                role: 'assistant',
                text: `Plan updated.\n\n${renderPlanText(next)}`,
              },
            ]);
            return;
          }
          if (action === 'hint' && typeof (r.json as any)?.text === 'string') {
            setMessages((m) => [
              ...m,
              { id: uid(), role: 'assistant', text: (r.json as any).text },
            ]);
            return;
          }
          setMessages((m) => [
            ...m,
            {
              id: uid(),
              role: 'assistant',
              text:
                'Nothing to change yet. Try “add <topic>” or “remove <topic>”.',
            },
          ]);
          return;
        }

        setMessages((m) => [
          ...m,
          {
            id: uid(),
            role: 'assistant',
            text: 'Say “looks good” to generate, or “add X / remove Y” to adjust.',
          },
        ]);
        return;
      }
    },
    [appendUser, brief, input, phase, plan]
  );

  const onChip = useCallback((c: string) => {
    handleSubmit(c);
  }, [handleSubmit]);

  const onUploadClick = () => fileRef.current?.click();
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      appendUser(`[uploaded] ${f.name}`);
      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: 'assistant',
          text:
            'Got it. I will use your upload to inform planning once ingest routes are enabled for files.',
        },
      ]);
    }
  };

  return (
    <div className="min-h-dvh w-full flex flex-col">
      <main className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-3xl mx-auto space-y-2">
          {messages.map((m) => {
            const isUser = m.role === 'user';
            const isOpener = m.id.startsWith('opener');
            let showText = m.text;
            if (isOpener) {
              const idx = Number((m.id.split('-')[1] ?? '0')) || 0;
              if (idx < openerIndex) showText = m.text;
              else if (idx === openerIndex) showText = m.text.slice(0, typedCount);
              else showText = '';
            } else if (!isUser) {
              // live typing for assistant messages
              if (m.id === liveTypingId) {
                showText = m.text.slice(0, liveTypedCount);
              }
            }
            if (isOpener && showText === '') return null;

            return (
              <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`whitespace-pre-wrap rounded-2xl px-3 py-2 text-[15px] leading-relaxed shadow-sm ${
                    isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-neutral-900 border border-neutral-200'
                  }`}
                  style={{ maxWidth: '85%' }}
                >
                  {showText}
                </div>
              </div>
            );
          })}

          {!!chips.length && phase === 'clarify' && (
            <div className="mt-3 flex flex-wrap gap-2">
              {chips.map((c) => (
                <button
                  key={c}
                  className="border rounded-full px-3 py-1 text-sm hover:bg-neutral-50"
                  onClick={() => onChip(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </main>

      {/* Sticky input bar */}
      <div className="sticky bottom-0 w-full border-t bg-white">
        <div className="max-w-3xl mx-auto px-4 py-3 flex gap-2 items-center">
          <button
            aria-label="Upload"
            className="border rounded px-2 py-2 text-base"
            onClick={onUploadClick}
            title="Upload a file"
          >
            ⬆︎
          </button>
          <input
            ref={fileRef}
            type="file"
            onChange={onFile}
            style={{ display: 'none' }}
            aria-hidden="true"
          />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={
              phase === 'idle'
                ? 'Tell me your goal…'
                : phase === 'clarify'
                ? 'Answer the clarifier (or tap a chip)…'
                : phase === 'locked'
                ? '“looks good”, or “add X / remove Y”…'
                : 'Type…'
            }
            className="flex-1 border rounded px-3 py-2"
          />
          <button
            aria-label="Send"
            className="border rounded px-3 py-2"
            onClick={() => handleSubmit()}
            title="Send (Enter)"
          >
            ⏎
          </button>
        </div>
      </div>
    </div>
  );
}