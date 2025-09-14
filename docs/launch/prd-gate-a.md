# Gate A PRD — Habit (Daily Learning Loop)

## Objective
Achieve a habit-forming daily loop: clarify → plan → confirm → generate → learn → review, with resilience and clear progress.

## Users
- New learners creating a plan from a prompt/link/note.
- Returning learners continuing scheduled reviews.

## Outcomes (must-meet)
- Next-best item served within p95 ≤ 500ms (no LLM).
- >80% of active learners have a scheduled `ReviewSchedule` item within 24h.
- Visible progress pulse whenever responses exceed 500ms.
- Error envelope surfaced in UI without breaking the flow.

## Scope (v4.1)
- `/api/chat` orchestrator with loop-guard and `x-planner`/`x-model` headers.
- `/learn/next`, `/learn/submit` endpoints; scheduler writing `ReviewSchedule`.
- Web `/learn` page: fetch next, submit attempt, show next-review time.
- Drizzle migrations for Plan/Module/Item/Attempt/ReviewSchedule; idempotent seed.

## Non-Goals (v4.1)
- Advanced personalization models; social features; full admin publishing UI.

## Acceptance Criteria
- API returns consistent envelope: `{ ok }` or `{ error: { code, message } }`.
- E2E: ingest → plan → generate → learn → review completes in staging.
- Progress UI shows pulse when any step >500ms.
- Fresh DB acceptance script passes; migration-in-place path validated.

## Metrics
- Daily active learners; % with scheduled review within 24h; p95 latency for `/learn/next` and `/learn/submit`; completion rate.

## Risks & Mitigations
- DB contention on scheduler: use batched updates + index on `(userId, dueAt)`.
- Planner unavailability: graceful 503 `MODEL_UNAVAILABLE` with retry hook.
- Duplicate intents: de-duplication step in orchestrator before generation.

## Launch checklist (Gate A)
- [ ] Orchestrator + headers + duplicate coalescing
- [ ] Learner endpoints + scheduler unit tests
- [ ] Progress UI + E2E
- [ ] Telemetry events + dashboard stub
- [ ] Runbook + rollback tested
