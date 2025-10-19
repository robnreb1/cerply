'use client';

import { useEffect } from 'react';

/**
 * Dev Login Helper for Manager Role
 * Uses Next.js API proxy which rewrites cookies for same-domain
 */
export default function DevLoginManagerPage() {
  useEffect(() => {
    // Redirect to the dev login endpoint through the Next.js proxy
    // The proxy will rewrite the Set-Cookie header so it works on vercel.app domain
    const redirectUrl = encodeURIComponent(`${window.location.origin}/`);
    window.location.href = `/api/dev/login-as-manager?redirect=${redirectUrl}`;
  }, []);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-neutral-50">
      <div className="w-full max-w-md rounded-lg border bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-medium">Dev Login</h1>
        <p className="text-center text-sm text-neutral-600">
          Logging in as manager...
        </p>
      </div>
    </div>
  );
}

