# Cerply — Launch Plan v4.1 (aligned to FSD)

## Overview
This plan sequences the MVP to hit GTM Gates:
A) Habit (daily learning loop), B) Certified supply, C) Pilot outcomes, D) Revenue.

## Priority Order
1) Conversational Orchestrator & Loop-Guard
- Outcome: /api/chat drives clarify → plan → confirm → generate; loop-guard + x-planner/x-model headers.
- Actions: unify ingest routes; natural revision; coalesce duplicates; still-thinking pulse hooks.
- Acceptance: variable module counts; domain-aware clarifiers; headers present; no duplicate intents.

2) Learner Engine (MVP)
- Outcome: Next-best item + capture→adapt loop.
- Actions: GET /learn/next, POST /learn/submit; scheduler → ReviewSchedule; web fetch/submit; unit tests.
- Acceptance: >80% learners scheduled; accuracy uptick post-review; latency meets FSD §14.

3) Persistence Uplift
- Outcome: Durable Plan/Module/Item/Attempt/ReviewSchedule with Drizzle migrations + seeds.
- Actions: idempotent seeds; migrate-in-place path; fresh-DB acceptance.

4) Auth & Session
- Outcome: Magic-link dev flow; 401 on generate without session; secure cookies.
- Actions: /api/auth/login, /api/auth/callback, /api/auth/me; cookie flags; `www-authenticate` on 401.

5) Infra & Deployment
- Outcome: Repro deploys (Render + GHCR + Vercel).
- Actions: image tagging by SHA; env/flags review; CI builds + smoke.
 - Acceptance:
   - [x] Green CI
   - [x] Can roll forward/back via image tag
   - [x] Render deploy auto-trigger after :prod promotion
 - Ops Notes:
   - GHCR tags: resolver picks latest non-prod tag; :prod retagged automatically.
   - Render deploy: GitHub Actions posts to service hook and waits for /api/health 200.
   - Manual verify: `gh api /users/$OWNER/packages/container/cerply-api/versions?per_page=10 | jq ...` to confirm `prod` tag is on the newest digest.

6) Observability + Telemetry & Cost Ledger
- Outcome: Route index + events + per-model costs.
- Actions: `__routes.json`; event sink; GenLedger; pilot metrics endpoint; alarms.
- Acceptance: events visible; cost totals ≤1% error; CI smoke green.

7) GTM Readiness (minimal)
- Outcome: Buyers can understand, try, and contact.
- Actions: one-liner; short demo GIFs for /learn and /curator; contact/waitlist; getting-started doc.
- Acceptance: public page + assets live; contact path working.

8) Certified Content (Admin)
- Outcome: Multi-agent refinement; publishable packs with audit trail.
- Actions: thin-slice: admin-only/CLI publish; then /api/curator/* and web /curator; SLA flag `FF_CERTIFIED_SLA_STATUS_V1`.
- Acceptance: 2 seed packs published; metadata visible; turnaround tracked.

9) Security & Compliance
- Outcome: Sensible defaults (rate limits, CORS, headers, budgets).
- Acceptance: headers/limits verified; privacy/terms placeholders.

10) Web UX & Reliability (behavior-only)
- Outcome: Smooth chat with visible progress; no visual regressions.
- Actions: progress pulse on delay; E2E ingest→plan→generate→learn→review; error envelope surfaced (flagged).
- Acceptance: E2E passes; UI unchanged unless flagged.

11) Groups/Challenges (flag)
- Outcome: Social loop behind `FF_GROUP_CHALLENGES_V1`.

12) Documentation & Spec Hygiene
- Outcome: Spec parity; flags documented; RFC for Adaptive + tests.

13) Launch Orchestration
- Outcome: D-day runbook; rollback; on-call; dashboard; dry-run complete.

## Gate Mapping
- Gate A (Habit): 1–6 + 7(min)
- Gate B (Certified supply): 8
- Gate C (Pilot outcomes): 6 + 8
- Gate D (Revenue): 7 + pilot conversions

## Naming/Schema Notes
- Endpoints: `/learn/next`, `/learn/submit`
- Tables: `ReviewSchedule` (not “spaced”)
- Auth: 401 on `/api/ingest/generate` without session; `www-authenticate` header


