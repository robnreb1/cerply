import { test, expect } from '@playwright/test';

// This spec runs against a Vercel preview URL via BASE_URL env in CI
// It assumes NEXT_PUBLIC_API_BASE points to staging API (already wired in workflow)

test('PLAN preview (real preview) renders cards and provenance', async ({ page }) => {
  await page.goto('/certified');
  await page.waitForSelector('input[aria-label="Topic"]', { timeout: 30000 });
  await page.fill('input[aria-label="Topic"]', 'Trees');
  await page.fill('input[aria-label="Level (beginner/advanced)"]', 'beginner');
  await page.fill('input[aria-label="Goals (comma-separated)"]', 'memory');
  await page.click('button:has-text("POST /api/certified/plan")');
  await expect(page.getByText('Status:')).toBeVisible({ timeout: 30000 });
  const pre = page.locator('pre');
  await expect(pre).toBeVisible();
  const text = await pre.textContent();
  expect(text).toContain('certified.plan');
  expect(text).toMatch(/"items"\s*:\s*\[/);
});
