# Security & Compliance Baselines (P0)

Scope: Certified routes preview hardening and CI advisory scans.

Env flags (default off):
- `MAX_REQUEST_BYTES` (default `65536`)
- `RATE_LIMIT_CERTIFIED` (format `limit:windowSec`, default `60:60`)
- `SECURITY_HEADERS_PREVIEW` (`true|false`)

API (preview):
- Request size guard for `/api/certified/*` (413 with JSON envelope)
- Simple in-memory token bucket keyed by `ip:route:origin` (429 responses include `x-ratelimit-*` and `retry-after`)
- Conservative headers (preview):
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


