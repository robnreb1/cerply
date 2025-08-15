'use client';

import { useEffect, useState } from 'react';

type PilotResponse = {
  completion21d?: number;
  spacedCoverage?: number;
  lift?: { d7?: number; d30?: number };
  [k: string]: any;
};

export default function AnalyticsPilot() {
  const [data, setData] = useState<PilotResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';
    fetch(`${api}/analytics/pilot`)
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Analytics (pilot)</h1>

      {error && <p className="text-red-600">Error: {error}</p>}
      {!data ? (
        <p>Loading…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card label="Completion (21 days)" value={fmtPct(data.completion21d)} />
          <Card label="Spaced-return coverage" value={fmtPct(data.spacedCoverage)} />
          <Card label="Knowledge lift D0 → D7" value={fmtNum(data.lift?.d7)} />
          <Card label="Knowledge lift D0 → D30" value={fmtNum(data.lift?.d30)} />
        </div>
      )}
    </main>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function fmtPct(n?: number) {
  if (typeof n !== 'number') return '—';
  return `${Math.round(n * 100)}%`;
}
function fmtNum(n?: number) {
  if (typeof n !== 'number') return '—';
  return `${Math.round(n * 100) / 100}`;
}
