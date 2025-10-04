
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

`GET /api/certified/artifacts/:id` additionally returns an `ETag` of the body’s SHA-256 (hex), quoted.

---

## 1) Admin Publish (server-to-server)

### POST `/api/certified/items/:itemId/publish`
**Also supported (legacy alias):** `POST /certified/items/:itemId/publish`

**Auth:** Admin token (same mechanism as other admin APIs).  
**Body (JSON):**
```json
{
  "lockHash": "hex-string"   // also accepted: lock_hash, lockhash
}

Responses
	•	200 — published
	•	409 — idempotent republish; includes Location of the existing artifact
	•	400 — missing lock hash: { "error": { "code": "NO_LOCK_HASH" } }
	•	404 — unknown item: { "error": { "code": "NOT_FOUND" } }
	•	401 — missing/invalid admin auth

⸻

2) Public: Fetch an artifact

GET /api/certified/artifacts/:artifactId

200 OK — JSON payload of the canonical artifact. Typical fields:

{
  "artifact": { /* domain object */ },
  "sha256": "hex-of-artifact-without-sha256",
  "signature": "hex-or-base64"
}

Exact structure of artifact is domain-specific; the presence of sha256 and (when available) signature is guaranteed.

404 — { "error": { "code": "NOT_FOUND" } }

Headers:
	•	ETag: "<hex>" (quoted)
	•	Cache-Control: public, max-age=300, must-revalidate
	•	Access-Control-Allow-Origin: *

⸻

3) Public: Fetch the raw signature

GET /api/certified/artifacts/:artifactId.sig

200 OK — application/octet-stream body containing the raw signature bytes.
404 — { "error": { "code": "NOT_FOUND" } }
Headers include cache & CORS as above.

If the stored JSON lacks a signature, the endpoint returns a deterministic, test-friendly signature derived from the canonical JSON (for backwards compatibility).

⸻

4) Public: Verify

POST /api/certified/verify (JSON)

A) Verify by artifactId

{ "artifactId": "art_123" }

	•	200 { "ok": true } if the artifact exists
	•	404 { "error": { "code": "NOT_FOUND" } } if it doesn’t

B) Inline verification (artifact + signature)

{
  "artifact": { /* domain object incl. sha256 */ },
  "signature": "hex-or-base64"
}

	•	200 { "ok": true, "sha256": "<hex>" } on success
	•	200 { "ok": false, "reason": "signature_invalid" } on failure

Server recomputes sha256 over the artifact without its sha256 field, then validates the signature against the canonical JSON with the same sha256 reinserted.

C) Legacy plan-lock acknowledgement

{ "lock": { /* legacy lock */ } }

	•	200 { "ok": true }

Bad request
	•	400 { "error": { "code": "BAD_REQUEST" } } (e.g., missing required fields)

⸻

Examples

Verify by ID

curl -sX POST http://localhost:80/api/certified/verify \
  -H 'content-type: application/json' \
  -d '{"artifactId":"art_123"}'

Inline verify

ART='{"title":"Example","value":42,"sha256":"<computed-hex>"}'
SIG='<hex-or-base64>'
curl -sX POST http://localhost:80/api/certified/verify \
  -H 'content-type: application/json' \
  -d "{\"artifact\":$ART,\"signature\":\"$SIG\"}"


⸻

Client helper (TypeScript)

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


⸻

Deprecations
	•	Legacy publish alias /certified/items/:itemId/publish is supported for backward compatibility. Prefer /api/certified/items/:itemId/publish. A removal date will be announced in CHANGELOG before deprecation.

