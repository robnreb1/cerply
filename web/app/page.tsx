// web/app/page.tsx
// ER-MUI home screen with minimalist design per FSD §14-§17

'use client';
import { Suspense, useState } from 'react';
import { InputAction, ArtefactRequest } from '@/components/ui/InputAction';
import { TrustBadgesRow } from '@/components/ui/TrustBadgesRow';
import { ModuleStack } from '@/components/ui/ModuleStack';
import { IconRow } from '@/components/ui/IconRow';
import { COPY } from '@/lib/copy';

export default function Home() {
  const enterprise =
    typeof window !== 'undefined'
      ? process.env.NEXT_PUBLIC_ENTERPRISE_MODE === 'true'
      : false;

  const [processing, setProcessing] = useState(false);
  const [modules, setModules] = useState<
    Array<{ id: string; title: string; summary?: string; estMinutes?: number }>
  >([]);

  const handleSubmit = async (req: ArtefactRequest) => {
    setProcessing(true);
    // TODO: wire to /api/ingest endpoint
    // For now, simulate processing
    setTimeout(() => {
      setModules([
        {
          id: 'mod-1',
          title: 'Getting Started',
          summary: 'Introduction to the core concepts',
          estMinutes: 5,
        },
        {
          id: 'mod-2',
          title: 'Key Principles',
          summary: 'Understanding the fundamental principles',
          estMinutes: 8,
        },
        {
          id: 'mod-3',
          title: 'Practical Applications',
          summary: 'Applying what you have learned',
          estMinutes: 10,
        },
      ]);
      setProcessing(false);
    }, 2000);
  };

  return (
    <main className="min-h-[100svh] bg-neutral-50">
      {/* Top bar with tagline */}
      <header className="border-b border-neutral-100 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 text-center">
          <p className="text-sm italic text-neutral-600">{COPY.topBarTagline}</p>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-neutral-900">Cerply</h1>
        </div>

        <InputAction enterprise={enterprise} onSubmit={handleSubmit} />

        {/* Icon row under input */}
        <IconRow />

        {/* Processing state */}
        {processing && (
          <div className="mt-8 text-center">
            <p className="text-sm text-neutral-500">{COPY.processing}</p>
          </div>
        )}

        {/* Results zone */}
        {modules.length > 0 && !processing && (
          <Suspense
            fallback={
              <p className="mt-8 text-center text-sm text-neutral-500">
                {COPY.processing}
              </p>
            }
          >
            <div className="mt-8">
              <ModuleStack items={modules} />
            </div>
          </Suspense>
        )}
      </section>

      {/* Trust badges row: subtle at bottom for non-enterprise, prominent for enterprise */}
      <TrustBadgesRow visible={!enterprise} />
    </main>
  );
}
