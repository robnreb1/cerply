// web/app/page.tsx
// Server component that renders the conversational ingest UI.
// (Fastify API routes live under api/src; do not place server code in this file.)

import IngestInteraction from "../components/IngestInteraction";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <main className="min-h-screen pt-10 sm:pt-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <IngestInteraction />
      </div>
    </main>
  );
}