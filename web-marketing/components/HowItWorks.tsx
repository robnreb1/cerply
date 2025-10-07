export default function HowItWorks() {
  const steps = [
    { step: 1, title: 'Bring content', description: 'Upload policies, regs, transcripts, or notes.' },
    {
      step: 2,
      title: 'We certify/adapt',
      description: 'Experts verify critical topics; we auto-assess learners.',
    },
    { step: 3, title: 'Your team retains', description: 'Spaced repetition keeps knowledge fresh.' },
  ];

  return (
    <section className="container py-16 md:py-24 bg-brand-surface2 -mx-6 px-6">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">How it works</h2>
      <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        {steps.map((item) => (
          <div key={item.step} className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-coral-500 text-white font-bold text-xl mb-4">
              {item.step}
            </div>
            <h3 className="text-xl font-bold mb-2">{item.title}</h3>
            <p className="text-brand-subtle">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

