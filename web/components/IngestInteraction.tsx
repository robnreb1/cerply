"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import UnderInputIcons from "@/components/UnderInputIcons";
import {
  ingestPreview,
  ingestGenerate,
  type ModuleOutline,
  type DraftItem,
} from "@/lib/api";

/**
 * IngestInteraction
 *
 * A lightweight, enterprise-ready interaction flow that:
 * 1) accepts paste, drag-drop, or file upload
 * 2) calls /api/ingest/preview to propose module outlines
 * 3) allows confirmation (and optional pruning) of modules
 * 4) calls /api/ingest/generate to build drafts
 *
 * Keep the component self-contained and "drop-in" for the Home page.
 */
type Props = {
  className?: string;
  /** Optional callback fired after successful generation */
  onComplete?: (result: { modules: ModuleOutline[]; drafts: DraftItem[] }) => void;
  /** Mobile fallback to show a subtle submit button even though Enter submits by default */
  showMobileSubmit?: boolean;
};

type Phase = "idle" | "previewing" | "confirm" | "generating" | "done" | "error";

export default function IngestInteraction({
  className,
  onComplete,
  showMobileSubmit = true,
}: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [modules, setModules] = useState<ModuleOutline[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const dropRef = useRef<HTMLDivElement>(null);

  const canSubmit = useMemo(() => input.trim().length > 0, [input]);

  // --- Files → fold into text payload for now (simple dev path).
  // In future, switch to type: 'file' payload once backend supports binary streams or URLs.
  const readFilesAsText = useCallback(async (files: FileList) => {
    const parts: string[] = [];
    for (const f of Array.from(files)) {
      try {
        const txt = await f.text();
        parts.push(`--- ${f.name} ---\n${txt}`);
      } catch {
        parts.push(`--- ${f.name} (unreadable) ---`);
      }
    }
    return parts.join("\n\n");
  }, []);

  const handleUpload = useCallback(
    async (files: FileList) => {
      const joined = await readFilesAsText(files);
      setInput((prev) => (prev ? `${prev}\n\n${joined}` : joined));
    },
    [readFilesAsText]
  );

  // --- Drag & Drop
  const onDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    dropRef.current?.classList.add("ring-2", "ring-zinc-400");
  };
  const onDragLeave: React.DragEventHandler<HTMLDivElement> = () => {
    dropRef.current?.classList.remove("ring-2", "ring-zinc-400");
  };
  const onDrop: React.DragEventHandler<HTMLDivElement> = async (e) => {
    e.preventDefault();
    dropRef.current?.classList.remove("ring-2", "ring-zinc-400");
    if (e.dataTransfer.files?.length) {
      await handleUpload(e.dataTransfer.files);
    } else if (e.dataTransfer.getData("text/plain")) {
      const t = e.dataTransfer.getData("text/plain");
      setInput((prev) => (prev ? `${prev}\n\n${t}` : t));
    }
  };

  // --- Submit → Preview
  const submitPreview = useCallback(
    async (payload: string) => {
      setError(null);
      setPhase("previewing");
      try {
        const resp = await ingestPreview({
          type: guessType(payload),
          payload,
        });

        setModules(resp.modules ?? []);
        // default select all
        const selectedMap = Object.fromEntries((resp.modules ?? []).map((m) => [m.id, true]));
        setSelected(selectedMap);
        setPhase("confirm");
      } catch (err: any) {
        setError(err?.message ?? "Preview failed");
        setPhase("error");
      }
    },
    []
  );

  // --- Confirm → Generate
  const confirmGenerate = useCallback(async () => {
    setError(null);
    setPhase("generating");
    try {
      const chosen = modules.filter((m) => selected[m.id]);
      const resp = await ingestGenerate({ modules: chosen });
      // be resilient to API shape during active development
      const drafts = (resp as any)?.drafts ?? (resp as any)?.items ?? [];
      setPhase("done");
      onComplete?.({ modules: chosen, drafts });
    } catch (err: any) {
      setError(err?.message ?? "Generation failed");
      setPhase("error");
    }
  }, [modules, onComplete, selected]);

  // --- UI helpers
  const toggleModule = (id: string) =>
    setSelected((s) => ({ ...s, [id]: !s[id] }));

  const reset = () => {
    setPhase("idle");
    setError(null);
    setModules([]);
    setSelected({});
  };

  // Optional descriptive hint for a module; tolerate evolving API fields
  const moduleHint = (m: ModuleOutline): string => {
    const anyM = m as any;
    return (anyM?.why ?? anyM?.summary ?? anyM?.description ?? "") as string;
  };

  return (
    <div className={className}>
      {/* Input / Dropzone */}
      <div
        ref={dropRef}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className="rounded-xl border border-zinc-200 bg-white/60 p-3 shadow-sm backdrop-blur-sm transition focus-within:ring-2 focus-within:ring-zinc-300"
      >
        <label htmlFor="ingest-input" className="sr-only">
          What will you master today?
        </label>
        <textarea
          id="ingest-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste notes, drop a file, or paste a URL…"
          rows={2}
          className="w-full resize-y rounded-md border-0 bg-transparent p-2 text-zinc-900 placeholder-zinc-400 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSubmit) submitPreview(input);
            }
          }}
        />

        {/* Icons row with Upload */}
        <UnderInputIcons onUpload={handleUpload} className="mt-2" />
      </div>

      {/* Mobile subtle submit (fallback) */}
      {showMobileSubmit && phase === "idle" && (
        <div className="mt-3 flex justify-center md:hidden">
          <button
            disabled={!canSubmit}
            onClick={() => submitPreview(input)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 disabled:opacity-40"
          >
            Learn it
          </button>
        </div>
      )}

      {/* Loading / Error states */}
      {phase === "previewing" && (
        <div className="mt-4 text-sm text-zinc-600">Analyzing your material…</div>
      )}
      {phase === "error" && error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <div className="mt-2">
            <button
              onClick={reset}
              className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Confirm modules */}
      {phase === "confirm" && (
        <div className="mt-4">
          <div className="text-sm text-zinc-700">
            Got it. Here’s a first pass at your learning modules — you can deselect any you
            don’t need:
          </div>
          <ul className="mt-3 space-y-2">
            {modules.map((m) => (
              <li
                key={m.id}
                className="flex items-start gap-2 rounded-md border border-zinc-200 bg-white p-3"
              >
                <input
                  id={`mod-${m.id}`}
                  type="checkbox"
                  checked={!!selected[m.id]}
                  onChange={() => toggleModule(m.id)}
                  className="mt-0.5"
                />
                <label htmlFor={`mod-${m.id}`} className="cursor-pointer">
                  <div className="font-medium text-zinc-900">{m.title}</div>
                  {(() => {
                    const hint = moduleHint(m);
                    return hint ? <div className="text-xs text-zinc-500">{hint}</div> : null;
                  })()}
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={confirmGenerate}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800"
            >
              Build learning
            </button>
            <button
              onClick={reset}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* Generating */}
      {phase === "generating" && (
        <div className="mt-4 text-sm text-zinc-600">Generating explanations and questions…</div>
      )}

      {/* Done */}
      {phase === "done" && (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Learning set created. You can find it in your Library.
        </div>
      )}
    </div>
  );
}

/** crude detector for now; can be extended */
function guessType(payload: string): "text" | "url" {
  try {
    const u = new URL(payload.trim());
    return u.protocol.startsWith("http") ? "url" : "text";
  } catch {
    return "text";
  }
}
