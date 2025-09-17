"use client";

/**
 * Home: minimalist, trust-forward input-first UI.
 * - Small "Cerply" label (left)
 * - Overlaid typewriter greeting inside input then fades
 * - Rotating placeholder suggestions
 * - Enter submits (no button); mobile fallback shows a subtle "Learn it" button
 * - Icon row (Certified · Curate · Guild · Account) under input
 */

import { useEffect, useMemo, useRef, useState } from "react";
import UnderInputIcons from "@/components/UnderInputIcons";

export default function HomePage() {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Typewriter greeting overlay
  const greeting = "Hi, I'm Cerply, what would you like to learn today?";
  const [typed, setTyped] = useState("");
  const [showOverlay, setShowOverlay] = useState(true);

  // Placeholder rotation (after overlay)
  const placeholders = useMemo(
    () => [
      "Paste your meeting notes…",
      "Upload a policy document…",
      "Drop in a podcast transcript…",
      "Paste a URL to summarize…",
    ],
    []
  );
  const [phIndex, setPhIndex] = useState(0);

  // Typewriter effect
  useEffect(() => {
    let i = 0;
    const delay = 24; // ms per char
    const timer = setInterval(() => {
      i++;
      setTyped(greeting.slice(0, i));
      if (i >= greeting.length) {
        clearInterval(timer);
        // Hold a moment, then hide overlay and start rotating placeholders
        setTimeout(() => setShowOverlay(false), 3600);
      }
    }, delay);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Placeholder rotator (only runs after overlay hides)
  useEffect(() => {
    if (showOverlay) return;
    const t = setInterval(() => {
      setPhIndex((i) => (i + 1) % placeholders.length);
    }, 2600);
    return () => clearInterval(t);
  }, [showOverlay, placeholders.length]);

  // Submit handler
  async function handleSubmit() {
    if (!value.trim() || submitting) return;
    setSubmitting(true);
    try {
      // TODO: route to ingestion pipeline (upload, parse, etc.)
      // For now, just simulate:
      await new Promise((res) => setTimeout(res, 600));
      // navigate or show generated modules…
      // router.push('/learn/session?id=…')
    } finally {
      setSubmitting(false);
    }
  }

  // Enter to submit (Shift+Enter = newline)
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  // Receive files from the UnderInputIcons upload action
  function handleUpload(files: FileList) {
    if (!value) {
      setValue(Array.from(files).map((f) => f.name).join(", "));
    }
    // TODO: route files into ingestion pipeline
  }

  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:py-14 min-h-[100svh] flex flex-col">
      

      {/* Centered brand label */}
      <div className="mb-4 text-center">
        <span className="text-3xl font-semibold tracking-tight text-zinc-700">Cerply</span>
      </div>

      {/* Input card */}
      <div
        ref={containerRef}
        className="relative rounded-2xl border border-black/10 bg-white shadow-sm"
      >
        {/* Typewriter overlay (sits inside the input box) */}
        {showOverlay && (
          <div className="pointer-events-none absolute inset-0 flex items-start">
            <div className="p-4 sm:p-5 w-full">
              <div className="font-semibold text-black tracking-tight">
                {typed}
                <span className="inline-block w-2 animate-pulse">▍</span>
              </div>
            </div>
          </div>
        )}

        {/* Textarea */}
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          placeholder={!showOverlay ? placeholders[phIndex] : ""}
          className={[
            "w-full resize-y bg-transparent outline-none",
            "rounded-2xl p-4 sm:p-5",
            "placeholder:text-black/40",
          ].join(" ")}
          aria-label="Paste, drop files, or type what you want to learn"
        />

        {/* Mobile fallback: subtle action button */}
        <div className="flex items-center justify-end gap-2 px-4 pb-4 sm:hidden">
          <button
            onClick={handleSubmit}
            disabled={submitting || !value.trim()}
            className="text-sm px-3 py-1.5 rounded-lg border border-black/10 text-black/70 hover:text-black disabled:opacity-40"
          >
            Learn it
          </button>
        </div>
      </div>

      {/* Status line for conversational feedback */}
      <div aria-live="polite" className="mt-3 min-h-[1.25rem] text-sm text-zinc-600">
        {submitting && (
          <span>
            Got it. <span className="font-medium">Building your learning modules…</span>
          </span>
        )}
      </div>

      {/* Icon row under the input */}
      <UnderInputIcons onUpload={handleUpload} />

      {/* Trust badges pinned to bottom */}
      <footer className="mt-auto pb-6 text-center text-xs text-black/50">
        Audit-ready · Expert-reviewed · Adaptive · Private by default
      </footer>
    </main>
  );
}