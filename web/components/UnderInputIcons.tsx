"use client";

import { useRef } from "react";
<<<<<<< HEAD
=======
import type { ChangeEventHandler } from "react";
>>>>>>> 508b575 (fix(web): correct Heroicons SVG component typing in UnderInputIcons)
import {
  AcademicCapIcon,
  Squares2X2Icon,
  SparklesIcon,
  UserCircleIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";

type Props = {
  /** Optional hook so the page can receive selected files */
  onUpload?: (files: FileList) => void;
  className?: string;
};

/** Heroicons are ForwardRefExoticComponent<SVGProps<...>>, so use ComponentType for SVG */
type Item = {
  key: string;
  label: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  emphasis?: boolean;
  onClick?: () => void;
};

export default function UnderInputIcons({ onUpload, className }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const openPicker = () => fileRef.current?.click();

  const handleChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload?.(e.target.files);
      // reset so choosing the same file again still triggers change
      e.currentTarget.value = "";
    }
  };

  const items: Item[] = [
    { key: "certified", label: "Certified", Icon: AcademicCapIcon },
    { key: "curate", label: "Curate", Icon: Squares2X2Icon },
    { key: "guild", label: "Guild", Icon: SparklesIcon },
    { key: "account", label: "Account", Icon: UserCircleIcon },
    // Upload (bolder / black emphasis)
    { key: "upload", label: "Upload", Icon: ArrowUpTrayIcon, emphasis: true, onClick: openPicker },
  ];

  return (
    <div
      className={`mt-4 flex items-center justify-between gap-3 px-2 ${className ?? ""}`}
      aria-label="Quick actions"
    >
      {items.map(({ key, label, Icon, emphasis, onClick }) => (
        <button
          key={key}
          type="button"
          onClick={onClick}
          className={
            emphasis
              ? "flex-1 rounded-md px-2 py-3 text-center text-black hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-zinc-300"
              : "group flex-1 rounded-md px-2 py-3 text-center text-zinc-500 hover:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-300"
          }
        >
          <Icon className="mx-auto h-5 w-5 stroke-1" aria-hidden="true" />
          <span className="mt-1 block text-xs">{label}</span>
        </button>
      ))}

      {/* Hidden file input, triggered by Upload */}
      <input
        ref={fileRef}
        type="file"
        className="sr-only"
        multiple
        onChange={handleChange}
        accept=".pdf,.doc,.docx,.txt,.md,.rtf,.ppt,.pptx,.csv,.xlsx,.xls,.json,.zip,.mp3,.m4a,.wav"
      />
    </div>
  );
}
