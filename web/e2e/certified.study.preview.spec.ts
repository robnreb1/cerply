import { test, expect } from '@playwright/test';

test('Study preview actions persist across reload', async ({ page }) => {
  await page.goto('/certified/study');
  await expect(page.getByRole('heading', { name: 'Certified Study Runner' })).toBeVisible();

  await page.waitForSelector('input[aria-label="Topic"]', { timeout: 30000 });
  await page.fill('input[aria-label="Topic"]', 'Hashes');
  await page.fill('input[aria-label="Level (beginner/advanced)"]', 'beginner');
  await page.click('button:has-text("Plan & Start")');

  await page.waitForSelector('button:has-text("Flip")', { timeout: 30000 });
  await page.click('button:has-text("Flip")');
  await page.click('button:has-text("Next")');

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Certified Study Runner' })).toBeVisible();
  // Expect controls still present (persisted session)
  await expect(page.locator('button:has-text("Next")')).toBeVisible();
});


