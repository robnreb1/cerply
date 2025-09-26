# Security & Compliance Baselines (P0)

Scope: Certified routes preview hardening and CI advisory scans.

Env flags (default safe values):
- `MAX_REQUEST_BYTES` (default `32768`)
- `RATE_LIMIT_CERTIFIED_BURST` (default `20`)
- `RATE_LIMIT_CERTIFIED_REFILL_PER_SEC` (default `5`)
- `RATE_LIMIT_CERTIFIED` (legacy `limit:windowSec`, still supported if BURST/REFILL not set)
- `REDIS_URL` (optional; enables persistent token buckets; falls back to in-memory if absent)
- `SECURITY_HEADERS_PREVIEW` (`true|false`, default `true`)

API:
- Request size guard for `/api/certified/*` (413 with JSON envelope `{ error: { code: 'PAYLOAD_TOO_LARGE', details: { max_bytes } } }`)
- Token bucket rate limit on certified POSTs; Redis-backed when `REDIS_URL` set, else in-memory fallback (429 JSON `{ error: { code: 'RATE_LIMITED', details: { retry_after_ms, limit } } }`, plus `x-ratelimit-*`, `retry-after`)
- Conservative headers (always on when preview flag enabled):
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: no-referrer`
  - `Cross-Origin-Resource-Policy: same-origin`
  - `Cross-Origin-Opener-Policy: same-origin`

CI:
- Gitleaks (advisory) on PRs
- Dependency Review (GH official)
- CodeQL (javascript) on PRs and weekly schedule
- Actions pinning audit (`scripts/audit-actions.mjs`) prints a table; non-blocking

Staging canary:
- OPTIONS/POST against `/api/certified/plan` asserts CORS invariants, and logs security headers + rate-limit headers (advisory)


