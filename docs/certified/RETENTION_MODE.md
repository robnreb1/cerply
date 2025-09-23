# Retention Mode (Preview)

Flags (env):
- CERTIFIED_ENABLED=true
- RETENTION_ENABLED=true (preview-only)

Endpoints (preview; no auth/PII):
- POST /api/certified/schedule
- POST /api/certified/progress
- GET  /api/certified/progress?sid=...

CORS invariants:
- OPTIONS returns 204 with ACAO:* and allowed methods/headers
- Responses under /api/certified/* include ACAO:* and never ACAC:true

Store:
- In-memory Map keyed by session_id; process-lifetime only; resets on restart.

SM-2-lite (quick):
- State: reps, ef (1.3..3.0), intervalDays, lastGrade
- Update: if grade < 3 → reset reps/interval, EF decreases slightly; else EF = EF + (0.1 - (5-q)*(0.08 + (5-q)*0.02)); intervals: 1, 6, then round(prev * EF).

Determinism:
- For fixed inputs and timestamps, ordering is deterministic (due ascending, id tiebreak).

Web integration (preview):
- Study Runner should call schedule on start/reset, post progress on grade/flip, and offer resume if server snapshot exists.
