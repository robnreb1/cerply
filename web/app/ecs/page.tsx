'use client';

import { useEffect, useState } from 'react';

type CoverageGap = { id: string; kind: string; detail: string; suggestion: string };
type CoverageSummary = { objectives: number; items: number; covered: number; gaps: number };
type CoverageResp = { scopeId: string; summary: CoverageSummary; gaps: CoverageGap[] };

const API = 'http://localhost:8080';

export default function ECSPage() {
  const [data, setData] = useState<CoverageResp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/evidence/coverage?scopeId=demo`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message ?? 'Failed to load coverage');
        setData(json as CoverageResp);
      } catch (e: any) {
        setError(e.message || 'Failed to load coverage');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div style={{ maxWidth: 880, margin: '40px auto', padding: 16 }}>
      <h1>Evidence Coverage</h1>
      {loading && <div>Loading…</div>}
      {error && <div style={{ color: 'crimson' }}>{error}</div>}
      {data && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
            margin: '16px 0'
          }}>
            <Stat label="Objectives" value={data.summary.objectives} />
            <Stat label="Items" value={data.summary.items} />
            <Stat label="Covered" value={data.summary.covered} />
            <Stat label="Gaps" value={data.summary.gaps} />
          </div>

          <h2 style={{ marginTop: 24 }}>Gaps</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {data.gaps.map(g => (
              <li key={g.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 10 }}>
                <div style={{ fontWeight: 600 }}>
                  [{g.kind}] {g.detail}
                </div>
                <div style={{ marginTop: 6 }}>
                  <em>Suggestion:</em> {g.suggestion}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 12, color: '#555' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
