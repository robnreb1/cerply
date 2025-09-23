import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('PLAN preview renders with mocked API', async ({ page }) => {
  const fixturePath = join(__dirname, '..', 'tests', 'fixtures', 'plan.success.json');
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
  await page.route('**/api/certified/plan', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture) });
  });
  await page.goto('/certified');
  await page.fill('input[aria-label="Topic"]', 'Hashes');
  await page.click('button:has-text("POST /api/certified/plan")');
  await expect(page.getByText('Status:')).toBeVisible();
  await expect(page.locator('pre')).toBeVisible();
});


