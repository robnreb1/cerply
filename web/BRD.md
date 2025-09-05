# Cerply — Business Requirements (BRD)

## 1) Product in one breath
Cerply is an **AI‑first learning orchestrator**. A stateful conversation clarifies a goal → plans modules → generates lessons → mixes daily practice → measures mastery → adapts. The UI is a thin, calm chat; **the orchestrator owns state**; **no pointless loops**.

## 2) Users & value
- **D2C learners** who want fast plans and daily practice.
- **Pilot orgs** who want minimal assign/track (badge aliasing: “{Org} Certified”).

## 3) Scope (today)
- **Flow:** clarify → plan → confirm → generate. Follow‑ups via `/api/ingest/followup` with `{ action: 'append' | 'revise' | 'hint' }`. Do **not** re‑plan unless server says `revise`.
- **UI rules:**
  - **Opener** types; each sentence on a **new line**. No duplicate intro. No “AI‑first marketing” phrase.
  - **Bubbles:** user **right‑justified**, Cerply **left**.
  - **Composer:** sticky input at bottom, Enter to send, upload button present; **native file input hidden** (inline style + Tailwind class backup).
  - **Natural‑language confirmations:** “**looks good**”, “**add/include X**”, “**remove Y**”.
- **API (Fastify :8080)**
  - `POST /api/ingest/clarify` → `{ ok, question, chips[] }` (3–6 smart chips; syllabus/vendor aware, e.g., AQA vs Edexcel).
  - `POST /api/ingest/preview` → `{ modules: [{ id, title }] }` (plan preview from an enriched brief).
  - `POST /api/ingest/followup` → returns **append/revise/hint**; when `message` starts with *add/include*, heuristically **append**.
  - `POST /api/ingest/generate` → gated by auth; use `GET /api/auth/me` and `/api/auth/login`.
- **Flags/env:** `LLM_PREVIEW=1`, `LLM_PLANNER_PROVIDER=openai`, `LLM_PLANNER_MODEL=gpt-4o-mini`.
- **Guardrails:** topic/language filters; refuse proxy uses (no unrelated Q&A); ASCII‑only headers; request budgeting/model routing; session‑scoped learner twin.

---

## 4) Landing experience (splash → chat)
- **Landing**: minimal logo **“Cerply” pulsing**, network strands animate into a **brain** that pulses; **auto‑transitions** to chat quickly.
- **Perf target**: ≤ **1.5s** from first paint to chat on normal desktop; animation should not block chat init.
- **Status**: visual spec handled separately; this BRD establishes **existence + quick handoff**.

## 5) Session start: logged‑in vs guest
- **Logged‑in**:
  - If active learning exists → ask: **Continue where you left off?** or **Add a new topic** (two chips). Route accordingly.
  - If no active learning → treat like new topic flow.
- **Guest**:
  - Opener should **hook** (value props) and nudge to **Sign up / Log in** early.
  - Keep a **1‑tap login** affordance visible in header.

## 6) Training lives in the chat stream
- New topics: short **intro explainer** → **quickly into questions**.
- **Default**: natural‑language Q&A in chat (typed or voice when available).
- **Optional**: **limited multiple choice** on request (user can flip to MC if needed).
- Persist **everything** in the stream; no separate pages for core flow.

## 7) Persistent shortcuts & diverted streams
- Always‑visible **shortcuts**: **Popular Topics** and **Cerply Certified**.
- Triggering a shortcut starts a **diverted sub‑thread** in the same stream (visually distinct block with a label), then offers a **“Back to your plan”** chip to return.
- The orchestrator must **pause/resume** the original thread state seamlessly.

## 8) Outcome‑first planning & content sourcing (priority order)
When planning/generating, use this priority stack:
1. **Cerply Certified** (paid/paywalled)
2. **Highly rated** content (**≥3★**)
3. **Previously generated** but unrated content
4. **Research** (deep search; summarize how mastery is achieved **with citations**). This will be common early on for new topics.

- Always assume **beginner** start unless user states otherwise.
- The **outcome and start point** determine module coverage; **no hard caps** (e.g., module count, time per session) baked into UX.
- Users must **confirm** the plan/content **meets expectations** before deep generation begins.

## 9) Generation & background prep
- After confirmation, generate **a very small subset of the first module** to get the learner started immediately.
- In the **background**, fetch/prepare subsequent content (reuse 
  where possible). This remains **seamless** to the user.

## 10) Adaptive learning model (per concept)
- New concept → **brief explainer**.
- Questions start **easy**, then ramp complexity.
- On mistakes → offer **simpler explainers** while keeping the current difficulty; require **3 correct** at that level to mark as recovered.
- On proficiency → emit a **congratulatory** message.
- Apply this to **concepts, modules, topics** (milestones).
- **Challenge** affordance: user can challenge a question/answer at any time (footer shortcut). Log the challenge and route to correction.

## 11) Audience & propagation
- Ask whether the topic is for **me**, **others**, or **both** (default configurable in Settings).
- If **for me**: follow standard flow above.
- If **for others**: support propagation styles:
  1) Push **individual questions** via external chat apps (e.g., WhatsApp, iMessage, Snapchat).  
  2) Others access directly via **Cerply app/web**.  
  3) **Integration** request → create a backlog item (likely business tier).
- If **for others only**: enable **full curation** before delivery:
  - Review/edit **concept/lesson structure** per module; allow **uploads** and **start from scratch**.
  - **Private** option (required for proprietary info).
  - Add a **share incentive** hook (paid/credits/kudos). **Open** item to design.

## 12) Analytics in the stream (and for teams)
- Present dashboards **inside the chat**; keep header/footer shortcuts for quick access to the same data.
- **Headline stats**: topics **complete / in progress / closed**, % completion, **weak/strong concepts**, **time spent** per day/week/month, **reminder frequency** (for complete/in‑progress topics).
- Users (and their **team**, if applicable) can **drill in** or ask for more detail; all data must be accessible.

## 13) Bounds & pacing
- Users can set **bounds** (e.g., “Master GCSE Maths by end of March”).
- Orchestrator **paces** modules/questions to meet the bound; communicates trade‑offs if the bound is aggressive.

## 14) Privacy & data
- Store **learning patterns** from day one to improve adaptation.
- Keep **user PII** in a secure table; all other tables use an **anonymized UID**.
- Respect regional **privacy** requirements; add deletion/export endpoints later.

---

## 15) Acceptance criteria (Done)
- [ ] **Landing** exists and transitions to chat in ≤ **1.5s**; animation does not block chat init.
- [ ] **Logged‑in** start: shows **Continue / Add new topic** choices when prior learning exists; routing works. **Guest** start: clear hook + working **Sign up / Log in** path.
- [ ] **Opener types** with line breaks; **exactly one** opener bubble.
- [ ] Clarify returns `{ question, chips[] }` with **3–6 chips**; picking a chip proceeds to **plan preview**.
- [ ] **Shortcuts** for **Popular Topics** and **Cerply Certified** appear; launching them creates a labeled **diverted block** with a **Back to your plan** chip; prior thread resumes correctly.
- [ ] **Outcome‑first** planning respects the **1→4** content priority order; **Cerply Certified** items require paywall gating.
- [ ] User **confirms** plan suitability before deep content generation.
- [ ] Generation starts with a **small subset** of module 1; background preparation continues seamlessly.
- [ ] Adaptive behavior: easier explainers on error; **3 correct** to recover; milestone **congrats** emitted.
- [ ] **Challenge** shortcut works and logs; MC toggle available on request; default is NL chat.
- [ ] **Tailwind styles load**; no visible native file input.
- [ ] **No Next.js overlays**: valid `app/layout.tsx` (with `<html>`/`<body>`), `app/error.tsx`, `app/global-error.tsx`.

## 16) Manual smoke tests
```bash
# API health
curl -sS http://localhost:8080/api/health

# Clarify
curl -sS -X POST http://localhost:8080/api/ingest/clarify \
  -H 'content-type: application/json' \
  --data '{"text":"GCSE German (AQA Higher)"}'

# Follow-up heuristic
curl -sS -X POST http://localhost:8080/api/ingest/followup \
  -H 'content-type: application/json' \
  --data '{"brief":"GCSE German (AQA Higher)","plan":[{"id":"m1","title":"Reading"}],"message":"add speaking practice"}'
```

## 17) Measurements (Quarter‑0)
- Log clarify→plan→generate latency and win‑rates.
- Nightly eval prompts.
- Add `difficulty`/`discrimination` fields to generated items (schema exists in API).

## 18) Safety & privacy
- Topic/language filters at clarify; decline proxy requests.
- ASCII‑only headers; request budgeting + routing; redact PII in logs where relevant.
- Session‑scoped “learner twin”; expose deletion endpoints later.

## 19) Moats (north star, not all today)
Data; Certified content + expert loop; org push & tracking; evolving prompts/orchestrator; long‑horizon memory; psychometrics; credentials; source rights; orchestrator/evals; compliance/residency; edge modes; integrations; marketplace; safety; experimentation; localization; freshness.

## 20) Operating principle
When ambiguous, make the **smallest reasonable assumption**, state it in the PR/commit, and proceed.