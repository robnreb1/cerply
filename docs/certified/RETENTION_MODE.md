# Retention Mode (Preview)

Flags (env):
- CERTIFIED_ENABLED=true
- CERTIFIED_MODE=plan
- RETENTION_ENABLED=true
- NEXT_PUBLIC_PREVIEW_CERTIFIED_UI=true

Endpoints (preview-only):
- POST /api/certified/schedule
- POST /api/certified/progress
- GET  /api/certified/progress?sid=

CORS invariants:
- OPTIONS → 204 with ACAO:* and allowed methods/headers
- Responses for /api/certified/* include ACAO:*; no ACAC:true; no debug headers

Web integration (preview):
- Study Runner (/certified/study) calls schedule on start/reset and posts progress on flip/grade.
- On refresh, if local empty, runner fetches snapshot and offers resume (applies order by due).
- Settings drawer shows algo (sm2-lite) and allows daily target (local only).

Notes:
- Store is in-memory (preview): resets on process restart.
- Schedule deterministic for fixed inputs/time.
