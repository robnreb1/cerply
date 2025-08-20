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

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/health');
        const json = await res.json().catch(() => ({}));
        setHealth(res.ok ? json : { error: `HTTP ${res.status}` });
      } catch (e: any) {
        setHealth({ error: String(e?.message || e) });
      }

      try {
        const r = await fetch('/api/prompts');
        setPromptsOk(r.ok ? 'ok' : 'fail');
      } catch {
        setPromptsOk('fail');
      }
    })();
  }, []);

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
        <h2 style={{ fontWeight: 600, marginBottom: 8 }}>API health (via Next rewrite)</h2>
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
        <p style={{ marginTop: 8 }}>
          `/api/prompts` check: {promptsOk === 'pending' ? '…' : promptsOk === 'ok' ? '✅ OK' : '❌ FAIL'}
        </p>
      </section>
    </main>
  );
}