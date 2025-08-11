
# Build via Cursor — Quickstart (Refreshed)

**Pitch:** Cerply turns complex rules into simple habits — and proves it.

## Run locally
```bash
docker compose up -d
# Web: http://localhost:3000  API: http://localhost:8080  AI: http://localhost:8090
```

## Cursor seed prompt
> You are building Cerply MVP (see `.cursorrules`). The API already has /health, /ingest/policy, /rde/decompose, and /evidence/coverage with a basic ECS util and vitest config. Improve types, add validation, persist to Postgres, and wire an Evidence Graph store. Extend the Next.js page to visualize ECS and gaps.

## Next tasks
1. Replace in-memory policy store with Postgres (policies table + migrations).  
2. Add Zod validators + structured error responses.  
3. Implement evidence_graph tables (nodes/edges) and compute ECS from DB.  
4. Add `/evidence/export` to return a zipped JSON bundle.  
5. In `web`, add an ECS card and gaps list from `/evidence/coverage?scopeId=demo`.
