// components/ui/TrustBadgesRow.tsx
import { COPY } from '@/lib/copy';

export function TrustBadgesRow({ visible = false }: { visible?: boolean }) {
  return (
    <div
      className={
        visible
          ? 'fixed inset-x-0 bottom-4 flex justify-center z-10'
          : 'sr-only'
      }
      role={visible ? 'contentinfo' : undefined}
      aria-label={visible ? 'Trust guarantees' : undefined}
    >
      <div className="px-3 py-1.5 rounded-full bg-white/70 backdrop-blur border border-neutral-200 text-xs text-neutral-500">
        {COPY.trustBadges}
      </div>
    </div>
  );
}

