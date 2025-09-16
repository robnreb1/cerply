## What changed
- /api/chat orchestrator (headers: x-api, x-planner; loop-guard)
- ingest thin wrappers with x-api headers; inline handlers removed

## How to verify (copy/paste)
BASE=${BASE:-http://localhost:8080}

# chat — plan path + headers
curl -sS -D /tmp/h.txt -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"Learn GCSE German"}]}' \
  "$BASE/api/chat" | jq .
grep -i '^x-api: chat-orchestrate' /tmp/h.txt
grep -i '^x-planner:' /tmp/h.txt

# chat — clarifier path
curl -sS -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"GCSE Physics"}]}' \
  "$BASE/api/chat" | jq '.action, .data.chips'

# chat — loop-guard
dup='{"messages":[{"role":"user","content":"Plan my policy training"}]}'
curl -sS -H 'content-type: application/json' -d "$dup" "$BASE/api/chat" >/dev/null
curl -sS -H 'content-type: application/json' -d "$dup" "$BASE/api/chat" | jq -r '.action, .data.notice'

# ingest — clarify/preview/generate
curl -sS -D - -H 'content-type: application/json' \
  -d '{"utterance":"GCSE German"}' "$BASE/api/ingest/clarify" | sed -n '1,20p'
curl -sS -H 'content-type: application/json' \
  -d '{"brief":"GCSE German (AQA Higher)"}' "$BASE/api/ingest/preview" | jq .
curl -i -H 'content-type: application/json' \
  -d '{"planId":"p","moduleId":"m","types":["explainer","mcq","free"]}' \
  "$BASE/api/ingest/generate" | sed -n '1,20p'

## Acceptance
- /api/chat returns plan/clarify with headers; duplicate-intent coalesced.
- ingest routes 200 with x-api headers; generate auth behavior per env.

## Summary
What changed & why.

## Auth Gate & Cookies
Gate /api/ingest/generate requires session when REQUIRE_AUTH_FOR_GENERATE=1 (401 + WWW-Authenticate: Session). Cookie flags: HttpOnly, SameSite=Lax, Max-Age=30d; Secure in production.

## Spec Impact
- [ ] Updated `docs/functional-spec.md` (status ticks)
- [ ] Added/edited `docs/spec/use-cases.md` (acceptance)
- [ ] Flags noted in `docs/spec/flags.md` (defaults)
- [ ] Ran `npm run spec:snapshot` (api-routes.json refreshed)

## UI/Style
- [ ] Uses brand tokens (`/style` parity)
- [ ] AA contrast respected

## API
- [ ] Error envelope `{ error: { code, message, details? } }`
- [ ] Request/response validated or sanitized

## Tests/Smoke
- [ ] Local smoke done (`/curate`, `/learn`)
