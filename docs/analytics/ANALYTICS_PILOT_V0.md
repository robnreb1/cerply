### Analytics Pilot v0 (Preview)

Flags
- API: `PREVIEW_ANALYTICS=true|false` (default false)
- API optional: `ANALYTICS_INGEST_SECRET` (require `Authorization: Bearer <secret>` for writes when set)
- Web: `NEXT_PUBLIC_PREVIEW_ANALYTICS=true|false`

Routes (preview)
- `OPTIONS /api/analytics/ingest` → 204; headers include `access-control-allow-origin: *`.
- `POST /api/analytics/ingest` → body `{ events: AnalyticsEvent[] }`; 204 on success.
- `GET /api/analytics/aggregate?from=&to=` → `{ totals: { by_event, by_day, engines?, topics? } }`.

Schema
- `AnalyticsEvent`: `{ event: 'plan_request'|'study_flip'|'study_next'|'study_prev'|'study_reset'|'study_shuffle'|'study_complete', ts: ISO string, anon_session_id: string, page_id?: string, props?: object, context?: { topic?, level?, goals?, engine? } }`

Storage
- Preview-first NDJSON at `api/.data/analytics.ndjson` (SQLite optional later). Aggregates computed by stream reduce.

Web
- Client `web/lib/analytics/client.ts` with `postEvents()`; gated by `NEXT_PUBLIC_PREVIEW_ANALYTICS`.
- Instrumentation added on Certified plan submit and Study Runner interactions.
- Dashboard: `/analytics` (preview) shows event totals and day breakdown.

CI
- Job `Analytics Smoke` starts API with `PREVIEW_ANALYTICS=true`, ingests one event, asserts aggregate ≥1.

Staging
- Canary verifies CORS for OPTIONS/POST and a minimal ingest/aggregate roundtrip when flag enabled.

Enable locally
```
PREVIEW_ANALYTICS=true npm -w api run dev
NEXT_PUBLIC_PREVIEW_ANALYTICS=true npm -w web run dev
```


