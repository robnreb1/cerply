// api/src/11m/run.ts
// Lightweight LLM runner with no SDK dependency.
// Uses fetch to call OpenAI Chat Completions.

export type LlmRunArgs = {
  provider?: string;         // 'openai' (default)
  model?: string;            // e.g. 'gpt-4o-mini'
  system?: string;           // system prompt
  input: string;             // user content
  json?: boolean;            // request JSON object output
  temperature?: number;      // default 0.2
};

export type LlmRunOk = { ok: true; output: string; raw?: any; model?: string };
export type LlmRunErr = { ok: false; reason: string };
export type LlmRunResult = LlmRunOk | LlmRunErr;

/**
 * Run an LLM call. Currently supports provider=openai via HTTPS.
 * Reads OPENAI_API_KEY from env. Safe to import in typecheck builds.
 */
export default async function runLLM(args: LlmRunArgs): Promise<LlmRunResult> {
  try {
    const provider = (args.provider ?? process.env.LLM_PLANNER_PROVIDER ?? 'openai').toLowerCase();
    if (provider !== 'openai') {
      return { ok: false, reason: `provider ${provider} not supported` };
    }

    const model = args.model ?? process.env.LLM_PLANNER_MODEL ?? 'gpt-4o-mini';
    const apiKey = process.env.OPENAI_API_KEY || '';
    if (!apiKey) return { ok: false, reason: 'OPENAI_API_KEY missing' };

    const messages: any[] = [];
    if (args.system) messages.push({ role: 'system', content: args.system });
    messages.push({ role: 'user', content: args.input });

    const body: any = {
      model,
      messages,
      temperature: typeof args.temperature === 'number' ? args.temperature : 0.2,
      n: 1,
    };
    if (args.json) body.response_format = { type: 'json_object' };

    // Use global fetch (Node 18+/20+)
    const fetchFn: any = (globalThis as any).fetch;
    const resp = await fetchFn('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp || !resp.ok) {
      let t = '';
      try { t = await resp.text(); } catch {}
      return { ok: false, reason: `OpenAI HTTP ${resp?.status ?? '??'}: ${String(t).slice(0, 400)}` };
    }

    const data = await resp.json();
    const output: string = data?.choices?.[0]?.message?.content ?? '';
    if (!output) return { ok: false, reason: 'empty completion' };

    return { ok: true, output, raw: data, model };
  } catch (err: any) {
    return { ok: false, reason: `LLM error: ${err?.message || String(err)}` };
  }
}