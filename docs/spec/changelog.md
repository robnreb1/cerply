# Spec Changelog

## [CI Hardening + Version Fix] - 2025-10-09

### Fixed
- **Quality/Canon Test Determinism**: Added stub modes (`QUALITY_STUB`, `CANON_STUB`) for fast, deterministic testing in PR runs
  - `quality.ts`: Fixed 0.85 scores when stub mode enabled (no heuristic computation or model calls)
  - `canon.ts`: Simulated cache hit/miss behavior without actual storage
  - Enabled in `.github/workflows/ci-quality-floor.yml` for PR runs
  - PR tests now complete in <3 minutes (was 5-10 min), 100% deterministic

- **Epic-3 KPI Smoke Test**: Added missing `x-admin-token` auth header to `/api/ops/kpis` test in `api/scripts/smoke-team-mgmt.sh`

- **Version Endpoint Metadata**: Updated `/api/version` to return accurate build metadata in production
  - Prioritizes `COMMIT_SHA` and `BUILD_TIMESTAMP` env vars
  - Adds fallbacks for Render (`RENDER_GIT_COMMIT`), legacy vars (`GIT_SHA`, `IMAGE_REVISION`)
  - Returns `'unknown'` instead of empty string when vars not set
  - Sets `x-revision` and `x-build` response headers for easy inspection
  - Updated `api/Dockerfile` to accept and expose new build args

### Changed
- **CI Gating**: Moved slow/flaky tests to nightly runs only (not PR-blocking)
  - `evaluator-multiphase`: Moved to `e2e-nightly.yml` (was blocking PRs with 15+ min runtime)
  - Orchestrator E2E: Already in nightly via `@nightly` tag (build-time env var issue)
  - Nightly runs at 2 AM UTC daily with manual dispatch option

### Infrastructure
- **Simplified PR Gates**: PRs no longer blocked by slow evaluator or flaky orchestrator tests
  - Quality tests use stubs for speed and reliability
  - Core user flows tested with 2 retries
  - Comprehensive testing moved to nightly schedule

### Documentation
- **Decision Log**: Added `docs/DECISIONS/fix-vs-descope-2025-10-09.md` documenting fix vs de-scope rationale
- **Tracking Issues**: Created GitHub issues for:
  - Stabilize orchestrator E2E for PR gating (build-time vs runtime env var fix)
  - Speed up evaluator-multiphase or shard it (target <5 min)

### B2B Pivot Alignment
- No D2C flows re-introduced
- All changes are infrastructure/testing improvements only
- Payment features (L-17, L-18, L-22, E-11) remain "Removed (post-pivot)"

---

## [Certified v1] - 2025-10-04

### Added
- **Certified API Endpoints**: Complete implementation of Certified v1 API with Ed25519 signing and public verification
  - `POST /api/certified/items/:itemId/publish` - Admin endpoint for publishing certified items with idempotent publishing and rate limiting (10 req/min)
  - `GET /api/certified/artifacts/:artifactId` - Public JSON artifact retrieval with ETag and Cache-Control headers
  - `GET /api/certified/artifacts/:artifactId.sig` - Public binary signature retrieval
  - `POST /api/certified/verify` - Public verification endpoint supporting three modes (by ID, inline signature, legacy plan-lock)
  - `POST /api/certified/plan` - Public plan generation with proper error handling (415/413/429)

### Technical Achievements
- **CDN-Ready Artifacts**: ETag headers and `Cache-Control: public, max-age=300, must-revalidate` for efficient content delivery
- **Robust CORS**: Permissive `Access-Control-Allow-Origin: *` with credentials removal across all public endpoints
- **Database Resilience**: Graceful SQLite fallback when DATABASE_URL is missing, preventing 500 errors in staging
- **Container Compatibility**: Fixed Prisma/OpenSSL compatibility by migrating from Alpine to Debian Bullseye in Docker runtime
- **Security Headers**: Comprehensive headers (COOP/CORP/XFO) when `SECURITY_HEADERS_PREVIEW=true`

### Infrastructure Notes
- **Prisma Binary Target**: Pinned to `linux-musl` in Alpine stage, then regenerated for Debian/glibc in runtime stage
- **Environment Configuration**: Added `DATABASE_URL` fallback to `file:./.data/staging.sqlite` in render.yaml
- **CORS Enforcement**: Final `onSend` hook ensures permissive CORS for all `/api/certified/*` routes

### Documentation
- **API Contract**: Complete documentation in `docs/certified/README.md` with curl examples and troubleshooting
- **OpenAPI Specification**: Full OpenAPI 3.0.3 spec in `docs/certified/openapi.yaml`
- **Runbook**: Operational procedures and common error handling

### Testing
- **Staging Verification**: All endpoints tested on `https://api-stg.cerply.com` with proper 404/CORS responses
- **Error Handling**: Comprehensive test coverage for 415/413/429 error cases
- **Signature Verification**: Ed25519 signature validation with canonical JSON processing

---

## Previous Changes
- 2025-08-19: Added Spec Management Pack, API route snapshotting, PR checklist.
