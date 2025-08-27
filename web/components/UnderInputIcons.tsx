"use client";

import {
  AcademicCapIcon,
  Squares2X2Icon,
  SparklesIcon,
  UserCircleIcon,
  ArrowUpTrayIcon, // Upload
} from "@heroicons/react/24/outline";
import { useRef } from "react";

type Props = {
  /** Optional hook so the page can receive selected files */
  onUpload?: (files: FileList) => void;
  className?: string;
};

type Item = {
  key: string;
  label: string;
  Icon: (props: React.ComponentProps<"svg">) => JSX.Element;
  emphasis?: boolean;
  onClick?: () => void;
};

export default function UnderInputIcons({ onUpload, className }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const openPicker = () => fileRef.current?.click();
  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    if (e.target.files?.length) {
      onUpload?.(e.target.files);
      // allow re-choosing the same file to trigger onChange again
      e.currentTarget.value = "";
    }
  };

  const items: Item[] = [
    { key: "certified", label: "Certified", Icon: AcademicCapIcon },
    { key: "curate", label: "Curate", Icon: Squares2X2Icon },
    { key: "guild", label: "Guild", Icon: SparklesIcon },
    { key: "account", label: "Account", Icon: UserCircleIcon },
    // Emphasised Upload (black)
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
          className={`group flex-1 rounded-md px-2 py-3 text-center focus:outline-none focus:ring-2 focus:ring-zinc-300 ${
            emphasis ? "text-black hover:text-zinc-900 font-medium" : "text-zinc-500 hover:text-zinc-700"
          }`}
          data-testid={`undericons-${key}`}
        >
          <Icon className="mx-auto h-5 w-5 stroke-1" aria-hidden="true" />
          <span className="mt-1 block text-xs">{label}</span>

          {key === "upload" && (
            <input
              ref={fileRef}
              type="file"
              className="sr-only"
              multiple
              onChange={handleChange}
              accept=".pdf,.doc,.docx,.txt,.md,.rtf,.ppt,.pptx,.csv,.xlsx,.xls,.json,.zip,.mp3,.m4a,.wav"
            />
          )}
        </button>
      ))}
    </div>
  );
}