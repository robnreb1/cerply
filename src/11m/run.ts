/**
 * Temporary stub for the LLM runner at repo root.
 * Real implementation now lives under `api/src/11m/` and is owned by the API workspace.
 * This keeps root typechecks green without requiring 'openai' at the root.
 */

export type LlmStubResult = {
  ok: false;
  reason: string;
};

export async function runLLMStub(): Promise<LlmStubResult> {
  return { ok: false, reason: 'LLM client not wired in this workspace' };
}

export default runLLMStub;
