### OpenAI Planner Adapter v0 (Preview)

Scope
- Preview-only planner adapter for Certified plan generation.
- No prod impact by default. Disabled unless both flags set at runtime.

Flags
- `PLANNER_ENGINE=openai`
- `FF_OPENAI_ADAPTER_V0=true` (default false)

Safety & Determinism
- If `OPENAI_API_KEY` is absent, the adapter returns a deterministic fallback (seeded by topic/level/goals). Offline/CI-safe.
- Model output is parsed into the existing Zod response schema. On parse error, the adapter falls back deterministically and annotates `provenance.error="parse_error"`.
- No tools or streaming; conservative `max_tokens` and low temperature; sets a custom user-agent.

Response Provenance
- `provenance.engine = "openai-v0"`.
- `provenance.proposers = ["openai-v0"]`.

Evaluator (Offline-first)
- Script: `npm -w api run -s planner:eval:openai`.
- Dataset: `api/tests/fixtures/planner-eval.jsonl`.
- Output: `api/tests/fixtures/planner-eval.openai.json`.
- Behavior: with no key → fallback path; with key → small sample real calls with caps.

CI
- Job: "OpenAI Eval (offline)" always runs on PRs/push and uploads the evaluator artifact.
- Optional job: "OpenAI Smoke (keyed)" runs only when `secrets.OPENAI_API_KEY` is present.

How to enable on staging (manual)
1) Set env vars on the API service:
   - `PLANNER_ENGINE=openai`
   - `FF_OPENAI_ADAPTER_V0=true`
   - Optionally set `OPENAI_API_KEY` for keyed mode.
2) Redeploy API.
3) Verify `POST /api/certified/plan` works with plan mode and `provenance.engine="openai-v0"`.

Notes
- CORS invariants unchanged: `OPTIONS 204`, `POST` includes `access-control-allow-origin: *` and strips `access-control-allow-credentials`.
- Defaults remain mock/adaptive unless flags flipped; prod defaults unchanged.


