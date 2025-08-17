export default function Style() {
  return (
    <div className="p-6 space-y-6">
      <section className="card p-6 space-y-3">
        <h1 className="text-2xl font-semibold" style={{letterSpacing: '.005em'}}>Cerply Brand Tokens</h1>
        <p className="text-[15px] text-brand-subtle">Coral primaries, warm neutrals, domain accents</p>
        <div className="flex gap-3">
          <button className="btn">Primary CTA</button>
          <button className="btn btn-secondary">Secondary</button>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          ['brand.bg','bg-[var(--brand-bg)]'],
          ['brand.surface','bg-[var(--brand-surface)]'],
          ['brand.surface2','bg-[var(--brand-surface2)]'],
          ['brand.border','bg-[var(--brand-border)]'],
          ['brand.ink','bg-[var(--brand-ink)]'],
          ['brand.subtle','bg-[var(--brand-subtle)]'],
          ['coral.50','bg-[var(--brand-coral-50)]'],
          ['coral.400','bg-[var(--brand-coral-400)]'],
          ['coral.500','bg-[var(--brand-coral-500)]'],
          ['coral.600','bg-[var(--brand-coral-600)]'],
          ['coral.700','bg-[var(--brand-coral-700)]'],
          ['domain.rc','bg-[var(--domain-rc)]'],
          ['domain.ima','bg-[var(--domain-ima)]'],
          ['domain.qpp','bg-[var(--domain-qpp)]'],
        ].map(([label,cls]) => (
          <div key={label} className="card p-3">
            <div className={`h-12 w-full rounded mb-2 ${cls}`} />
            <div className="text-xs">{label}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
