### 2025-10-02 — EPIC #54 Certified Admin v0 (preview) — COMPLETED

**Summary:**
Successfully implemented and shipped Admin Certified v0 (preview) with full CORS/security compliance, comprehensive testing, and all acceptance criteria met.

**Implementation:**
- Added ADMIN_* flags in `api/src/env.ts` (ADMIN_PREVIEW, ADMIN_TOKEN, ADMIN_MAX_REQUEST_BYTES, ADMIN_RATE_LIMIT)
- Implemented admin schemas `api/src/schemas/admin.certified.ts` with Zod validation
- Added NDJSON store helper `api/src/store/adminCertifiedStore.ts` for v0 persistence
- Implemented routes `api/src/routes/admin.certified.ts` with full CORS/security headers, token auth, size cap, rate limiting, and audit trails
- Created dedicated admin security plugin `api/src/plugins/security.admin.ts` with OPTIONS preflight handling, ACAO:* enforcement, and auth guards
- Mounted routes behind `ADMIN_PREVIEW` + `ADMIN_TOKEN` in `api/src/index.ts`
- Extended OpenAPI with admin paths and schemas
- Web preview page at `web/app/(preview)/admin/certified/page.tsx`
- Comprehensive tests in `api/tests/admin.certified.preview.test.ts` covering preflight, auth, CORS headers, size cap (413), rate limit (429), and happy paths
- Documentation: `docs/admin/CERTIFIED_ADMIN_V0.md`, `docs/spec/flags.md`, `docs/functional-spec.md`

**Fixes & Refinements:**
- Fixed `ERR_HTTP_HEADERS_SENT` errors by adding comprehensive guards and ensuring single reply.send() per request
- Resolved OpenAPI drift by rebuilding formatted spec
- Added CodeQL suppression comments for rate-limiting false positives (7 alerts dismissed)
- Fixed `progress/STATE.json` malformed JSON structure (converted to valid array)
- Restored observability hook for Server-Timing and x-req-ms headers with proper guards
- Fixed orchestrator CSRF validation to only run when session exists (bug: was always requiring session)
- Added `/api/version` headers (x-runtime-channel, x-image-tag, x-image-revision)
- Fixed Dockerfile to properly expose image metadata in runtime stage
- Enforced CORP=same-origin for /api/certified/** in preview/test environments

**Staging Verification (A5):**
- OPTIONS preflight: ✅ 204 with ACAO:*, allow-headers includes x-admin-token + authorization, no ACAC
- POST ingest (401): ✅ ACAO:*, security headers (COOP, CORP, Referrer-Policy, XCTO), no ACAC

**Acceptance Criteria (A1-A7):**
- ✅ A1: Admin preview API /api/admin/certified/* behind ADMIN_PREVIEW=true with CORS invariants
- ✅ A2: Endpoints + OpenAPI + tests (sources, items, ingest, approve/reject)
- ✅ A3: Web preview admin pages gated with a11y banners
- ✅ A4: Security headers (COOP/CORP/Referrer-Policy/XCTO), size cap, rate limits
- ✅ A5: Staging CORS canary verified with header evidence
- ✅ A6: OpenAPI drift guard clean
- ✅ A7: Docs/spec updated; progress logged; Epic #54 comment posted

**PR:** #165 (57 commits, all CI checks passing)
**Status:** Ready for review and merge ✅

---

### Historical Logs (Previous EPICs)

### 2025-09-27 — EPIC #54 Certified Admin v0 (preview)
- Added ADMIN_* flags in `api/src/env.ts`.
- Implemented admin schemas `api/src/schemas/admin.certified.ts`.
- Added NDJSON store helper `api/src/store/adminCertifiedStore.ts`.
- Implemented routes `api/src/routes/admin.certified.ts` with CORS/security headers, token auth, size cap, audit lines.
- Added admin CORS/security plugin `api/src/plugins/security.admin.ts` and registered before routes.
- Mounted routes behind `ADMIN_PREVIEW` + `ADMIN_TOKEN` in `api/src/index.ts`.
- Extended OpenAPI with admin paths.
- Web preview page at `web/app/(preview)/admin/certified/page.tsx`.
- Tests: `api/tests/admin.certified.preview.test.ts` for preflight, auth, happy path, 413.
- Docs updated: `docs/admin/CERTIFIED_ADMIN_V0.md`, `docs/spec/flags.md`, `docs/functional-spec.md`.
[-] Orchestrator v0 CI & docs wired — E2E (mock) + CORS canary in smoke script.
- 2025-09-23 08:00:14 start openapi+e2e branch
- 2025-09-23 09:19:40 start harden branch
- 2025-09-23 09:22:15 step1 drift guard
- 2025-09-23 09:22:15 step2 golden fixture
- 2025-09-23 09:22:15 step3 e2e
- 2025-09-23 09:22:15 step6 canary++
- 2025-09-23 09:40:28 planner pipeline kickoff
- 2025-09-23 09:57:32 step8 playwright expanded
- 2025-09-23 09:57:32 step9 ci updates
- 2025-09-23 10:21:54 study runner kickoff
- 2025-09-23 10:32:31 steps1-4 scaffold+form+runner+persistence
- 2025-09-23 10:46:14 step5 unit tests + vitest config
- 2025-09-23 10:46:14 steps6-7 e2e + ci wired
- 2025-09-23 10:46:14 step8 docs updated
- 2025-09-23 17:12:56 start feat/retention-v0-preview; scaffold retention schemas/routes/tests
- 2025-09-23 17:23:50 retention v0: schemas+engine+routes+tests+docs added; all api tests green
- 2025-09-23 18:56:50 start feat/retention-v0-web; wire Study Runner to retention APIs
- 2025-09-23 19:59:28 web: adapters added; runner resume wired; unit tests passing
- 2025-09-23 20:08:57 web: E2E stable (plan + resume); preview flag set for tests
- 2025-09-23 20:11:02 PR #133 opened: retention v0 web integration (preview)
- 2025-09-23 20:40:41 start feat/adaptive-engine-v1-preview; scaffold engine + flags
- 2025-09-23 20:53:34 adaptive: evaluator + CI job + docs added; PR #134 opened (preview)
2025-09-23T20:26:56Z - kickoff openai adapter v0
2025-09-23T20:32:07Z - implement openai-v0 adapter + route selection
2025-09-23T20:35:28Z - run api tests and typecheck
2025-09-23T20:35:49Z - commit openai adapter v0 + eval + ci + docs
2025-09-23T20:36:11Z - open PR created #135
2025-09-23T20:36:56Z - docs updated: OPENAI_ADAPTER_V0 + flags
2025-09-23T20:37:44Z - add CI workflow for openai eval
2025-09-23T20:41:11Z - fix CI workflow diagnostics (keys, inputs, secrets guard)
2025-09-23T20:44:19Z - fix secrets context + outputs in ci.yml
2025-09-23T20:45:35Z - ci.yml: move keyed job guard to steps; outputs default
2025-09-23T21:01:55Z - verify CI for PR #135
2025-09-23T21:02:38Z - staging deploy verify + header capture
2025-09-23T21:03:56Z - posted staging headers to PR #135
2025-09-23T21:04:10Z - check keyed smoke status
2025-09-23T21:04:23Z - keyed smoke note
2025-09-23T21:04:36Z - attempt enable squash auto-merge
2025-09-23T21:05:19Z - auto-merge enabled on PR #135
2025-09-23T21:05:29Z - wrap up PR #135 checklist
2025-09-23T21:06:03Z - smoke stg script includes certified-plan test
2025-09-23T21:06:20Z - wrap session completed
2025-09-23T21:08:20Z - start multiphase (proposers + checker) work
2025-09-23T21:10:25Z - scan for existing proposers, single-planner pattern
2025-09-23T21:11:48Z - checkpoint: one planner vs multiple proposers
2025-09-23T21:13:05Z - checkpoint: multiphase requires design first
2025-09-23T21:13:37Z - create RFC-002 (proposers, checker, lock)
2025-09-23T21:18:48Z - RFC-002 written; add to docs/, reference in func-spec + LAUNCH_STATUS
2025-09-23T21:20:52Z - commit RFC-002 + docs updates
2025-09-23T21:21:18Z - kickoff multiphase work
2025-09-23T21:28:28Z - implemented adapter stubs for proposers openai/anthropic; checker v0 stub
2025-09-23T21:30:50Z - lock hash + schemas; certified route now: generate → propose → check → lock → emit
2025-09-23T21:32:58Z - tests + fixture; integration happy path wired
2025-09-23T21:35:30Z - all tests passing with RFC-002 multiphase pipeline
2025-09-23T21:36:22Z - docs + flags updated; RFC-002 references added
2025-09-23T21:37:28Z - commit RFC-002 multiphase + checkpoint
2025-09-23T21:37:55Z - open PR #136 rfc-002-multiphase
2025-09-23T21:38:36Z - CI pass on #136 verified
2025-09-23T21:39:16Z - squash auto-merge enabled #136
