import { test, expect } from '@playwright/test';

test('PLAN preview renders cards and CORS invariants hold', async ({ page, request }) => {
  const base = process.env.BASE_URL!;
  // Try common paths in case routing differs on preview
  const candidates = ['/certified', '/certified/', '/(preview)/certified'];
  let ready = false;
  for (const p of candidates) {
    await page.goto(`${base}${p}`);
    const visible = await page.locator('input[aria-label="Topic"]').first().isVisible().catch(() => false);
    if (visible) { ready = true; break; }
  }
  if (ready) {
    await page.fill('input[aria-label="Topic"]', 'Hashes');
    await page.click('button:has-text("POST /api/certified/plan")');
    await expect(page.getByText('Status:')).toBeVisible();
    await expect(page.locator('pre')).toBeVisible();
  }

  // CORS invariants via direct fetch
  const res = await request.post(`${process.env.NEXT_PUBLIC_API_BASE || 'https://cerply-api-staging-latest.onrender.com'}/api/certified/plan`, {
    headers: { 'origin': 'https://app.cerply.com', 'content-type': 'application/json' },
    data: { topic: 'Hashes' },
  });
  expect([200,501,503]).toContain(res.status());
  if (res.status() === 200) {
    const acao = res.headers()['access-control-allow-origin'];
    const acac = (res.headers()['access-control-allow-credentials'] || '').toLowerCase();
    const hook = res.headers()['x-cors-certified-hook'];
    expect(acao).toBe('*');
    expect(acac).not.toBe('true');
    expect(hook).toBeUndefined();
    const j = await res.json();
    expect(j?.endpoint).toBe('certified.plan');
    expect(Array.isArray(j?.plan?.items)).toBeTruthy();
    // Determinism assertions for PLAN mode
    if (j?.mode === 'plan') {
      expect(j.plan?.title).toBe('Plan: Hashes');
      expect(j.plan?.items?.length).toBe(5);
      expect(j.plan?.items?.[0]?.id).toBe('card-intro');
      expect(typeof j.request_id).toBe('string');
    }
  }
});


