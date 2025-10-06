import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { callJSON } from '../11m/run';

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

const SYSTEM_PROMPT = `You are Cerply, an expert learning consultant and educator.

Your role:
1. First, ask 2-4 clarifying questions to understand the learner's:
   - Current level/experience
   - Goals and motivation  
   - Learning style preferences
   - Time constraints or specific needs

2. After gathering context, propose a clear learning path with 3-6 modules.
   Each module should have:
   - Specific, actionable title (not vague like "Introduction")
   - Brief description of what they'll learn
   - Estimated time commitment

3. Be conversational and encouraging. Avoid corporate jargon.

4. Adapt to the learner's domain (academic, professional, personal enrichment).

Format your response as JSON:
{
  "response_type": "clarify" | "plan" | "answer",
  "message": "your message to the user",
  "questions": ["question1", "question2"] (optional, for clarify),
  "modules": [{"title": "...", "description": "...", "estMinutes": 5}] (optional, for plan)
}`;

export async function registerChatRoutes(app: FastifyInstance) {
  app.post('/api/chat', async (req, reply) => {
    reply.header('x-api', 'chat-orchestrate');
    const llmEnabled = !!process.env.OPENAI_API_KEY;
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

    // Try LLM if available
    if (llmEnabled) {
      try {
        const conversationContext = msgs.slice(-5).map(m => 
          `${m.role === 'user' ? 'User' : 'Cerply'}: ${m.content}`
        ).join('\n');
        
        const result = await callJSON({
          system: SYSTEM_PROMPT,
          user: conversationContext || last,
        });

        if (result.ok && result.json) {
          const data = result.json as any;
          
          if (data.response_type === 'clarify') {
            return reply.send({
              action: 'clarify',
              data: {
                question: data.message,
                chips: data.questions || []
              }
            });
          } else if (data.response_type === 'plan' && data.modules) {
            return reply.send({
              action: 'plan',
              data: {
                message: data.message,
                modules: data.modules.map((m: any, i: number) => ({
                  id: `m${i+1}`,
                  title: m.title,
                  description: m.description,
                  estMinutes: m.estMinutes || 5
                }))
              }
            });
          } else {
            // Generic answer/message
            return reply.send({
              action: 'answer',
              data: { message: data.message }
            });
          }
        }
      } catch (err) {
        console.error('[chat] LLM error:', err);
        // Fall through to heuristic
      }
    }

    // Heuristic fallback
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

    if (last.length > 0) {
      return reply.send({ action: 'plan', data: { modules: planFrom(last) } });
    }

    return reply.send({ action: 'meta', data: { notice: 'send a brief (topic, goal, level)' } });
  });
}


