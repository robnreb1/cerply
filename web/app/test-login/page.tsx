'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Simple test login page for local development
 * Calls backend directly and sets session cookie
 */
export default function TestLoginPage() {
  const [status, setStatus] = useState('Logging in...');
  const router = useRouter();

  useEffect(() => {
    async function login() {
      try {
        setStatus('Calling backend API...');
        
        // Call backend dev login endpoint directly
        const response = await fetch('http://localhost:8080/api/dev/login-as-manager?redirect=skip', {
          credentials: 'include',
          redirect: 'manual',
        });

        if (response.ok || response.status === 302) {
          setStatus('✅ Login successful! Redirecting...');
          
          // Wait a moment for cookie to be set
          setTimeout(() => {
            window.location.href = '/curator/modules/new';
          }, 1000);
        } else {
          const text = await response.text();
          setStatus(`❌ Login failed: ${text}`);
        }
      } catch (error: any) {
        setStatus(`❌ Error: ${error.message}`);
      }
    }

    login();
  }, []);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-neutral-50">
      <div className="w-full max-w-md rounded-lg border bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-medium">Test Login</h1>
        <div className="text-center">
          <div className="mb-4 text-sm text-neutral-600">
            {status}
          </div>
          {status.includes('❌') && (
            <button
              onClick={() => window.location.reload()}
              className="mt-4 border rounded px-4 py-2 bg-blue-600 text-white hover:bg-blue-700"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

