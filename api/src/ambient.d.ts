import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    body: any;
    query: any;
    params: any;
  }
}
export {};
