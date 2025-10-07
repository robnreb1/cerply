# PLATFORM FOUNDATIONS v1

**Epic:** Quality-first, cost-aware, adaptive learning infrastructure  
**Status:** Implemented  
**Version:** 1.0.0  
**Last Updated:** 2025-10-07

---

## Five Principles (Global Enforcement)

### 1. Quality-first, Always Reusable
- **First-time generation**: Use top models (gpt-4) + heuristic quality scoring
- **Quality floor**: Minimum 0.80 threshold; retry once with rigor mode if below
- **Canonization**: Store only content that passes quality floor (>= 0.80)
- **Integrity**: SHA256 validation on retrieval; invalidate if tampered
- **503 QUALITY_FLOOR**: Return error if even retry fails to meet threshold

### 2. AI-first, Chat-native, Non-templated
- **Conversational**: All responses vary; never fixed "Getting started/Key principles/Practical applications" blocks
- **Paraphrase pools**: Generate multiple variants; rotate on reuse
- **Lint enforcement**: `ux-no-templates-lint` blocks forbidden phrases in content
- **Interaction Engine**: NL intent router (web/lib/ie/router.ts) for dynamic microcopy

### 3. Adaptive by Default
- **Auto-assessment**: NO self-grading; system infers mastery from correctness, latency, hints, retries
- **Difficulty adaptation**:
  - 2× wrong @ same difficulty + latency > 30s → ease down
  - 3× correct @ fast (<10s) + no hints → step up
- **Never-repeat-verbatim**: Paraphrase variants prevent exact text repetition
- **Spaced scheduling**: SM2-lite algorithm with auto-inferred grades

### 4. Cost-aware via Reuse (Never at Quality's Expense)
- **Fresh generation**: When canon miss or quality floor fails
- **Reuse**: When canon hit with integrity validation
- **Telemetry**: Cost Graph tracks fresh vs reuse per route
- **Transparency**: `x-cost: fresh|reuse` header on every response

### 5. Observability (Tiny, Testable Signals)
Every M3 API response includes headers:
- **`x-canon: hit|store|bypass`** — Canon cache status
- **`x-quality: 0.00–1.00`** — Quality score (heuristic)
- **`x-cost: fresh|reuse`** — Cost bucket (fresh generation vs canon reuse)
- **`x-adapt: none|easy|hard|review`** — Adaptive difficulty signal

Body includes:
- **Success**: `{ data, meta }` envelope
- **Error**: `{ error: { code, message, details? } }` envelope

---

## Components

### Canon Store (`api/src/lib/canon.ts`)
**Purpose:** In-memory LRU cache for high-quality, reusable content.

**Features:**
- Stable key generation (`keyFrom`) from normalized payload
- SHA256 integrity check on retrieval
- LRU eviction (max 1000 entries)
- Optional JSON persistence (`CANON_PERSIST_PATH`)
- Quality filter: only store content with `quality_score >= 0.80`

**API:**
- `retrieveCanonicalContent(key)` — Get cached content with integrity check
- `canonizeContent(artifact, metadata, payload)` — Store content if quality passes
- `searchCanonicalContent(query)` — Find by topic + quality filter

**Environment:**
- `CANON_ENABLED=true` — Enable canon store
- `CANON_PERSIST_PATH=/path/to/canon.json` — Optional persistence

---

### Quality Floor (`api/src/lib/quality.ts`)
**Purpose:** Heuristic content scoring to enforce minimum standards.

**Scoring Logic:**
- **Forbidden phrases**: Heavy penalty for "getting started", "key principles", "practical applications", etc.
- **Schema coverage**: Reward complete title, summary, modules with descriptions
- **Length bounds**: Minimum content depth (100+ chars)
- **Unique token ratio**: Penalize repetitive/generic content (<0.5 unique ratio)
- **Module depth**: Reward modules with detailed descriptions (>20 chars)

**Quality Threshold:** `0.80` (configurable)

**Retry Logic:**
1. Generate content (normal mode)
2. Score with heuristics
3. If `score < 0.80`, retry with `rigorMode = true` (more detailed/specific generation)
4. If still `< 0.80`, return `503 QUALITY_FLOOR` error

**API:**
- `scoreArtifact(artifact)` — Returns 0.00–1.00 quality score
- `evaluateQualityMetrics(artifact)` — Returns detailed metrics (coherence, coverage, accuracy, soundness)
- `generateWithQualityRetry(generatorFn)` — Wraps generation with retry logic

---

### Cost Graph (`api/src/lib/costGraph.ts`)
**Purpose:** Track API invocation costs, distinguishing fresh generation vs canon reuse.

**Telemetry:**
- **Fresh invocation**: Estimated tokens in/out, cost (based on model tier)
- **Reuse invocation**: Near-zero cost (~$0.000001)
- **Per-route aggregates**: `fresh_count`, `reuse_count`, `total_cost`, `reuse_savings`

**API:**
- `trackFreshInvocation(route, model, tokens_in, tokens_out, canon_key?)`
- `trackReuseInvocation(route, canon_key, model?)`
- `getTodayAggregates()` — Returns cost breakdown per route

**Exposure:**
- `GET /api/ops/usage/daily` includes `meta.cost_graph` field

**Environment:**
- `COST_GRAPH_ENABLED=true` — Enable cost tracking

---

### Interaction Engine (`web/lib/ie/router.ts`)
**Purpose:** Lightweight NL intent router for non-templated, varied responses.

**Intents:**
- `shorter`, `bullets`, `simplify`, `examples`, `timeConstraint`, `dontUnderstand`, `skip`, `test`, `goBack`, `whatsNext`, `showProgress`, `generalConversation`

**Features:**
- Paraphrase pools for each intent (4+ variants per intent)
- Context-aware suggestions based on learner state
- No fixed "Getting started/Key principles" blocks

**API:**
- `parseIntent(text, context)` — Returns intent + parameters
- `routeIntent(intent, context)` — Returns dynamic response
- `getIntentSuggestions(context)` — Returns relevant suggestions
- `generateMicrocopy(options)` — Dynamic, non-templated microcopy

**Lint Enforcement:**
- `ux-no-templates-lint` script blocks forbidden phrases in web code

**Environment:**
- `NEXT_PUBLIC_INTERACTION_ENGINE=true` — Enable IE in web UI

---

## M3 API Surface (Contracts)

All M3 endpoints follow these standards:

### Success Envelope
```json
{
  "data": { /* route-specific payload */ },
  "meta": {
    "source": "canon" | "fresh",
    "quality_score": 0.85,
    "canonized": true,
    /* other metadata */
  }
}
```

### Error Envelope
```json
{
  "error": {
    "code": "VALIDATION_ERROR" | "QUALITY_FLOOR" | "INTERNAL_ERROR",
    "message": "Human-readable message",
    "details": { /* optional structured details */ }
  }
}
```

### Headers (All Responses)
- `x-canon: hit|store|bypass`
- `x-quality: 0.00–1.00`
- `x-cost: fresh|reuse`
- `x-adapt: none|easy|hard|review`

### Endpoints

#### `POST /api/preview`
**Purpose:** Preview content structure before generation.

**Request:**
```json
{ "content": "quantum mechanics basics" }
```

**Response:**
```json
{
  "data": {
    "summary": "Structured exploration of...",
    "proposed_modules": [
      { "id": "mod-1", "title": "Foundations", "estimated_items": 5 }
    ],
    "clarifying_questions": ["What is your current familiarity?"]
  },
  "meta": { "source": "canon", "canonized": true, "quality_score": 0.88 }
}
```

---

#### `POST /api/generate`
**Purpose:** Generate full learning modules with items.

**Request:**
```json
{
  "modules": [{ "title": "Linear Algebra" }],
  "level": "intermediate"
}
```

**Response (Success):**
```json
{
  "data": {
    "modules": [
      {
        "id": "module-1",
        "title": "Linear Algebra",
        "lessons": [{ "id": "lesson-1", "title": "...", "explanation": "..." }],
        "items": [{ "id": "item-1", "prompt": "...", "type": "free" }]
      }
    ]
  },
  "meta": {
    "source": "fresh",
    "canonized": true,
    "model": "gpt-4",
    "quality_score": 0.87,
    "quality_metrics": { "coherence": 0.9, "coverage": 0.85, ... },
    "retried": false
  }
}
```

**Response (Quality Floor Failure - 503):**
```json
{
  "error": {
    "code": "QUALITY_FLOOR",
    "message": "Generated content did not meet quality threshold even after retry",
    "details": {
      "quality_score": 0.72,
      "threshold": 0.8,
      "retried": true,
      "quality_metrics": { ... }
    }
  }
}
```

---

#### `POST /api/score`
**Purpose:** Auto-assess learner response (NO SELF-GRADE).

**Request:**
```json
{
  "item_id": "item-1",
  "response_text": "the matrix determinant measures volume scaling",
  "latency_ms": 8500,
  "variants": ["determinant", "volume", "scaling"],
  "expected_answer": "determinant measures volume"
}
```

**Response:**
```json
{
  "data": {
    "correct": true,
    "rationale": "Well done! You've got this concept down.",
    "signals": {
      "latency_bucket": "fast",
      "paraphrase_match": 0.8,
      "difficulty_delta": 1,
      "next_review_suggestion_s": 604800
    }
  },
  "meta": { "source": "fresh" }
}
```

**Headers:** `x-adapt: hard` (step up next)

---

#### `GET /api/daily/next?sid=<session_id>`
**Purpose:** Get adaptive queue with difficulty and reasons.

**Response:**
```json
{
  "data": {
    "queue": [
      {
        "item_id": "item-1",
        "prompt": "Define spaced repetition",
        "assigned_difficulty": "medium",
        "priority": 1.0,
        "reason": "stepped_up_mastery",
        "due_at": "2025-10-07T12:00:00Z"
      }
    ],
    "assigned_difficulty": "medium"
  },
  "meta": { "adaptation_reason": "stepped_up_mastery" }
}
```

**Headers:** `x-adapt: hard`

---

#### `GET /api/ops/usage/daily`
**Purpose:** Daily usage aggregates with cost graph.

**Response:**
```json
{
  "data": {
    "generated_at": "2025-10-07T12:00:00Z",
    "today": "2025-10-07",
    "yesterday": "2025-10-06",
    "routes": [
      {
        "date": "2025-10-07",
        "route": "/api/generate",
        "requests": 42,
        "total_tokens_in": 8400,
        "total_tokens_out": 12600,
        "total_cost": 0.042,
        "models": ["gpt-4"]
      }
    ]
  },
  "meta": {
    "cost_graph": [
      {
        "route": "/api/generate",
        "fresh_count": 12,
        "reuse_count": 30,
        "total_cost": 0.015,
        "reuse_savings": 0.027
      }
    ]
  }
}
```

---

#### `GET /api/ops/canon/_debug` (Non-prod Only)
**Purpose:** Inspect canon store stats.

**Response:**
```json
{
  "data": {
    "enabled": true,
    "size": 47,
    "maxSize": 1000,
    "keys": ["a1b2c3d4...", "e5f6g7h8..."]
  },
  "meta": { "source": "canon_store" }
}
```

---

## Testing

### Contract Smoke Tests
**Script:** `api/scripts/smoke-m3-contracts.sh`

**What it tests:**
- Headers (`x-canon`, `x-quality`, `x-cost`, `x-adapt`) present on all endpoints
- Success envelope `{ data, meta }` structure
- Error envelope `{ error: { code, message, details? } }` structure
- 200 for valid requests
- 400 for validation errors
- 503 for quality floor failures (if stub generates low quality)

**Usage:**
```bash
# Local
./api/scripts/smoke-m3-contracts.sh http://localhost:8080

# Staging
./api/scripts/smoke-m3-contracts.sh https://cerply-api-staging-latest.onrender.com

# Prod
./api/scripts/smoke-m3-contracts.sh https://cerply-api-prod-latest.onrender.com
```

---

## CI Integration

**Workflow:** `.github/workflows/ci-quality-floor.yml`

**Steps:**
1. Install dependencies (root + workspaces)
2. Typecheck (API + Web)
3. Unit tests (API: canon, quality, cost graph, adaptive)
4. E2E tests (Web: Playwright learner auto-assessment)
5. Contract smoke tests (`smoke-m3-contracts.sh`)
6. Lint conversational copy (`ux-no-templates-lint`)

**Environment Variables (CI):**
- `CERTIFIED_ENABLED=true`
- `RETENTION_ENABLED=true`
- `CANON_ENABLED=true`
- `COST_GRAPH_ENABLED=true`
- `NEXT_PUBLIC_INTERACTION_ENGINE=true`

---

## Acceptance Criteria

### ✅ Headers Present
```bash
curl -si POST $API/api/preview ... | grep -i "x-canon:"
curl -si POST $API/api/generate ... | grep -i "x-quality:"
curl -si POST $API/api/score ... | grep -i "x-adapt:"
```

### ✅ Success Envelope
```bash
curl -s POST $API/api/generate ... | jq '.data, .meta'
```

### ✅ Error Envelope
```bash
curl -s POST $API/api/score -d '{}' | jq '.error.code, .error.message'
```

### ✅ Quality Floor (503)
```bash
# If stub generates low-quality content (unlikely with current stubs)
curl -si POST $API/api/generate ... | grep "503"
curl -s POST $API/api/generate ... | jq '.error.code' # "QUALITY_FLOOR"
```

### ✅ Canon Reuse
```bash
# First call: x-canon: store, x-cost: fresh
# Second call (same payload): x-canon: hit, x-cost: reuse
```

### ✅ Adaptive Signals
```bash
# Fast correct: x-adapt: hard
# Slow wrong: x-adapt: easy
# Wrong (normal latency): x-adapt: review
```

### ✅ Cost Graph
```bash
curl -s $API/api/ops/usage/daily | jq '.meta.cost_graph[] | select(.route=="/api/generate") | .reuse_savings'
```

---

## Known Gaps (Future Work)

1. **LLM-based Quality Scoring:** Current heuristic scoring is robust but could be enhanced with LLM-based evaluation (e.g., GPT-4 as judge).
2. **Semantic Canon Search:** Currently key-based exact match; future: vector embeddings for semantic similarity.
3. **Persistent Learner Model:** In-memory sliding window (N=5); future: database-backed BKT/AFM models.
4. **Real-time LLM Paraphrasing:** Stub paraphrases; future: on-the-fly LLM generation of variants.
5. **Multi-model Cross-checks:** Quality floor retry with different model; future: ensemble validation.

---

## References

- **BRD:** Learning that sticks (spaced, adaptive), certified via human-in-the-loop, enterprise utility, D2C data flywheel
- **FSD:** §21/§21.1 (M3 API surface), learner flow, retention endpoints, non-templated NL UX
- **SSOT:** `docs/specs/mvp-use-cases.md` (L-1…L-24)

---

**Sentinel:** `PLATFORM_FOUNDATIONS_v1_COMPLETE`
