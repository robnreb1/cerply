export default function BrandHeader() {
  return (
    <header className="w-full border-b border-[var(--brand-border)] bg-[var(--brand-surface)]">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
        <div
          className="h-6 w-6 rounded-8"
          style={{ background: 'linear-gradient(135deg, #F06B54 0%, #F58A76 55%, #FDE0D8 100%)' }}
        />
        <span className="font-semibold text-[var(--brand-ink)]">Cerply</span>
      </div>
    </header>
  );
}
