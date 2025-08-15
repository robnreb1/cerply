
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerCurator } from './routes/curator';
import { registerLearn } from './routes/learn';
import { registerAnalytics } from './routes/analytics';
import multipart from '@fastify/multipart';
import { registerIngest } from './routes/ingest';

const app = Fastify({ logger: true });
app.register(multipart);
await app.register(cors, { origin: true });

app.get('/health', async()=>({ok:true}));

registerCurator(app);
registerLearn(app);
registerAnalytics(app);
registerIngest(app);

const port = Number(process.env.PORT || 8080);
const host = '0.0.0.0';
app.listen({ port, host }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
