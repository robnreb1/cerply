export function pickPreviewTitle(resp) {
  if (resp && resp.status === 'ok' && resp.plan && resp.plan.title) return String(resp.plan.title);
  if (resp && resp.status === 'stub') return 'Certified (stub mode)';
  return 'Certified';
}


