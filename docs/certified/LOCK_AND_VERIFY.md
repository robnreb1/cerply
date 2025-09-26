# Certified Lock & Verify (Preview)

- Endpoint: `POST /api/certified/verify`
- Input:
```json
{
  "plan": {"title":"...","items":[{"id":"m1","type":"card","front":"A","back":"B"}]},
  "lock": { "algo": "blake3", "hash": "<hex>", "canonical_bytes": 123 },
  "meta": { "request_id": "<uuid>" }
}
```
- Behavior: Re-canonicalizes `plan` using the same stable sort and field filter used by `planner/lock.ts`, hashes with provided algo (`blake3` preferred, falls back to SHA-256), compares to provided lock.
- Response (200):
```json
{
  "ok": true,
  "computed": { "algo": "blake3", "hash": "<hex>", "size_bytes": 123 },
  "provided": { "algo": "blake3", "hash": "<hex>" }
}
```
- Errors: 415 when content-type != `application/json`; 400 when schema invalid.
- CORS invariant: `access-control-allow-origin: *`; credentials stripped. `OPTIONS /api/certified/verify` returns 204.

Audit Trail (Preview)
- Emitted on successful `/api/certified/plan` and `/api/certified/verify` calls.
- Tag: `certified_audit_v1`.
- Fields: `ts`, `request_id`, `action: 'plan'|'verify'`, `engines`, `lock_algo`, `lock_hash_prefix`, `citations_count`, `ok` (verify).
- Preview admin: `GET /api/certified/_audit_preview?limit=100` (flag: `FF_CERTIFIED_AUDIT_PREVIEW=true`).
