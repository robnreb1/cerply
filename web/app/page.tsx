// web/app/page.tsx
// Enterprise B2B: Redirect to login/manager dashboard

'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to login - enterprise users should authenticate first
    router.push('/login');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-neutral-900 mb-4">
          Redirecting to login...
        </h1>
        <p className="text-neutral-500">
          Enterprise access requires authentication
        </p>
      </div>
    </div>
  );
}
