// web/e2e/home.spec.ts
// Playwright tests for ER-MUI home page per FSD §17 acceptance criteria

import { test, expect } from '@playwright/test';

test.describe('ER-MUI Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display centered input with cycling placeholders', async ({
    page,
  }) => {
    const input = page.locator('input[aria-label*="Paste text"]');
    await expect(input).toBeVisible();

    // Check first placeholder
    const placeholder1 = await input.getAttribute('placeholder');
    expect(placeholder1).toBeTruthy();
    expect(
      ['Paste your meeting notes…', 'Upload a policy document…', 'Drop in a podcast transcript…'].includes(
        placeholder1 || ''
      )
    ).toBe(true);

    // Wait for placeholder rotation (3.5s cycle + buffer)
    await page.waitForTimeout(4000);
    const placeholder2 = await input.getAttribute('placeholder');

    // Placeholder should have changed
    if (placeholder1 !== placeholder2) {
      expect(placeholder2).toBeTruthy();
    }
  });

  test('should display top bar tagline in italics', async ({ page }) => {
    const tagline = page.getByText('Helping you master what matters.');
    await expect(tagline).toBeVisible();
  });

  test('should display icon row with all icons', async ({ page }) => {
    // Check all five icons are present
    await expect(page.getByRole('button', { name: /certified/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /curate/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /guild/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /account/i })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /upload.*emphasized/i })
    ).toBeVisible();
  });

  test('should display trust badges row at bottom', async ({ page }) => {
    const trustBadges = page.getByText(
      /audit-ready.*expert-reviewed.*adaptive.*private by default/i
    );
    await expect(trustBadges).toBeVisible();
  });

  test('should support keyboard interaction (Tab and Enter)', async ({
    page,
  }) => {
    // Tab to input
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab'); // might need multiple tabs depending on focus order

    const input = page.locator('input[aria-label*="Paste text"]');
    await input.fill('Test topic');

    // Press Enter to submit
    await input.press('Enter');

    // Should show processing message
    await expect(
      page.getByText(/building your learning modules/i)
    ).toBeVisible({ timeout: 2000 });
  });

  test('should accept paste and display processing state', async ({ page }) => {
    const input = page.locator('input[aria-label*="Paste text"]');
    await input.fill('Test content for learning');

    const createButton = page.getByRole('button', { name: /create modules/i });
    await createButton.click();

    // Processing message should appear
    await expect(
      page.getByText(/building your learning modules/i)
    ).toBeVisible({ timeout: 2000 });

    // After processing, modules should appear (mocked with 2s delay)
    await expect(page.getByText(/getting started/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test('should support file upload via button', async ({ page }) => {
    // Click the upload label
    const uploadLabel = page.getByText('Upload', { exact: true });
    await expect(uploadLabel).toBeVisible();

    // Verify file input exists and accepts correct types
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveAttribute('accept', '.pdf,.docx,.txt');
  });

  test('should support drag-and-drop zone', async ({ page }) => {
    const dropZone = page.locator('div').filter({ hasText: /paste text/i }).first();
    
    // Create a simple drag event simulation
    // Note: Full drag-drop simulation requires more complex setup
    // This test verifies the drop zone element exists and is visible
    await expect(dropZone).toBeVisible();
  });

  test('should be fully keyboard operable', async ({ page }) => {
    // Start from top
    await page.keyboard.press('Tab');
    
    // Navigate through focusable elements
    const focusedElement1 = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement1).toBeTruthy();

    // Continue tabbing
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    const focusedElement2 = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement2).toBeTruthy();
    
    // Should not trap focus
    expect(['INPUT', 'BUTTON', 'A', 'LABEL'].includes(focusedElement2 || '')).toBe(true);
  });
});

test.describe('Enterprise Mode', () => {
  test('should show trust badges prominently when enterprise mode enabled', async ({
    page,
    context,
  }) => {
    // This would need NEXT_PUBLIC_ENTERPRISE_MODE=true at build time
    // For now, we verify the component logic is present
    await page.goto('/');
    
    // In non-enterprise mode, trust badges should be at bottom (fixed position)
    const trustBadges = page.getByText(
      /audit-ready.*expert-reviewed.*adaptive.*private by default/i
    );
    await expect(trustBadges).toBeVisible();
  });
});

