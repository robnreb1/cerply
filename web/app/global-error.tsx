"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <div className="container py-10">
          <div className="card">
            <h1 className="text-xl font-semibold">App error</h1>
            <p className="mt-2 text-sm text-zinc-600">{error?.message || 'Unknown error'}</p>
            <button onClick={reset} className="btn mt-4">Reload</button>
          </div>
        </div>
      </body>
    </html>
  );
}

