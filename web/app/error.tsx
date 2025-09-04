'use client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl p-4">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="mt-1 text-sm text-zinc-600">{error?.message || 'An unexpected error occurred.'}</p>
      <button onClick={reset} className="mt-3 rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white">Try again</button>
    </div>
  );
}

