// web/app/page.tsx
import IngestInteraction from "../components/IngestInteraction";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="min-h-screen pt-10 sm:pt-14">
      <div className="mx-auto max-w-3xl w-full px-4 sm:px-6">
        <IngestInteraction />
      </div>
    </main>
  );
}