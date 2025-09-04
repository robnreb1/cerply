// web/components/IngestInteraction.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PlayIcon,
  ArrowPathIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/solid";

// Rotating example placeholders shown in the input when empty
const EXAMPLES = [
  "e.g. I've got 30 mins to spare, get me started on quadratic equations",
  "e.g. my daughter needs to remember all the key events that led to WW2",
  "e.g. I would like to learn how to start a business in the UK",
  "e.g. I need to remember all key topics and decisions covered in our team meeting today",
  "e.g. my team needs to understand this new regulation in detail and how to apply it",
] as const;

type ModuleOutline = { id?: string; slug?: string; title: string; estMinutes?: number };
type PreviewResp = { ok: boolean; modules?: ModuleOutline[]; error?: any };
type GenerateResp = {
  ok?: boolean;
  items?: Array<{
    title: string;
    explanation: string;
    questions: {
      mcq?: { id: string; stem: string; options: string[]; correctIndex: number };
      free?: { prompt: string };
    };
  }>;
  error?: { code: string; message: string };
};

type Message = { role: "user" | "assistant"; content: string; html?: boolean };

const isBroadTopic = (s: string) => {
  const trimmed = s.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length <= 3) return true;
  // quick domainy keywords heuristic
  const dom = /physics|math|chem|bio|history|law|policy|compliance|security|finance|accounting|leadership|management|astrophys|quantum|ai|machine learning|data science/i;
  return dom.test(trimmed);
};

const suggestSeedModules = (topic: string): ModuleOutline[] => {
  const t = topic.toLowerCase();
  if (t.includes("astro")) {
    return [
      { title: "Foundations: Space, Time & Light" },
      { title: "Stars & Stellar Evolution" },
      { title: "Exoplanets & Planetary Systems" },
      { title: "Galaxies & Active Nuclei" },
      { title: "Cosmology: Big Bang to Now" },
      { title: "Observation & Instruments" },
    ];
  }
  if (t.includes("quantum")) {
    return [
      { title: "Key Ideas: States & Measurement" },
      { title: "Superposition & Entanglement" },
      { title: "Dynamics & the Schrödinger Equation" },
      { title: "Spin & Two-Level Systems" },
      { title: "QM in Practice: Tunneling, Wells" },
      { title: "Information & Computing (Intro)" },
    ];
  }
  // generic fallback 4-pack
  return [
    { title: `Foundations of ${topic}` },
    { title: `${topic}: Core Concepts` },
    { title: `${topic}: Applications` },
    { title: `${topic}: Review & Practice` },
  ];
};

const toSlug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const saveSession = (session: any) => {
  try {
    const all = JSON.parse(localStorage.getItem("cerply.sessions") || "[]");
    all.unshift({ id: Date.now(), ...session });
    localStorage.setItem("cerply.sessions", JSON.stringify(all.slice(0, 20)));
  } catch {}
};

const INTRO_HTML =
  'Hi, <strong>I’m Cerply</strong>.\nWhat would you like to learn today?\nYou can paste text, share a link, upload a document, or just name a topic.';

export default function IngestInteraction() {
  const [input, setInput] = useState("");
  const [exampleIdx, setExampleIdx] = useState(0);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "", html: true },
  ]);
  const [phase, setPhase] = useState<"idle" | "clarify" | "preview" | "confirm" | "generating" | "done">("idle");
  const [clarifyQuestion, setClarifyQuestion] = useState<string>("");
  const [clarifyChips, setClarifyChips] = useState<string[] | null>(null);
  const [clarify, setClarify] = useState<{ level?: string; scope?: string; time?: string; prior?: string }>({});
  const [proposed, setProposed] = useState<ModuleOutline[] | null>(null);
  const [items, setItems] = useState<GenerateResp["items"]>(undefined);
  const [busy, setBusy] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const clarifyTopicRef = useRef<string>("");

  const hasUserMessage = useMemo(() => messages.some((m) => m.role === "user"), [messages]);
  const isFirstTurn = useMemo(
    () => !hasUserMessage && (!proposed || proposed.length === 0) && !items,
    [hasUserMessage, proposed, items]
  );

  const fileRef = useRef<HTMLInputElement>(null);

  const doPreviewFromText = async (text: string) => {
    if (!text?.trim()) return;
    setPhase("preview");
    setBusy(true);
    pushAssistant("Got it. I’m sizing this into bite-sized modules…");
    const p = await runPreview({ text });
    setBusy(false);

    let mods = p?.ok && p.modules?.length ? p.modules : suggestSeedModules(text.slice(0, 60));
    mods = mods.map((m, i) => ({
      ...m,
      id: m.id || `mod-${i + 1}`,
      slug: m.slug || toSlug(m.title),
      estMinutes: m.estMinutes || 4,
    }));
    setProposed(mods);
    setPhase("confirm");
    pushAssistant("Here’s a first pass. Want me to build learning content for these modules?");
  };

  const openPicker = () => fileRef.current?.click();

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // For demo: handle the first file; extend later to multiple
    const f = files[0];
    pushUser(`Uploaded: ${f.name}`);

    try {
      const isTexty =
        f.type.startsWith("text/") ||
        /\.(md|csv|json|txt)$/i.test(f.name);

      if (isTexty) {
        const raw = await f.text();
        await doPreviewFromText(raw.slice(0, 4000)); // cap for demo
      } else {
        pushAssistant("Thanks — uploads are enabled. Parsing PDFs/Docs will land next. For now, paste text or upload .txt/.md/.csv/.json.");
      }
    } catch (err) {
      pushAssistant("⚠️ Sorry — failed to read that file. Please try a plain text file for now.");
    } finally {
      // reset so choosing the same file again still triggers change
      e.currentTarget.value = "";
    }
  };

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(120, el.scrollHeight) + "px"; // cap at ~6 lines
  }, [input]);

  useEffect(() => {
    // Typewriter effect for intro
    let i = 0;
    let cancelled = false;

    const step = () => {
      i = Math.min(i + 1, INTRO_HTML.length);
      setMessages((prev) => {
        const next = [...prev];
        if (!next.length) next.push({ role: "assistant", content: "", html: true });
        // render line breaks in intro
        const html = INTRO_HTML.slice(0, i).replace(/\n/g, '<br/>');
        next[0] = { ...next[0], content: html, html: true };
        return next;
      });
      if (!cancelled && i < INTRO_HTML.length) {
        const ch = INTRO_HTML[i - 1];
        const delay =
          ch === "." ? 250 :
          ch === "," ? 120 :
          22;
        timeout = window.setTimeout(step, delay);
      }
    };

    let timeout = window.setTimeout(step, 200); // brief initial pause
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, []);

  // Rotate example placeholder every 5s (only visible when the box is empty)
  useEffect(() => {
    const id = window.setInterval(() => {
      setExampleIdx((i) => (i + 1) % EXAMPLES.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  const disabled = useMemo(() => busy || !input.trim(), [busy, input]);

  const postJSON = async <T,>(url: string, body: any): Promise<T> => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      // tolerate plain text errors
      return { error: { message: text } } as unknown as T;
    }
  };

  const runPreview = async (payload: any) =>
    postJSON<PreviewResp>("/api/ingest/preview", payload);

  const runGenerate = async (payload: any) =>
    postJSON<GenerateResp>("/api/ingest/generate", payload);

  const runClarify = async (payload: any) =>
    postJSON<{ ok?: boolean; question?: string; chips?: string[]; error?: any }>("/api/ingest/clarify", payload);

  const runFollowup = async (payload: any) =>
    postJSON<{ ok?: boolean; action?: 'append' | 'revise' | 'hint'; plan?: ModuleOutline[]; brief?: string; hint?: string; error?: any }>("/api/ingest/followup", payload);

  const getAuthMe = async (): Promise<{ ok?: boolean; user?: any }> => {
    try {
      const r = await fetch('/api/auth/me');
      const j = await r.json().catch(() => ({}));
      return j as any;
    } catch {
      return {} as any;
    }
  };

  const pushAssistant = (content: string) =>
    setMessages((m) => [...m, { role: "assistant", content }]);

  const pushUser = (content: string) =>
    setMessages((m) => [...m, { role: "user", content }]);

  const startClarify = async (topic: string) => {
    clarifyTopicRef.current = topic;
    setPhase("clarify");
    const res = await runClarify({ text: topic });
    const q = res?.question || `Quick check on “${topic}”. What should we focus on today?`;
    const chips = (res?.chips && res.chips.length ? res.chips : ['Basics','Core concepts','Applications']).slice(0,6);
    setClarifyQuestion(q);
    setClarifyChips(chips);
    pushAssistant(q);
  };

  const proceedFromClarify = async (answer: string) => {
    const topic = clarifyTopicRef.current || messages.findLast((m) => m.role === "user")?.content || "your topic";
    setPhase("preview");
    setBusy(true);
    pushAssistant("Thanks — sizing modules now…");
    const p = await runPreview({
      text: `Topic: ${topic}\nNotes: ${answer}\nAssume multi‑session plan; time today = intro session.`,
    });
    setBusy(false);

    let mods = p?.ok && p.modules?.length ? p.modules : suggestSeedModules(topic);
    mods = mods.map((m, i) => ({
      ...m,
      id: m.id || `mod-${i + 1}`,
      slug: m.slug || toSlug(m.title),
      estMinutes: m.estMinutes || 5,
    }));
    setProposed(mods);
    setPhase("confirm");
    pushAssistant("Proposed outline ready. Build content?");
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    pushUser(text);
    setInput("");

    // Natural-language confirmations
    if (/^looks good\b/i.test(text)) {
      const me = await getAuthMe();
      if (!me?.ok || !me.user) {
        pushAssistant('Please log in to generate content.');
        return;
      }
      await buildContent();
      return;
    }

    // Follow-up heuristics
    if (/^(add|include|remove)\b/i.test(text) && proposed?.length) {
      const fu = await runFollowup({ brief: clarifyTopicRef.current || '', plan: proposed, message: text });
      if (fu?.ok && (fu.plan || fu.action === 'hint')) {
        if (fu.plan) setProposed(fu.plan);
        if (fu.action === 'hint' && fu.hint) pushAssistant(fu.hint);
        setPhase('confirm');
        return;
      }
    }

    if (phase === "clarify") {
      await proceedFromClarify(text);
      return;
    }

    // Broad topics → clarifying Qs first
    if (isBroadTopic(text)) {
      await startClarify(text);
      return;
    }

    // Short artefacts → straight to preview
    setPhase("preview");
    setBusy(true);
    pushAssistant("Got it. I’m sizing this into bite-sized modules…");
    const p = await runPreview({ text });
    setBusy(false);

    let mods = p?.ok && p.modules?.length ? p.modules : suggestSeedModules(text);
    // ensure ids/slugs
    mods = mods.map((m, i) => ({
      ...m,
      id: m.id || `mod-${i + 1}`,
      slug: m.slug || toSlug(m.title),
      estMinutes: m.estMinutes || 4,
    }));
    setProposed(mods);
    setPhase("confirm");
    pushAssistant(`Here’s a first pass. Want me to build learning content for these modules? Say "looks good" to proceed, or type add/include/remove to adjust.`);
  };


  const buildContent = async () => {
    if (!proposed?.length) return;
    setPhase("generating");
    setBusy(true);
    pushAssistant("Building explanations and questions…");

    const artefact = (() => {
      // Prefer the last user message as source text
      const last = messages.findLast((m) => m.role === "user")?.content || "";
      return { kind: "text", text: last };
    })();

    const prefs: Record<string, string> = {};
    if (clarify.level) prefs.audience = clarify.level;
    if (clarify.time) prefs.timeBudget = clarify.time;

    const resp = await runGenerate({
      artefact,
      modules: proposed.map(({ slug, title }) => ({ slug: slug!, title })),
      prefs,
    });

    setBusy(false);

    if (resp?.ok && resp.items?.length) {
      setItems(resp.items);
      setPhase("done");
      saveSession({ topic: artefact, modules: proposed, items: resp.items, ts: new Date().toISOString() });
      pushAssistant("Content ready. You can rate modules and start learning.");
    } else {
      const msg = resp?.error?.message || "Could not generate content. Please try again.";
      pushAssistant(`⚠️ ${msg}`);
      setPhase("confirm");
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled) void handleSend();
    }
  };

  return (
    <div className="mx-auto max-w-3xl w-full">
      <div className="flex flex-col pb-16">
      {/* Chat transcript */}
      <div className="space-y-2 pr-1">
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "text-right" : "text-left"}
          >
            <div
              className={
                "inline-block rounded-2xl px-4 py-3 " +
                (m.role === "user"
                  ? "bg-zinc-100 text-zinc-900"
                  : "bg-white ring-1 ring-zinc-200 text-zinc-800")
              }
            >
              {m.html ? (
                <p className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: m.content }} />
              ) : (
                m.content.split("\n").map((line, j) => (
                  <p key={j} className="whitespace-pre-wrap">
                    {line}
                  </p>
                ))
              )}
            </div>
          </div>
        ))}

        {busy && (
          <div className="text-left">
            <div className="inline-flex items-center gap-2 rounded-2xl bg-white ring-1 ring-zinc-200 px-4 py-3 text-zinc-700">
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
              <span>Thinking…</span>
            </div>
          </div>
        )}

        {phase === "clarify" && clarifyChips && (
          <div className="text-left">
            <div className="inline-flex flex-wrap gap-2 p-2">
              {clarifyChips.map((c) => (
                <button
                  key={c}
                  onClick={() => proceedFromClarify(c)}
                  className="badge tap-target hover:bg-zinc-100"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}


        {phase !== "done" && proposed?.length && (
          <div className="rounded-xl border border-zinc-200 bg-white">
            <div className="border-b border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700">
              Proposed modules
            </div>
            <ol className="grid gap-2 p-4 sm:grid-cols-2">
              {proposed.map((m, i) => (
                <li key={m.slug || i} className="rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-200">
                  <input
                    value={m.title}
                    onChange={(e) =>
                      setProposed((prev) =>
                        prev ? prev.map((x) => (x.id === m.id ? { ...x, title: e.currentTarget.value } : x)) : prev
                      )
                    }
                    className="w-full bg-transparent outline-none text-sm font-medium text-zinc-900"
                    aria-label={`Edit title for ${m.id || m.slug || `module ${i + 1}`}`}
                  />
                  <div className="text-xs text-zinc-500">~{m.estMinutes ?? 5} min</div>
                </li>
              ))}
            </ol>
            <div className="flex items-center justify-end gap-2 border-t border-zinc-200 p-3">
              <button
                onClick={buildContent}
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                disabled={busy}
              >
                <PlayIcon className="h-4 w-4" />
                Build learning content
              </button>
            </div>
          </div>
        )}

        {phase === "done" && items && (
          <div className="space-y-3">
            {items.map((it, idx) => (
              <div key={idx} className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-semibold text-zinc-900">{it.title}</h3>
                  <div className="flex gap-2">
                    <button className="inline-flex items-center gap-1 rounded-full bg-zinc-50 px-2 py-1 text-xs ring-1 ring-zinc-200 hover:bg-zinc-100">
                      <HandThumbUpIcon className="h-4 w-4" /> Helpful
                    </button>
                    <button className="inline-flex items-center gap-1 rounded-full bg-zinc-50 px-2 py-1 text-xs ring-1 ring-zinc-200 hover:bg-zinc-100">
                      <HandThumbDownIcon className="h-4 w-4" /> Needs work
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-zinc-700">{it.explanation}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {it.questions.mcq && (
                    <div className="rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-200">
                      <div className="text-xs font-medium text-zinc-700">MCQ</div>
                      <div className="mt-1 text-sm">{it.questions.mcq.stem}</div>
                    </div>
                  )}
                  {it.questions.free && (
                    <div className="rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-200">
                      <div className="text-xs font-medium text-zinc-700">Free response</div>
                      <div className="mt-1 text-sm">{it.questions.free.prompt}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-2 sticky bottom-0 z-10">
        <div className="flex items-center gap-2">
          <textarea
            ref={taRef}
            rows={2}
            placeholder={isFirstTurn ? EXAMPLES[exampleIdx] : "Type your reply…"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            className="min-h-[2lh] max-h-32 flex-1 resize-none rounded-xl border border-transparent px-3 py-3 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-300"
          />

          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={openPicker}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50 text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-100"
              aria-label="Upload"
              title="Upload"
            >
              <ArrowUpTrayIcon className="h-4 w-4" />
            </button>

            <button
              onClick={handleSend}
              disabled={disabled}
              className={
                "inline-flex h-8 w-8 items-center justify-center rounded-lg " +
                (disabled ? "bg-zinc-200 text-zinc-500" : "bg-zinc-900 text-white hover:bg-zinc-800")
              }
              aria-label="Send"
              title="Send"
            >
              <PlayIcon className="h-4 w-4" />
            </button>
          </div>

          <input
            ref={fileRef}
            type="file"
            className="sr-only"
            style={{ display: 'none' }}
            onChange={onFileChange}
            accept=".txt,.md,.csv,.json,.pdf,.doc,.docx,.ppt,.pptx,.rtf"
            multiple
          />
        </div>
      </div>

      {/* Discovery rails (below composer, lighter + smaller) */}
      </div>
      <div className="mt-28 md:mt-40 pt-8 pb-12 border-t border-zinc-100">
        <section className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]">
          <div className="mx-auto max-w-screen-2xl px-4">
            <div className="px-1 mb-2 text-[11px] font-medium text-zinc-500 text-center">Popular searches</div>
            <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex justify-center gap-3 pb-2">
                {[
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
                ].map((it) => (
                  <button
                    key={it.title}
                    onClick={() => setInput(it.title)}
                    className="shrink-0 w-36 rounded-lg bg-white p-2 text-left ring-1 ring-zinc-100 hover:ring-zinc-200"
                  >
                    <div className="flex h-12 items-center justify-center rounded-md bg-zinc-50 text-2xl">
                      <span aria-hidden>{it.emoji}</span>
                    </div>
                    <div className="mt-2 line-clamp-2 text-[11px] font-medium text-zinc-700">{it.title}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] mt-6">
          <div className="mx-auto max-w-screen-2xl px-4">
            <div className="px-1 mb-2 text-[11px] font-medium text-zinc-500 text-center">Cerply certified</div>
            <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex justify-center gap-3 pb-2">
                {[
                  { title: "Food Safety Level 2", emoji: "🍽️" },
                  { title: "Fire Warden Training", emoji: "🔥" },
                  { title: "Data Protection Awareness", emoji: "🔐" },
                  { title: "Safeguarding Basics", emoji: "🧒" },
                  { title: "Manual Handling", emoji: "📦" },
                  { title: "Workplace First Aid", emoji: "🩹" },
                  { title: "Intro to Cyber Hygiene", emoji: "🛡️" },
                  { title: "Anti‑bribery Essentials", emoji: "⚖️" },
                ].map((it) => (
                  <button
                    key={it.title}
                    onClick={() => setInput(it.title)}
                    className="shrink-0 w-36 rounded-lg bg-white p-2 text-left ring-1 ring-zinc-100 hover:ring-zinc-200"
                  >
                    <div className="flex h-12 items-center justify-center rounded-md bg-zinc-50 text-2xl">
                      <span aria-hidden>{it.emoji}</span>
                    </div>
                    <div className="mt-2 line-clamp-2 text-[11px] font-semibold text-zinc-800">{it.title}</div>
                    <div className="text-[10px] text-emerald-700">Certified</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}