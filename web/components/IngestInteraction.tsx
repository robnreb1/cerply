// web/components/IngestInteraction.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpTrayIcon, PaperAirplaneIcon } from "@heroicons/react/24/solid";

type Message = {
  role: "user" | "assistant";
  content: string;
  html?: boolean;
  collapsed?: boolean;
  collapsedHtml?: string;
  collapsedTitle?: string;
  context?: 'about' | 'default';
};
type PlannedModule = { id?: string; title: string; estMinutes?: number };

const INTRO_MESSAGES = [
  "What will you master today?",
  'Tell me your goal in one line, for example, "GCSE German (AQA Higher) by May" or "remember the key points from a podcast I listened to".',
  "I will plan the modules, then we can generate the daily practice."
];

export default function IngestInteraction() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [aboutThreadStart, setAboutThreadStart] = useState<number | null>(null);
  const [typingIndex, setTypingIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const openerRef = useRef<string[]>(INTRO_MESSAGES);
  const [activeTab, setActiveTab] = useState<"popular" | "certified" | "challenge" | "analytics">("popular");
  const [isGenerating, setIsGenerating] = useState(false);
  const [plan, setPlan] = useState<PlannedModule[] | null>(null);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const [awaitingClarify, setAwaitingClarify] = useState(false);
  const [pendingBrief, setPendingBrief] = useState<string>("");
  const [aboutActive, setAboutActive] = useState(false);
  const [authActive, setAuthActive] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [lastActionHash, setLastActionHash] = useState<string | null>(null);
  const [thinkingSince, setThinkingSince] = useState<number | null>(null);
  const [thinkingNoticeShown, setThinkingNoticeShown] = useState(false);
  const [t0, setT0] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);
  useEffect(() => { if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' }); }, []);
  // Loop guard: single “Still thinking…” then a subtle pulse after 10s
  useEffect(() => {
    let t1: any; let t2: any;
    if (isGenerating) {
      if (t0 === null) setT0(Date.now());
      const started = thinkingSince ?? Date.now();
      if (thinkingSince === null) setThinkingSince(started);
      t1 = setTimeout(() => {
        if (!thinkingNoticeShown) {
          setThinkingNoticeShown(true);
          setMessages(prev => [...prev, { role: 'assistant', content: 'Still thinking…' }]);
          // telemetry: loop-guard trigger
          try { fetch('/api/analytics/record', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'loop_guard_shown', ts: new Date().toISOString() }) }); } catch {}
        }
      }, 2000);
      t2 = setTimeout(() => {
        setMessages(prev => {
          const next = [...prev];
          for (let i = next.length - 1; i >= 0; i--) {
            if (next[i].role === 'assistant' && next[i].content.startsWith('Still thinking')) {
              next[i] = { ...next[i], content: 'Still thinking… ·' } as any;
              break;
            }
          }
          return next;
        });
        // telemetry: progress pulse
        try { fetch('/api/analytics/record', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'progress_pulse', ts: new Date().toISOString() }) }); } catch {}
      }, 10000);
    } else {
      setThinkingSince(null);
      setThinkingNoticeShown(false);
      if (t0 !== null) {
        // telemetry: time to response
        try { fetch('/api/analytics/record', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'ttfr', ms: Date.now() - t0, ts: new Date().toISOString() }) }); } catch {}
      }
      setT0(null);
    }
    return () => { if (t1) clearTimeout(t1); if (t2) clearTimeout(t2); };
  }, [isGenerating]);
  useEffect(() => {
    const onShortcut = (e: any) => {
      const detail = e?.detail as any;
      const tab = detail?.tab as string | undefined;
      if (tab === 'about') {
        // If there's a collapsed About thread, expand it instead of creating a new one
        let expanded = false;
        setMessages(prev => {
          const next = [...prev];
          for (let i = next.length - 1; i >= 0; i--) {
            const m: any = next[i];
            if (m?.collapsed && m?.collapsedTitle === 'About Cerply' && m?.collapsedHtml) {
              next[i] = { role: 'assistant', content: m.collapsedHtml, html: true } as any;
              expanded = true;
              break;
            }
          }
          return next;
        });
        if (expanded) { setAboutActive(true); return; }
        // Otherwise inject interactive About explainer
        const html = `
<strong>About Cerply</strong><br/>
Cerply turns information into knowledge by planning focused modules and then teaching via questions (the fastest way to learn).<br/>
Ask: <a href="#" data-cmd="what-can-you-do">What can you do?</a> · <a href="#" data-cmd="how-help-master">How are you able to help me master any topic?</a> · <a href="#" data-cmd="privacy">How do you handle privacy?</a><br/>
<a href="#" data-cmd="return">Return to previous discussion</a>`;
        setMessages(prev => [...prev, { role: 'assistant', content: html, html: true, context: 'about' }]);
        setAboutActive(true);
        setAboutThreadStart(messages.length + 1);
        return;
      }
      if (tab && (tab === 'popular' || tab === 'certified' || tab === 'challenge' || tab === 'analytics')) setActiveTab(tab);
    };
    window.addEventListener('cerply-shortcut', onShortcut);
    return () => window.removeEventListener('cerply-shortcut', onShortcut);
  }, []);

  // Handle clicks inside assistant HTML bubbles to inject follow-up prompts
  useEffect(() => {
    const handler = async (ev: any) => {
      const t = ev.target as HTMLElement;
      // Expand collapsed thread by clicking anywhere on the bubble
      const collapsedNode = t.closest('[data-collapsed-index]') as HTMLElement | null;
      if (collapsedNode) {
        ev.preventDefault();
        const idxStr = collapsedNode.getAttribute('data-collapsed-index');
        const idx = idxStr ? parseInt(idxStr, 10) : -1;
        if (!isNaN(idx) && idx >= 0) {
          setMessages(prev => {
            const next = [...prev];
            const m: any = next[idx];
            if (m?.collapsed && m?.collapsedHtml) {
              next[idx] = { role: 'assistant', content: m.collapsedHtml, html: true, context: 'about' } as any;
            }
            return next;
          });
          return;
        }
      }
      // Auth mini-form submit
      const form = t.closest('form[data-auth-form]') as HTMLFormElement | null;
      if (form && t instanceof HTMLElement && t.matches('button[data-auth-submit]')) {
        ev.preventDefault();
        const emailInput = form.querySelector('input[type="email"]') as HTMLInputElement | null;
        const email = emailInput?.value?.trim();
        if (!email) return;
        try {
          const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
          const j = await r.json().catch(() => ({}));
          if (j?.next) window.location.href = j.next; // server will set cookie and redirect back
        } catch {}
        return;
      }

      if (t && t.matches('a[data-cmd]')) {
        ev.preventDefault();
        const cmd = t.getAttribute('data-cmd') || '';
        const map: Record<string, string> = {
          'what-can-you-do': 'Explain how Cerply plans modules and teaches via questions.',
          'how-help-master': 'How are you able to help me master any topic?',
          'privacy': 'Explain how Cerply handles PII and anonymized learner IDs.',
          'return': '__return_to_discussion__',
        };
        const prompt = map[cmd];
        if (!prompt) return;
        if (prompt === '__return_to_discussion__') {
          // Collapse last assistant HTML bubble (preserve to re-expand)
          setMessages(prev => {
            const next = [...prev];
            const start = aboutThreadStart ?? next.findIndex(m => (m as any).html && (m as any).content?.includes('About Cerply')) ?? next.length - 1;
            const end = next.length - 1;
            const slice = next.slice(start, end + 1);
            const collapsedHtml = slice
              .map(m => {
                if ((m as any).html) return (m as any).content;
                const who = m.role === 'user' ? 'You' : 'Cerply';
                return `<p><strong>${who}:</strong> ${m.content}</p>`;
              })
              .join('');
            next.splice(start, end - start + 1, {
              role: 'assistant',
              content: 'About thread minimized. Click to expand.',
              collapsed: true,
              collapsedHtml,
              collapsedTitle: 'About Cerply'
            } as any);
            return next;
          });
          setAboutActive(false);
          setAboutThreadStart(null);
          return;
        }
        // Route About/general questions through intelligent chat first
        if (cmd === 'how-help-master' || cmd === 'what-can-you-do' || cmd === 'privacy') {
          setMessages(prev => [...prev, { role: 'user', content: prompt, context: 'about' }]);
          setIsGenerating(true);
          (async () => {
            try {
              const r = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: prompt, about: true })
              });
              if (r.ok) {
                const j = await r.json();
                const a = (j?.reply as string) || '';
                if (a) {
                  const safe = a.replace(/\n/g, '<br/>');
                  const withReturn = `${safe}<br/><a href="#" data-cmd="return">Return to previous discussion</a>`;
                  setMessages(prev => [...prev, { role: 'assistant', content: withReturn, html: true, context: 'about' }]);
                }
              } else {
                const fallback = 'Let me answer that: I keep things simple and practical. I plan short modules, teach by questions, track progress, and schedule refreshers to help you remember.';
                const withReturn = `${fallback}<br/><a href="#" data-cmd="return">Return to previous discussion</a>`;
                setMessages(prev => [...prev, { role: 'assistant', content: withReturn, html: true, context: 'about' }]);
              }
            } finally {
              setIsGenerating(false);
            }
          })();
          return;
        }
        // Otherwise, execute via normal send
        handleSend(prompt);
      }
    };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  // Typewriter effect for initial assistant messages using stable ref
  useEffect(() => {
    if (messages.length === 0 && typingIndex < openerRef.current.length) {
      let i = 0;
      const full = openerRef.current[typingIndex];
      setTypedText("");
      const id = setInterval(() => {
        i++;
        setTypedText(full.slice(0, i));
        if (i >= full.length) {
          clearInterval(id);
          // push the fully typed message, then move to next
          setMessages(prev => [...prev, { role: "assistant", content: full }]);
          setTypingIndex((t) => t + 1);
        }
      }, 30);
      return () => clearInterval(id);
    }
  }, [typingIndex, messages.length]);

  // Typewriter helper for assistant messages (uses updater to capture index)
  const typeOutAssistant = (text: string) => {
    const full = text;
    let i = 0;
    let atIndex = -1;
    setMessages(prev => {
      atIndex = prev.length;
      return [...prev, { role: 'assistant', content: '' }];
    });
    const id = setInterval(() => {
      i++;
      const partial = full.slice(0, i);
      setMessages(prev => {
        const next = [...prev];
        const idx = Math.min(Math.max(0, atIndex), next.length - 1);
        if (next[idx]) next[idx] = { ...next[idx], content: partial } as any;
        return next;
      });
      if (i >= full.length) clearInterval(id);
    }, 20);
  };

  const handleSend = async (override?: string) => {
    const messageText = (override ?? input).trim();
    if (!messageText || isGenerating) return;

    if (!override) setInput("");
    setMessages(prev => [...prev, { role: "user", content: messageText, context: aboutActive ? 'about' : 'default' }]);
    setIsGenerating(true);

    try {
      // Always try orchestrator first
      try {
        const thread = [...messages, { role: 'user', content: messageText }].map(m => ({ role: m.role as any, content: (m as any).html ? m.content.replace(/<[^>]+>/g, ' ') : m.content }));
        // load learner profile (best-effort) and send along
        let profile: any = undefined;
        try {
          const pr = await fetch('/api/learner/profile');
          if (pr.ok) profile = await pr.json();
        } catch {}
        const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: thread, profile }) });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j && typeof j === 'object' && j.action) {
          const action = String(j.action);
          const data = j.data;
          const hash = JSON.stringify({ action, data });
          if (hash === lastActionHash) {
            // Coalesce duplicate intents
            return;
          }
          setLastAction(action);
          setLastActionHash(hash);
          // replace thinking placeholder if present
          setMessages(prev => {
            const next = [...prev];
            for (let i = next.length - 1; i >= 0; i--) {
              if (next[i].role === 'assistant' && next[i].content.startsWith('Still thinking')) {
                next.splice(i, 1);
                break;
              }
            }
            return next;
          });
          if (action === 'clarify' && data?.question) {
            typeOutAssistant(String(data.question));
            setAwaitingClarify(true);
            setPendingBrief(messageText);
            return;
          }
          if (action === 'plan' && Array.isArray(data?.modules)) {
            const modules: PlannedModule[] = data.modules;
            setPlan(modules);
            setAwaitingConfirm(true);
            const bullets = modules.map((m: any, i: number) => `${i + 1}. ${m.title}`).join('\n');
            typeOutAssistant(`Here’s a plan for "${messageText}":\n${bullets}\nReply “confirm” to start, or say what to change.`);
            return;
          }
          if (action === 'items' && Array.isArray(data?.items)) {
            // Ensure user is logged in so items can be saved to profile
            try {
              const me = await fetch('/api/auth/me');
              if (!me.ok) {
                const html = `
<strong>Log in to save your plan</strong><br/>
Create an account to save this topic and continue learning daily.<br/>
<form data-auth-form style="margin-top:8px;display:flex;gap:8px;align-items:center;">
  <input type="email" placeholder="you@example.com" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:8px;" />
  <button data-auth-submit type="submit" style="padding:8px 12px;background:#111;color:#fff;border-radius:8px;">Send link</button>
</form>`;
                setMessages(prev => [...prev, { role: 'assistant', content: html, html: true, context: 'default' }]);
                setAuthActive(true);
                return;
              }
            } catch {}
            // Persist via wrapper for consistency
            if (plan && plan.length) {
              try {
                const gen = await fetch('/api/ingest/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ modules: plan }) });
                if (gen.ok) {
                  typeOutAssistant('Saved to your profile. Let’s begin.');
                  const j = await gen.json();
                  try {
                    const first = (j?.items ?? [])[0];
                    if (first?.explanation) typeOutAssistant(first.explanation);
                    if (first?.questions?.free?.prompt) typeOutAssistant(first.questions.free.prompt);
                  } catch {}
                  setAwaitingConfirm(false);
                  return;
                }
              } catch {}
            }
            // Fallback: show first item from orchestrator response
            const items = data.items;
            typeOutAssistant('Let’s begin.');
            try {
              const first = items[0];
              if (first?.explanation) typeOutAssistant(first.explanation);
              if (first?.questions?.free?.prompt) typeOutAssistant(first.questions.free.prompt);
            } catch {}
            setAwaitingConfirm(false);
            return;
          }
          if (action === 'meta' && data?.notice) {
            typeOutAssistant(String(data.notice));
            return;
          }
        }
      } catch {}

      // About context: answer Q&A instead of planning
      if (aboutActive) {
        const lower = messageText.toLowerCase();
        let answer = '';
        if (/how are you able to help/.test(lower)) {
          answer = 'Cerply uses cutting‑edge AI to scan trusted sources quickly, then turns them into simple, science‑backed steps for learning and remembering. When content is Cerply Certified, experts have reviewed it to raise confidence in quality.';
        } else if (/name|meaning/.test(lower)) {
          answer = '“Cerply” blends “cerebral” and “apply”: think deeply, then apply through practice. The name signals planning smartly and learning by doing.';
        } else if (/what can you do|do you do|capab/.test(lower)) {
          answer = 'I ask a couple of quick questions, build a short plan, then teach by asking you small questions. I explain as we go and adapt to your answers.';
        } else if (/progress|track|keep\s.*sharp|memory|remember|review|spaced/.test(lower)) {
          answer = 'I track your progress for each topic and use short, well‑timed refreshers so knowledge sticks. Even when you’ve mastered something, I’ll drop in quick checks to keep you sharp.';
        } else if (/grade|mark|score/.test(lower)) {
          answer = 'When you write a free answer, I look for the key ideas in plain language and give partial credit when you’re close. Then I show a short explainer and a follow‑up question to lock it in.';
        } else if (/privacy|pii|data/.test(lower)) {
          answer = 'We keep your personal details separate from your learning data and use anonymous learner IDs. We use secure cookies. You can export or delete your data any time.';
        } else if (/plan|teach|modules|questions/.test(lower) || /cerply/.test(lower)) {
          answer = 'First we clarify your goal, then I create a short plan. You learn by answering small questions; I explain and adjust to your level. I track progress and schedule quick refreshers, and reuse trusted, reviewed materials when they exist.';
        }
        if (answer) {
          const withReturn = `${answer}<br/><a href="#" data-cmd="return">Return to previous discussion</a>`;
          setMessages(prev => [...prev, { role: 'assistant', content: withReturn, html: true, context: 'about' }]);
          return;
        }
        // If the question isn’t About-related, provide a concise default and stop (don’t plan)
        const defaultAbout = 'I can help with questions about Cerply. Try: “How do you plan modules?”, “How do you grade?”, or “How do you handle privacy?”';
        const withReturn = `${defaultAbout}<br/><a href="#" data-cmd="return">Return to previous discussion</a>`;
        setMessages(prev => [...prev, { role: 'assistant', content: withReturn, html: true, context: 'about' }]);
        return;
      }

      // If we already proposed a plan and user says confirm/generate, proceed to generate (bypass orchestrator)
      if (plan && /^(yes|ok|start|go|generate|confirm|let\'?s\s*(go|start))/i.test(messageText)) {
        try {
          const me = await fetch('/api/auth/me');
          if (!me.ok) {
            const html = `
<strong>Log in to save your plan</strong><br/>
Create an account to save this topic and continue learning.<br/>
<form data-auth-form style="margin-top:8px;display:flex;gap:8px;align-items:center;">
  <input type="email" placeholder="you@example.com" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:8px;" />
  <button data-auth-submit type="submit" style="padding:8px 12px;background:#111;color:#fff;border-radius:8px;">Send link</button>
</form>`;
            setMessages(prev => [...prev, { role: 'assistant', content: html, html: true, context: 'default' }]);
            setAuthActive(true);
            return;
          }
        } catch {}
        const gen = await fetch('/api/ingest/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modules: plan })
        });
        if (gen.ok) {
          const j = await gen.json();
          const count = Array.isArray(j?.items) ? j.items.length : 0;
          setMessages(prev => [...prev, { role: 'assistant', content: `Great — I generated ${count} lesson drafts. Ready when you are.` }]);
          try {
            const first = (j?.items ?? [])[0];
            if (first?.explanation) setMessages(prev => [...prev, { role: 'assistant', content: first.explanation }]);
            if (first?.questions?.free?.prompt) setMessages(prev => [...prev, { role: 'assistant', content: first.questions.free.prompt }]);
          } catch {}
          setAwaitingConfirm(false);
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: 'I had trouble generating items. Please try again.' }]);
        }
        return;
      }

      // If we are in a clarify exchange, process that reply early (bypass orchestrator)
      if (awaitingClarify) {
        const combined = `${pendingBrief}`.trim();
        setAwaitingClarify(false);
        try {
          const prefs: Record<string, any> = {};
          const lower = messageText.toLowerCase();
          if (/refresher|foundation|foundations|basics|review/.test(lower)) prefs.preferRefresher = true;
          if (/dive|straight in|advanced|deep/.test(lower)) prefs.preferDiveDeep = true;
          if (/beginner|new to this/.test(lower)) prefs.level = 'beginner';
          if (/intermediate/.test(lower)) prefs.level = 'intermediate';
          if (/confident|advanced/.test(lower)) prefs.level = 'advanced';
          if (Object.keys(prefs).length) {
            await fetch('/api/learner/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefs }) });
          }
        } catch {}
        setPendingBrief("");
        const preview = await fetch('/api/ingest/preview', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: combined })
        });
        if (preview.ok) {
          const j = await preview.json();
          if (j?.error) { setMessages(prev => [...prev, { role: 'assistant', content: j.error?.message || 'That does not look like a learnable topic.' }]); return; }
          const modules: PlannedModule[] = Array.isArray(j?.modules) ? j.modules : [];
          if (modules.length) {
            setPlan(modules);
            setAwaitingConfirm(true);
            const bullets = modules.map((m: any, i: number) => `${i + 1}. ${m.title}`).join('\n');
            setMessages(prev => [...prev, { role: 'assistant', content: `Here’s a plan for "${combined}":\n${bullets}\nReply “confirm” to start, or say what to change.` }]);
          } else {
            setMessages(prev => [...prev, { role: 'assistant', content: `I couldn’t form a plan from that. Can you add a little more detail?` }]);
          }
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: `I couldn’t reach the planner just now. Please try again.` }]);
        }
        return;
      }

      // Orchestrate first: unified persona → plan/clarify/meta
      try {
        const history = messages.slice(-8).map(m => ({ role: m.role, content: m.html ? m.content.replace(/<[^>]+>/g, ' ') : m.content }));
        const r = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'orchestrate', text: messageText, history })
        });
        if (r.ok) {
          const j = await r.json();
          const action = j?.action as string | undefined;
          if (action === 'meta' && typeof j?.answer === 'string' && j.answer.trim()) {
            setMessages(prev => [...prev, { role: 'assistant', content: j.answer }]);
            return;
          }
          if (action === 'clarify' && typeof j?.question === 'string' && j.question.trim()) {
            setMessages(prev => [...prev, { role: 'assistant', content: j.question }]);
            setAwaitingClarify(true);
            setPendingBrief(messageText);
            return;
          }
          if (action === 'plan' && Array.isArray(j?.plan) && j.plan.length) {
            const modules: PlannedModule[] = j.plan;
            setPlan(modules);
            setAwaitingConfirm(true);
            const bullets = modules.map((m: any, i: number) => `${i + 1}. ${m.title}`).join('\n');
            setMessages(prev => [
              ...prev,
              { role: 'assistant', content: `Here’s a plan for "${messageText}":\n${bullets}\nReply “confirm” to start, or say what to change.` }
            ]);
            return;
          }
          // otherwise fall through
        }
      } catch { /* ignore and fall back */ }

      // Treat brand/meta prompts as Q&A anywhere (not learning topics) – fallback only
      {
        const lower = messageText.toLowerCase();
        // If this clearly looks like a learning command (e.g., "teach me X"), skip meta routing
        if (/^(teach|learn|explain|show)\b/.test(lower) && !/cerply/.test(lower)) {
          // fall through to clarify/preview
        } else {
        let answer = '';
        // Specific topics first so they don't get shadowed by generic matches
        if (/how\s+are\s+you\s+able\s+to\s+help/.test(lower)) {
          answer = 'Cerply uses cutting‑edge AI to scan trusted sources quickly, then turns them into simple, science‑backed steps for learning and remembering. When content is Cerply Certified, experts have reviewed it to raise confidence in quality.';
        } else if (/privacy|pii|data/.test(lower)) {
          answer = 'We keep your personal details separate from your learning data and use anonymous learner IDs. We use secure cookies. You can export or delete your data any time.';
        } else if (/grade|grading|mark|score|explainers?/.test(lower)) {
          answer = 'When you write a free answer, I look for the key ideas in plain language and give partial credit when you’re close. Then I show a short explainer and a follow‑up question to lock it in.';
        } else if (/progress|track|keep\s.*sharp|memory|remember|review|spaced/.test(lower)) {
          answer = 'I track your progress for each topic and use short, well‑timed refreshers so knowledge sticks. Even when you’ve mastered something, I’ll drop in quick checks to keep you sharp.';
        } else if (/(cerply|what\s+can\s+you\s+do|how\s+do\s+you\s+(plan|teach))/.test(lower)) {
          answer = 'I ask a couple of quick questions, build a short plan, then teach by asking you small questions with simple explainers. I adapt to your answers and schedule refreshers to help you remember.';
        }
        if (answer) {
          setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
          return;
        }
        }
      }
      // If waiting on clarify, combine and move to preview next
      if (awaitingClarify) {
        // Use the original brief for planning; treat this reply as context (not part of the topic string)
        const combined = `${pendingBrief}`.trim();
        setAwaitingClarify(false);
        // persist refinement into learner profile (best-effort)
        try {
          const prefs: Record<string, any> = {};
          const lower = messageText.toLowerCase();
          if (/refresher|foundation|foundations|basics|review/.test(lower)) prefs.preferRefresher = true;
          if (/dive|straight in|advanced|deep/.test(lower)) prefs.preferDiveDeep = true;
          if (/beginner|new to this/.test(lower)) prefs.level = 'beginner';
          if (/intermediate/.test(lower)) prefs.level = 'intermediate';
          if (/confident|advanced/.test(lower)) prefs.level = 'advanced';
          if (Object.keys(prefs).length) {
            await fetch('/api/learner/profile', {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefs })
            });
          }
        } catch {}
        setPendingBrief("");
        // proceed to preview using the original brief only
        const preview = await fetch('/api/ingest/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: combined })
        });
        if (preview.ok) {
          const j = await preview.json();
          if (j?.error) {
            setMessages(prev => [...prev, { role: 'assistant', content: j.error?.message || 'That does not look like a learnable topic.' }]);
            return;
          }
          const modules: PlannedModule[] = Array.isArray(j?.modules) ? j.modules : [];
          if (modules.length) {
            setPlan(modules);
            setAwaitingConfirm(true);
            const bullets = modules.map((m: any, i: number) => `${i + 1}. ${m.title}`).join('\n');
            setMessages(prev => [
              ...prev,
              { role: 'assistant', content: `Here’s a plan for "${combined}":\n${bullets}\nReply “confirm” to start, or say what to change.` }
            ]);
          } else {
            setMessages(prev => [...prev, { role: 'assistant', content: `I couldn’t form a plan from that. Can you add a little more detail?` }]);
          }
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: `I couldn’t reach the planner just now. Please try again.` }]);
        }
        return;
      }

      // If we already proposed a plan and user says confirm/generate, proceed to generate
      if (plan && /^(yes|ok|start|go|generate|confirm|let\'?s\s*(go|start))/i.test(messageText)) {
        // Check auth first
        try {
          const me = await fetch('/api/auth/me');
          if (!me.ok) {
            const html = `
<strong>Log in to save your plan</strong><br/>
Create an account to save this topic and continue learning.<br/>
<form data-auth-form style="margin-top:8px;display:flex;gap:8px;align-items:center;">
  <input type="email" placeholder="you@example.com" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:8px;" />
  <button data-auth-submit type="submit" style="padding:8px 12px;background:#111;color:#fff;border-radius:8px;">Send link</button>
</form>`;
            setMessages(prev => [...prev, { role: 'assistant', content: html, html: true, context: 'default' }]);
            setAuthActive(true);
            return;
          }
        } catch {}
        const gen = await fetch('/api/ingest/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modules: plan })
        });
        if (gen.ok) {
          const j = await gen.json();
          const count = Array.isArray(j?.items) ? j.items.length : 0;
          setMessages(prev => [...prev, { role: 'assistant', content: `Great — I generated ${count} lesson drafts. Ready when you are.` }]);
          // Start the session immediately: show first explainer or question from item 1
          try {
            const first = (j?.items ?? [])[0];
            if (first?.explanation) {
              setMessages(prev => [...prev, { role: 'assistant', content: first.explanation }]);
            }
            if (first?.questions?.free?.prompt) {
              setMessages(prev => [...prev, { role: 'assistant', content: first.questions.free.prompt }]);
            }
          } catch {}
          setAwaitingConfirm(false);
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: 'I had trouble generating items. Please try again.' }]);
        }
        return;
      }

      // Clarify first: always ask a clarifying question/confirmation
      const tokenish = messageText.split(/\s+/).filter(Boolean);
      const hasLetters = /[a-zA-Z]/.test(messageText);
      const controlPhrase = /^(let\'?s\s*(go|start)|ok(ay)?|start|next|proceed|continue)$/i.test(messageText.trim());
      // Always attempt clarify first, even for seemingly valid topics
      const clarify = await fetch('/api/ingest/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: messageText })
      });
      if (clarify.ok) {
        const j = await clarify.json();
        if (Array.isArray(j?.propose) && j.propose.length) {
          const modules: PlannedModule[] = j.propose;
          setPlan(modules);
          setAwaitingConfirm(true);
          const bullets = modules.map((m: any, i: number) => `${i + 1}. ${m.title}`).join('\n');
          setMessages(prev => [
            ...prev,
            { role: 'assistant', content: `Here’s a draft plan for "${messageText}":\n${bullets}\nReply “confirm” to start, or say what to change.` }
          ]);
          return;
        }
        const text = (j?.question || 'Can you clarify your goal?');
        setMessages(prev => [...prev, { role: 'assistant', content: text }]);
        setAwaitingClarify(true);
        setPendingBrief(messageText);
        return;
      }

      // Otherwise, request a plan preview from the API
      const preview = await fetch('/api/ingest/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: messageText })
      });
      if (preview.ok) {
        const j = await preview.json();
        if (!preview.ok || j?.error) {
          const msg = j?.error?.message || 'I couldn’t reach the planner just now. Please try again.';
          setMessages(prev => [...prev, { role: 'assistant', content: msg }]);
          return;
        }
        const modules: PlannedModule[] = Array.isArray(j?.modules) ? j.modules : [];
        if (modules.length) {
          setPlan(modules);
          setAwaitingConfirm(true);
          const bullets = modules.map((m: any, i: number) => `${i + 1}. ${m.title}`).join('\n');
          setMessages(prev => [
            ...prev,
            { role: 'assistant', content: `Here’s a plan for "${messageText}":\n${bullets}\nReply “confirm” to start, or say what to change.` }
          ]);
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: `I couldn’t form a plan from that. Can you add a little more detail?` }]);
        }
      } else {
        // Fallback response if preview fails
        setMessages(prev => [...prev, { role: 'assistant', content: `I couldn’t reach the planner just now. Please try again.` }]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Fallback response
      setMessages(prev => [...prev, { role: "assistant", content: `Something went wrong — please try again.` }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = () => {
    fileRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setInput(`Uploaded: ${file.name}`);
    }
  };

  const popularTopics = [
    { title: "Astrophysics for beginners", emoji: "🛰️" },
    { title: "Excel pivot tables", emoji: "📊" },
    { title: "Project management basics", emoji: "📋" },
    { title: "First aid essentials", emoji: "⛑️" },
    { title: "GDPR essentials", emoji: "🛡️" },
    { title: "Python data analysis", emoji: "🐍" },
    { title: "Public speaking", emoji: "🎤" },
    { title: "Leadership 101", emoji: "🧭" },
    { title: "Customer discovery", emoji: "🕵️" },
    { title: "SQL joins explained", emoji: "🧩" },
  ];

  const certifiedCourses = [
    { title: "Food Safety Level 2", emoji: "🍽️" },
    { title: "Fire Warden Training", emoji: "🔥" },
    { title: "Data Protection Awareness", emoji: "🔐" },
    { title: "Safeguarding Basics", emoji: "🧒" },
    { title: "Manual Handling", emoji: "📦" },
    { title: "Workplace First Aid", emoji: "🩹" },
    { title: "Intro to Cyber Hygiene", emoji: "🛡️" },
    { title: "Anti‑bribery Essentials", emoji: "⚖️" },
  ];

  const getCurrentTopics = () => {
    switch (activeTab) {
      case "popular":
        return popularTopics;
      case "certified":
        return certifiedCourses;
      case "challenge":
        return popularTopics.slice(0, 5); // Example for challenge topics
      case "analytics":
        return popularTopics.slice(5); // Example for analytics topics
      default:
        return popularTopics;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div ref={topRef} />
      {/* Footer shortcuts moved to bottom; header nav removed */}

      {/* Chat Messages */}
      {/* Chat area fills available viewport height minus header/footer; scrolls internally */}
      <div className="flex-1 space-y-4 mb-6 max-h-[calc(100vh-180px)] overflow-y-auto px-1">
        {/* Live typewriter bubble */}
        {messages.length === 0 && typingIndex < openerRef.current.length && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white border border-zinc-200 text-zinc-900">
              <p className="text-sm whitespace-pre-wrap">{typedText}</p>
            </div>
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : message.context === 'about'
                    ? "bg-amber-50 border border-amber-200 text-amber-900"
                    : "bg-zinc-50 border border-zinc-200 text-zinc-900"
              }`}
              data-collapsed-index={message.collapsed ? index : undefined}
              style={{ cursor: message.collapsed ? 'pointer' as const : 'default' as const }}
            >
              {message.html ? (
                <div className="prose prose-zinc text-sm max-w-none" dangerouslySetInnerHTML={{ __html: message.content }} />
              ) : (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              )}
            </div>
          </div>
        ))}
        {isGenerating && (
          <div className="flex justify-start">
            <div className="bg-white border border-zinc-200 rounded-2xl px-4 py-3">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-zinc-900"></div>
                <span className="text-sm text-zinc-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Carousels removed */}
      <div className="mb-4" />

      {/* Footer shortcuts moved to global footer */}
      <div className="sticky bottom-0 bg-white">
        {/* Input row (single chat bar) */}
        <div className="max-w-3xl mx-auto px-4 pb-4 flex items-center gap-2">
          {/* Upload */}
          <button
            onClick={handleFileUpload}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50 text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-100 transition-colors"
            aria-label="Upload"
            title="Upload"
          >
            <ArrowUpTrayIcon className="h-5 w-5" />
          </button>
          {/* Text input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell me your goal..."
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300"
              disabled={isGenerating}
              ref={inputRef}
            />
          </div>
          {/* Send */}
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isGenerating}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-500 transition-colors"
            aria-label="Send"
            title="Send"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </button>
        </div>
        {awaitingConfirm && plan && (
          <div className="max-w-3xl mx-auto px-4 pb-2">
            <button
              onClick={async () => {
                if (isGenerating) return;
                setIsGenerating(true);
                try {
                  const gen = await fetch('/api/ingest/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ modules: plan })
                  });
                  if (gen.ok) {
                    const j = await gen.json();
                    const count = Array.isArray(j?.items) ? j.items.length : 0;
                    setMessages(prev => [...prev, { role: 'assistant', content: `Great — I generated ${count} lesson drafts. Ready when you are.` }]);
                    setAwaitingConfirm(false);
                  } else {
                    setMessages(prev => [...prev, { role: 'assistant', content: 'I had trouble generating items. Please try again.' }]);
                  }
                } finally {
                  setIsGenerating(false);
                }
              }}
              className="mt-1 inline-flex items-center rounded-md bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800"
            >
              Confirm and generate
            </button>
          </div>
        )}
        {/* duplicate input removed */}
        
        <input
          ref={fileRef}
          type="file"
          className="sr-only"
          onChange={handleFileChange}
          accept=".txt,.md,.csv,.json,.pdf,.doc,.docx,.ppt,.pptx,.rtf"
          multiple
        />
      </div>
    </div>
  );
}