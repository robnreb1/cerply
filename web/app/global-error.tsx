'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error('global error:', error);

  return (
    <html lang="en">
      <body>
        <div className="container py-8">
          <div className="card">
            <h2 className="text-lg font-semibold mb-2">App crashed</h2>
            <p className="mb-4 text-sm opacity-80">
              {error?.message || 'Unknown error.'}
            </p>
            <button className="btn" onClick={() => reset()}>
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}