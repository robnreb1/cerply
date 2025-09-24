import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    include: [
      'lib/study/__tests__/**/*.test.ts',
      'lib/study/**/*Adapter.test.ts',
      'lib/study/schedulerAdapter.test.ts'
    ],
    exclude: [
      '**/node_modules/**',
      'e2e/**',
      'lib/presenter/certifiedPlan.test.*'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov']
    }
  },
});


