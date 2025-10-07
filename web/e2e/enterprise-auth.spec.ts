// E2E tests for Enterprise Auth (EPIC 1)
// Tests B2B auth flow and middleware gating

import { test, expect } from '@playwright/test';

test.describe('Enterprise Auth Gating', () => {
  test('redirects anonymous user from home to login', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to /login
    await expect(page).toHaveURL(/\/login/);
    expect(await page.textContent('h1')).toContain('Enterprise Login');
  });

  test('shows unauthorized page for non-enterprise users', async ({ page }) => {
    await page.goto('/unauthorized');
    
    expect(await page.textContent('h1')).toContain('Access Restricted');
    expect(await page.textContent('p')).toContain('authorized enterprise users');
  });

  test('allows access to login page without auth', async ({ page }) => {
    await page.goto('/login');
    
    await expect(page).toHaveURL('/login');
    expect(await page.textContent('h1')).toContain('Enterprise Login');
    expect(await page.locator('input[type="email"]')).toBeVisible();
    expect(await page.locator('input[type="email"]').getAttribute('placeholder')).toContain('organization.com');
  });

  test('redirects from protected routes to login', async ({ page }) => {
    // Try to access a protected route
    await page.goto('/curate');
    
    // Should redirect to login with 'from' parameter
    await expect(page).toHaveURL(/\/login\?from=/);
  });

  test('allows access to API health without auth', async ({ page }) => {
    const response = await page.request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    const json = await response.json();
    expect(json).toHaveProperty('ok', true);
  });

  test('displays enterprise-focused copy', async ({ page }) => {
    await page.goto('/login');
    
    const text = await page.textContent('body');
    expect(text).toContain('organization');
    expect(text).toContain('Enterprise');
    expect(text).not.toContain('Join the waitlist');
  });
});

test.describe('Marketing Site B2B Copy', () => {
  test('shows B2B-focused landing page', async ({ page, baseURL }) => {
    // This test assumes marketing site is separate deployment
    // For local testing, skip if not running
    if (!process.env.MARKETING_SITE_URL) {
      test.skip();
      return;
    }

    await page.goto(process.env.MARKETING_SITE_URL);
    
    const text = await page.textContent('body');
    expect(text).toContain('team');
    expect(text).toContain('organization');
    expect(text).toContain('Request a Demo');
    expect(text).not.toContain('Join the waitlist');
  });
});

test.describe('Auth Flow Integration', () => {
  test('login page has enterprise-focused UI', async ({ page }) => {
    await page.goto('/login');
    
    // Check for enterprise-specific elements
    const button = await page.locator('button[type="submit"]');
    expect(await button.textContent()).toContain('Enterprise');
    
    // Check placeholder
    const input = await page.locator('input[type="email"]');
    expect(await input.getAttribute('placeholder')).toContain('organization');
  });

  test('unauthorized page has support links', async ({ page }) => {
    await page.goto('/unauthorized');
    
    // Check for support email link
    const supportLink = await page.locator('a[href*="mailto"]');
    expect(supportLink).toBeVisible();
    expect(await supportLink.getAttribute('href')).toContain('support@cerply.com');
    
    // Check for login retry link
    const loginLink = await page.locator('a[href="/login"]');
    expect(loginLink).toBeVisible();
  });
});

