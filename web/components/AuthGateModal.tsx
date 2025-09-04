'use client';
import { useState } from 'react';

export function AuthGateModal({
  open, onClose, onVerified,
}: { open: boolean; onClose: () => void; onVerified: (userId:string)=>void }) {
  const [email, setEmail] = useState(''); 
  const [sent, setSent] = useState(false);
  const [link, setLink] = useState<string | null>(null); // DEV shortcut

  async function start() {
    const res = await fetch('/auth/magic/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setSent(true);
    if (data.dev_link) setLink(data.dev_link); // only when DEV_AUTH=1 on API
  }

  async function verify(token: string) {
    const res = await fetch(`/auth/magic/verify?token=${encodeURIComponent(token)}`, { redirect: 'follow' });
    if (res.ok) {
      const uid = (await res.json()).userId;
      onVerified(uid);
      onClose();
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold">Sign in to build your plan</h3>
        <p className="mt-1 text-sm text-neutral-600">
          We’ll save your learning plan and track progress across devices.
        </p>
        {!sent ? (
          <div className="mt-4 flex gap-2">
            <input
              value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="you@company.com" className="flex-1 rounded border px-3 py-2"
            />
            <button onClick={start} className="rounded bg-black px-3 py-2 text-white">Send link</button>
          </div>
        ) : (
          <div className="mt-4 text-sm">
            Check your email for a magic link.
            {link && (
              <div className="mt-2">
                <button onClick={()=>verify(new URL(link).searchParams.get('token')||'')}
                        className="rounded border px-2 py-1 text-xs">
                  Dev: verify now
                </button>
              </div>
            )}
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="text-sm text-neutral-600">Close</button>
        </div>
      </div>
    </div>
  );
}