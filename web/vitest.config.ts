import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    include: [
      'lib/study/__tests__/**/*.test.ts'
    ],
    exclude: [
      '**/node_modules/**',
      'e2e/**',
      'lib/presenter/certifiedPlan.test.*'
    ]
  },
});


