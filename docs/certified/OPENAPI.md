# Certified OpenAPI & Preview Docs

Flags:
- `PREVIEW_DOCS=true` enables `/api/docs` and serves `/api/openapi.json`.
- `CERTIFIED_ENABLED=true`, `CERTIFIED_MODE=plan|mock` control the plan endpoint.

Build OpenAPI:
```bash
npm -w api run openapi:build
```

Serve Docs (preview only):
- Start API with `PREVIEW_DOCS=true` and open `/api/docs`.

Schema (request/response): see `api/src/schemas/certified.plan.ts` (Zod), reflected in `api/openapi/build/openapi.json`.

CORS invariants:
- OPTIONS `/api/certified/*` → 204 + `Access-Control-Allow-Origin: *`
- Non-OPTIONS under `/api/certified/*` → `ACAO:*`, no `ACAC:true`, no `x-cors-certified-hook`.


