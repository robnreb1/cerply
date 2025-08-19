'use client';

import { useState, useMemo } from 'react';
import { QualityPanel } from '../../components/QualityPanel';

type MCQItem = {
  id: string;
  stem: string;
  options: string[];
  correctIndex: number;
};
type Objective = { id: string; title: string; items: MCQItem[] };
type ImportResp = { scopeId: string; template: string; chunks: string[] };
type GenerateResp = { items: MCQItem[]; objectives: Objective[] };
type QualityMeta = { readability?: number; bannedFlags?: string[]; qualityScore?: number; sourceSnippet?: string };


const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080';

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ');
}

export default function CuratePage() {
  const [tab, setTab] = useState<'source' | 'generate' | 'quality'>('source');
  
  // Check if quality bar feature is enabled
  const qualityBarEnabled = process.env.NEXT_PUBLIC_FF_QUALITY_BAR_V1 === 'true';

  // Source/import state
  const [text, setText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [importData, setImportData] = useState<ImportResp | null>(null);

  // Generate state
  const [countObjectives, setCountObjectives] = useState(2);
  const [itemsPerObjective, setItemsPerObjective] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [genErr, setGenErr] = useState<string | null>(null);
  const [genData, setGenData] = useState<GenerateResp | null>(null);



  const chunkPreview = useMemo(() => (importData?.chunks ?? []).slice(0, 10), [importData]);

  async function importFromText() {
    setImportErr(null);
    setImporting(true);
    try {
      const res = await fetch(`${API_BASE}/import/file`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'pasted.txt',
          content: text,
          template: 'policy',
          scopeId: 'demo',
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error?.message || j?.error || res.statusText);
      }
      const j = (await res.json()) as ImportResp;
      setImportData(j);
      setTab('generate');
    } catch (e: any) {
      setImportErr(e?.message ?? 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  function readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject(new Error('read failed'));
      fr.onload = () => resolve(String(fr.result).split(',')[1] || '');
      fr.readAsDataURL(file);
    });
  }
  function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject(new Error('read failed'));
      fr.onload = () => resolve(String(fr.result));
      fr.readAsText(file);
    });
  }

  async function importFromFile(file: File) {
    setImportErr(null);
    setImporting(true);
    try {
      const lower = file.name.toLowerCase();
      const isBinary = lower.endsWith('.pdf') || lower.endsWith('.docx');
      const payload: any = {
        name: file.name,
        template: 'policy',
        scopeId: 'demo',
      };
      if (isBinary) {
        payload.contentBase64 = await readFileAsBase64(file);
      } else {
        payload.content = await readFileAsText(file);
      }
      const res = await fetch(`${API_BASE}/import/file`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error?.message || j?.error || res.statusText);
      }
      const j = (await res.json()) as ImportResp;
      setImportData(j);
      setTab('generate');
    } catch (e: any) {
      setImportErr(e?.message ?? 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  async function generateItems() {
    setGenErr(null);
    setGenerating(true);
    try {
      let chunks = importData?.chunks;
      if ((!chunks || chunks.length === 0) && text.trim()) {
        // Fallback: call import endpoint implicitly on current text
        const resImport = await fetch(`${API_BASE}/import/file`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            name: 'pasted.txt',
            content: text,
            template: 'policy',
            scopeId: 'demo',
          }),
        });
        if (resImport.ok) {
          const j = (await resImport.json()) as ImportResp;
          setImportData(j);
          chunks = j.chunks;
        }
      }
      if (!chunks || chunks.length === 0) {
        throw new Error('Nothing to generate from — import some text or a file first.');
      }
      const res = await fetch(`${API_BASE}/api/items/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chunks,
          count_objectives: countObjectives,
          items_per_objective: itemsPerObjective,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error?.message || j?.error || res.statusText);
      }
      const j = (await res.json()) as GenerateResp;
      setGenData(j);
      setTab('quality');
    } catch (e: any) {
      setGenErr(e?.message ?? 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }



  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Curate</h1>
        <nav className="inline-flex gap-2">
          <button
            className={clsx('btn', tab === 'source' && 'bg-[var(--brand-coral-500)] text-white')}
            onClick={() => setTab('source')}
          >
            Source
          </button>
          <button
            className={clsx('btn', tab === 'generate' && 'bg-[var(--brand-coral-500)] text-white')}
            onClick={() => setTab('generate')}
          >
            Generate
          </button>
                  {qualityBarEnabled && (
          <button
            className={clsx('btn', tab === 'quality' && 'bg-[var(--brand-coral-500)] text-white')}
            onClick={() => setTab('quality')}
          >
            Quality
          </button>
        )}
        </nav>
      </header>

      {tab === 'source' && (
        <section className="card space-y-4">
          <h2 className="text-lg font-medium">Paste text or upload a file</h2>
          <textarea
            className="w-full min-h-[180px] p-4 rounded-md border border-[var(--brand-border)] bg-[var(--brand-surface)]"
            placeholder="Paste policy, meeting notes, or transcript…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <button className="btn" onClick={importFromText} disabled={importing || !text.trim()}>
              {importing ? 'Importing…' : 'Chunk & Save'}
            </button>
            <label className="btn cursor-pointer">
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importFromFile(f);
                }}
                accept=".txt,.md,.pdf,.docx"
              />
              Upload file
            </label>
            <span className="text-sm text-[var(--brand-subtle)]">
              Supports .txt, .md, .pdf, .docx
            </span>
          </div>
          {importErr && <p className="text-[var(--role-color-error,#D14D57)]">{importErr}</p>}
          {chunkPreview.length > 0 && (
            <div className="mt-2">
              <div className="text-sm mb-1 text-[var(--brand-subtle)]">Preview (first 10 chunks)</div>
              <ul className="list-disc pl-6 space-y-1">
                {chunkPreview.map((c, i) => (
                  <li key={i} className="text-sm leading-snug">{c}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {tab === 'generate' && (
        <section className="card space-y-4">
          <h2 className="text-lg font-medium">Generate items</h2>
          <div className="flex items-end gap-4">
            <label className="flex flex-col">
              <span className="text-sm mb-1">Objectives</span>
              <input
                type="number"
                min={1}
                max={20}
                value={countObjectives}
                onChange={(e) => setCountObjectives(Number(e.target.value))}
                className="input"
              />
            </label>
            <label className="flex flex-col">
              <span className="text-sm mb-1">Items / objective</span>
              <input
                type="number"
                min={1}
                max={10}
                value={itemsPerObjective}
                onChange={(e) => setItemsPerObjective(Number(e.target.value))}
                className="input"
              />
            </label>
            <button className="btn" onClick={generateItems} disabled={generating}>
              {generating ? 'Generating…' : 'Generate'}
            </button>
          </div>
          {genErr && <p className="text-[var(--role-color-error,#D14D57)]">{genErr}</p>}
          {genData?.objectives?.length ? (
            <div className="space-y-3">
              {genData.objectives.map((o) => (
                <div key={o.id} className="border border-[var(--brand-border)] rounded-md p-3 bg-[var(--brand-surface)]">
                  <div className="font-medium mb-2">{o.title}</div>
                  <ol className="list-decimal pl-6 space-y-2">
                    {o.items.map((it) => (
                      <li key={it.id}>
                        <div className="font-medium">{it.stem}</div>
                        <ul className="list-disc pl-5 text-sm">
                          {it.options.map((op, i) => (
                            <li key={i} className={i === it.correctIndex ? 'font-semibold' : ''}>{op}</li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--brand-subtle)]">No items yet — import some text on the Source tab and click Generate.</p>
          )}
        </section>
      )}

      {tab === 'quality' && qualityBarEnabled && (
        <QualityPanel items={genData?.items || []} />
      )}
    </main>
  );
}
