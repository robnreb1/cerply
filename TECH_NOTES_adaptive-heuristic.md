# Adaptive Heuristic - Technical Notes

**Version:** v1.0 (Auto-Assessment MVP)  
**Date:** 2025-10-06  
**Status:** Implemented  

---

## Core Principle

**Cerply uses system-inferred mastery** instead of self-grading to provide truly adaptive learning. The system observes learner behavior (correctness, latency, hints, retries) and automatically adjusts difficulty and scheduling.

---

## Auto-Assessment Thresholds

### 1. Correctness Inference

**Input telemetry:**
- `user_answer`: String (learner's response)
- `expected_answer`: String (correct answer)
- `latency_ms`: Number (time from flip to submit)
- `hint_count`: Number (hints requested)
- `retry_count`: Number (submission attempts)

**Determination:**
```typescript
correct = (user_answer.toLowerCase() === expected_answer.toLowerCase()) ||
          (user_answer.length > 10) // Stub: longer answers assumed valid
```

**Production roadmap:** Use LLM-based rubric scoring for free-response questions (semantic similarity, not exact match).

---

### 2. Difficulty Inference

**Algorithm:**
```typescript
if (latency_ms > 30000 || hint_count > 1) {
  difficulty = 'hard'
} else if (latency_ms < 10000 && hint_count === 0 && correct) {
  difficulty = 'easy'
} else {
  difficulty = 'medium'
}
```

**Rationale:**
- **Fast + correct + no hints** = Mastery (easy)
- **Slow or hints needed** = Struggle (hard)
- **Everything else** = Baseline (medium)

---

### 3. Adaptive Scheduling Thresholds

#### Auto-Ease (Drop Difficulty)
**Trigger:** 2 consecutive incorrect at same difficulty with `latency_ms > 30s`

**Action:**
- `hard` → `medium`
- `medium` → `easy`
- Enqueue scaffold item first (future: micro-lesson)

**Rationale:** Learner is stuck; reduce cognitive load.

#### Auto-Step-Up (Raise Difficulty)
**Trigger:** 3 consecutive correct with `latency_ms < 10s` and `hint_count === 0`

**Action:**
- `easy` → `medium`
- `medium` → `hard`
- Advance to next concept (future: skip redundant items)

**Rationale:** Learner is ready for more challenge.

---

### 4. Never-Repeat-Verbatim Rule

**Implementation:** Paraphrase variants

**Example:**
```typescript
baseItems = [
  { 
    id: 'item-1', 
    base: 'What is spaced repetition?', 
    variants: [
      'Define spaced repetition',
      'Explain the concept of spaced repetition',
      'How would you describe spaced repetition?'
    ]
  }
]

// Pick variant based on attempt count (deterministic rotation)
variantIdx = attempts.length % variants.length
```

**Production roadmap:** LLM-generated variants per item (semantic preservation, lexical diversity).

---

## Sliding Window (N=5)

**Per-session state:**
```typescript
type LearnerState = {
  sid: string;
  attempts: AttemptRecord[]; // Max 5 (FIFO)
  current_difficulty: 'easy' | 'medium' | 'hard';
  seen_items: Set<string>; // Never-repeat tracking
}
```

**Why N=5?**
- Small enough for in-memory storage (preview mode)
- Large enough to detect patterns (2-3 consecutive triggers)
- Not persistent (resets on process restart)

**Production roadmap:** Persistent learner model in DB with longer history (N=50-100).

---

## Conversion to SM2 Grades

For backward compatibility with SM2-lite retention algorithm, auto-assessment results are converted to 0-5 grades:

| Correct | Latency | Hints | Inferred Grade | SM2 Interpretation |
|---------|---------|-------|----------------|-------------------|
| ✓ | <10s | 0 | 5 | Easy recall |
| ✓ | <20s | 0 | 4 | Correct with effort |
| ✓ | ≥20s | 0 | 3 | Correct but slow |
| ✗ | any | 0 | 2 | Incorrect, no hints |
| ✗ | any | >0 | 1 | Incorrect with hints |

**Production roadmap:** Replace SM2 with BKT/AFM (see below).

---

## Backward Compatibility

**`POST /api/certified/progress`:**
- Accepts `action: 'grade'` with `grade: 0-5` (legacy self-grading)
- Accepts `action: 'submit'` with `result: { correct, latency_ms, ... }` (new auto-assessment)
- Logs warning when legacy mode used: `"DEPRECATED: Self-grading mode used. Consider migrating to auto-assessment."`

**Migration path:**
1. Deploy with both modes supported
2. Update clients to use `action: 'submit'`
3. Monitor usage logs
4. Remove `action: 'grade'` support in v2.0 (3-6 months)

---

## Future Work: Advanced Learner Models

### Bayesian Knowledge Tracing (BKT)

**Why:** Estimates P(knows skill | observations) with latent variables:
- P(init): Prior knowledge
- P(learn): Learning rate
- P(guess): Correct by chance
- P(slip): Incorrect despite knowing

**Benefits:**
- Handles uncertainty (probabilistic)
- Models skill acquisition over time
- Generalizes to unseen items

**Implementation:** [Future epic: `EPIC_BKT_V1`]

### Additive Factors Model (AFM)

**Why:** Linear regression on skill-item interactions:
- Q-matrix: Skills required per item
- Beta weights: Learner proficiency per skill
- Opportunity counts: Practice effects

**Benefits:**
- Interpretable (skill diagnostics)
- Scales to large item banks
- Multi-skill items

**Implementation:** [Future epic: `EPIC_AFM_V1`]

### Deep Knowledge Tracing (DKT)

**Why:** RNN/LSTM on interaction sequences:
- Captures complex patterns (e.g., forgetting curves, spacing effects)
- No manual feature engineering
- State-of-the-art accuracy

**Challenges:**
- Requires large datasets (100k+ interactions)
- Black-box (hard to explain to learners)
- GPU infrastructure

**Implementation:** [Future epic: `EPIC_DKT_V1` - post-MVP]

---

## Production Deployment Checklist

- [ ] Feature flag: `ADAPTIVE_NO_SELF_GRADE=true` (default on for staging)
- [ ] Monitor latency distribution (P50, P95, P99)
- [ ] A/B test: Auto-assessment vs. self-grading (retention metrics)
- [ ] Collect learner feedback ("Did this feel fair?")
- [ ] Tune thresholds based on real data (current values are educated guesses)
- [ ] Add telemetry dashboard (adaptation events, difficulty transitions)

---

## References

1. [Corbett, A. T., & Anderson, J. R. (1994). Knowledge tracing: Modeling the acquisition of procedural knowledge.](https://dx.doi.org/10.1007/BF01099821)
2. [Cen, H., Koedinger, K., & Junker, B. (2006). Learning Factors Analysis – A General Method for Cognitive Model Evaluation and Improvement.](https://link.springer.com/chapter/10.1007/11774303_17)
3. [Piech, C., et al. (2015). Deep Knowledge Tracing.](https://arxiv.org/abs/1506.05908)
4. [Ebbinghaus, H. (1885). Memory: A contribution to experimental psychology.](https://psychclassics.yorku.ca/Ebbinghaus/memory.htm)

---

**Maintained by:** Engineering team  
**Last updated:** 2025-10-06  
**Next review:** Post-MVP (200+ sessions collected)

