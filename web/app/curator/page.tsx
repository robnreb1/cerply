
'use client';
import { useEffect, useState } from 'react';
const FF = process.env.NEXT_PUBLIC_FF_CURATOR_DASHBOARD_V1 === 'true';
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function Curator() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!FF) return;
    (async () => {
      const r = await fetch(`${apiUrl}/curator/items`);
      const data = await r.json();
      setItems(data.items || []);
      setLoading(false);
    })();
  }, []);

  if (!FF) return <main style={{padding:24}}><h2>Curator Dashboard</h2><p>Feature flag off.</p></main>;
  if (loading) return <main style={{padding:24}}><p>Loading…</p></main>;

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h2>Curator Dashboard</h2>
      <p>Filter and click an item to edit.</p>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead><tr><th align="left">ID</th><th align="left">Objective</th><th align="left">Status</th><th align="left">Trust</th></tr></thead>
        <tbody>
          {items.map(it => (
            <tr key={it.id}>
              <td><a href={`/curator/items/${it.id}`}>{it.id}</a></td>
              <td>{it.objective_id}</td>
              <td>{it.status}</td>
              <td>{it.trust_label || 'UNLABELLED'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
