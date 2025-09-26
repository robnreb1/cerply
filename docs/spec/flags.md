# Feature Flags
- ff_connectors_basic_v1 (default: off in prod, on in dev)
- ff_quality_bar_v1
- ff_cost_guardrails_v1
- ff_group_challenges_v1
- ff_certified_sla_status_v1
- ff_marketplace_ledgers_v1
- ff_benchmarks_optin_v1

 - PREVIEW_ANALYTICS (default: off) — enables `/api/analytics/*` preview endpoints.
 - ANALYTICS_INGEST_SECRET (optional) — when set, `POST /api/analytics/ingest` requires `Authorization: Bearer <secret>`.

 - FF_OPENAI_ADAPTER_V0 (default: off) — enables preview OpenAI planner adapter v0 when `PLANNER_ENGINE=openai`.
 
Runtime (simple gate)
- CERTIFIED_ENABLED (default: false) — enables `/api/certified/*` stub routes
  - When true, `POST /api/certified/plan` returns 501 with JSON:
    {
      "status":"stub",
      "endpoint":"certified.plan",
      "request_id":"<uuid-v4>",
      "enabled": true,
      "message":"Certified pipeline is enabled but not implemented yet."
    }
  - CORS preflight `OPTIONS /api/certified/*` returns 204 with headers:
    - access-control-allow-origin: *
    - access-control-allow-methods: GET,HEAD,PUT,PATCH,POST,DELETE
    - access-control-allow-headers: content-type, authorization
 
Runtime (mode)
- CERTIFIED_MODE (values: `stub` | `mock`, default: `stub`)
Preview flags — Verify & Audit (v1)
- `FF_CERTIFIED_AUDIT_PREVIEW` (default: false) — enables `GET /api/certified/_audit_preview`.
- `MAX_AUDIT_BUFFER` (default: 1000) — in-memory ring buffer size for preview audits.
  - `stub`: preserves 501 behavior above.
  - `mock`: `POST /api/certified/plan` returns 200 with JSON:
    {
      "status":"ok",
      "request_id":"<uuid>",
      "endpoint":"certified.plan",
      "mode":"mock",
      "enabled": true,
      "provenance": { "planner":"mock", "proposers":["mockA","mockB"], "checker":"mock" },
      "plan": { "title":"Mock Plan", "items":[ { "id":"m1", "type":"card", "front":"...", "back":"..." } ] }
    }

Planner engines (selection)
- PLANNER_ENGINE (values: `mock` | `openai` | `adaptive`, default: `mock`)
  - `openai`: requires `FF_OPENAI_ADAPTER_V0=true` to activate preview adapter; with no `OPENAI_API_KEY`, deterministic fallback is used.
  - `adaptive`: requires `FF_ADAPTIVE_ENGINE_V1=true`.

Certified multiphase (preview flags; default off)
- FF_CERTIFIED_PROPOSERS — enables multiple proposer engines
- FF_CERTIFIED_CHECKER — enables checker-v0 merge/select stage
- FF_CERTIFIED_LOCK — enables lock metadata and header `x-certified-lock-id`
- CERTIFIED_PROPOSERS — comma list of engines: `adaptive,openai`

Security baselines (preview vars)
- RATE_LIMIT_CERTIFIED (format `limit:windowSec`, default `60:60`)
- MAX_REQUEST_BYTES (default `65536`)
- SECURITY_HEADERS_PREVIEW (`true|false`) — adds conservative security headers to certified responses

Env (observability)
- OBS_SAMPLE_PCT (0..100) — % of requests sampled as events(type='latency')
- BUDGET_DAILY_CENTS — enables /api/ledger/alarm 24h budget check