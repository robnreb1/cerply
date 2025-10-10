# Use Cases (living)
- Learner: adaptive practice loop (start, next, submit) — MVP ✅
- Curator: import (url/file/transcript), chunk, generate, quality score — MVP ✅
- Trust: evidence/coverage snapshot — stub ✅
- Channel delivery: Slack integration for lesson delivery and response collection — Planned (Epic 5) 🔜

- Certified: pipeline scaffold — flagged stubs ✅
  - Given CERTIFIED_ENABLED=false, POST `/api/certified/plan` → 503 `{ error: { code: 'CERTIFIED_DISABLED', ... } }`
  - Given CERTIFIED_ENABLED=true and CERTIFIED_MODE=stub (default), same route → 501 stub JSON:
    {
      "status":"stub",
      "endpoint":"certified.plan",
      "request_id":"<uuid-v4>",
      "enabled": true,
      "message":"Certified pipeline is enabled but not implemented yet."
    }
  - Given CERTIFIED_ENABLED=true and CERTIFIED_MODE=mock, same route → 200 mock JSON:
    {
      "status":"ok",
      "request_id":"<uuid>",
      "endpoint":"certified.plan",
      "mode":"mock",
      "enabled": true,
      "provenance": { "planner":"mock", "proposers":["mockA","mockB"], "checker":"mock" },
      "plan": { "title":"Mock Plan", "items":[ { "id":"m1", "type":"card", "front":"...", "back":"..." } ] }
    }
  - Preview page: `web/app/(preview)/certified/page.tsx` — shows stub response when `NEXT_PUBLIC_PREVIEW_CERTIFIED_UI=true`.
 - Study Runner: `web/app/(preview)/certified/study/page.tsx` — form (topic, level, goals) → fetch PLAN → deck runner with flip/next/prev/reset, local persistence keyed by input hash; deterministic per identical inputs.
  - Drizzle migrations apply cleanly; server boots

Add new cases here as bullets with steps + acceptance criteria.
