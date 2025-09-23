import { test, expect } from '@playwright/test';
import fixture from '../tests/fixtures/plan.success.json';

test('Study Runner renders and navigates with mocked API', async ({ page }) => {
  await page.route('**/api/certified/plan', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture) });
  });

  await page.goto('/(preview)/certified/study');
  await expect(page.getByRole('heading', { name: 'Certified Study Runner' })).toBeVisible();

  // Empty topic should block submit
  await expect(page.getByRole('button', { name: 'Start' })).toBeDisabled();

  await page.fill('input[aria-label="Topic"]', 'Hashes');
  await page.selectOption('select[aria-label="Level"]', { value: 'beginner' });
  await page.fill('input[aria-label="Goals"]', 'memory, spaced repetition');
  await page.click('button[aria-label="Submit"]');

  // Deck appears
  await expect(page.getByLabel('Progress')).toBeVisible();
  await expect(page.getByLabel('Card front')).toContainText('Overview: Hashes');

  // Flip / Next / Prev / Reset
  await page.keyboard.press(' ');
  await expect(page.getByLabel('Card back')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByLabel('Card front')).toContainText('Core Concept 1');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByLabel('Card front')).toContainText('Overview: Hashes');
  await page.keyboard.press('KeyR');
  await expect(page.getByLabel('Card front')).toContainText('Overview: Hashes');
});


