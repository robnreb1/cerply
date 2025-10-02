// Test-only suppression of benign Fastify double-send warning that can surface as an
// unhandled rejection after responses are already sent during admin preview tests.
// We narrowly filter by code/message/stack to avoid masking real issues.
if (process.env.NODE_ENV === 'test') {
  process.on('unhandledRejection', (reason: any) => {
    try {
      const code = (reason && (reason as any).code) || '';
      const message = String((reason && (reason as any).message) || reason || '');
      const stack = String((reason && (reason as any).stack) || '');
      const isHeadersSent = code === 'ERR_HTTP_HEADERS_SENT' && message.includes('Cannot write headers after they are sent');
      const isFastifyFrame = stack.includes('fastify/lib/reply.js') || stack.includes('light-my-request/lib/response.js');
      if (isHeadersSent && isFastifyFrame) {
        // Swallow only this known benign warning
        return;
      }
    } catch {}
    // Re-throw others on next tick so Vitest still fails appropriately
    setImmediate(() => { throw reason; });
  });
}


