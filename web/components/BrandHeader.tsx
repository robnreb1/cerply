import Link from 'next/link';

export default function BrandHeader() {
  return (
    <header className="w-full border-b border-[var(--brand-border)] bg-[var(--brand-surface)]">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="h-6 w-6 rounded-8"
            style={{ background: 'linear-gradient(135deg, #F06B54 0%, #F58A76 55%, #FDE0D8 100%)' }}
          />
          <Link href="/" className="font-semibold text-[var(--brand-ink)] hover:text-[var(--brand-primary)] transition-colors">
            Cerply
          </Link>
        </div>
        
        <nav className="flex items-center gap-6">
          <Link 
            href="/curate" 
            className="text-sm text-[var(--brand-subtle)] hover:text-[var(--brand-ink)] transition-colors"
          >
            Curate
          </Link>
          <Link 
            href="/learn" 
            className="text-sm text-[var(--brand-subtle)] hover:text-[var(--brand-ink)] transition-colors"
          >
            Learn
          </Link>
          <Link 
            href="/coverage" 
            className="text-sm text-[var(--brand-subtle)] hover:text-[var(--brand-ink)] transition-colors"
          >
            Coverage
          </Link>
          <Link 
            href="/analytics/pilot" 
            className="text-sm text-[var(--brand-subtle)] hover:text-[var(--brand-ink)] transition-colors"
          >
            Analytics
          </Link>
          <Link 
            href="/prompts" 
            className="text-sm text-[var(--brand-subtle)] hover:text-[var(--brand-ink)] transition-colors"
          >
            Prompts
          </Link>
        </nav>
      </div>
    </header>
  );
}
