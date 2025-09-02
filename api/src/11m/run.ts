// api/src/11m/run.ts
// Guarded, lazy OpenAI client so typechecks pass even if the SDK isn't installed.
// Returns a friendly stubbed error if OPENAI_API_KEY is missing or the package isn't installed.

export type LlmResult = {
  ok: boolean;
  output?: string;
  reason?: string;
};

/**
 * Run a minimal chat completion. Uses dynamic import so TS doesn't require the
 * 'openai' package at type-time. If the package or API key is missing, we
 * return a clear explanatory result instead of throwing.
 */
export async function runLLM(prompt: string): Promise<LlmResult> {
  let OpenAI: any;
  try {
    // Lazy import avoids TS2307 when the SDK isn't installed locally.
    OpenAI = (await import("openai")).default;
  } catch {
    return { ok: false, reason: "openai package not installed in api workspace" };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { ok: false, reason: "OPENAI_API_KEY not set" };
  }

  try {
    const client = new OpenAI({ apiKey });

    // Use a lightweight, cost-efficient model by default; callers can change later.
    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const text =
      resp?.choices?.[0]?.message?.content ??
      (resp?.choices?.[0] as any)?.text ??
      "";

    return { ok: true, output: text };
  } catch (err: any) {
    return { ok: false, reason: `OpenAI error: ${err?.message || String(err)}` };
  }
}

export default runLLM;

export async function callJSON(opts: {
  system: string;
  user: string;
  model?: string;
}) {
  const model = opts.model || process.env.CERPLY_SMART_MODEL || "gpt-4o-mini";

  if (!process.env.OPENAI_API_KEY) {
    return { ok: false as const, reason: "Missing OPENAI_API_KEY" };
  }

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const resp = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const text =
      resp?.choices?.[0]?.message?.content ??
      (resp?.choices?.[0] as any)?.text ??
      "{}";

    const json = JSON.parse(text);
    return { ok: true as const, json };
  } catch (err: any) {
    return { ok: false as const, reason: `OpenAI error: ${err?.message || String(err)}` };
  }
}