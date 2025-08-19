'use client';

import { useEffect, useState } from 'react';

type ManifestEntry = {
  id: string;
  title: string;
  role?: string;
  purpose?: string;
  path: string;
  hash: string;
  updatedAt: string;
};

type LoadedPrompt = {
  id: string;
  meta: ManifestEntry;
  raw: string;
  template?: string;
};

export default function PromptsPage() {
  const [list, setList] = useState<ManifestEntry[]>([]);
  const [sel, setSel] = useState<LoadedPrompt | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      fetch('/api/prompts')
        .then(r => r.json())
        .then(d => {
          console.log('Fetched prompts:', d);
          setList(d.prompts ?? []);
        })
        .catch(e => {
          console.error('Error fetching prompts:', e);
          setError(String(e));
        });
    }
  }, []);

  const open = async (id: string) => {
    setError(null);
    setSel(null);
    try {
      const d = await fetch(`/api/prompts/${encodeURIComponent(id)}`).then(r => r.json());
      if (d.error) throw new Error(d.error);
      setSel(d);
    } catch (e:any) { setError(e.message); }
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    alert('Copied to clipboard');
  };

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-brand-ink">Prompt Library</h1>
      {error && <div className="p-3 rounded bg-brand-surface2 border border-brand-border text-red-700">{error}</div>}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <input
            placeholder={`Found ${list.length} prompts…`}
            className="w-full border border-brand-border rounded-[8px] px-3 py-2 bg-brand-surface"
            disabled
          />
          <ul className="divide-y divide-brand-border rounded-[8px] border border-brand-border bg-brand-surface">
            {list.map(p => (
              <li key={p.id} className="p-3 hover:bg-brand-surface2 cursor-pointer" onClick={() => open(p.id)}>
                <div className="font-medium">{p.title}</div>
                <div className="text-sm text-brand-subtle">{p.role || '—'} · {p.updatedAt?.slice(0,10)} · {p.path}</div>
              </li>
            ))}
            {list.length===0 && <li className="p-3 text-brand-subtle">No prompts found (place files under docs/prompt-library or docs/prompts)</li>}
          </ul>
        </div>
        <div className="space-y-3">
          {!sel && <div className="p-4 text-brand-subtle border border-dashed border-brand-border rounded-[8px] bg-brand-surface2">Select a prompt to preview…</div>}
          {sel && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">{sel.meta.title}</div>
                  <div className="text-sm text-brand-subtle">{sel.meta.role || '—'} · {sel.meta.path}</div>
                </div>
                <div className="flex gap-2">
                  <button className="btn" onClick={() => copy(sel.template ?? sel.raw)}>Copy prompt</button>
                  <button className="btn outline" onClick={() => copy(sel.raw)}>Copy raw</button>
                </div>
              </div>
              <pre className="p-3 rounded-[8px] bg-brand-surface border border-brand-border overflow-auto max-h-[60vh] text-sm whitespace-pre-wrap">
{sel.template ?? sel.raw}
              </pre>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
