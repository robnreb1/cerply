export default function ValueProps() {
  const props = [
    {
      title: 'Certified, when it counts',
      description:
        'Human-in-the-loop expert panels verify critical topics; audit-ready lineage.',
    },
    {
      title: 'Adaptive by default',
      description:
        "Your teams don't self-grade; we auto-assess and schedule so knowledge sticks.",
    },
    {
      title: 'Enterprise-ready',
      description: 'Push to teams, monitor compliance, and keep content fresh.',
    },
  ];

  return (
    <section className="container py-16 md:py-24">
      <div className="grid md:grid-cols-3 gap-8">
        {props.map((prop, i) => (
          <div key={i} className="card">
            <h3 className="text-xl font-bold mb-3">{prop.title}</h3>
            <p className="text-brand-subtle">{prop.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

