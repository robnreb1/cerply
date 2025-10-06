# Platform Engineering Principles

This document codifies the core engineering principles that govern all Cerply development. These principles are enforced through CI gates, code reviews, and automated tests to ensure consistent quality and prevent drift.

## 1. Quality-First / Always-Reusable

**Principle:** First-time content generation uses top models with multi-model cross-reference. Results are canonized and cached for reuse with hashable artifacts, metadata, and lineage. Certified adds human-in-the-loop (HITL) experts—but quality-first applies to all first-time content.

**Implementation:**
- New topics use ensemble models (GPT-5 + cross-reference)
- Generated content stored with SHA, lineage, model set, and policy tags
- Canon store enables semantic+hash retrieval for reuse across learners
- Certified path adds HITL status while maintaining quality baseline

**CI Enforcement:**
- Quality floor tests ensure responses meet minimum rubric or come from canon
- Canon reuse tests verify cache hits and cost reduction
- Multi-model ensemble tests validate quality-first generation

## 2. Adaptive-by-Default

**Principle:** Auto-assess learner performance without self-grading. Use telemetry-driven difficulty and variant selection to continuously adapt content delivery.

**Implementation:**
- Automatic assessment based on response time and accuracy
- Difficulty progression: wrong/slow → easier next; correct/fast → harder or paraphrase variant
- Spaced repetition with struggle-based weighting
- No manual difficulty selection required from learners

**CI Enforcement:**
- Adaptive telemetry tests verify difficulty shifts based on performance
- Auto-assessment tests prove no manual grading required
- Spaced repetition tests validate struggle-based queue ordering

## 3. AI-First, Automated

**Principle:** Prefer natural language interaction with intent routing to tools. Minimize manual forms and multi-step wizards unless explicitly invoked by users.

**Implementation:**
- Natural language router for intent parsing and routing
- Dynamic microcopy generation instead of static templates
- Conversational UI with contextual follow-ups
- Single intro string only; all other copy is generated or parameterized

**CI Enforcement:**
- Conversational UX lint blocks large hardcoded strings outside whitelist
- "No Templates" test ensures lexical diversity across generations
- Natural language command acceptance tests verify adaptive responses

## 4. Cost-Aware, Never Quality-Compromising

**Principle:** Use tiered inference graph—cheap models for intent/routing/microcopy; expensive ensemble only for "quality-first content" then reuse via cache.

**Implementation:**
- Model tiers: nano (grading), mini (conversation), standard (quality content)
- Orchestration uses cheap path for microcopy/intent parsing
- Expensive models only for first-time quality content generation
- Cache hits reduce costs while maintaining quality

**CI Enforcement:**
- Cost guard tests verify cheap path usage for microcopy/intent
- Ensemble escalation tests confirm expensive models only for "fresh" content
- Cache hit tests prove cost reduction without quality loss

## 5. Intelligent, Intuitive, Natural Interactions

**Principle:** Conversational UI with dynamic microcopy, contextual follow-ups, and never-static flows beyond a single intro. Forms are fallbacks; users can "just say it" at all times.

**Implementation:**
- Natural language router for all user intents
- Dynamic microcopy generator seeded with brand voice
- No dead ends: long-running tasks show progress + engagement options
- Stateful context: short-term session + long-term profile from telemetry

**CI Enforcement:**
- NL command acceptance tests for: "shorter", "bullets", "I have 15 mins", "explain like I'm 12", "examples", "skip", "don't get it"
- No dead ends test ensures meaningful engagement during long tasks
- Variance tests prevent templated responses that appear natural

## 6. Observability & Drift Guards

**Principle:** CI gates, UX lints, and evaluations ensure we don't regress from these principles.

**Implementation:**
- Automated tests for all principles above
- UX linting prevents template drift
- Quality floor evaluations maintain content standards
- Cost monitoring ensures efficient orchestration

**CI Enforcement:**
- All principles have corresponding test suites
- Regression tests run on every PR
- Drift audit reports summarize failures and near-misses

## Cross-References

- [Interaction Contract](interaction-contract.md) - UX rules and natural language patterns
- [Quality-First Pipeline](quality-first-pipeline.md) - Content generation and canonization
- [Cost Orchestration](cost-orchestration.md) - Model tiers and budget management
- [CI Guardrails](ci-guardrails.md) - Automated enforcement mechanisms
- [Functional Spec](../functional-spec.md) - Implementation details
- [MVP Use Cases](../specs/mvp-use-cases.md) - User requirements and acceptance criteria
