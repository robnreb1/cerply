/**
 * ClickableText Component
 * Styled text link that feels natural in conversation
 * Avoids button-heavy UI
 */

'use client';

interface ClickableTextProps {
  text: string;
  onClick: () => void;
  className?: string;
}

export default function ClickableText({ text, onClick, className = '' }: ClickableTextProps) {
  return (
    <button
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={`inline font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer transition-colors ${className}`}
      tabIndex={0}
      role="button"
      type="button"
    >
      {text}
    </button>
  );
}

