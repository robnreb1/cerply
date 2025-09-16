import { FastifyInstance } from 'fastify';
import crypto from 'crypto';

type Msg = { id?: string; role: 'user'|'assistant'|'tool'; content: string; meta?: any };
type ChatReq = { messages: Msg[]; profile?: any };

const recent = new Map<string, number>();
const DEDUPE_MS = 5000;

function fingerprint(messages: Msg[]) {
  const last3 = messages.slice(-3);
  const raw = JSON.stringify(last3.map(m => [m.role, m.content]));
  return crypto.createHash('sha1').update(raw).digest('hex');
}

function planFrom(brief: string) {
  // minimal, variable count, de-duped-ish titles
  const base = [
    'Foundations', 'Core Techniques', 'Applied Practice',
    'Common Pitfalls', 'Exam Strategies'
  ];
  const n = 3 + (brief.length % 3); // 3–5
  return Array.from(new Set(base)).slice(0, n).map((t, i) => ({ id: `m${i+1}`, title: t }));
}

export async function registerChatRoutes(app: FastifyInstance) {
  app.post('/api/chat', async (req, reply) => {
    reply.header('x-api', 'chat-orchestrate');
    const llmEnabled = !!process.env.LLM_PREVIEW;
    reply.header('x-planner', llmEnabled ? 'llm' : 'heuristic');
    if (process.env.LLM_PLANNER_MODEL) reply.header('x-model', process.env.LLM_PLANNER_MODEL);

    const body = req.body as ChatReq;
    const msgs = Array.isArray(body?.messages) ? body.messages : [];
    const last = msgs.filter(m => m.role === 'user').slice(-1)[0]?.content?.trim() || '';

    // loop-guard: coalesce duplicate intents within short window
    const fp = fingerprint(msgs);
    const now = Date.now();
    const lastAt = recent.get(fp);
    if (lastAt && now - lastAt < DEDUPE_MS) {
      return reply.send({ action: 'meta', data: { notice: 'duplicate-intent-coalesced' } });
    }
    recent.set(fp, now);

    // domain-aware clarifier (GCSE / regulatory hint), otherwise plan
    const lower = last.toLowerCase();
    if (/gcse|a-level|aqa|edexcel/.test(lower)) {
      return reply.send({
        action: 'clarify',
        data: {
          question: 'Which board and level?',
          chips: ['AQA', 'Edexcel', 'WJEC', 'OCR', 'Higher', 'Foundation']
        }
      });
    }

    // simple plan proposal (variable count, no time boxes)
    if (last.length > 0) {
      return reply.send({ action: 'plan', data: { modules: planFrom(last) } });
    }

    // fallback meta
    return reply.send({ action: 'meta', data: { notice: 'send a brief (topic, goal, level)' } });
  });
}


