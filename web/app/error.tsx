"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container py-10">
      <div className="card">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-zinc-600">{error?.message || 'Unknown error'}</p>
        <button onClick={reset} className="btn mt-4">Try again</button>
      </div>
    </div>
  );
}

