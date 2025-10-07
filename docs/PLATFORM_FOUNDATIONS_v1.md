# Platform Foundations v1

**Epic:** PLATFORM_FOUNDATIONS_v1  
**Related:** M3_API_SURFACE  
**BRD/FSD Hooks:** Quality-first then reuse, cost-aware via reuse, adaptive learning, non-templated chat

## Overview

Platform Foundations provides the core infrastructure for quality-first content generation, intelligent reuse, cost optimization, and natural interaction.

### Principles

1. **Quality-first, always reusable:** Generate once with high quality (even if expensive), then persist and reuse. Never "cheap out" on first-time generation.
2. **Cost-aware via reuse, not via low quality:** Optimize costs by reusing high-quality canon content, not by generating cheap content.
3. **Adaptive, automated, AI-first:** System infers mastery and adjusts difficulty automatically. No manual grading required.
4. **Chat-first, natural, never templated:** Responses vary naturally using paraphrase pools. No fixed "Getting started / Key principles" blocks.

## Components

### 1. Canon Store (`api/src/lib/canon.ts`)

**Purpose:** In-memory LRU cache for high-quality generated content.

**Features:**
- Stable content hashing (`keyFrom()`) based on normalized prompt + inputs + policy
- LRU eviction when cache exceeds max size (default 1000 entries)
- Optional JSON persistence via `CANON_PERSIST_PATH`
- Access tracking (accessed_at, access_count)

**API:**
```typescript
keyFrom(payload: any): string
retrieveCanonicalContent(key: string): CanonRecord | null
canonizeContent(artifact, metadata, payload): CanonRecord
searchCanonicalContent(query: string): CanonRecord[]
contentExists(key: string): boolean
```

**Env Flags:**
- `CANON_ENABLED=true` (required for canon store to function)
- `CANON_PERSIST_PATH=/path/to/canon.json` (optional, for persistence)

### 2. Quality Floor (`api/src/lib/quality.ts`)

**Purpose:** Heuristic scorer to ensure generated content meets minimum standards before canonization.

**Threshold:** 0.8 (only content scoring >= 0.8 is stored in canon)

**Scoring Heuristics:**
- Penalize template phrases ("getting started", "key principles", etc.) -0.15 each
- Penalize missing/short title/summary -0.1 each
- Penalize low unique token ratio (< 0.5) -0.1
- Reward high specificity (unique ratio > 0.7) +0.05
- Reward well-structured modules +0.05

**Retry Logic:**
- First attempt: normal generation mode
- If score < 0.8: retry once with "rigor mode" (more detailed prompts)
- Store only if final score >= 0.8

**API:**
```typescript
scoreArtifact(artifact, options): number
evaluateQualityMetrics(artifact): QualityMetrics
meetsQualityFloor(artifact): boolean
generateWithQualityRetry(generator, options): Promise<{artifact, quality_score, retried}>
```

**Env Flags:**
- `QUALITY_FLOOR_ENABLED=true`

### 3. Cost Graph (`api/src/lib/costGraph.ts`)

**Purpose:** Track fresh generation vs canon reuse for cost optimization.

**Tracking:**
- Fresh invocations: full token counts + estimated cost
- Reuse invocations: near-zero cost (~$0.000001 for tracking)
- Aggregates by route: fresh_count, reuse_count, total_cost, reuse_savings

**API:**
```typescript
trackFreshInvocation(route, model, tokens_in, tokens_out, canon_key?)
trackReuseInvocation(route, canon_key, model)
getTodayAggregates(): CostAggregates[]
```

**Env Flags:**
- `COST_GRAPH_ENABLED=true`

**Exposed via:** `GET /api/ops/usage/daily` (includes `graph` field with cost aggregates)

### 4. Interaction Engine (`web/lib/ie/router.ts`)

**Purpose:** Natural language intent recognition with non-templated responses.

**Features:**
- Intent types: upload, start_study, show_progress, help, about_cerply, clarify, confirm
- Paraphrase pools (6-8 variants per intent)
- Markov-style state to avoid same response twice in a row
- Dynamic microcopy generation for inputs/buttons/hints

**API:**
```typescript
parseIntent(input: string): IntentResult
routeIntent(intentResult, context?): string
getIntentSuggestions(context?): string[]
generateMicrocopy(key: string, context?): string
```

**Usage:** Integrated into `/learn` page and chat interfaces.

## Integration Flow

### Content Generation (`/api/generate`)

1. **Check Canon:** `retrieveCanonicalContent(keyFrom(payload))`
   - If hit: return cached, track reuse, near-zero cost
2. **Generate Fresh:** `generateWithQualityRetry(...)`
   - First attempt (normal mode)
   - If score < 0.8: retry with rigor mode
3. **Canonize:** If final score >= 0.8, store in canon
4. **Track Cost:** Fresh invocation with full tokens/cost
5. **Return:** Include metadata (source, quality_score, canonized, model)

### Adaptive Learning (`/api/score`, `/api/daily/next`)

- No manual grading required
- System infers mastery from telemetry (correct, latency_ms, hint_count)
- Auto-adjusts difficulty based on thresholds:
  - 2× wrong/slow (>30s) → ease difficulty
  - 3× correct/fast (<10s, no hints) → step up difficulty
- Never repeats verbatim (uses paraphrase variants)

## Testing

### Test-Only Routes

- `GET /api/ops/canon/:key` (NODE_ENV=test only) - inspect canon entries

### Env Setup for Tests

```bash
# All tests
export CANON_ENABLED=true
export QUALITY_FLOOR_ENABLED=true
export COST_GRAPH_ENABLED=true
export CERTIFIED_ENABLED=true
export RETENTION_ENABLED=true

# Run tests
npm run test --workspace=api -- canon-reuse
npm run test --workspace=api -- quality-floor-eval
npm run test --workspace=api -- cost-graph-tests
npm run test --workspace=web -- conv-variance-eval
npm run test --workspace=web -- nl-commands-e2e
```

## Verification

### Canon Reuse

```bash
# First call (fresh)
curl -X POST http://localhost:8080/api/generate \
  -H "Content-Type: application/json" \
  -d '{"modules":[{"title":"Quantum Mechanics"}]}'
# Check metadata.source == "fresh", metadata.canonized == true

# Second call (reuse)
# Same request → metadata.source == "canon"
```

### Quality Floor

```bash
# Check quality scores
curl http://localhost:8080/api/ops/canon/:key
# Verify quality_score >= 0.8 for all stored entries
```

### Cost Graph

```bash
# Check cost aggregates
curl http://localhost:8080/api/ops/usage/daily
# Verify graph field shows reuse_count > 0, reuse_cost near-zero
```

## Backward Compatibility

- Canon disabled when `CANON_ENABLED != true` (falls through to fresh every time)
- Quality floor disabled when `QUALITY_FLOOR_ENABLED != true` (no retry)
- Cost graph disabled when `COST_GRAPH_ENABLED != true`
- Legacy `/api/certified/progress` action=grade still accepted (logs deprecation warning)
- Front/back fields on Card schema now optional for test compatibility

## Performance

- Canon LRU: O(1) lookup, O(log N) eviction
- Quality scoring: O(n) where n = content length
- Cost tracking: O(1) insert, O(m) aggregation where m = routes * days

## Future Work

- Semantic search for canon (current: exact key match)
- Distributed canon store (Redis/Postgres)
- ML-based quality scoring (current: heuristic)
- Real-time cost alerts/budgets
- BKT/AFM adaptive models (current: heuristic thresholds)

