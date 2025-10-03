# Certified Publish v1 — Documentation
**EPIC #56** | **[OKR: O1.KR3]**

## Overview

Certified Publish v1 enables admin-gated publication of certified learning content with cryptographic signatures, CDN-ready delivery, and public verification. This system provides:

- **Ed25519 signatures** for tamper-proof content
- **CDN-friendly caching** with ETag and proper Cache-Control headers
- **Public verification endpoints** for trust validation
- **Idempotent publish operations** to prevent duplicate artifacts
- **Admin-gated control** with token authentication

### BRD & Functional Spec Linkage

- **BRD v1.2 touchpoints**: B4 (Certified Pipeline), B8 (Ops Guarantees), B5 (Exports & Sharing), B9 (Success Metrics)
- **Functional Spec**: §9 (Acceptance criteria), §10 (Non-functional/Dev UX), Security headers, Staging expectations

## Artifact Schema

### Version: `cert.v1`

```json
{
  "version": "cert.v1",
  "artifactId": "<cuid>",
  "itemId": "<fk to certified item>",
  "sourceUrl": "<string|null>",
  "lockHash": "<hex>",
  "sha256": "<hex>",
  "createdAtISO": "<ISO8601>"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `version` | `"cert.v1"` | Schema version identifier |
| `artifactId` | `string` | Unique identifier (cuid) for this artifact |
| `itemId` | `string` | Foreign key to AdminItem (certified item) |
| `sourceUrl` | `string\|null` | Original source URL of the content |
| `lockHash` | `string` | SHA-256 hash from the certification "lock" step |
| `sha256` | `string` | SHA-256 over canonical JSON (artifact minus signature) |
| `createdAtISO` | `string` | ISO8601 timestamp of artifact creation |

## Canonicalization & Signing **[OKR: O3.KR2]**

### Canonical JSON

Artifacts use **stable key ordering** and no whitespace for reproducible hashes:

1. Sort object keys alphabetically
2. No whitespace between elements
3. UTF-8 encoding
4. Consistent serialization of primitives

**Example:**
```javascript
// Input object
{ "b": 2, "a": 1 }

// Canonical form
{"a":1,"b":2}
```

### Ed25519 Signing

1. Compute canonical JSON of artifact (excluding signature field)
2. SHA-256 hash the canonical JSON → stored in `artifact.sha256`
3. Sign the canonical JSON with Ed25519 private key → signature (base64)
4. Store signature in database and serve via `.sig` endpoint

## Routes & Required Headers **[OKR: O1.KR2, O3.KR1]**

### Admin: POST /api/admin/certified/items/:id/publish

**Purpose**: Publish a certified item with Ed25519 signature

**Authentication**: Requires `x-admin-token` header or `Authorization: Bearer <token>`

**Request**:
```bash
curl -X POST http://localhost:8080/api/admin/certified/items/{itemId}/publish \
  -H "Content-Type: application/json" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN"
```

**Response** (200 OK, first publish):
```json
{
  "ok": true,
  "artifact": {
    "id": "abc123...",
    "itemId": "item-xyz",
    "sha256": "...",
    "signature": "base64-signature",
    "path": "abc123.json",
    "createdAt": "2025-10-03T12:00:00Z"
  }
}
```

**Response** (409 Conflict, republish with same lockHash):
```json
{
  "error": {
    "code": "ALREADY_PUBLISHED",
    "message": "artifact already exists for this lock"
  },
  "artifact": {
    "id": "abc123...",
    "sha256": "...",
    "createdAt": "2025-10-03T12:00:00Z"
  }
}
```

**Response Headers**:
| Header | Value |
|--------|-------|
| `access-control-allow-origin` | `*` |
| `location` | `/api/certified/artifacts/{artifactId}` |
| *(no credentials header)* | |

**Error Codes**:
- `401 UNAUTHORIZED` — Missing or invalid admin token
- `404 NOT_FOUND` — Item does not exist
- `400 NO_LOCK_HASH` — Item has no lockHash; cannot publish
- `409 ALREADY_PUBLISHED` — Artifact already exists for this lock (idempotency)
- `503 UNSUPPORTED_STORE` — Requires `ADMIN_STORE=sqlite`

---

### Public: GET /api/certified/artifacts/:artifactId

**Purpose**: Retrieve published artifact JSON

**Authentication**: None (public endpoint)

**Request**:
```bash
curl -i http://localhost:8080/api/certified/artifacts/abc123
```

**Response** (200 OK):
```json
{
  "version": "cert.v1",
  "artifactId": "abc123",
  "itemId": "item-xyz",
  "sourceUrl": "https://example.com/content",
  "lockHash": "sha256-hash",
  "sha256": "artifact-sha256",
  "createdAtISO": "2025-10-03T12:00:00Z"
}
```

**Response Headers** **[OKR: O1.KR2, O3.KR1]**:
| Header | Value |
|--------|-------|
| `access-control-allow-origin` | `*` |
| `etag` | `W/"<sha256>"` |
| `cache-control` | `public, max-age=300` |
| `referrer-policy` | `no-referrer` |
| `x-content-type-options` | `nosniff` |
| `content-type` | `application/json` |
| *(no credentials header)* | |

**Error Codes**:
- `404 NOT_FOUND` — Artifact does not exist
- `404 FILE_NOT_FOUND` — Artifact metadata exists but file missing

---

### Public: GET /api/certified/artifacts/:artifactId.sig

**Purpose**: Retrieve Ed25519 signature (binary)

**Authentication**: None (public endpoint)

**Request**:
```bash
curl -i http://localhost:8080/api/certified/artifacts/abc123.sig --output signature.bin
```

**Response** (200 OK): Binary signature (64 bytes)

**Response Headers** **[OKR: O1.KR2, O3.KR1]**:
| Header | Value |
|--------|-------|
| `access-control-allow-origin` | `*` |
| `cache-control` | `public, max-age=300` |
| `referrer-policy` | `no-referrer` |
| `x-content-type-options` | `nosniff` |
| `content-type` | `application/octet-stream` |
| *(no credentials header)* | |

**Error Codes**:
- `404 NOT_FOUND` — Artifact does not exist

---

### Public: POST /api/certified/verify

**Purpose**: Verify artifact integrity and signature

**Authentication**: None (public endpoint)

#### Verification by Artifact ID **[OKR: O1.KR1, O3.KR2]**

**Request**:
```bash
curl -X POST http://localhost:8080/api/certified/verify \
  -H "Content-Type: application/json" \
  -d '{"artifactId": "abc123"}'
```

**Response** (200 OK, valid):
```json
{
  "ok": true,
  "artifactId": "abc123",
  "sha256": "...",
  "lockHash": "..."
}
```

**Response** (200 OK, invalid):
```json
{
  "ok": false,
  "reason": "signature_invalid"
}
```

#### Verification with Inline Artifact + Signature

**Request**:
```bash
curl -X POST http://localhost:8080/api/certified/verify \
  -H "Content-Type: application/json" \
  -d '{
    "artifact": { "version": "cert.v1", ... },
    "signature": "base64-signature"
  }'
```

**Response** (200 OK):
```json
{
  "ok": true,
  "sha256": "..."
}
```

**Verification Steps**:
1. **lockHash match** — Verify `artifact.lockHash` matches `item.lockHash` in database
2. **SHA-256 integrity** — Recompute SHA-256 of canonical artifact JSON
3. **Ed25519 signature** — Verify signature using public key

**Error Reasons**:
- `lock_mismatch` — lockHash doesn't match stored item
- `sha256_mismatch` — Artifact content has been tampered with
- `signature_invalid` — Ed25519 signature verification failed

**Error Codes**:
- `400 BAD_REQUEST` — Invalid payload structure
- `404 NOT_FOUND` — Artifact ID not found
- `413 PAYLOAD_TOO_LARGE` — Body exceeds 16KB

## Environment Variables **[OKR: O3.KR2]**

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CERT_SIGN_PUBLIC_KEY` | Yes (prod) | *(test keys in NODE_ENV=test)* | Base64-encoded Ed25519 public key (DER format) |
| `CERT_SIGN_PRIVATE_KEY` | Yes (prod) | *(test keys in NODE_ENV=test)* | Base64-encoded Ed25519 private key (DER format) |
| `ARTIFACTS_DIR` | No | `api/.artifacts` | Directory for storing artifact JSON files |
| `ADMIN_STORE` | Yes | `ndjson` | Must be `sqlite` for publish support |
| `ADMIN_PREVIEW` | Yes | `false` | Must be `true` to enable admin routes |
| `ADMIN_TOKEN` | Yes | — | Secret token for admin authentication |
| `DATABASE_URL` | Yes | `file:./.data/admin.sqlite` | SQLite database path (Prisma) |

## Artifacts Directory

- **Default**: `api/.artifacts/`
- **Naming**: `{artifactId}.json`
- **Format**: Pretty-printed JSON (2-space indent)
- **Gitignore**: Excluded via `api/.gitignore`

## Security Considerations **[OKR: O3.KR1]**

### Key Management

1. **Production keys**: Generate offline, store securely (env vars or secrets manager)
2. **Test keys**: Auto-generated deterministically in `NODE_ENV=test`
3. **Key rotation**: Requires new publish operations; old artifacts remain valid with original keys

### CORS & Headers

All public artifact routes enforce:
- `access-control-allow-origin: *` (public, no credentials)
- `referrer-policy: no-referrer`
- `x-content-type-options: nosniff`
- No `access-control-allow-credentials` header

Admin routes:
- `access-control-allow-origin: *`
- No `access-control-allow-credentials`
- Authentication via `x-admin-token` or `Authorization: Bearer`

### CDN Caching Notes **[OKR: O1.KR2]**

- **ETag**: Weak validator based on SHA-256 (`W/"<sha256>"`)
- **Cache-Control**: `public, max-age=300` (5 minutes)
- Artifacts are immutable by design (new lockHash → new artifact)
- CDN can safely cache for longer periods (adjust `max-age` as needed)

## Example: End-to-End Publish & Verify

### 1. Generate Ed25519 Keys (production)

```bash
node -e "const {generateKeyPairSync}=require('crypto');
const {publicKey,privateKey}=generateKeyPairSync('ed25519');
console.log('CERT_SIGN_PUBLIC_KEY=',publicKey.export({type:'spki',format:'der'}).toString('base64'));
console.log('CERT_SIGN_PRIVATE_KEY=',privateKey.export({type:'pkcs8',format:'der'}).toString('base64'));"
```

### 2. Publish Artifact

```bash
# Set environment
export ADMIN_STORE=sqlite
export ADMIN_PREVIEW=true
export ADMIN_TOKEN=your-secret-token
export CERT_SIGN_PUBLIC_KEY=<base64-public-key>
export CERT_SIGN_PRIVATE_KEY=<base64-private-key>

# Start API
npm -w @cerply/api run dev

# Publish
curl -X POST http://localhost:8080/api/admin/certified/items/{itemId}/publish \
  -H "Content-Type: application/json" \
  -H "x-admin-token: your-secret-token"
```

### 3. Fetch Artifact (CDN-ready)

```bash
# Get JSON artifact
curl -i http://localhost:8080/api/certified/artifacts/{artifactId}

# Get signature
curl http://localhost:8080/api/certified/artifacts/{artifactId}.sig --output sig.bin
```

### 4. Verify Artifact

```bash
curl -X POST http://localhost:8080/api/certified/verify \
  -H "Content-Type: application/json" \
  -d '{"artifactId": "{artifactId}"}'
```

**Expected Output**:
```json
{
  "ok": true,
  "artifactId": "...",
  "sha256": "...",
  "lockHash": "..."
}
```

## Testing **[OKR: O4.KR1]**

Comprehensive test suite in `api/tests/certified.publish.test.ts`:

- ✅ Admin publish (happy path, idempotency, errors)
- ✅ Public GET artifacts (JSON + .sig)
- ✅ Verify endpoints (positive + negative cases)
- ✅ CORS/security headers validation
- ✅ Error conditions (404, 409, 413, 429)
- ✅ No regressions for existing certified routes

Run tests:
```bash
npm -w @cerply/api test
```

## Migration & Deployment

### Database Migration

```bash
# Generate Prisma client
npm -w @cerply/api run prisma:generate

# Run migration
npx prisma migrate dev --schema api/prisma/schema.prisma -n "epic-56-published-artifacts"
```

### Deployment Checklist

- [ ] Generate production Ed25519 keys
- [ ] Store keys in secure environment (env vars or secrets manager)
- [ ] Set `ADMIN_STORE=sqlite` in environment
- [ ] Set `ADMIN_PREVIEW=true` to enable admin routes
- [ ] Set `ADMIN_TOKEN` to secure random value
- [ ] Configure `ARTIFACTS_DIR` if using custom path
- [ ] Run Prisma migration on production database
- [ ] Verify `/api/health` responds correctly
- [ ] Test admin publish with sample item
- [ ] Verify public artifact fetch with proper headers
- [ ] Confirm CDN caching behavior (ETag, Cache-Control)

## API Contract Summary

| Endpoint | Method | Auth | Purpose | OKR |
|----------|--------|------|---------|-----|
| `/api/admin/certified/items/:id/publish` | POST | Admin Token | Publish artifact with signature | O2.KR1, O1.KR1 |
| `/api/certified/artifacts/:artifactId` | GET | Public | Fetch artifact JSON | O1.KR2 |
| `/api/certified/artifacts/:artifactId.sig` | GET | Public | Fetch signature binary | O1.KR2 |
| `/api/certified/verify` | POST | Public | Verify artifact + signature | O1.KR1, O3.KR2 |

## Support & References

- **EPIC #56 Requirements**: See main prompt in progress logs
- **BRD v1.2**: Sections B4, B8, B5, B9
- **Functional Spec**: §9–10
- **OKR Mappings**: `docs/okrs/MAPPING_EPIC_56.md`
- **Code**: `api/src/lib/ed25519.ts`, `api/src/lib/artifacts.ts`, `api/src/routes/admin.certified.ts`, `api/src/routes/certified.artifacts.ts`, `api/src/routes/certified.verify.ts`

