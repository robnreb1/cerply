// components/ui/ModuleStack.tsx
import { Module, ModuleCard } from './ModuleCard';

export function ModuleStack({ items }: { items: Module[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((m) => (
        <ModuleCard key={m.id} m={m} />
      ))}
    </div>
  );
}

