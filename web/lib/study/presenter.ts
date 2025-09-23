import type { PlanResponse } from '../api/generated';

export type DeckCard = { id: string; front: string; back: string };

export function toDeck(resp: PlanResponse): { title: string; cards: DeckCard[] } {
  const items = Array.isArray(resp?.plan?.items) ? resp.plan.items : [];
  const cards: DeckCard[] = items
    .filter((it: any) => it && it.type === 'card')
    .map((it: any) => ({ id: String(it.id), front: String(it.front || ''), back: String(it.back || '') }));
  return { title: String(resp?.plan?.title || ''), cards };
}


