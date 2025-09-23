export function renderTitle(resp) {
  if (resp?.status === 'ok' && resp?.plan?.title) return String(resp.plan.title);
  if (resp?.status === 'stub') return 'Certified (stub mode)';
  return 'Certified';
}

export function pickCards(resp) {
  const items = Array.isArray(resp?.plan?.items) ? resp.plan.items : [];
  return items.filter((it) => it && it.type === 'card' && typeof it.id === 'string');
}
