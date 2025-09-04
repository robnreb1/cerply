# Cerply — Cursor Handover

## Architecture
- `web/` Next.js App Router (:3000)
- `api/` Fastify (:8080)
- Flags: `LLM_PREVIEW=1`, `LLM_PLANNER_PROVIDER=openai`, `LLM_PLANNER_MODEL=gpt-4o-mini`

## Core flow (no loops)
clarify → plan → confirm → generate; follow-ups via `/api/ingest/followup`.

## Routes to honor
- `POST /api/ingest/clarify` → `{ ok, question, chips[] }`
- `POST /api/ingest/preview` → `{ modules:[{id,title}] }` (plan preview)
- `POST /api/ingest/followup` → `{ action:'append'|'revise'|'hint', modules?[], text? }`
- `POST /api/ingest/generate` → gated by `/api/auth/me`

## UI rules
- Opener types; each sentence on a new line.
- User right / assistant left. Sticky input. Upload supported; native input hidden (inline style fallback + Tailwind).
- No carousels (for now).

## Guardrails
- Topic/language filter; refuse proxy uses; ASCII-only headers.

## Smoke commands
```bash
# API
curl -sS http://localhost:8080/api/health

curl -sS -X POST http://localhost:8080/api/ingest/clarify \
  -H 'content-type: application/json' \
  --data '{"text":"GCSE German (AQA Higher)"}'

curl -sS -X POST http://localhost:8080/api/ingest/followup \
  -H 'content-type: application/json' \
  --data '{"brief":"GCSE German (AQA Higher)","plan":[{"id":"m1","title":"Reading"}],"message":"add speaking practice"}'