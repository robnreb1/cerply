# Feature Flags
- ff_connectors_basic_v1 (default: off in prod, on in dev)
- ff_quality_bar_v1
- ff_cost_guardrails_v1
- ff_group_challenges_v1
- ff_certified_sla_status_v1
- ff_marketplace_ledgers_v1
- ff_benchmarks_optin_v1

Admin preview flags (EPIC #54):
- ADMIN_PREVIEW: enable /api/admin/certified/* routes (default off)
- ADMIN_TOKEN: required bearer token for admin routes
- ADMIN_MAX_REQUEST_BYTES: size cap in bytes (default 32768)
- ADMIN_RATE_LIMIT: per-route limit hint (reserved)
 - CORS invariants: ACAO:* on responses; no ACAC; OPTIONS returns 204 with `access-control-allow-headers: content-type, x-admin-token`.

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

Auth & Session (v0)
- AUTH_ENABLED (default: false) — enables anonymous sessions and CSRF guard
- AUTH_REQUIRE_SESSION (default: false) — when true, mutating under `/api/orchestrator/*` and `/api/certified/*` requires a session (401 if missing)
- AUTH_COOKIE_NAME (default: sid) — cookie name for session id
- AUTH_SESSION_TTL_SECONDS (default: 604800) — session TTL (7 days)
- REDIS_URL (optional) — when set, session store uses Redis instead of in-memory

Channel Integrations (Epic 5)
- FF_CHANNEL_SLACK (default: false) — enables Slack channel integration via `/api/delivery/*` routes
  - When true, `POST /api/delivery/send` accepts `channel: 'slack'`
  - When true, `POST /api/delivery/webhook/slack` handles Slack events and interactivity
- FF_CHANNEL_WHATSAPP (default: false) — enables WhatsApp integration (planned Phase 2)
- FF_CHANNEL_TEAMS (default: false) — enables Microsoft Teams integration (planned Phase 3)
- FF_CHANNEL_EMAIL (default: false) — enables email fallback for channel failures

Slack Configuration (Epic 5)
- SLACK_CLIENT_ID — OAuth client ID from Slack app configuration
- SLACK_CLIENT_SECRET — OAuth client secret (must be set when FF_CHANNEL_SLACK=true)
- SLACK_SIGNING_SECRET — Webhook signature verification secret (required for webhook handler)

Ensemble Content Generation (Epic 6)
- FF_ENSEMBLE_GENERATION_V1 (default: false) — enables 3-LLM ensemble content generation pipeline
  - When true, enables `/api/content/*` routes for understanding, refinement, and generation
  - Requires OPENAI_API_KEY and ANTHROPIC_API_KEY to be set
- FF_CONTENT_CANON_V1 (default: false) — enables canon storage and reuse for generic content
  - Automatically detects generic content (fire safety, GDPR, etc.) and stores for reuse
  - Saves ~70% cost by reusing similar content (>90% similarity threshold)

LLM Configuration (Epic 6)
**Note:** These models are used ONLY for content building (ensemble generation), NOT for standard chat interactions.

- OPENAI_API_KEY — OpenAI API key for GPT-5 (required for ensemble generation)
- ANTHROPIC_API_KEY — Anthropic API key for Claude 4.5 Sonnet (required for ensemble generation)
- GOOGLE_API_KEY — Google API key for Gemini 2.5 Pro (required for ensemble generation)
- LLM_GENERATOR_1 (default: gpt-5) — First generator model with extended thinking capabilities
- LLM_GENERATOR_2 (default: claude-sonnet-4.5-20250514) — Second generator model with nuanced reasoning
- LLM_FACT_CHECKER (default: gemini-2.5-pro) — Fact-checker model with multimodal reasoning

Cost Controls (Epic 6)
- MAX_GENERATION_COST_USD (default: 5.00) — Maximum cost per generation; aborts if exceeded
- WARN_GENERATION_COST_USD (default: 2.00) — Warning threshold for high-cost generations

Gamification & Certification (Epic 7)
- FF_GAMIFICATION_V1 (default: false) — enables gamification features (levels, leaderboards)
- FF_CERTIFICATES_V1 (default: false) — enables certificate generation and Ed25519 signing
- FF_MANAGER_NOTIFICATIONS_V1 (default: false) — enables manager notifications for learner achievements
- CERTIFICATE_SIGNING_KEY — Ed25519 private key for certificate signing (hex format)
- CERTIFICATE_PUBLIC_KEY — Ed25519 public key for certificate verification (hex format)

Conversational Learning Interface (Epic 8)
- FF_CONVERSATIONAL_UI_V1 (default: false) — enables chat panel and natural language query routing
  - When true, enables `/api/chat/*` routes for chat sessions, messages, and explanations
  - Requires OPENAI_API_KEY to be set for LLM-powered explanations
- FF_FREE_TEXT_ANSWERS_V1 (default: false) — enables free-text answer validation in `/api/learn/submit`
  - When true, accepts `answerText` field in addition to `answerIndex`
  - Uses fuzzy matching (>90% similarity) and LLM fallback for validation
  - Requires OPENAI_API_KEY for LLM validation
- CHAT_LLM_MODEL (default: gpt-4o-mini) — LLM model for chat explanations (cost-optimized)
- LLM_UNDERSTANDING (default: gpt-4o) — LLM model for free-text answer validation (accuracy-optimized)
- EXPLANATION_CACHE_TTL (default: 3600) — Cache TTL in seconds for explanations (1 hour)

Web Feature Flags (Epic 8)
- NEXT_PUBLIC_CONVERSATIONAL_UI_V1 (default: false) — enables ChatPanel component in web UI
  - When true, shows floating chat button with Cmd+K shortcut
  - Keyboard shortcuts: Cmd+K or / to open, Escape to close