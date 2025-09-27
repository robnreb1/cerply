"use client";
import { useEffect, useState } from 'react';
import { apiRoute } from '../../../lib/apiBase';

export default function AuthPreviewPage() {
  const enabled = String(process.env.NEXT_PUBLIC_PREVIEW_AUTH_UI || 'false').toLowerCase() === 'true';
  const [info, setInfo] = useState<{ session_id?: string; expires_at?: string } | null>(null);
  const [csrf, setCsrf] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    // try load
    fetch(apiRoute('auth/session'), { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(j => setInfo(j))
      .catch(() => {});
  }, [enabled]);

  if (!enabled) return <div className="p-6 text-sm text-brand-ink/70">Auth preview UI is disabled.</div>;

  async function createSession() {
    setError(null);
    const r = await fetch(apiRoute('auth/session'), { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: '{}' });
    const j = await r.json();
    if (!r.ok) { setError('Failed to create session'); return; }
    setInfo({ session_id: j.session_id, expires_at: j.expires_at });
    setCsrf(j.csrf_token);
    // Also update non-HttpOnly cookie client-side (belt and braces)
    try { document.cookie = `csrf=${j.csrf_token}; Path=/; SameSite=Lax`; } catch {}
  }

  async function deleteSession() {
    setError(null);
    const r = await fetch(apiRoute('auth/session'), { method: 'DELETE', credentials: 'include' });
    if (!r.ok) { setError('Failed to delete session'); return; }
    setInfo(null); setCsrf(null);
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-lg font-semibold">Auth Preview</h1>
      <div className="space-x-2">
        <button className="btn" onClick={createSession}>Create session</button>
        <button className="btn" onClick={deleteSession}>Delete session</button>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="text-sm">
        <div>session_id: <code>{info?.session_id || '—'}</code></div>
        <div>expires_at: <code>{info?.expires_at || '—'}</code></div>
        <div>csrf_token: <code>{csrf || '—'}</code></div>
      </div>
    </div>
  );
}


