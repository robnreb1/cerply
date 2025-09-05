"use client";
import React, { useState } from 'react';

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE as string) || 'http://localhost:8080';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string>('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('');
    try {
      const r = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
        credentials: 'include',
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j?.next) {
        // For dev stub, API returns next: /api/auth/callback?token=...
        const redirect = encodeURIComponent(window.location.origin + '/');
        const sep = j.next.includes('?') ? '&' : '?';
        window.location.href = `${API_BASE}${j.next}${sep}redirect=${redirect}`;
        return;
      }
      setStatus('Could not initiate login.');
    } catch (e) {
      setStatus('Network error. Please ensure the API is running on :8080.');
    }
  }

  return (
    <div className="min-h-dvh w-full flex flex-col">
      <main className="flex-1 px-4 py-6">
        <div className="max-w-md mx-auto space-y-4">
          <h1 className="text-xl font-semibold">Log in</h1>
          <p className="text-sm text-neutral-600">Enter your email to log in. We’ll open a secure link to set your session and bring you back here.</p>
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
            <button type="submit" className="border rounded px-3 py-2">Send magic link</button>
          </form>
          {status && <div className="text-sm text-red-600">{status}</div>}
        </div>
      </main>
    </div>
  );
}
