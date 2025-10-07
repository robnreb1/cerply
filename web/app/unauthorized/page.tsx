'use client';

import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="w-full max-w-lg rounded-lg border bg-white p-8 shadow-sm text-center">
        <div className="mb-6">
          <svg
            className="mx-auto h-16 w-16 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="mb-4 text-2xl font-semibold text-neutral-900">Access Restricted</h1>
        <p className="mb-6 text-neutral-600">
          This resource is only available to authorized enterprise users. 
          Please contact your organization administrator if you believe you should have access.
        </p>
        <div className="space-y-3">
          <Link
            href="/login"
            className="block w-full rounded border border-blue-600 bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition"
          >
            Try logging in again
          </Link>
          <a
            href="mailto:support@cerply.com?subject=Access%20Request"
            className="block w-full rounded border border-neutral-300 px-4 py-2 text-neutral-700 hover:bg-neutral-50 transition"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}

