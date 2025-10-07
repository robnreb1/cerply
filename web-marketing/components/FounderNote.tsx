export default function FounderNote() {
  return (
    <section className="container py-16 md:py-24">
      <div className="max-w-3xl mx-auto card">
        <h2 className="text-2xl font-bold mb-4">A note from the founder</h2>
        <p className="text-brand-subtle leading-relaxed mb-4">
          We built Cerply because traditional training doesn't stick. Whether it's compliance
          documents, technical specs, or internal knowledge, teams spend hours reading and forget
          most of it within days. We use adaptive learning and spaced repetition to make sure
          knowledge becomes second nature—backed by human experts when it matters most.
        </p>
        <p className="text-brand-subtle leading-relaxed">
          Want to chat?{' '}
          <a href="mailto:hello@cerply.com" className="font-medium">
            Drop us a line
          </a>
          .
        </p>
      </div>
    </section>
  );
}

