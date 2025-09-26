import { test, expect } from '@playwright/test';

test('Orchestrator preview: submit → stream → finish (mock)', async ({ page }) => {
  // Gate UI on flag
  process.env.NEXT_PUBLIC_PREVIEW_ORCH_UI = 'true';

  // Mock POST /api/orchestrator/jobs
  await page.route('**/api/orchestrator/jobs', async (route, request) => {
    if (request.method() === 'OPTIONS') {
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ job_id: 'job-123' }) });
  });

  // Mock SSE stream
  await page.route('**/api/orchestrator/events?job=*', async (route) => {
    const body = [
      'event: ready\n',
      'data: {"job_id":"job-123"}\n\n',
      'event: step.start\n',
      'data: {"i":0}\n\n',
      'event: end\n',
      'data: {"status":"finished"}\n\n',
    ].join('');
    return route.fulfill({ status: 200, headers: { 'Content-Type': 'text/event-stream' }, body });
  });

  await page.goto('/orchestrator');
  await page.getByRole('button', { name: 'Submit' }).click();
  // Accept either explicit job id or the ready payload
  await expect(page.locator('pre')).toContainText('ready', { timeout: 10000 });
  await expect(page.locator('pre')).toContainText('finished');
});


