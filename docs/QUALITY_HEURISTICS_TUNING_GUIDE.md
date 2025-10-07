# Quality Heuristics Tuning Guide

**Location**: `api/src/lib/canon.ts` → `evaluateContentQuality()`

## Overview
The quality scoring system is **100% tunable**. If responses feel templated or scores are too strict/lenient, adjust these weights.

## Current Baseline (as of 2025-10-07)
- **Baseline per metric**: `0.88` (up from 0.85)
- **Target threshold**: `0.80` (content must score ≥0.80 to be canonized)
- **Typical good content scores**: 0.80-0.90

## The Four Quality Metrics

### 1. **Coherence** (0.88 baseline)
- Measures: Logical flow, consistency, non-repetition
- **Penalties**:
  - Forbidden template phrases: `-0.15`
  - Low unique token ratio (<0.4): `-0.08`
- **Bonuses**:
  - Descriptive title (>20 chars): `+0.02`
  - High unique tokens (>0.6): `+0.05`
  - Reasonable variety (>0.5): `+0.02`

### 2. **Coverage** (0.88 baseline)
- Measures: Completeness, schema fulfillment, depth
- **Penalties**:
  - No title: `-0.3`
  - Short title (<10): `-0.08`
  - No summary: `-0.3`
  - Short summary (<50): `-0.05`
  - No modules: `-0.4`
  - Few modules (<3): `-0.05`
- **Bonuses**:
  - Good title (>20): `+0.05`
  - Detailed summary (>100): `+0.05`
  - Good module count (≥3): `+0.05`
  - Rich module content: `+0.03`

### 3. **Factual Accuracy** (0.88 baseline)
- Measures: Specificity, precision, detail
- **Penalties**:
  - Low unique token ratio (<0.4): `-0.08`
- **Bonuses**:
  - High unique tokens (>0.6): `+0.05`

### 4. **Pedagogical Soundness** (0.88 baseline)
- Measures: Learning effectiveness, structure, actionability
- **Penalties**:
  - Forbidden phrases: `-0.15`
  - No summary: `-0.2`
- **Bonuses**:
  - Detailed summary (>100): `+0.03`
  - Good module count (≥3): `+0.03`
  - Rich module content (≥50%): `+0.05`
  - Modules with items: `+0.03`

## Forbidden Template Phrases (STRICT)
These trigger **heavy penalties** (-0.15 each):
- `getting started`
- `key principles`
- `practical applications`
- `introduction to`
- `basic concepts`

**Why strict?** Non-templated content is core to Cerply's value proposition.

## Unique Token Ratio
Measures content variety (higher = more specific, less repetitive).

**Calculation**: `unique_tokens / total_tokens` (tokens > 2 chars)

- **Excellent** (>0.6): +0.05 bonus
- **Good** (>0.5): +0.02 bonus
- **Poor** (<0.4): -0.08 penalty

## How to Tune

### If Responses Feel Templated:
1. **Add more forbidden phrases** to the list
2. **Increase penalties** for forbidden phrases (e.g., -0.20 instead of -0.15)
3. **Raise unique token threshold** (require >0.65 for bonus)
4. **Add semantic similarity checks** (future: compare against known templates)

### If Quality Scores Too Low (Too Strict):
1. **Increase baseline** (e.g., 0.90 instead of 0.88)
2. **Add more bonuses** for good content
3. **Reduce penalties** for minor issues
4. **Lower threshold** (e.g., 0.75 instead of 0.80) - but document why

### If Quality Scores Too High (Too Lenient):
1. **Decrease baseline** (e.g., 0.85 instead of 0.88)
2. **Increase penalties** for poor content
3. **Raise threshold** (e.g., 0.85 instead of 0.80)
4. **Remove bonuses** that are too generous

## Testing Changes
After tuning, run:
```bash
# Unit tests
npm -w api run test:quality-floor

# Full suite
npm -w api test

# Smoke tests
./api/scripts/smoke-m3-contracts.sh http://localhost:8080
```

## Monitoring in Production
Check quality scores via:
```bash
curl -s $API/api/ops/usage/daily | jq '.meta.cost_graph[] | select(.route=="/api/generate")'
```

Look for:
- **Average quality scores** across requests
- **Canon hit rate** (reuse vs fresh ratio)
- **503 QUALITY_FLOOR errors** (too strict if frequent)

## Future Enhancements
1. **LLM-based scoring**: Use GPT-4 as judge for semantic quality
2. **Semantic similarity**: Compare against known template embeddings
3. **User feedback loop**: Adjust based on "this feels templated" reports
4. **A/B testing**: Test different thresholds with small user cohorts
5. **Multi-model cross-checks**: Generate with multiple models, compare quality

## Change Log
- **2025-10-07**: Baseline increased to 0.88, added rich content bonuses, reduced minor penalties
- **2025-10-06**: Initial implementation with 0.85 baseline

---

**Remember**: Quality scoring is a **living system**. Tune based on real user feedback, not just test pass rates!

