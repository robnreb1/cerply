import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:3100',
    headless: true,
  },
  webServer: {
    command: 'npm run start -- -p 3100',
    timeout: 120_000,
    port: 3100,
    reuseExistingServer: true,
  },
});


