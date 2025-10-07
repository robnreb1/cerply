'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface WaitlistModalProps {
  onClose: () => void;
}

export default function WaitlistModal({ onClose }: WaitlistModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [honeypot, setHoneypot] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Honeypot check
    if (honeypot) {
      return;
    }

    if (!email) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: name || undefined,
          source: 'landing_page',
          ua: navigator.userAgent,
          ts: new Date().toISOString(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/waitlist-ok');
      } else if (res.status === 501) {
        // Fallback: provider not configured
        window.location.href = 'mailto:hello@cerply.com?subject=Cerply%20Waitlist';
      } else {
        setError(data.error?.message || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-brand-surface rounded-16 p-8 max-w-md w-full shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Request a Demo</h2>
          <button
            onClick={onClose}
            className="text-brand-subtle hover:text-brand-ink text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Name (optional)
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-brand-border rounded-12 focus:outline-none focus:ring-2 focus:ring-brand-coral-400"
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email <span className="text-brand-coral-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-brand-border rounded-12 focus:outline-none focus:ring-2 focus:ring-brand-coral-400"
              placeholder="you@example.com"
            />
          </div>

          {/* Honeypot field - hidden from users */}
          <input
            type="text"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            style={{ position: 'absolute', left: '-9999px' }}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />

          {error && (
            <div className="text-brand-coral-600 text-sm bg-brand-coral-50 p-3 rounded-12">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn w-full">
            {loading ? 'Submitting...' : 'Request Demo'}
          </button>
        </form>
      </div>
    </div>
  );
}

