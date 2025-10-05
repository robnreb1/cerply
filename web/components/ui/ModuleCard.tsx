// components/ui/ModuleCard.tsx
export type Module = {
  id: string;
  title: string;
  summary?: string;
  estMinutes?: number;
};

export function ModuleCard({ m }: { m: Module }) {
  return (
    <article className="rounded-xl border border-neutral-200 bg-white shadow-sm p-4">
      <h3 className="font-semibold">{m.title}</h3>
      {m.summary && <p className="mt-1 text-sm text-neutral-600">{m.summary}</p>}
      {m.estMinutes && (
        <p className="mt-2 text-xs text-neutral-400">~{m.estMinutes} min</p>
      )}
    </article>
  );
}

