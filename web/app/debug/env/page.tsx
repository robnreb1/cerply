// web/app/debug/env/page.tsx
// Internal debug page per FSD §13 M2 requirements
'use client';
import { useEffect, useState } from 'react';

export default function DebugEnvPage() {
  const [health, setHealth] = useState<any>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'not set';

  useEffect(() => {
    fetch('/api/health', { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      })
      .then((data) => setHealth(data))
      .catch((err) => setHealthError(String(err)));
  }, []);

  return (
    <main className="min-h-screen bg-neutral-50 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold text-neutral-900 mb-6">
          Debug: Environment & Proxy
        </h1>

        <section className="bg-white rounded-lg border border-neutral-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-neutral-800 mb-3">
            Build-time Environment
          </h2>
          <dl className="space-y-2 font-mono text-sm">
            <div>
              <dt className="font-semibold text-neutral-600">
                NEXT_PUBLIC_API_BASE:
              </dt>
              <dd className="text-neutral-900">{apiBase}</dd>
            </div>
            <div>
              <dt className="font-semibold text-neutral-600">
                NEXT_PUBLIC_ENTERPRISE_MODE:
              </dt>
              <dd className="text-neutral-900">
                {process.env.NEXT_PUBLIC_ENTERPRISE_MODE || 'not set'}
              </dd>
            </div>
          </dl>
        </section>

        <section className="bg-white rounded-lg border border-neutral-200 p-6">
          <h2 className="text-lg font-semibold text-neutral-800 mb-3">
            Proxy Health Check: GET /api/health
          </h2>
          {health && (
            <pre className="bg-neutral-50 rounded p-4 text-xs overflow-x-auto">
              {JSON.stringify(health, null, 2)}
            </pre>
          )}
          {healthError && (
            <p className="text-red-600 text-sm">Error: {healthError}</p>
          )}
          {!health && !healthError && (
            <p className="text-neutral-500 text-sm">Loading...</p>
          )}
        </section>

        <footer className="mt-8 text-xs text-neutral-500 text-center">
          This page verifies that the Next.js proxy is correctly forwarding
          /api/* to the backend API.
        </footer>
      </div>
    </main>
  );
}
