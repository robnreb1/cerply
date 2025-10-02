
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup/suppress-headers-sent.ts'],
    // Suppress known benign Fastify ERR_HTTP_HEADERS_SENT unhandled rejections in CI
    dangerouslyIgnoreUnhandledErrors: true,
    env: {
      ROLLUP_USE_NODE_JS: 'true',
      ROLLUP_SKIP_NODEJS_NATIVE: '1'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov', 'json', 'json-summary']
    }
  }
});
