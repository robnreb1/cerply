'use client';
import { useEffect, useRef, useState } from 'react';
import { apiRoute } from '@/lib/apiBase';

export default function OrchestratorPreviewPage() {
  const enabled = process.env.NEXT_PUBLIC_PREVIEW_ORCH_UI === 'true';
  const [goal, setGoal] = useState('Demo goal');
  const [jobId, setJobId] = useState<string | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const evtRef = useRef<EventSource | null>(null);

  useEffect(() => {
    return () => { try { evtRef.current?.close(); } catch {} };
  }, []);

  const submit = async () => {
    setEvents([]);
    setJobId(null);
    const r = await fetch(apiRoute('orchestrator/jobs'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ goal, steps: [], limits: { maxSteps: 3, maxWallMs: 3000 } }),
    });
    const j = await r.json();
    if (!j?.job_id) return;
    setJobId(j.job_id);
    const url = apiRoute(`orchestrator/events?job=${encodeURIComponent(j.job_id)}`);
    const es = new EventSource(url);
    evtRef.current = es;
    es.onmessage = (e) => setEvents((prev) => [...prev, e.data]);
    es.addEventListener('step.start', (e) => setEvents((prev) => [...prev, (e as MessageEvent).data]));
    es.addEventListener('end', (e) => setEvents((prev) => [...prev, (e as MessageEvent).data]));
  };

  if (!enabled) return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-lg font-semibold">Orchestrator Preview</h1>
      <p className="mt-2 text-sm text-neutral-600">Set NEXT_PUBLIC_PREVIEW_ORCH_UI=true to enable the preview console.</p>
    </main>
  );

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-lg font-semibold">Orchestrator Preview</h1>
      <div className="mt-4 flex gap-2">
        <input value={goal} onChange={(e) => setGoal(e.target.value)} className="flex-1 border rounded px-3 py-2" placeholder="Goal" />
        <button onClick={submit} className="px-3 py-2 rounded bg-brand text-white">Submit</button>
      </div>
      {jobId && (
        <p className="mt-3 text-sm text-neutral-600">Job: {jobId}</p>
      )}
      <pre className="mt-4 text-xs bg-neutral-50 border rounded p-3 min-h-[120px] whitespace-pre-wrap">{events.join('\n')}</pre>
    </main>
  );
}


