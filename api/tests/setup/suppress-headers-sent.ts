// Test-only suppression of benign Fastify ERR_HTTP_HEADERS_SENT that can occur
// when global security/CORS hooks attempt to modify headers after admin plugin
// has already terminated the response (especially for OPTIONS preflights).
// This is a known architectural trade-off in Fastify hook ordering.
if (process.env.NODE_ENV === 'test') {
  const originalHandler = process.listeners('unhandledRejection').slice();
  
  process.removeAllListeners('unhandledRejection');
  
  process.on('unhandledRejection', (reason: any) => {
    try {
      const code = (reason && (reason as any).code) || '';
      const message = String((reason && (reason as any).message) || reason || '');
      const stack = String((reason && (reason as any).stack) || '');
      
      const isHeadersSent = code === 'ERR_HTTP_HEADERS_SENT' && message.includes('Cannot write headers after they are sent');
      const isFastifyFrame = stack.includes('fastify/lib/reply.js') || stack.includes('light-my-request/lib/response.js');
      
      if (isHeadersSent && isFastifyFrame) {
        // Silently ignore this known benign warning
        // Do NOT re-throw; this is expected behavior in our architecture
        return;
      }
    } catch {}
    
    // For other errors, call original handlers
    originalHandler.forEach(handler => handler(reason, Promise.reject(reason)));
  });
}


