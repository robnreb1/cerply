'use client';
import { useState } from 'react';

type MCQItem = {
  id: string;
  stem: string;
  options: string[];
  correctIndex: number;
};

export default function CuratePage() {
  const [chunks, setChunks] = useState<string>('');
  const [countObjectives, setCountObjectives] = useState<number>(2);
  const [itemsPerObjective, setItemsPerObjective] = useState<number>(3);
  const [items, setItems] = useState<MCQItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setItems([]);

    try {
      const body = {
        chunks: chunks
          .split('\n')
          .map(s => s.trim())
          .filter(Boolean),
        count_objectives: countObjectives,
        items_per_objective: itemsPerObjective,
      };

      const res = await fetch('http://localhost:8080/api/items/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? 'Request failed');
      }
      setItems(data.items ?? []);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 840, margin: '40px auto', padding: 16 }}>
      <h1>Curate: Generate MCQs</h1>

      <label style={{ display: 'block', margin: '16px 0 8px' }}>
        Paste chunks (one per line)
      </label>
      <textarea
        value={chunks}
        onChange={e => setChunks(e.target.value)}
        rows={8}
        style={{ width: '100%' }}
        placeholder={`Line 1...\nLine 2...`}
      />

      <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
        <label>
          Objectives:&nbsp;
          <input
            type="number"
            min={1}
            max={20}
            value={countObjectives}
            onChange={e => setCountObjectives(parseInt(e.target.value || '1', 10))}
            style={{ width: 80 }}
          />
        </label>

        <label>
          Items / objective:&nbsp;
          <input
            type="number"
            min={1}
            max={10}
            value={itemsPerObjective}
            onChange={e => setItemsPerObjective(parseInt(e.target.value || '1', 10))}
            style={{ width: 80 }}
          />
        </label>

        <button onClick={generate} disabled={loading}>
          {loading ? 'Generating…' : 'Generate'}
        </button>
      </div>

      {error && (
        <div style={{ color: 'crimson', marginTop: 12 }}>
          {error}
        </div>
      )}

      <hr style={{ margin: '24px 0' }} />

      <h2>Items ({items.length})</h2>
      <ol>
        {items.map((it) => (
          <li key={it.id} style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600 }}>{it.stem}</div>
            <ul>
              {it.options.map((opt, idx) => (
                <li key={idx}>
                  {opt}{' '}
                  {idx === it.correctIndex ? <strong>(correct)</strong> : null}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
