'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiBase } from '@/lib/apiBase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('Sending magic link…');
    try {
      const r = await fetch(`${apiBase()}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
      const j = await r.json().catch(() => ({} as any));
      if (!r.ok) {
        setStatus(j?.error?.message || 'Login failed');
        return;
      }
      if (j?.next) {
        const redirect = encodeURIComponent(window.location.origin + '/');
        const sep = j.next.includes('?') ? '&' : '?';
        window.location.href = `${apiBase()}${j.next}${sep}redirect=${redirect}`;
        return;
      }
      setStatus('Unexpected response.');
    } catch (e: any) {
      setStatus(`Network error: ${e?.message || e}`);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-neutral-50">
      <div className="w-full max-w-md rounded-lg border bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-medium">Log in to Cerply</h1>
        <p className="mb-4 text-sm text-neutral-600">
          Enter your email. We’ll open a secure link to set your session and bring you back here.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full border rounded px-3 py-2"
          />
          <button type="submit" className="border rounded px-3 py-2 w-full bg-blue-600 text-white">
            Send magic link
          </button>
        </form>
        {status && <div className="mt-4 text-sm text-neutral-700">{status}</div>}
      </div>
    </div>
  );
}




