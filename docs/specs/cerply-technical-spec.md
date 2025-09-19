# Cerply — Technical Requirements (Tech Spec)
Version: v1.2
Status: AUTHORITATIVE — single source of truth for technical requirements
Owner: Engineering (Robert + lead dev)
Changelog: see History section at bottom

SSOT: This document is the authoritative source for technical requirements and must link back to BRD IDs for business value.

## 1) System Overview
- API: Fastify (Node 20) on Render; envs: staging & prod.
- DB: Postgres (Render) with Drizzle migrations & seed.
- Web: Next.js; /api/:path* proxies to API_ORIGIN/api/:path*.
- Containers: single Dockerfile (amd64); GHCR tags: staging, staging-latest, prod.

## 2) Reliability & Deployments
- /api/version must return headers: x-image-tag, x-image-revision, x-image-created, x-runtime-channel.
- CI/CD:
  - ci.yml: build/test/typecheck -> build+push image -> staging deploy -> header asserts.
  - promote-prod.yml: tag promote -> Render deploy -> health wait.
  - Nightly smoke & header checks.
- PR previews: label-gated workflow on Vercel; sticky URL; soft-fail 429; teardown; 48h sweep. Legacy deploy gated and runs vercel pull + build + --prebuilt in web/.

## 3) Certified Pipeline (Maps to BRD B4)
- Planner (LLM-A): scope/structure.
- Proposers (LLM-B, LLM-C): two independent drafts.
- Checker (LLM-D): verify claims against citations (must be real/credible); produce diffs & verdict.
- Convergence: select/merge; lock content + metadata (source URIs, agent prompts/outputs, checksums).
- Storage: persist prompts, outputs, diffs, reviewer stamp (for Industry Certified), timestamps.
- Flags: feature flag supports provider/model swaps (OpenAI/Google/Anthropic), temperatures, retries, fallbacks.
- Cost ledger: per-call cost capture.

## 4) Adaptive Learning (Maps to BRD B2)
- Signals: accuracy, latency, hint usage, item difficulty, user prefs (format, length).
- Policy: per-user plan that adjusts item order, difficulty, and review cadence (Leitner-style acceptable for MVP).
- Controls: admin knobs for floor/ceiling difficulty; user preferred formats.
- Telemetry: events for schedule changes and outcomes.

## 5) Group Learning (Maps to BRD B3)
- Push: author selects topic/set -> push to group (team/family/friends).
- Tracking: group dashboard: participation, completion, accuracy.
- Privacy: org mode keeps PII inside tenant; consumer groups default minimal profile.
- APIs: /groups, /groups/:id/members, /groups/:id/push, /groups/:id/stats (scoped by auth).

## 6) Access & Pricing (Maps to BRD B6)
- Free consumer tier: limit concurrent topics; block Certified access at API/authz.
- Certified access: entitlements for subscription and pay-as-you-go.
- Gates: UI hides locked content; API enforces.

## 7) Telemetry & Observability (Maps to BRD B9)
- Event stream: plan_generated, item_attempted, review_scheduled, exported, certified_locked, group_push.
- Dashboards/exports for ops & GTM.

## 8) Security & Limits
- Basic auth (passwordless or simple session), per-IP/user rate limits, request logging (PII-guarded).
- Secrets via GitHub/Render; none in repo.
- No raw deploy hooks; no legacy hosts; no per-workspace lockfiles; amd64 only.

## 9) Mobile Readiness (BRD B7)
- REST/Graph API stable for iOS/Android; mobile apps deferred; enterprise variant honors SSO/MAM policies later.

## 10) BRD <-> Tech Mapping (Crosswalk)
- B2 Adaptive <-> T4 Adaptive
- B3 Group <-> T5 Group
- B4 Certified <-> T3 Pipeline
- B5 Export/Share <-> T2/Integrations
- B6 Access/Pricing <-> T6 Access
- B8 Ops <-> T2 Deployments
- B9 Metrics <-> T7 Telemetry

## 11) Acceptance & Health
- /api/health 200 JSON; /api/db/health 200 or 5xx JSON (never 404); __routes.json lists both.
- Smokes verify headers & health; web smoke respects api_base; retries & timeouts set.

---

## History
- v1.2 (2025-09-19): Consolidated Tech Spec; added certification pipeline details, adaptive/group modules, access gates, BRD<->Tech crosswalk, mobile readiness.
