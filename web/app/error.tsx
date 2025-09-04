'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Helpful in dev
  console.error('route error:', error);

  return (
    <div className="container py-8">
      <div className="card">
        <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
        <p className="mb-4 text-sm opacity-80">
          {error?.message || 'Unknown error.'}
        </p>
        <button className="btn" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </div>
  );
}