# Cerply Certified API (v1)

This document describes the public, stable endpoints for publishing, fetching, and verifying Certified artifacts.

---

## Canonicalization & Hashing Rules

- **Canonical JSON** = JSON with all **object keys sorted** lexicographically at every level. Arrays keep their original order.
- **`sha256`** on an artifact is computed over the **canonicalized artifact with its `sha256` field removed**.
- **Signature verification** (inline mode) validates the signature **against the canonical JSON with `sha256` reinserted**.

> Pseudocode:
> ```
> canonical = sortObjectKeysRecursively(artifactWithoutSha256)
> sha256 = hex( SHA256( JSON.stringify(canonical) ) )
> signedPayload = JSON.stringify({ ...canonical, sha256 })
> verify(signature, signedPayload)
> ```

---

## Headers

All public endpoints return:
- `Access-Control-Allow-Origin: *`
- No `Access-Control-Allow-Credentials` header
- Where applicable: `Cache-Control: public, max-age=300, must-revalidate`

`GET /api/certified/artifacts/:id` additionally returns an `ETag` of the body's SHA-256 (hex), quoted.

---

## 1) Admin Publish (server-to-server)

### POST `/api/certified/items/:itemId/publish`
**Also supported (legacy alias):** `POST /certified/items/:itemId/publish`

**Auth:** Admin token (same mechanism as other admin APIs).  
**Rate Limiting:** 10 requests per minute  
**Body (JSON):**
```json
{
  "lockHash": "hex-string"   // also accepted: lock_hash, lockhash
}
```

**Responses:**
- `200` — published successfully
- `409` — idempotent republish; includes Location of the existing artifact
- `400` — missing lock hash: `{ "error": { "code": "NO_LOCK_HASH" } }`
- `404` — unknown item: `{ "error": { "code": "NOT_FOUND" } }`
- `401` — missing/invalid admin auth
- `429` — rate limited: `{ "error": { "code": "RATE_LIMITED", "message": "Too many requests" } }`

---

## 2) Public: Plan Generation

### POST `/api/certified/plan`

**Auth:** Public endpoint (no authentication required)  
**Feature Flag:** Gated behind `CERTIFIED_ENABLED` environment variable  
**Body (JSON):**
```json
{
  "topic": "string"  // Required: non-empty string
}
```

**Responses:**
- `200` — plan generated successfully
- `400` — bad request: `{ "error": { "code": "BAD_REQUEST", "message": "Missing required field: topic (non-empty string)" } }`
- `413` — payload too large: `{ "error": { "code": "PAYLOAD_TOO_LARGE" } }`
- `415` — unsupported media type: `{ "error": { "code": "UNSUPPORTED_MEDIA_TYPE", "message": "Expected content-type: application/json" } }`
- `429` — rate limited (simulated via `x-rate-limit-sim` header or environment): `{ "error": { "code": "RATE_LIMITED", "message": "Too many requests" } }`
- `503` — service unavailable when `CERTIFIED_ENABLED` is false

**Headers:**
- `Access-Control-Allow-Origin: *`
- `Referrer-Policy: no-referrer` (when `SECURITY_HEADERS_PREVIEW=true`)
- `Cross-Origin-Opener-Policy: same-origin` (when `SECURITY_HEADERS_PREVIEW=true`)
- `Cross-Origin-Resource-Policy: same-origin` (when `SECURITY_HEADERS_PREVIEW=true`)

---

## 3) Public: Fetch an artifact

### GET `/api/certified/artifacts/:artifactId`

**Auth:** Public endpoint (no authentication required)

**Responses:**
- `200 OK` — JSON payload of the canonical artifact. Typical fields:
  ```json
  {
    "artifact": { /* domain object */ },
    "sha256": "hex-of-artifact-without-sha256",
    "signature": "hex-or-base64"
  }
  ```
- `404` — `{ "error": { "code": "NOT_FOUND", "message": "artifact not found" } }`

**Headers:**
- `ETag: W/"<hex>"` (quoted)
- `Cache-Control: public, max-age=300, must-revalidate`
- `Access-Control-Allow-Origin: *`
- `Content-Type: application/json`

---

## 4) Public: Fetch the raw signature

### GET `/api/certified/artifacts/:artifactId.sig`

**Auth:** Public endpoint (no authentication required)

**Responses:**
- `200 OK` — `application/octet-stream` body containing the raw signature bytes
- `404` — `{ "error": { "code": "NOT_FOUND", "message": "artifact not found" } }`

**Headers:**
- `Cache-Control: public, max-age=300, must-revalidate`
- `Access-Control-Allow-Origin: *`
- `Content-Type: application/octet-stream`

If the stored JSON lacks a signature, the endpoint returns a deterministic, test-friendly signature derived from the canonical JSON (for backwards compatibility).

---

## 5) Public: Verify

### POST `/api/certified/verify`

**Auth:** Public endpoint (no authentication required)

**Content-Type:** `application/json` (required)

#### Case A: Verify by artifactId

```json
{ "artifactId": "art_123" }
```

- `200 { "ok": true, "artifactId": "art_123", "sha256": "<hex>", "lockHash": "<hex>" }` if the artifact exists and is valid
- `404 { "error": { "code": "NOT_FOUND", "message": "artifact not found" } }` if it doesn't exist

#### Case B: Inline verification (artifact + signature)

```json
{
  "artifact": { /* domain object incl. sha256 */ },
  "signature": "hex-or-base64"
}
```

- `200 { "ok": true, "sha256": "<hex>" }` on success
- `200 { "ok": false, "reason": "signature_invalid" }` on failure

Server recomputes sha256 over the artifact without its sha256 field, then validates the signature against the canonical JSON with the same sha256 reinserted.

#### Case C: Legacy plan-lock acknowledgement

```json
{ "lock": { /* legacy lock */ } }
```

- `200 { "ok": true }` if lock is valid
- `200 { "ok": false, "reason": "lock_mismatch", "details": { "expected": "...", "got": "..." } }` if lock doesn't match

**Error Responses:**
- `400 { "error": { "code": "BAD_REQUEST" } }` (e.g., missing required fields)
- `415 { "error": { "code": "UNSUPPORTED_MEDIA_TYPE", "message": "Expected content-type: application/json" } }`

**Headers:**
- `Access-Control-Allow-Origin: *`
- `x-cert-verify-hit: 1` (diagnostic header)

---

## Examples

### Verify by ID
```bash
export API_BASE="https://api-stg.cerply.com"
curl -sX POST "$API_BASE/api/certified/verify" \
  -H 'content-type: application/json' \
  -d '{"artifactId":"art_123"}'
```

### Inline verify
```bash
export API_BASE="https://api-stg.cerply.com"
ART='{"title":"Example","value":42,"sha256":"<computed-hex>"}'
SIG='<hex-or-base64>'
curl -sX POST "$API_BASE/api/certified/verify" \
  -H 'content-type: application/json' \
  -d "{\"artifact\":$ART,\"signature\":\"$SIG\"}"
```

### Fetch artifact JSON
```bash
export API_BASE="https://api-stg.cerply.com"
curl -sI "$API_BASE/api/certified/artifacts/unknown-id"
# Expected: HTTP/2 404, access-control-allow-origin: *
```

### Fetch artifact signature
```bash
export API_BASE="https://api-stg.cerply.com"
curl -sI "$API_BASE/api/certified/artifacts/unknown-id.sig"
# Expected: HTTP/2 404, access-control-allow-origin: *
```

### Plan generation (with error cases)
```bash
export API_BASE="https://api-stg.cerply.com"

# Valid request
curl -sX POST "$API_BASE/api/certified/plan" \
  -H 'content-type: application/json' \
  -d '{"topic":"machine learning basics"}'

# Invalid content-type (should return 415)
curl -sX POST "$API_BASE/api/certified/plan" \
  -H 'content-type: text/plain' \
  -d '{"topic":"test"}'

# Missing topic (should return 400)
curl -sX POST "$API_BASE/api/certified/plan" \
  -H 'content-type: application/json' \
  -d '{}'
```

---

## Client helper (TypeScript)

```typescript
function stableSort(obj: any): any {
  if (Array.isArray(obj)) return obj.map(stableSort);
  if (obj && typeof obj === 'object' && obj.constructor === Object) {
    return Object.fromEntries(Object.keys(obj).sort().map(k => [k, stableSort(obj[k])]));
  }
  return obj;
}

export function computeArtifactSha256(artifact: Record<string, any>): string {
  const { sha256: _omit, ...rest } = artifact;
  const canonical = JSON.stringify(stableSort(rest));
  const crypto = require('node:crypto');
  return crypto.createHash('sha256').update(Buffer.from(canonical)).digest('hex');
}
```

---

## Troubleshooting

### Prisma Engine / libssl Mismatch

**Problem:** Staging environment returns 500 errors with "Unable to require(/app/node_modules/.prisma/client/libquery_engine-linux-musl.so.node). Prisma cannot find the required libssl system library."

**Solution:** We fixed this by:
1. Switching from Alpine Linux to Debian Bullseye in the Docker runtime
2. Installing `libssl1.1` and `libssl-dev` packages
3. Creating a symlink for `libssl.so.1.1` in `/lib/x86_64-linux-gnu/`
4. Regenerating Prisma client for the Debian/glibc environment

**Why it matters on Render:** Render's container runtime uses a different base image than our development environment, requiring explicit OpenSSL 1.1 compatibility.

### CORS Headers Issues

**Problem:** `access-control-allow-credentials: true` appears in responses despite our certified CORS hooks.

**Solution:** Confirm that:
1. Our certified CORS hook in `api/src/index.ts` is registered last (final `onSend` hook)
2. Infrastructure (Cloudflare/Render) isn't overwriting our headers
3. The route is properly marked as `{ config: { public: true } }`

### Database Configuration

**Problem:** Staging returns 500 errors with "Error validating datasource db: the URL must start with the protocol file:"

**Solution:** We implemented graceful database handling:
1. `DATABASE_URL` defaults to `file:./.data/staging.sqlite` if not set
2. Directory creation ensures the `.data` folder exists
3. `withPrisma` helper wraps all database operations with error handling
4. Routes return proper 404 responses instead of 500 errors

---

## Runbook

### Quick Health Check
```bash
curl -s "$API_BASE/api/health"
# Expected: {"ok":true,"timestamp":"...","version":"..."}
```

### Verify Smoke Tests
```bash
#!/bin/bash
export API_BASE="https://api-stg.cerply.com"

echo "Testing Certified endpoints..."

# Test artifact endpoints (should return 404)
curl -sI "$API_BASE/api/certified/artifacts/unknown-id" | grep -E "(HTTP|access-control|etag)"
curl -sI "$API_BASE/api/certified/artifacts/unknown-id.sig" | grep -E "(HTTP|access-control|content-type)"

# Test verify endpoint
curl -si -X POST "$API_BASE/api/certified/verify" \
  -H 'content-type: application/json' \
  -d '{"artifactId":"does-not-exist"}' | grep -E "(HTTP|x-cert-verify-hit)"

# Test plan endpoint (if enabled)
curl -sX POST "$API_BASE/api/certified/plan" \
  -H 'content-type: application/json' \
  -d '{"topic":"test"}' | grep -E "(error|plan)"

echo "Smoke tests completed."
```

### Common 4xx/5xx Responses

| Status | Cause | Action |
|--------|-------|--------|
| `401` | Missing admin auth | Check admin token in request headers |
| `404` | Unknown artifact/item | Verify artifact ID exists in database |
| `415` | Wrong content-type | Use `application/json` for POST requests |
| `429` | Rate limited | Wait and retry (10 req/min for publish) |
| `500` | Database/Prisma error | Check staging logs, verify database connectivity |

---

## Security & Headers

All certified endpoints include these security headers when `SECURITY_HEADERS_PREVIEW=true`:
- `Referrer-Policy: no-referrer`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`
- `X-Content-Type-Options: nosniff`

### ETag Semantics

- **JSON artifacts:** ETag is computed over the full response body (including `sha256` field)
- **Stable hashing:** ETag remains consistent across requests for the same artifact
- **Cache validation:** Clients can use `If-None-Match` header for conditional requests

---

## Deprecations

- Legacy publish alias `/certified/items/:itemId/publish` is supported for backward compatibility. Prefer `/api/certified/items/:itemId/publish`. A removal date will be announced in CHANGELOG before deprecation.