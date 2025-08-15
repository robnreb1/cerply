
# RFC-002 — Curation & Adaptive Engine (v1)

Purpose: Add human QA for generated lessons and a first-class adaptive engine.
Scope (in): interactive micro-quizzes + explainers; Curator Dashboard (uploader + QA);
Adaptive learning (weak-topic focus, spaced returns, safe variants); Trust labels; Insights (tenant vs market-wide).
Non-goals (now): SCORM export; multilingual UI; advanced item types beyond MCQ/multi-select/order/fill-in; mobile apps.

Acceptance criteria: Curator list & editor; QA workflow; trust labels; Adaptive next-set; seed analytics; CSV export endpoint (placeholder).

Telemetry: completion(21d), knowledge-lift(D0→D7→D30), spaced-return coverage, curator edit rate, label mix, manager weekly usage.

Data boundaries: tenant isolation (future PR); optional market-wide compare (flagged, future PR).

Workflow: Draft → QA → Publish → (optional) Cerply Certified submission.
