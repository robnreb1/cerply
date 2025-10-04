import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export async function registerTestVerifyRoutes(app: FastifyInstance) {
  console.log('DEBUG: registerTestVerifyRoutes called');
  
  app.get('/api/certified/verify', { config: { public: true } }, async (req: FastifyRequest, reply: FastifyReply) => {
    console.log('DEBUG: test verify GET handler called');
    
    // Always return 404 for testing
    reply.header('access-control-allow-origin', '*');
    reply.removeHeader('access-control-allow-credentials');
    return reply.code(404).send({ error: { code: 'NOT_FOUND' } });
  });

  app.post('/api/certified/verify', { config: { public: true } }, async (req: FastifyRequest, reply: FastifyReply) => {
    console.log('DEBUG: test verify POST handler called');
    
    // Always return 404 for testing
    reply.header('access-control-allow-origin', '*');
    reply.removeHeader('access-control-allow-credentials');
    return reply.code(404).send({ error: { code: 'NOT_FOUND' } });
  });
}
