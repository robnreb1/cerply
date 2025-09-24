# Testing Strategy

This repo enforces layered tests and CI gates to increase confidence for Certified Plan and Retention.

- Unit/property:
  - SM2-lite property tests assert EF bounds [1.3, 3.0], non-negative intervals, and low-grade resets.
  - Adaptive planner deterministic fixtures across topics/levels/goals.
  - Web API client includes retry/backoff on 5xx with unit tests for timing.

- Contract checks:
  - Zod runtime validation for Certified responses in plan mode.
  - OpenAPI build/check job exists in CI.

- API negatives:
  - Certified plan enforces content-type and now guards 413 (>16KB) and 429 (simulated) with CORS invariants; tests assert ACAO:* and structured error envelope.

- E2E:
  - Local Playwright against dev server (PLAN and STUDY flows).
  - Preview E2E workflow resolves Vercel preview URL and runs PLAN and STUDY specs against it with staging API.

- Canaries:
  - Staging deploy workflow probes CORS: requires ACAO:*, forbids ACAC:true, notes x-ratelimit-*; uploads headers.

- Coverage gates:
  - CI runs Vitest coverage for API/Web, merges lcov, checks >=85% statements/branches on changed files.

- Perf smoke:
  - Manual/nightly k6 burst (~50 rps, 30s) against staging `/api/certified/plan`; uploads results.


