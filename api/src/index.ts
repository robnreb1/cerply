
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerCurator } from './routes/curator';
import { registerLearn } from './routes/learn';
import { registerAnalytics } from './routes/analytics';

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

app.get('/health', async()=>({ok:true}));

registerCurator(app);
registerLearn(app);
registerAnalytics(app);

const port = Number(process.env.PORT || 8080);
const host = '0.0.0.0';
app.listen({ port, host }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
