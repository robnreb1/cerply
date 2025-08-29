"use client";

import React from "react";

const PLACEHOLDERS = [
  "Paste your meeting notes…",
  "Upload a policy document…",
  "Drop in a podcast transcript…",
];

type Module = { id: string; title: string; category?: string };

export default function UiDemo() {
  const [placeholder, setPlaceholder] = React.useState(PLACEHOLDERS[0]);
  const [phase, setPhase] = React.useState<"idle"|"processing"|"ready">("idle");
  const [modules, setModules] = React.useState<Module[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [inputText, setInputText] = React.useState("");
  const [dragOver, setDragOver] = React.useState(false);

  const enterprise = String(process.env.NEXT_PUBLIC_ENTERPRISE_MODE) === "true";

  // Cycle placeholder text
  React.useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % PLACEHOLDERS.length;
      setPlaceholder(PLACEHOLDERS[i]);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  async function onSubmit(artifact: {text?: string; fileName?: string; url?: string}) {
    setPhase("processing");
    setError(null);

    // Simulate: tiny pause + try to fetch /api/prompts (falls back to demo if upstream down)
    try {
      const res = await fetch("/api/prompts", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Module[];
      setModules(data);
      setPhase("ready");
    } catch (e: any) {
      // Demo fallback, still moves the user forward
      setModules([
        { id: "demo-1", title: "Welcome to Cerply", category: "demo" },
        { id: "demo-2", title: "Try a curated prompt", category: "demo" },
      ]);
      setPhase("ready");
      setError("Using local demo modules (upstream unavailable).");
    }
  }

  function onFileSelect(file: File) {
    // For now we don’t parse; we just accept and move on to generation.
    onSubmit({ fileName: file.name });
  }

  function onDrop(ev: React.DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    setDragOver(false);
    const f = ev.dataTransfer?.files?.[0];
    if (f) onFileSelect(f);
  }

  function onPaste(ev: React.ClipboardEvent<HTMLTextAreaElement>) {
    const pasted = ev.clipboardData.getData("text/plain");
    if (pasted?.trim()) setInputText(pasted);
  }

  const Input = (
    <div
      className={`w-full max-w-2xl mx-auto transition rounded-2xl border p-5 bg-white
      ${dragOver ? "border-black/40 shadow-lg" : "border-black/10 shadow-sm"}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <label className="block text-sm text-black/60 mb-2">
        Give Cerply anything. We’ll convert it into personalised micro-learning and tests.
      </label>

      <textarea
        className="w-full h-28 rounded-xl border border-black/10 p-4 outline-none focus:ring-2 focus:ring-black/10"
        placeholder={placeholder}
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onPaste={onPaste}
      />

      <div className="mt-3 flex items-center gap-3">
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt,.md,.rtf,.html,.htm,.json,.csv,.xml,audio/*,video/*"
          className="text-sm"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelect(f); }}
        />
        <button
          onClick={() => onSubmit({ text: inputText })}
          disabled={!inputText.trim()}
          className="ml-auto px-4 py-2 rounded-xl bg-black text-white disabled:bg-black/30"
        >
          Build modules
        </button>
      </div>

      <p className="mt-3 text-sm text-black/60">
        Cerply converts anything you give it into personalised micro-learning and tests — so you remember what matters.
      </p>
    </div>
  );

  const Loading = (
    <div className="mt-10 text-center text-black/70">
      <div className="animate-pulse text-lg">Got it. Building your learning modules…</div>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
        {[1,2,3,4].map(i => (
          <div key={i} className="rounded-2xl border border-black/10 p-4">
            <div className="h-4 w-2/3 bg-black/10 rounded mb-3" />
            <div className="h-3 w-1/2 bg-black/10 rounded" />
          </div>
        ))}
      </div>
    </div>
  );

  const Cards = (
    <div className="mt-8 max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
      {modules.map(m => (
        <div key={m.id} className="rounded-2xl border border-black/10 p-5 bg-white shadow-sm">
          <div className="text-sm uppercase tracking-wide text-black/40">{m.category ?? "module"}</div>
          <div className="mt-1 font-medium">{m.title}</div>
          <button className="mt-4 text-sm underline underline-offset-4">Open</button>
        </div>
      ))}
    </div>
  );

  const Upsell = enterprise ? null : (
    <div className="mt-10 max-w-2xl mx-auto text-center text-black/70">
      <span className="text-sm">
        Want this mapped to your compliance standard?{" "}
        <button className="underline">Enable Enterprise features</button>
      </span>
    </div>
  );

  return (
    <main className="min-h-[100dvh] bg-neutral-50 text-black">
      <div className="mx-auto px-4 pt-16 pb-28 max-w-5xl">
        <h1 className="text-2xl font-semibold text-center mb-8">Cerply</h1>

        {/* Input / States */}
        {phase === "idle" && Input}
        {phase === "processing" && Loading}
        {phase === "ready" && (
          <>
            {Cards}
            {Upsell}
          </>
        )}

        {/* Error, if any */}
        {error && (
          <div className="mt-6 max-w-2xl mx-auto text-center text-sm text-amber-700">
            {error}
          </div>
        )}
      </div>

      {/* Trust badges */}
      <div className={`fixed inset-x-0 bottom-0 px-4 py-3 ${enterprise ? "bg-white/80 backdrop-blur" : "bg-transparent"}`}>
        <div className="max-w-5xl mx-auto text-center text-xs sm:text-sm text-black/50">
          Audit-ready · Expert-reviewed · Adaptive · Private by default
        </div>
      </div>
    </main>
  );
}
