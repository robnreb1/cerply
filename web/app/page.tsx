'use client';

export default function Home() {
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Cerply v4.1 Starter</h1>
      <p className="text-sm text-gray-600">Turn information into knowledge.</p>

      <ul className="list-disc pl-6">
        <li><a className="underline" href="/curator">Curator Dashboard</a></li>
        <li><a className="underline" href="/learn">Learn</a></li>
        <li><a className="underline" href="/analytics/pilot">Analytics (pilot)</a></li>
      </ul>

      <p className="text-xs text-gray-500">
        Spaced returns: 2 → 7 → 21 → 60 days. Knowledge lift: D0 → D7 → D30.
      </p>
    </main>
  );
}
