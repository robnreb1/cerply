// components/ui/IconRow.tsx
'use client';
import { COPY } from '@/lib/copy';
import {
  ShieldCheckIcon,
  BeakerIcon,
  UserGroupIcon,
  UserCircleIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';

export function IconRow({ onUploadClick }: { onUploadClick?: () => void }) {
  return (
    <div className="flex items-center justify-center gap-6 mt-6 text-xs text-neutral-400">
      <button
        className="flex flex-col items-center gap-1 hover:text-neutral-600 transition-colors"
        aria-label={COPY.iconLabels.certified}
      >
        <ShieldCheckIcon className="h-5 w-5" aria-hidden />
        <span>{COPY.iconLabels.certified}</span>
      </button>

      <button
        className="flex flex-col items-center gap-1 hover:text-neutral-600 transition-colors"
        aria-label={COPY.iconLabels.curate}
      >
        <BeakerIcon className="h-5 w-5" aria-hidden />
        <span>{COPY.iconLabels.curate}</span>
      </button>

      <button
        className="flex flex-col items-center gap-1 hover:text-neutral-600 transition-colors"
        aria-label={COPY.iconLabels.guild}
      >
        <UserGroupIcon className="h-5 w-5" aria-hidden />
        <span>{COPY.iconLabels.guild}</span>
      </button>

      <button
        className="flex flex-col items-center gap-1 hover:text-neutral-600 transition-colors"
        aria-label={COPY.iconLabels.account}
      >
        <UserCircleIcon className="h-5 w-5" aria-hidden />
        <span>{COPY.iconLabels.account}</span>
      </button>

      <button
        onClick={onUploadClick}
        className="flex flex-col items-center gap-1 text-neutral-700 font-medium hover:text-neutral-900 transition-colors"
        aria-label={`${COPY.iconLabels.upload} (emphasized)`}
      >
        <ArrowUpTrayIcon className="h-5 w-5" aria-hidden />
        <span>{COPY.iconLabels.upload}</span>
      </button>
    </div>
  );
}

