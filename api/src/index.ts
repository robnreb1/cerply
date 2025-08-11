
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerHealth } from './routes/health.js';
import { registerIngest } from './routes/ingest.js';
import { registerRDE } from './routes/rde.js';
import { registerEvidence } from './routes/evidence.js';

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

registerHealth(app);
registerIngest(app);
registerRDE(app);
registerEvidence(app);

const port = Number(process.env.PORT || 8080);
const host = '0.0.0.0';
app.listen({ port, host }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
