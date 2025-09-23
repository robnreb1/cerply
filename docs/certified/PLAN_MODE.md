# Certified PLAN Mode — Planner Pipeline v1

Flags:
- CERTIFIED_ENABLED=true, CERTIFIED_MODE=plan
- PLANNER_ENGINE=mock (default) or openai (gated; requires OPENAI_API_KEY; disabled in CI)

Request (POST /api/certified/plan, Content-Type: application/json):
```json
{ "topic": "Hashes", "level": "beginner", "goals": ["overview","fundamentals"] }
```

Response (200, deterministic for mock): see api/src/schemas/certified.plan.ts and OpenAPI at /api/docs (when PREVIEW_DOCS=true).

CORS invariants:
- OPTIONS → 204 + Access-Control-Allow-Origin: *
- Non-OPTIONS → ACAO:*; no ACAC:true; no x-cors-certified-hook

Engines:
- Mock (deterministic): api/src/planner/engines/mock.ts
- OpenAI (adapter only, gated): api/src/planner/engines/openai.ts

Offline evaluator:
- Dataset: api/tests/fixtures/planner-eval.jsonl
- Run: npm -w api run planner:eval → prints summary; CI runs with PLANNER_ENGINE=mock

Web preview:
- Form at /certified (preview gate): topic + optional level/goals; posts to API and renders cards.
