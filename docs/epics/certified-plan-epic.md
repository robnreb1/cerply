# Epic: Certified Plan v0 (PLAN mode)

Status: Delivered (v0)
Date: 2025-09-23

## Scope
- API endpoint `POST /api/certified/plan` with strict JSON, schema validation, and deterministic planner.
- Planner pipeline contracts and a deterministic mock engine; optional OpenAI adapter (gated).
- OpenAPI generation + preview docs.
- Web preview UI `/certified` and Study Runner v0 `/certified/study` (preview-only).
- Tests: unit, golden fixture, smoke, Playwright E2E.
- CI hardening: PR E2E, OpenAPI drift guard, submodule cleanup guard.

## Flags
- CERTIFIED_ENABLED, CERTIFIED_MODE (`stub|mock|plan`)
- PLANNER_ENGINE (`mock|openai`), OPENAI_API_KEY
- NEXT_PUBLIC_PREVIEW_CERTIFIED_UI, PREVIEW_DOCS

## Acceptance (delivered)
- 415 on wrong content-type; 400 on invalid body; 200 PLAN with deterministic shape; 501/503 unchanged; OPTIONS 204 + ACAO:*.
- Response includes `request_id`, `provenance.*`, and `plan.items[]`.
- Web preview posts JSON and renders plan; Study Runner v0 works with mocked API; unit tests and E2E pass.
- CI green on PRs with Playwright job; openapi-drift job passes.

## Artifacts
- Schemas: `api/src/schemas/certified.plan.ts`
- Endpoint: `api/src/routes/certified.ts`
- Planner: `api/src/planner/*`
- OpenAPI: `api/openapi/build/openapi.json`
- Web: `web/app/(preview)/certified/*`, `web/e2e/*`

## Next
- Adaptive engine v1 (flagged) and qualitative heuristics.
- Finalize OpenAI adapter; extend evaluator dataset and scoring.
- Analytics pilot endpoint and dashboard skeleton.
- CORS canary++ assert rate-limit headers end-to-end.
- Auto-generate web client on OpenAPI updates in CI.


