Cerply — Functional Specification (v3.3, AI-First)

1) Product vision

Cerply is an AI-first learning engine. Users speak naturally; Cerply (GPT-5 persona) clarifies goals, baselines current knowledge, proposes logically grouped, syllabus-aware modules (variable length), generates lessons & quizzes, and reinforces over time. It should feel like talking to a subject-matter mentor with infinite memory, not a website with AI bolted on.

D2C ships first (wow factor + daily value), then expand to teams & enterprise (push modules to staff, track progress, whitelabel “[Company] Certified” while optionally drawing from Cerply Certified).

⸻

2) Objectives (next 90 days)
	•	Ship a stable D2C web app with conversational intake → clarify → plan → confirm → lessons → daily review.
	•	Establish moats (data telemetry; human-in-loop certification; groups/teams; refined prompts; delightful UX; reinforcement).
	•	Land 3–5 enterprise pilots (L&D/Compliance) on the same codebase.
	•	Keep infra simple: Fastify API + Next.js; OpenAI for orchestration & planning (env-flag guarded).

2.1) UI freeze (no visual regressions)

This spec must not trigger any front-end visual changes. The current UI (header, spacing, colors, input/composer placement, no carousels, etc.) is frozen. All work below focuses on chat/LLM orchestration and server behavior. Do not reintroduce past ideas (e.g., straplines/alternate layouts) unless explicitly requested later.

⸻

3) Principles & moats (AGI-preserving)
	1.	Data (private by default): Capture searches, clarifiers, plans, outcomes, ratings, spaced-review signals. Strict confidentiality. Powers long-horizon “infinite memory.”
	2.	Certified (human-in-loop): Expert guild validates selected courses; Cerply Certified for D2C; [Company] Certified for enterprise.
	3.	Groups/Teams: Share with friends/family; owners push modules to cohorts; track progress—beyond generic chatbots.
	4.	Prompts & Tooling: Purpose-built, refined prompts with tool access (search, proprietary material, prior modules). Not realistically replicable by casual users.
	5.	Beauty: Minimalist, professional UI; typewriter assistant messages; frictionless interactions.
	6.	Competitive energy: Friendly leaderboards; insights into struggle vs mastery.
	7.	Never lose knowledge: Spaced retrieval reactivates prior learnings.
	8.	AI-first: The conversation drives the flow; UI only scaffolds it.
	9.	Tone: Friendly, assertive, and non-sycophantic. Cerply challenges vague requests and low-quality inputs.
	10.	Cerply Certified: Admin-only multi-agent refinement workflow across frontier models (GPT‑5 for planning and lesson generation, Gemini Ultra for alternative lesson generation, Claude Opus for review and refinement) produces trusted modules.
	11.	Expert Certified: Human experts, freelancers, or companies certify or distribute modules; public or private; may overlay Cerply Certified.

⸻

4) System overview
	•	Web (Next.js App Router, Tailwind): Single conversational surface. Upload/paste/URL. Assistant replies with typewriter effect. Auto-scroll to latest. Login gate before persistent creation.
	•	API (Fastify): Primary entrypoint POST /api/chat (orchestrator) that calls GPT-5 with the Cerply persona and available tools. Legacy /api/ingest/* routes remain as thin wrappers over orchestrator.
	•	LLM routing (env-guarded): 
		- Orchestration/Planning/Chat: GPT‑5 (fallback GPT‑4o).
		- Lesson creation: GPT‑5 Thinking.
		- Cerply Certified alt-lesson generation: Gemini Ultra.
		- Cerply Certified review/compare/refine: Anthropic Claude Opus.
	•	Data: Start in-memory (MVP), with planned Postgres persistence. Telemetry & event logs from Day 1.

⸻

5) Primary user flows

5.1 D2C learner
	1.	Landing → Cerply (typewriter): “Hi, I’m Cerply.” What would you like to learn?
	2.	User enters brief (or uploads file/URL).
	3.	Cerply clarifies (e.g., “GCSE German → AQA or Edexcel? Higher or Foundation?”).
	4.	Cerply baselines (self-report level for now).
	5.	Cerply proposes modules (variable count), logically grouped and syllabus-aware, not time-boxed.
	6.	User confirms/edits in natural language (no fixed buttons).
	•	e.g., “add speaking practice” → append, don’t pivot.
	7.	Cerply generates draft lesson items (explainer + MCQ + free type; later: voice/games).
	8.	Cerply schedules daily reviews (spaced repetition).
	9.	Dashboard shows progress & objectives; user can pause/disable tracks.

5.2 L&D / owner (phase 2)
	•	Load org topics (private) + whitelabel Cerply Certified and Expert Certified content.
	•	Push modules to cohorts; analytics (participation, mastery, risk).
	•	“[Company] Certified” overlay; audit-ready exports.

5.3 Cerply Admin (Certified generation)
	•	Admin-only workflow for Cerply Certified content generation.
	•	Admin chooses topic.
	•	Multi-agent refinement workflow uses GPT‑5 for planning and lesson generation, Gemini Ultra to generate alternative lessons, and Claude Opus to critique and refine the output.
	•	The final output is stored as Cerply Certified with a maintained audit trail.

⸻

6) Conversational orchestrator (frontend behavior)
	•	States: idle → clarifying → planning → confirming → generating → reviewing → daily.
	•	Typewriter for all assistant messages (configurable speed).
	•	Auto-scroll to latest on each assistant chunk or user send. Never jump to top.
	•	Loop guard: Coalesce duplicate intents (same kind & payload). Show one “Still thinking…” if >2s with no new content; show a subtle progress pulse if >10s.
	•	Natural edits: No “Create modules / Edit brief” buttons. Cerply asks “Does this meet your needs?” and processes free-text replies through /api/chat (or /api/ingest/followup compat).
	•	Assertive clarity: If the topic is too broad/ambiguous, Cerply pushes for constraints (goal, level, timeframe, constraints, prior knowledge), not a template dump.

⸻

7) Frontend UX spec (no carousels)
	•	Top bar: Keep the header exactly as currently implemented (logo + account).
	•	Intro block: Typewriter opener (bold “I’m Cerply”); user composer clearly separated at the bottom.
	•	Composer: Text field + upload button + Enter icon (keyboard return) as send.
	•	User bubbles: light green (brand-matched).
	•	Assistant bubbles: neutral white/grey.
	•	Modules & items render inside the chat as assistant cards after confirmation—never below the composer.
	•	Upload supports .pdf, .docx, .txt (base64 → API).
	•	No visual changes mandated by this spec. If a behavior conflicts with current visuals, keep the visuals and raise a follow-up ticket.

⸻

8) Backend API (MVP)

8.1 Orchestrator (primary)

POST /api/chat → unified entrypoint.
Request { messages: Msg[], profile?: LearnerProfile }
	•	Msg = { id, role: 'user'|'assistant'|'tool', content: string, meta? }
	•	The assistant system prompt (persona) and tool schema are injected server-side.

Response { action: 'clarify'|'plan'|'confirm'|'generate'|'items'|'meta', data, telemetry? }
	•	clarify → { question, chips?[] }
	•	plan → { modules: ModuleOutline[] } (no fixed count)
	•	confirm → { summary, risks?, assumptions? }
	•	generate/items → { items: LessonItem[] }
	•	meta → { notice | apology | progress }

Headers: x-planner, x-model, x-api: chat-orchestrate.

8.2 Tools exposed to the model
	•	search.web(query) → curated web search.
	•	kb.fetch(kind, id) → proprietary materials; includes Cerply Certified and Expert Certified.
	•	profile.read(userId) / profile.write(userId, patch) → learner memory.
	•	modules.store(userId, plan) / modules.load(userId) → persistent plans.
	•	analytics.record(event) → telemetry sink.

8.3 Legacy/compat (thin wrappers over orchestrator)
	•	POST /api/ingest/clarify → orchestrator seeded to clarify.
	•	POST /api/ingest/preview → orchestrator for a plan.
	•	POST /api/ingest/followup → orchestrator with last plan + user message.
	•	POST /api/ingest/generate (auth-gated) → orchestrator for items.

8.4 Health/Auth
	•	GET /api/health → { ok, env }
	•	POST /api/auth/login → { ok, dev?, next }
	•	GET /api/auth/callback?token=... → sets cerply_session cookie (HttpOnly, SameSite=Lax)
	•	GET /api/auth/me → { ok, user|null }

LLM planner toggles: OPENAI_API_KEY, LLM_PREVIEW=1, LLM_PLANNER_PROVIDER=openai, LLM_PLANNER_MODEL=gpt-4o-mini (overrideable), hard 503 on missing/invalid.

⸻

9) Data model (MVP)
	•	Message { id, role: 'user'|'assistant'|'tool', kind?: 'text'|'typing'|'modules'|'items'|'notice', payload? }
	•	Plan ModuleOutline { id, title }[] (no estMinutes, no fixed count)
	•	LessonItem { moduleId, title, explanation, questions: { mcq, free } }
	•	Session { sessionId, idx }
	•	Telemetry { ts, userId?, kind, props }

⸻

9.1) Infinite Memory & Adaptive Learning

**Learner Profile (baseline + preferences)**
- At onboarding or anytime via settings, user can register learning preferences and difficulties (e.g., preferred formats, self-identified weak areas, time available per day).
- Profile persisted and injected into planning and generation prompts.

**Telemetry Collection (passive signals)**
- For every lesson interaction capture: correctness, retries, time-to-answer, skips/abandons, ratings, engagement streaks.
- Logged via `analytics.record` and associated to userId where available.

**Infinite Memory Store**
- Profile + telemetry evolve into long-horizon store:
  `{ prefs, strengths, weaknesses, masteredTopics, strugglingTopics, interests }`.
- Each new plan or review includes this context.

**Adaptive Lesson Evolution**
- Struggled topics → generate more varied practice, denser refreshers, easier ramp.
- Mastered topics → reduce frequency, schedule spaced retrieval.

**Interests-driven Personalisation**
- Track topics with highest engagement; weave into examples or reviews to sustain motivation.

**Cross-user Insights (confidential)**
- Aggregate telemetry to detect hard spots; adjust Cerply Certified modules automatically (regenerate or clarify where common failure occurs).
- Maintains strict confidentiality—no PII leakage.

**Adaptive Reinforcement Loop**
- Flow: Baseline → Initial plan → Lessons & quizzes → Telemetry → Profile update → Next module generation & reviews.
- Infinite memory ensures no knowledge is lost; spaced retrieval reactivates mastered material over time.

⸻

9.2) Module & Lesson Guardrails

Cerply distinguishes between two major categories of modules: **Non-Certified Modules (D2C)** and **Certified Modules (Cerply Certified / Expert Certified)**. Each category applies different guardrail strategies for lesson quality, metadata, and trust.

**Non-Certified Modules (D2C)**
- Guardrails such as success criteria, prerequisites, explainers, pitfalls, and citations are implicitly generated by the AI and operate in the background.
- These elements shape lesson planning, structure, and adaptivity, but are not formally exposed to the user as explicit metadata or checklists.
- Telemetry (e.g., correctness, engagement, retries) and adaptive refinement still apply: lessons evolve based on learner performance and aggregate insights.
- The focus is on rapid, conversational learning experiences where AI-driven structure ensures quality without surfacing formal requirements.

**Certified Modules**
- Certified modules are designed to be publishable, trust-forward, and auditable. They explicitly expose metadata such as:
  - Success criteria
  - Prerequisites
  - Explainers
  - Pitfalls
  - Citations
- This metadata is visible to learners and reviewers, supporting transparency and accountability.

  - *Cerply Certified*: Modules are generated and refined through a multi-agent process using frontier models (e.g., GPT‑5 for planning and lesson creation, Gemini Ultra for alternative lessons, Claude Opus for critique and convergence). The workflow includes generation, critique, and refinement steps, producing trusted modules with full audit trails.
  - *Expert Certified*: Human experts, freelancers, or companies validate, edit, or author modules. These can be public or private, and may overlay Cerply Certified modules if desired. Human input can include direct authorship, review, or targeted edits for domain accuracy or compliance.

Certified modules are intended for scenarios where reliability, auditability, and explicit learning objectives are required—such as enterprise, compliance, or public distribution.

⸻
	•	Cookies: cerply_session HttpOnly, SameSite=Lax, 30-day max-age (dev).
	•	CORS: only known web origins; credentials enabled.
	•	Headers ASCII-only to avoid proxy bugs.
	•	PII: email only for login; artefacts never shared beyond LLM provider when planner is enabled.
	•	Settings page (post-MVP) for data collection opt-out.

⸻

11) Observability
	•	API structured logs (route, duration, status, planner/model, token usage).
	•	Frontend event log: time to clarifier/plan/generate, scroll-lock state, loop-guard triggers.
	•	Basic counters for usage and cost when LLM enabled.

⸻

12) Feature flags (default false)
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
	•	Kill blockers on 3000/8080 if needed.
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
AC: No jumps to top; manual scroll doesn’t fight auto-scroll once user stops.
	•	Composer sits clearly separated at the bottom on initial load and never hangs mid-screen.
AC: On first paint, composer is within last 15% of viewport height.
	•	Enter icon present; Enter submits; Shift+Enter newline.
AC: Keyboard behavior verified; icon visible.
	•	User bubbles light-green (brand-matched); assistant neutral.
AC: Contrast AA on text over both backgrounds.
	•	No UI regression from this spec.
AC: Implementing chat/LLM behavior from this document does not require modifying the existing header, colors, spacing, or adding/removing carousels.

14.2 Intelligent intake & planning
	•	POST /api/chat (or ingest/clarify) returns domain-aware clarifiers (e.g., GCSE → board/level).
AC: At least one domain-specific question/chip in the first response for GCSE/regulatory domains.
	•	Planning produces logically grouped modules (variable count; no generic “Module 1/About/Core Concepts”).
AC: ≥80% of sample queries pass manual spot-check; counts vary with content.
	•	If LLM planner is enabled and healthy, planner=llm; else planner=heuristic with reason.
AC: x-planner and optional x-model headers present; diagnostics.planner filled.

14.3 Natural revision (no buttons)
	•	“Add speaking practice” appends to plan (dedup) rather than pivoting.
AC: { action: 'updated-plan' } contains original modules + new one last.
	•	“Generate lesson items” returns { action: 'generated-items' } with items for the current plan.
AC: At least one MCQ and one free prompt per module.

14.4 Auth gate & persistence
	•	Calling POST /api/ingest/generate without session cookie returns 401 + www-authenticate.
AC: After /api/auth/login → /api/auth/callback?token=..., subsequent generate succeeds.
	•	Cookie is HttpOnly, SameSite=Lax, 30-day max-age (dev).
AC: Set-Cookie verified.

14.5 Non-UI routes (flagged)
	•	/curator/quality/compute accepts items → 200/400, never 404/405.
	•	/evidence/coverage returns summary + gaps; web /coverage (if present) proxies cleanly.
	•	Health routes return 200 JSON on Vercel and local (proxy permitted).

14.6 Loop guard
	•	Assistant never repeats the same planning/generating notice twice without new content.
AC: Duplicate intents coalesced; “Still thinking…” appears once; a follow-up result or apology arrives within 10s.

⸻

15) Non-functional / Dev UX
	•	Performance: First assistant response ≤1.5s median (heuristic path). LLM path ≤4.5s median with streaming UI.
	•	A11y: Lighthouse Accessibility ≥90 (home).
	•	Scripts:
	•	Smoke (local): npm run smoke hits /api/health and (if flagged) /api/prompts.
	•	Staging smoke (if edge canaries used): scripts/smoke-stg.sh with bypass cookie; accept x-edge: *-proxy|*-fallback.
	•	Logs: x-api header per route; planner/model headers where applicable.

⸻

16) Change log
	•	2025-09-06: v3.3 — Added Cerply Certified (admin-only multi-agent frontier refinement) and Expert Certified (human expert/company certification). Updated LLM routing to use GPT‑5 for planning and lesson generation, Gemini Ultra for alternative lesson generation, Claude Opus for review/refine, with GPT‑4o fallback. Added admin workflow for Cerply Certified.
	•	2025-09-05: v3.2 — Removed fixed module count; clarified assertive tone; tightened loop-guard UX; re-affirmed UI freeze; acceptance updated to variable module counts.
	•	2025-09-04: v3.1 — Orchestrator elevated to primary (/api/chat); tools contract documented; acceptance tightened; legacy ingest wrapped.
	•	2025-09-03: v3.0 — AI-first rewrite; conversational intake formalised; buttons removed; typewriter/auto-scroll acceptance; loop guard; LLM env clarified; carousels removed; D2C priority.
	•	2025-08-31 → 08-19: (historic) Edge canaries & proxies; prompts library; evidence coverage; flags; learn MVP.

⸻

Notes for your team
	•	This FSD intentionally centres the AI conversation. Any UI that pushes users through fixed templates is an anti-goal.
	•	Keep file & URL ingestion simple and visible.
	•	If the conversation “hangs”, the UI must show progress (spinner/pulse) and never leave users at the top of the chat.