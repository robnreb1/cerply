# Spec Changelog

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
