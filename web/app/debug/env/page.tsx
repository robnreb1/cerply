// web/app/debug/env/page.tsx
'use client';

import { useEffect, useState } from 'react';

type Health = { ok?: boolean; env?: string; note?: string; error?: string };

const VARS = [
  'NEXT_PUBLIC_API_BASE',
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_BRAND',
  'NEXT_PUBLIC_ENV',
  'NEXT_PUBLIC_FF_QUALITY_BAR_V1',
  'NEXT_PUBLIC_FF_CONNECTORS_BASIC_V1',
] as const;

const buildEnv: Record<(typeof VARS)[number], string | undefined> = {
  NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_BRAND: process.env.NEXT_PUBLIC_BRAND,
  NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
  NEXT_PUBLIC_FF_QUALITY_BAR_V1: process.env.NEXT_PUBLIC_FF_QUALITY_BAR_V1,
  NEXT_PUBLIC_FF_CONNECTORS_BASIC_V1: process.env.NEXT_PUBLIC_FF_CONNECTORS_BASIC_V1,
};

export default function DebugEnvPage() {
  const [health, setHealth] = useState<Health>({});
  const [promptsOk, setPromptsOk] = useState<'ok' | 'fail' | 'pending'>('pending');
  const [healthStatus, setHealthStatus] = useState<'ok' | 'fail' | 'pending'>('pending');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/health');
        const json = await res.json().catch(() => ({}));
        if (res.ok) {
          setHealth(json);
          setHealthStatus('ok');
        } else {
          setHealth({ error: `HTTP ${res.status}` });
          setHealthStatus('fail');
        }
      } catch (e: any) {
        setHealth({ error: String(e?.message || e) });
        setHealthStatus('fail');
      }

      try {
        const r = await fetch('/api/prompts');
        setPromptsOk(r.ok ? 'ok' : 'fail');
      } catch {
        setPromptsOk('fail');
      }
    })();
  }, []);

  const getStatusIndicator = (status: 'ok' | 'fail' | 'pending') => {
    switch (status) {
      case 'ok': return <span style={{ color: 'green', fontWeight: 'bold' }}>✅ OK</span>;
      case 'fail': return <span style={{ color: 'red', fontWeight: 'bold' }}>❌ FAIL</span>;
      case 'pending': return <span style={{ color: 'orange' }}>⏳ Pending...</span>;
    }
  };

  return (
    <main style={{ padding: 24, fontFamily: 'ui-sans-serif, system-ui' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Debug / Env</h1>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontWeight: 600, marginBottom: 8 }}>Build-time env (NEXT_PUBLIC_*)</h2>
        <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 900 }}>
          <tbody>
            {VARS.map((k) => (
              <tr key={k}>
                <td style={{ borderBottom: '1px solid #eee', padding: '6px 8px', width: 340 }}>
                  <code>{k}</code>
                </td>
                <td style={{ borderBottom: '1px solid #eee', padding: '6px 8px' }}>
                  <code>{String(buildEnv[k] ?? '—')}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontWeight: 600, marginBottom: 8 }}>API Endpoints (via Next proxy)</h2>
        
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontWeight: 500, marginBottom: 8 }}>/api/health</h3>
          <p style={{ marginBottom: 8 }}>
            Status: {getStatusIndicator(healthStatus)}
          </p>
          <pre
            style={{
              background: '#fafafa',
              border: '1px solid #eee',
              borderRadius: 8,
              padding: 12,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {JSON.stringify(health, null, 2)}
          </pre>
        </div>

        <div>
          <h3 style={{ fontWeight: 500, marginBottom: 8 }}>/api/prompts</h3>
          <p>
            Status: {getStatusIndicator(promptsOk)}
          </p>
        </div>
      </section>
    </main>
  );
}