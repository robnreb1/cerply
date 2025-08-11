
'use client';
import { useState } from 'react';

export default function Decompose() {
  const [text, setText] = useState('Our policy requires AML checks for all new customers and records must be retained for 6 years.');
  const [resp, setResp] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  async function run() {
    setLoading(true);
    setResp(null);
    const r = await fetch(`${apiUrl}/rde/decompose`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await r.json();
    setResp(data);
    setLoading(false);
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h2>Decomposer</h2>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={6} style={{ width: '100%', padding: 12 }} />
      <div style={{ marginTop: 12 }}>
        <button onClick={run} disabled={loading} style={{ padding: '8px 12px' }}>
          {loading ? 'Decomposing…' : 'Decompose'}
        </button>
      </div>
      {resp && (
        <pre style={{ marginTop: 16, background: '#111', color: '#eee', padding: 12, borderRadius: 8, overflowX: 'auto' }}>
{JSON.stringify(resp, null, 2)}
        </pre>
      )}
    </main>
  );
}
