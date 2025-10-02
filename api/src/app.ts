import type { FastifyServerOptions } from 'fastify';
import createApp from './index';

// Unified app builder used by tests and production bootstrap
export async function buildApp(_opts?: FastifyServerOptions) {
  // createApp already wires plugins/routes in the same order as production
  return await createApp();
}

export default buildApp;


