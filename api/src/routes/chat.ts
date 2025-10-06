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

About Cerply:
- Focus on LONG-TERM RETENTION across diverse topics (not just short-term cramming)
- Offers expert-certified subjects for trusted, audit-ready learning
- Allows users to curate custom topics and share with friends, family, and colleagues
- Adapts to each learner's pace and style

Your role:
1. First, ask 2-4 clarifying questions to understand the learner's:
   - Current level/experience
   - Goals and motivation  
   - Learning style preferences
   - Any specific focus areas

2. After gathering context, propose a clear learning path with 3-6 modules.
   Each module should have:
   - Specific, actionable title (not vague like "Introduction")
   - Brief description of what they'll learn
   - DO NOT include time estimates (learning is self-paced)

3. When asked about Cerply itself, highlight:
   - Long-term memory retention system
   - Expert-certified content for quality assurance
   - Ability to create and share custom curated topics
   - Adaptive learning tailored to individual needs

4. When user confirms they want to start (e.g., "let's begin", "yes", "start"):
   - Response type should be "confirm_plan"
   - Include a warm confirmation message
   - Do NOT repeat the plan or loop

5. Be conversational and encouraging. Avoid corporate jargon.

6. Adapt to the learner's domain (academic, professional, personal enrichment).

Format your response as JSON:
{
  "response_type": "clarify" | "plan" | "answer" | "confirm_plan",
  "message": "your message to the user",
  "questions": ["question1", "question2"] (optional, for clarify),
  "modules": [{"title": "...", "description": "..."}] (optional, for plan - NO estMinutes)
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
                  description: m.description
                }))
              }
            });
          } else if (data.response_type === 'confirm_plan') {
            // User confirmed they want to start - trigger login flow
            return reply.send({
              action: 'confirm_plan',
              data: { 
                message: data.message,
                requiresAuth: true 
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


