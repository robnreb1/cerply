# Use Cases (living)
- Learner: adaptive practice loop (start, next, submit) — MVP ✅
- Curator: import (url/file/transcript), chunk, generate, quality score — MVP ✅
- Trust: evidence/coverage snapshot — stub ✅

- Certified: pipeline scaffold — flagged stubs ✅
  - Given CERTIFIED_ENABLED=false, POST `/api/certified/plan` → 503 `{ error: { code: 'CERTIFIED_DISABLED', ... } }`
  - Given CERTIFIED_ENABLED=true, same route → 501 stub JSON:
    {
      "status":"stub",
      "endpoint":"certified.plan",
      "request_id":"<uuid-v4>",
      "enabled": true,
      "message":"Certified pipeline is enabled but not implemented yet."
    }
  - Preview page: `web/app/(preview)/certified/page.tsx` — shows stub response when `NEXT_PUBLIC_PREVIEW_CERTIFIED_UI=true`.
  - Drizzle migrations apply cleanly; server boots

Add new cases here as bullets with steps + acceptance criteria.
