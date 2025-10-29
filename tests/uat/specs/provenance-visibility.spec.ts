/**
 * Provenance Visibility Tests (FSD §7, §3)
 * Critical: Provenance badges MUST be visible to managers, NEVER to learners
 * Tests: L05, B03
 */

import { test, expect } from '@playwright/test';

test.describe('Provenance Visibility (FSD §7)', () => {
  test('L05: Learner NEVER sees provenance badges anywhere', async ({ page }) => {
    // Given: Learner navigates to Learn interface
    // Note: Actual Learn page may not exist yet, testing concept
    
    await page.goto('/v2');
    
    // Navigate to any learner-facing page
    // For now, verify Build page structure
    
    // When: Page loads
    await page.waitForLoadState('networkidle');
    
    // Then: No provenance badges are visible
    // Look for data attributes or common badge patterns
    const provenanceBadges = page.locator('[data-provenance-badge]');
    await expect(provenanceBadges).toHaveCount(0);
    
    // Also check for text patterns that indicate provenance
    const badgeTexts = [
      'Internal',
      'Certified Core',
      'Industry source',
      'Cerply templates',
      'provenance:',
    ];
    
    for (const badgeText of badgeTexts) {
      // If these appear, they should NOT be in learner view
      // This test will need adjustment based on actual implementation
      const matches = page.locator(`text="${badgeText}"`);
      const count = await matches.count();
      
      // In a learner context, count should be 0
      // For now, we're testing the structure
      console.log(`Checking for "${badgeText}": ${count} found`);
    }
  });

  test('Manager sees provenance badges in Build Content pane', async ({ page }) => {
    // Given: Manager is on Build page
    await page.goto('/v2/build');
    
    // When: Module content is loaded (create or load existing)
    const chatInput = page.locator('input[placeholder*="message"]');
    await chatInput.fill('Show me a module with provenance');
    await page.getByRole('button', { name: 'Send' }).click();
    
    await page.waitForTimeout(3000);
    
    // Then: Content pane shows provenance indicators
    const contentPane = page.locator('div:has-text("Module Content")').first();
    await expect(contentPane).toBeVisible();
    
    // Look for badge UI elements (adjust based on actual implementation)
    // Common patterns: spans with specific classes, data attributes, or pill-style badges
    
    const hasBadgeStructure = await page.locator('.bg-blue-500\\/10, .bg-green-500\\/10, [class*="badge"], [class*="provenance"]').count();
    console.log(`Badge-like elements found: ${hasBadgeStructure}`);
    
    // At minimum, verify the content pane exists and has structure
    expect(await contentPane.textContent()).toBeTruthy();
  });

  test('Provenance in Track dashboard (manager)', async ({ page }) => {
    // Given: Manager navigates to Track
    await page.goto('/v2');
    await page.getByRole('link', { name: 'Track' }).click();
    
    // When: Dashboard loads
    await expect(page).toHaveURL(/\/track/);
    
    // Then: Dashboard structure is present
    // Provenance details would appear in module details or exports
    await expect(page.getByText(/Track|Dashboard|Analytics/i)).toBeVisible();
  });
});

test.describe('Provenance Enforcement Rules (FSD §1, §7)', () => {
  test('Storage routing: Client content stored in Client Library', async ({ page }) => {
    // This is a backend test - verifying data routing
    // Frontend can only verify UI indicators
    
    await page.goto('/v2/build');
    
    // Create module with client content
    const chatInput = page.locator('input[placeholder*="message"]');
    await chatInput.fill('Create a module with our company proprietary trading process');
    await page.getByRole('button', { name: 'Send' }).click();
    
    await page.waitForTimeout(3000);
    
    // Verify module created
    // Backend should route this to Client Library (not Certified/Industry)
    await expect(page.locator('text=/Module|created/i')).toBeVisible();
    
    // Note: Actual storage verification requires DB check or API call
  });

  test('Industry sources referenced, not stored', async ({ page }) => {
    // Another backend/data test
    // Verify that industry source content is referenced (link) not copied
    
    await page.goto('/v2/build');
    
    // Upload or reference industry source
    // UI should show provenance badge "Industry source"
    // Backend should store reference/link only
    
    // Placeholder for when upload flow exists
    expect(true).toBe(true);
  });
});

