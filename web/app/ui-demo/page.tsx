export const dynamic = 'force-dynamic';

import IngestInteraction from '@/components/IngestInteraction';

export default function UiDemoPage() {
  return (
    <main className="min-h-[70vh] px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-xl font-semibold text-zinc-800">
          Cerply — Ingest Demo
        </h1>
        <IngestInteraction />
      </div>
    </main>
  );
}
