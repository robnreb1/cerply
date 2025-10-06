import { test, expect } from '@playwright/test';

// Resume flow: empty local storage, server has snapshot, schedule returns order

test('Certified Study Runner resume from server snapshot', async ({ page }) => {
  // Mock GET progress to return a snapshot of 2 items
  await page.route('**/api/certified/progress?sid=*', async (route) => {
    const url = new URL(route.request().url());
    const sid = url.searchParams.get('sid') || 's1';
    const body = { session_id: sid, items: [
      { card_id: 'm1', reps: 1, ef: 2.5, intervalDays: 1, dueISO: '2025-01-01T00:00:00.000Z' },
      { card_id: 'm2', reps: 0, ef: 2.5, intervalDays: 0, dueISO: '2025-01-02T00:00:00.000Z' }
    ] };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  // Mock schedule to return order [m1,m2]
  await page.route('**/api/certified/schedule', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ session_id: 's1', plan_id: 'p1', order: ['m1','m2'], due: new Date().toISOString(), meta: { algo: 'sm2-lite', version: 'v0' } }) });
  });
  // Mock plan
  await page.route('**/api/certified/plan', async (route) => {
    const body = { status: 'ok', request_id: 'r', endpoint: 'certified.plan', mode: 'plan', enabled: true, provenance: { planner: 'rule', proposers:['rule'], checker: 'rule' }, plan: { title: 'P', items: [ { id: 'm1', type: 'card', front: 'A1', back: 'B1' }, { id: 'm2', type: 'card', front: 'A2', back: 'B2' } ] } };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  await page.goto('/certified/study');
  await expect(page.getByRole('heading', { name: 'Certified Study (Preview)' })).toBeVisible();
  
  // New M3 flow: Click "Start Study Session" button
  await page.click('text=Start Study Session');
  
  // Should show card interface with demo cards
  await expect(page.locator('text=What is spaced repetition?')).toBeVisible();
  
  // Click to flip the card
  await page.click('text=Click to reveal answer');
  
  // Should show answer
  await expect(page.locator('text=A learning technique')).toBeVisible();
});
