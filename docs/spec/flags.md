# Feature Flags
- ff_connectors_basic_v1 (default: off in prod, on in dev)
- ff_quality_bar_v1
- ff_cost_guardrails_v1
- ff_group_challenges_v1
- ff_certified_sla_status_v1
- ff_marketplace_ledgers_v1
- ff_benchmarks_optin_v1
 
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

Env (observability)
- OBS_SAMPLE_PCT (0..100) — % of requests sampled as events(type='latency')
- BUDGET_DAILY_CENTS — enables /api/ledger/alarm 24h budget check