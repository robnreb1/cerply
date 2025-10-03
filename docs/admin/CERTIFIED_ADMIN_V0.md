## Certified Admin v0 (Preview) — EPIC #54 + #55

Flags:
- `ADMIN_PREVIEW=true` (enables routes)
- `ADMIN_TOKEN=<secret>` (required)
- `ADMIN_MAX_REQUEST_BYTES` (default 32KB)
- `ADMIN_RATE_LIMIT` (reserved for future per-route override)
- `ADMIN_STORE=ndjson|sqlite` (default: `ndjson`, EPIC #55)

Namespace: `/api/admin/certified/*` with CORS invariants:
- ACAO: `*` on responses
- No `Access-Control-Allow-Credentials`
- OPTIONS preflight: 204, ACAO:*, allow headers `content-type, x-admin-token, authorization`

Security headers: COOP, CORP, Referrer-Policy, X-Content-Type-Options set on responses.

Endpoints:
- POST `/api/admin/certified/sources` {name, baseUrl, notes?} → {source_id}
- GET `/api/admin/certified/sources?q=<search>&page=1&limit=20` → {sources: [], total?, page?, limit?}
- POST `/api/admin/certified/items/ingest` {title, url, tags?[]} → {item_id}
- GET `/api/admin/certified/items?status=<status>&source_id=<id>&q=<search>&page=1&limit=20` → {items: [], total?, page?, limit?}
- GET `/api/admin/certified/items/:id` → item details incl. provenance
- POST `/api/admin/certified/items/:id/approve` → {ok, id, status}
- POST `/api/admin/certified/items/:id/reject` → {ok, id, status}

Query parameters (EPIC #55):
- `q`: Search query (LIKE on title/url/name, max 200 chars)
- `page`: Page number (1-based, optional)
- `limit`: Items per page (1-100, clamped, optional)
- `status`: Filter items by status (`pending`, `approved`, `rejected`, `queued`, `error`)
- `source_id`: Filter items by source ID

**Backward compatibility:** Responses without pagination params return legacy array format (`{sources:[]}`, `{items:[]}`). With pagination params, returns `{sources:[], total, page, limit}` or `{items:[], total, page, limit}`.

Auth:
- Header only: `X-Admin-Token: <redacted>` or `Authorization: Bearer <redacted>` (stateless)
- 401 invalid/missing; CSRF N/A

Storage (EPIC #55):
- **NDJSON (default):** `api/store/admin-certified.ndjson` with append-only rows; last write wins for items
- **SQLite (opt-in):** Set `ADMIN_STORE=sqlite` to use Prisma + SQLite (`api/.data/admin.sqlite`)
  - Schema: `AdminSource`, `AdminItem` (with indexes), `AdminEvent`
  - Transactions for ingest + event logging
  - Migration scripts:
    - Import: `npx tsx api/scripts/admin.ndjson.import.ts`
    - Export: `npx tsx api/scripts/admin.sqlite.export.ts [output-file]`

Example curls (local, token redacted):
```bash
# OPTIONS preflight for ingest
curl -sS -i -X OPTIONS http://localhost:8080/api/admin/certified/items/ingest \
  -H 'Origin: http://localhost:3000' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type, x-admin-token' | sed -n '1,30p'

# POST ingest
curl -sS -X POST http://localhost:8080/api/admin/certified/items/ingest \
  -H 'content-type: application/json' \
  -H 'x-admin-token: <redacted>' \
  --data '{"title":"Spec","url":"https://example.com"}'
```

Web preview:
- `/admin/certified` behind `NEXT_PUBLIC_PREVIEW_ADMIN=true`; uses `NEXT_PUBLIC_ADMIN_TOKEN` only for local dev.


