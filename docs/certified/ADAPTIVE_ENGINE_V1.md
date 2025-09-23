# Adaptive Planner Engine v1 (Preview)

Flags (preview only):
- FF_ADAPTIVE_ENGINE_V1=true
- PLANNER_ENGINE=adaptive

Notes:
- Deterministic, seedable heuristic (no network) for tests and evaluator.
- Does not change request/response schema; provenance.engine reports "adaptive-v1".

Evaluator:
- Run: npm -w api run -s planner:eval:adaptive
- Output: api/tests/fixtures/planner-eval.adaptive.json (cases, ok, coverage, firstIds)

How to test locally:
- CERTIFIED_ENABLED=true CERTIFIED_MODE=plan PLANNER_ENGINE=adaptive FF_ADAPTIVE_ENGINE_V1=true npm -w api run -s test

Limitations:
- Heuristic ordering only; not production-tuned.
