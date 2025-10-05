// components/ui/InputAction.tsx
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { COPY } from '@/lib/copy';

const PLACEHOLDERS = COPY.placeholders;

export type ArtefactRequest =
  | { type: 'text'; payload: string }
  | { type: 'url'; payload: string }
  | { type: 'file'; payload: File };

export function InputAction({
  enterprise = false,
  onSubmit,
}: {
  enterprise?: boolean;
  onSubmit: (req: ArtefactRequest) => void;
}) {
  const [value, setValue] = useState('');
  const [i, setI] = useState(0);
  const timer = useRef<number | null>(null);
  const placeholder = useMemo(() => PLACEHOLDERS[i % PLACEHOLDERS.length], [i]);

  useEffect(() => {
    timer.current = window.setInterval(() => setI((x) => x + 1), 3500);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, []);

  const isUrl = (s: string) => /^https?:\/\/\S+$/i.test(s.trim());

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onSubmit({ type: 'file', payload: files[0] });
  };

  const handleSubmit = () => {
    const v = value.trim();
    if (!v) return;
    if (isUrl(v)) return onSubmit({ type: 'url', payload: v });
    return onSubmit({ type: 'text', payload: v });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className="w-full max-w-2xl mx-auto"
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
      }}
    >
      <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white/80 backdrop-blur px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-brand-coral-400/30">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-transparent outline-none text-[15px] placeholder:text-neutral-400"
          aria-label="Paste text, URL, or drag-drop file"
        />
        <label className="inline-flex items-center text-sm font-medium text-brand-coral-600 hover:underline cursor-pointer">
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            aria-label="Choose file to upload"
          />
          {COPY.buttons.upload}
        </label>
        <button
          onClick={handleSubmit}
          className="rounded-lg px-3 py-1.5 text-sm font-semibold bg-brand-coral-600 text-white hover:opacity-90"
          aria-label="Create modules from input"
        >
          {COPY.buttons.createModules}
        </button>
      </div>

      {/* Micro-copy */}
      <p className="mt-2 text-center text-sm text-neutral-500">{COPY.reassurance}</p>

      {/* Enterprise trust badges (prominent in enterprise mode) */}
      <div className={enterprise ? 'mt-3 flex justify-center' : 'sr-only'}>
        <div className="text-xs text-neutral-400">{COPY.trustBadges}</div>
      </div>
    </div>
  );
}

