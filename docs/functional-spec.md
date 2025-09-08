Cerply — Functional Specification (v3.0, AI-First)

1) Product vision

Cerply is an AI-first learning engine. Users speak naturally; Cerply clarifies goals, baselines current knowledge, proposes logically grouped modules, generates lessons & quizzes, and reinforces over time. It feels like talking to a subject-matter mentor with infinite memory, not a website with AI bolted on.

D2C ships first (wow factor + daily value), then expand to teams & enterprise (push modules to staff, track progress, “Company Certified” white-label).

⸻

2) Objectives (90-day)
	•	Ship a stable D2C web app with conversational intake → plan → confirm → lessons → daily review.
	•	Establish moats (data telemetry; human-in-loop certification; group/teams; refined prompts; delightful UX; reinforcement).
	•	Land 3–5 enterprise pilots (L&D/Compliance) on the same codebase.
	•	Keep infra simple: Fastify API + Next.js app; OpenAI for planning (env-flag guarded).

⸻

3) Principles & moats
	1.	Data (private by default): Capture searches, clarifiers, plans, outcomes, ratings, spaced review signals. Strict confidentiality. Enables “infinite memory” for longitudinal learning.
	2.	Certified (human-in-loop): Expert guild validates selected courses; “Cerply Certified” for D2C, “[Company] Certified” for enterprise.
	3.	Groups/Teams: Share with friends/family; push to teams; track progress; not possible with a generic chatbot alone.
	4.	Prompts: Purpose-built, deeply refined prompts that a casual user can’t replicate.
	5.	Beauty: Minimalist, professional UI; typewriter assistant messages; frictionless interactions.
	6.	Competitive energy: Friendly leaderboards; insights into struggle vs mastery.
	7.	Never lose knowledge: Spaced retrieval keeps prior learnings active.
	8.	AI-first: Conversation drives flow. UI scaffolds it—doesn’t fight it.

⸻

4) System overview
	•	Web (Next.js App Router, Tailwind): Single conversational surface. Upload/paste/URL. Assistant replies with typewriter effect. Auto-scroll to latest. Login gate before persistent creation.
	•	API (Fastify): /api/ingest/* (parse/preview/generate/clarify/followup), /api/auth/*, health & debug helpers. Optional LLM planner for module planning.
	•	LLM routing (env-guarded): OpenAI gpt-4o-mini for planning when enabled; deterministic fallbacks when not.
	•	Data: Start with in-memory stores; persist later (Postgres). Telemetry & event logs from Day 1.

⸻

5) Primary user flows

5.1 D2C learner
	1.	User lands → Cerply says (typewriter): “Hi, I’m Cerply. What would you like to learn?”
	2.	User enters brief (or uploads file/URL).
	3.	Cerply clarifies (exam board, level, focus, prior knowledge).
	4.	Cerply baselines (ask “What’s your current level?” → quick self-report for now).
	5.	Cerply proposes modules (3–6, logically grouped, not time-boxed).
	6.	User confirms or edits in natural language (no template buttons).
	•	If “add speaking practice” → follow-up augments plan (append, not pivot).
	7.	Cerply generates draft lesson items (explainers, MCQ, free-type).
	8.	Cerply schedules daily reviews (spaced repetition).
	9.	Dashboard shows progress & objectives; user can pause/disable tracks.

5.2 L&D / owner (phase 2, on same stack)
	•	Load org topics (private) + whitelabel “Cerply Certified”.
	•	Push modules to cohorts; view analytics (participation, mastery, risk).
	•	“Company Certified” overlay; audit-ready exports.

⸻

6) Conversational orchestrator (frontend logic)
	•	States: idle → clarifying → planning → confirming → generating → reviewing → daily.
	•	Typewriter for all assistant messages (configurable speed).
	•	Auto-scroll to latest on each assistant chunk or user send. Never jump to top.
	•	Loop guard: If the same assistant intent is queued twice consecutively (same kind & payload), coalesce and show "Still thinking…" once; if >10s without new content, show a one-line progress pulse.
	•	Natural edits: No “Create modules / Edit brief” buttons. Ask “Does this meet your needs?” then parse user reply via /api/ingest/followup.

⸻

7) Frontend UX spec (no carousels, for now)
	•	Top bar: Left logo; centre strapline “What will you master today?”; right login/account.
	•	Intro block: Typewriter assistant opener (bold “I’m Cerply”); then user composer visibly separate below (stays at bottom).
	•	Composer: Text field + upload button + Enter icon (keyboard return) send affordance.
	•	User bubbles: light green (to match logo hue).
	•	Assistant bubbles: neutral white/grey.
	•	Modules & items render within the chat stream as assistant cards once confirmed—not below the composer.
	•	Upload supports .pdf, .docx, .txt (base64 to API).
	•	No discovery carousels until visual treatment is redesigned.

⸻

8) Backend API (current MVP)

Namespaces
	•	Health/Debug:
	•	GET /api/health → { ok, env }
	•	GET /__routes(.json) | GET /__hello | GET /__whoami
	•	Auth:
	•	POST /api/auth/login → { ok, dev?, next }
	•	GET /api/auth/callback?token=... → sets cerply_session (HttpOnly, SameSite=Lax)
	•	GET /api/auth/me → { ok, user|null }
	•	Ingest:
	•	POST /api/ingest/parse → normalize { text|url|file }
	•	POST /api/ingest/preview → { modules[], diagnostics }
	•	POST /api/ingest/generate (auth-gated via REQUIRE_AUTH_FOR_GENERATE) → { items[] }
	•	POST /api/ingest/clarify → { question, chips[] } (seed clarifiers; adaptive)
	•	POST /api/ingest/followup →
	•	message includes “add/include …” → { action: "updated-plan", modules[] }
	•	message includes “generate/create … items” → { action: "generated-items", items[] }
	•	otherwise { action: "refine", brief, message }
	•	Feature-flagged (optional):
	•	/curator/quality/compute, /import/url|file|transcript, /evidence/coverage, /marketplace/ledger/summary, /certified/status, /learn/next|submit.

LLM planner (optional):
	•	Env toggles: LLM_PREVIEW=1, LLM_PLANNER_PROVIDER=openai, LLM_PLANNER_MODEL=gpt-4o-mini, OPENAI_API_KEY.
	•	If disabled/unset, fall back to heuristic module proposer.

⸻

9) Data model (MVP)
	•	Message: { id, role: "user"|"assistant", kind: "text"|"typing"|"modules"|"items"|"notice", payload }
	•	Plan: ModuleOutline { id, title, estMinutes? }[]
	•	Item: { moduleId, title, explanation, questions: { mcq, free } }
	•	Session (learn): { sessionId, idx }
	•	Telemetry event: { ts, userId?, kind, props } (e.g., clarify_shown, plan_confirmed, items_generated, loop_guard_hit)

⸻

10) Security & privacy
	•	Cookies: cerply_session HttpOnly, SameSite=Lax, 30-day max-age (dev).
	•	CORS: web origins allowed; credentials enabled.
	•	Headers ASCII-only (no typographic arrows) to avoid edge proxy bugs.
	•	PII: emails only for login; no artefact content is shared with third parties beyond the LLM provider (and only when planner is enabled).
	•	Opt-outs: Controls for data collection in Settings (post-MVP).

⸻

11) Observability
	•	API structured logs (route, duration, status, planner used).
	•	Frontend event log (first-party): time to clarifier, time to plan, time to generate, scroll-lock state, loop-guard triggers.
	•	Basic counters for usage and cost if LLM used.

⸻

12) Feature flags (all default false)
	•	FF_QUALITY_BAR_V1
	•	FF_COST_GUARDRAILS_V1
	•	FF_GROUP_CHALLENGES_V1
	•	FF_CONNECTORS_BASIC_V1
	•	FF_CERTIFIED_SLA_STATUS_V1
	•	FF_MARKETPLACE_LEDGERS_V1
	•	FF_BENCHMARKS_OPTIN_V1
	•	FF_PROMPTS_LIB_V1

⸻

13) Environments & dev setup
	•	Node 20.x (do not use 22.x).
	•	Monorepo scripts
	•	Run both: npm run dev
	•	API only: npm -w api run dev (Fastify on :8080)
	•	Web only: npm -w web run dev (Next.js on :3000)
	•	Ports fix: kill blockers on 3000/8080 if needed.
	•	Env basics:
	•	Web: NEXT_PUBLIC_USE_MOCKS=false, NEXT_PUBLIC_API_BASE=http://localhost:8080
	•	API (LLM optional): OPENAI_API_KEY=..., LLM_PREVIEW=1, LLM_PLANNER_PROVIDER=openai, LLM_PLANNER_MODEL=gpt-4o-mini
	•	Gate generate: REQUIRE_AUTH_FOR_GENERATE=1

⸻

14) Acceptance criteria (measurable)

14.1 Conversational UX
	•	Assistant opener renders with typewriter effect (avg 20–40 chars/sec).
AC: First 120 chars appear progressively; not a single frame dump.
	•	Auto-scroll anchors to the latest message after each user send or assistant chunk.
AC: No jumps to top; manual scroll does not fight auto-scroll once user stops scrolling.
	•	Composer sits clearly separated at the bottom on initial load and never hangs mid-screen.
AC: On first paint, composer is within last 15% of viewport height.
	•	Enter icon present in composer; Enter submits; Shift+Enter makes newline.
AC: Keyboard behavior verified; icon visible.
	•	User bubbles use light green (Cerply brand-matched); assistant bubbles neutral.
AC: Contrast AA on text over both backgrounds.

14.2 Intelligent intake & planning
	•	POST /api/ingest/clarify returns domain-aware clarifiers for known patterns (e.g., “GCSE German” → exam board & level chips).
AC: Includes at least one domain-specific question or chip in 1st response for GCSE/regulatory domains.
	•	POST /api/ingest/preview produces 3–6 logical modules (no generic “Module 1”/“About”).
AC: Titles contain no “About/Module/Core Concepts” placeholders; 80% of sample queries pass manual spot-check.
	•	If LLM planner is enabled and healthy, planner=llm in diagnostics; otherwise planner=heuristic with reason.
AC: Headers include x-planner and optional x-model; JSON includes diagnostics.planner.

14.3 Natural revision (no buttons)
	•	When the user says “add speaking practice”, follow-up appends to plan (dedup), doesn’t pivot.
AC: Response { action: "updated-plan" } with original modules + the new one at the end.
	•	When the user says “generate lesson items”, follow-up returns { action: "generated-items" } with items for current plan.
AC: At least one MCQ and one free prompt per module.

14.4 Auth gate and persistence
	•	Calling POST /api/ingest/generate without session cookie returns 401 + www-authenticate.
AC: After /api/auth/login → /api/auth/callback?token=..., subsequent /api/ingest/generate succeeds.
	•	Session cookie is HttpOnly, SameSite=Lax, 30-day max-age (dev).
AC: Set-Cookie verified.

14.5 Non-UI routes (where flagged)
	•	/curator/quality/compute accepts items and returns scores (200) or 400; never 404/405.
	•	/evidence/coverage returns summary + gaps; web /coverage (if present) proxies cleanly.
	•	Health routes return 200 JSON on Vercel and local (proxy permitted).

14.6 Loop guard
	•	Assistant never repeats the same “planning” or “generating” message more than once without new content.
AC: Duplicate intents are coalesced; “Still thinking…” appears once; a follow-up result or apology arrives within 10s.

⸻

15) Non-functional / Dev UX
	•	Performance: First assistant response within 1.5s on average (heuristic path). LLM path under 4.5s median with streaming messaging UI.
	•	A11y: Lighthouse Accessibility ≥ 90 (home).
	•	Scripts:
	•	Smoke (local): npm run smoke hits /api/health and (if flagged) /api/prompts.
	•	Staging smoke (if edge canaries used): scripts/smoke-stg.sh with bypass cookie; accept x-edge: *-proxy|*-fallback.
	•	Logs: x-api header set per route; planner/model in headers where applicable.

⸻

16) Change log
	•	2025-09-03: v3.0 AI-first rewrite. Conversational intake formalised; buttons removed in favour of natural replies; typewriter + auto-scroll acceptance; loop guard; LLM planner env clarified; carousels removed for now; D2C priority recorded.
	•	2025-08-31 → 08-19: (historic) Edge canaries & proxies; prompts library; evidence coverage; flags; learn MVP.

⸻

Notes for your team
	•	This FSD intentionally centres the AI conversation. Any UI that pushes users through fixed templates is an anti-goal.
	•	Keep file & URL ingestion simple, but validate size and visibility of the Upload affordance.
	•	If the conversation “hangs”, the UI must tell the user it’s thinking (with a clear spinner message) and never leave them at the top of the chat.