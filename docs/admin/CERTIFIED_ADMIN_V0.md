## Certified Admin v0 (Preview) — EPIC #54

Flags:
- `ADMIN_PREVIEW=true` (enables routes)
- `ADMIN_TOKEN=<secret>` (required)
- `ADMIN_MAX_REQUEST_BYTES` (default 32KB)
- `ADMIN_RATE_LIMIT` (reserved for future per-route override)

Namespace: `/api/admin/certified/*` with CORS invariants:
- ACAO: `*` on responses
- No `Access-Control-Allow-Credentials`
- OPTIONS preflight: 204, ACAO:*, allow headers `content-type, x-admin-token, authorization`

Security headers: COOP, CORP, Referrer-Policy, X-Content-Type-Options set on responses.

Endpoints:
- POST `/api/admin/certified/sources` {name, baseUrl, notes?} → {source_id}
- GET `/api/admin/certified/sources` → {sources: []}
- POST `/api/admin/certified/items/ingest` {title, url, tags?[]} → {item_id}
- GET `/api/admin/certified/items?status=pending|approved|rejected` → {items: []}
- GET `/api/admin/certified/items/:id` → item details incl. provenance
- POST `/api/admin/certified/items/:id/approve` → {ok, id, status}
- POST `/api/admin/certified/items/:id/reject` → {ok, id, status}

Auth:
- Header only: `X-Admin-Token: <redacted>` or `Authorization: Bearer <redacted>` (stateless)
- 401 invalid/missing; CSRF N/A

Storage:
- NDJSON file `api/store/admin-certified.ndjson` with append-only rows; last write wins for items

Example curl (local, token redacted):
```bash
curl -sS -X POST http://localhost:8080/api/admin/certified/items/ingest \
  -H 'content-type: application/json' \
  -H 'x-admin-token: <redacted>' \
  --data '{"title":"Spec","url":"https://example.com"}'
```

Web preview:
- `/admin/certified` behind `NEXT_PUBLIC_PREVIEW_ADMIN=true`; uses `NEXT_PUBLIC_ADMIN_TOKEN` only for local dev.


