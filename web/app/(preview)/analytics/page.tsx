"use client";
import { useEffect, useState } from 'react';

export default function AnalyticsPreviewPage() {
  if (process.env.NEXT_PUBLIC_PREVIEW_ANALYTICS !== 'true') {
    return <div style={{ padding: 16 }}>Analytics preview disabled. Set NEXT_PUBLIC_PREVIEW_ANALYTICS=true.</div>;
  }

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    fetch('/api/analytics/aggregate', { cache: 'no-store' })
      .then((r) => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <h1 style={{ fontSize: 18, fontWeight: 600 }}>Analytics (Preview)</h1>
      {loading && <div>Loading…</div>}
      {data && (
        <div style={{ display: 'grid', gap: 12 }}>
          <section>
            <h2 style={{ fontWeight: 600 }}>Totals by Event</h2>
            <ul>
              {Object.entries(data.totals?.by_event || {}).map(([k,v]) => (
                <li key={k}><code>{k}</code>: {v as any}</li>
              ))}
            </ul>
          </section>
          <section>
            <h2 style={{ fontWeight: 600 }}>By Day</h2>
            <ul>
              {(data.totals?.by_day || []).map((r:any) => (
                <li key={r.day}><code>{r.day}</code>: {r.count}</li>
              ))}
            </ul>
          </section>
          {data.totals?.engines && (
            <section>
              <h2 style={{ fontWeight: 600 }}>Engines</h2>
              <ul>
                {Object.entries(data.totals.engines).map(([k,v]) => (<li key={k}><code>{k}</code>: {v as any}</li>))}
              </ul>
            </section>
          )}
          {data.totals?.topics && (
            <section>
              <h2 style={{ fontWeight: 600 }}>Topics</h2>
              <ul>
                {Object.entries(data.totals.topics).map(([k,v]) => (<li key={k}><code>{k}</code>: {v as any}</li>))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}


