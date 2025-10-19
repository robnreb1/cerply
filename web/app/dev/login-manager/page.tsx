'use client';

import { useEffect, useState } from 'react';
import { apiBase } from '@/lib/apiBase';

/**
 * Dev Login Helper for Manager Role
 * Hits the backend API directly to set session cookie, then redirects
 */
export default function DevLoginManagerPage() {
  const [status, setStatus] = useState('Logging in as manager...');

  useEffect(() => {
    const performLogin = async () => {
      try {
        const redirectUrl = `${window.location.origin}/`;
        const apiUrl = `${apiBase()}/api/dev/login-as-manager?redirect=${encodeURIComponent(redirectUrl)}`;
        
        // Use window.location to navigate directly to the API endpoint
        // This ensures the cookie is set in the browser
        window.location.href = apiUrl;
      } catch (err: any) {
        setStatus(`Error: ${err?.message || String(err)}`);
      }
    };

    performLogin();
  }, []);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-neutral-50">
      <div className="w-full max-w-md rounded-lg border bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-medium">Dev Login</h1>
        <p className="text-center text-sm text-neutral-600">{status}</p>
      </div>
    </div>
  );
}

