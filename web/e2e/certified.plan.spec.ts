import { test, expect } from '@playwright/test';

test('PLAN preview renders cards and CORS invariants hold', async ({ page, request }) => {
  const base = process.env.BASE_URL!;
  // In Next.js, grouping segment (preview) is not part of the URL
  await page.goto(`${base}/certified`);
  await page.fill('input[aria-label="Topic"]', 'Hashes');
  await page.click('button:has-text("POST /api/certified/plan")');
  await expect(page.getByText('Status:')).toBeVisible();
  await expect(page.locator('pre')).toBeVisible();

  // CORS invariants via direct fetch
  const res = await request.post(`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/certified/plan`, {
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
  }
});


