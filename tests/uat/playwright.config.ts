import { defineConfig, devices } from '@playwright/test';

/**
 * Cerply V2.0 UAT Configuration
 * Functional acceptance tests based on BRD v2 + FSD v2
 */
export default defineConfig({
  testDir: './specs',  // Relative to config file location (tests/uat/)
  fullyParallel: false, // Run sequentially to avoid DB conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  
  timeout: 60 * 1000, // 60s per test
  
  reporter: [
    ['list'],
    ['junit', { outputFile: 'reports/junit.xml' }],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
  ],

  use: {
    baseURL: process.env.APP_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // V2 dev mode auth
    extraHTTPHeaders: {
      'Authorization': 'Bearer dev-token',
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start dev server if not already running
  webServer: process.env.SKIP_WEBSERVER ? undefined : {
    command: 'npm -w web run dev',
    cwd: '../../', // Run from project root
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

