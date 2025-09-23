"use client";
import { useState } from 'react';
import { apiBase } from '../../../lib/apiBase';
import { postCertifiedPlan } from '../../../lib/api/generated';

export default function CertifiedPreviewPage() {
  if (process.env.NEXT_PUBLIC_PREVIEW_CERTIFIED_UI !== 'true') {
    return (
      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>Certified Preview</h1>
        <p>Preview disabled. Set NEXT_PUBLIC_PREVIEW_CERTIFIED_UI=true to enable.</p>
      </div>
    );
  }

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<number | null>(null);
  const [json, setJson] = useState<any>(null);
  const [topic, setTopic] = useState<string>('');
  const [level, setLevel] = useState<string>('');
  const [goals, setGoals] = useState<string>('');

  async function callPlan() {
    setLoading(true);
    setStatus(null);
    setJson(null);
    try {
      const goalsArr = goals.split(',').map((s) => s.trim()).filter(Boolean);
      const r = await postCertifiedPlan(apiBase(), { topic, level: level || undefined, goals: goalsArr.length ? goalsArr : undefined } as any);
      setStatus(r.status);
      setJson(r.json);
    } catch (e) {
      setStatus(-1);
      setJson({ error: String((e as any)?.message || e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <h1 style={{ fontSize: 18, fontWeight: 600 }}>Certified Preview</h1>
      <div style={{ display: 'grid', gap: 8, alignItems: 'center', gridTemplateColumns: '1fr 180px 1fr auto' }}>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter a topic (e.g., Hashes)"
          aria-label="Topic"
          style={{ flex: 1, padding: '8px 10px', border: '1px solid #ccc', borderRadius: 8 }}
        />
        <select value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Level" style={{ padding: '8px 10px', border: '1px solid #ccc', borderRadius: 8 }}>
          <option value="">Level (optional)</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <input
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          placeholder="Goals (comma-separated)"
          aria-label="Goals"
          style={{ flex: 1, padding: '8px 10px', border: '1px solid #ccc', borderRadius: 8 }}
        />
        <button onClick={callPlan} disabled={loading || !topic.trim()} style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: 8 }}>
          {loading ? 'Calling…' : 'POST /api/certified/plan'}
        </button>
      </div>
      {status !== null && (
        <div>
          <div style={{ marginBottom: 8 }}>Status: <strong>{status}</strong></div>
          {(status === 415 || status === 400 || status === 501 || status === 503) && (
            <div style={{ marginBottom: 8, padding: 8, background: '#fff3cd', border: '1px solid #ffe2a1', borderRadius: 8 }}>
              {status === 415 ? 'Unsupported media type: send JSON (application/json).' :
               status === 400 ? 'Bad request: include a non-empty topic.' :
               status === 501 ? 'Certified is enabled but not implemented yet.' : 'Cerply Certified is disabled.'}
            </div>
          )}
          {json && (
            <pre style={{ background: '#0b0b0b', color: '#d5f5e3', padding: 12, borderRadius: 8, overflowX: 'auto' }}>
{JSON.stringify(json, null, 2)}
            </pre>
          )}
          {json?.request_id && (
            <div style={{ marginTop: 8 }}>request_id: <code style={{ background: '#fff3cd', padding: '2px 6px', borderRadius: 6 }}>{json.request_id}</code></div>
          )}
        </div>
      )}
    </div>
  );
}


