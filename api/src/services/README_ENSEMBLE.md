# Content Generation Services

## ⚠️ CRITICAL: Unified Ensemble Architecture

**DO NOT create separate content generators for different features.**

Cerply uses a **single, unified ensemble engine** for ALL content generation:

```
┌──────────────────────────────────────────────┐
│         Any Content Generation Need          │
│  (Manager modules, Learner content, etc.)    │
└─────────────────┬────────────────────────────┘
                  │
                  ▼
          ┌───────────────┐
          │  ALWAYS CALL  │
          │  phd-ensemble │
          └───────────────┘
```

---

## The ONE Engine: `phd-ensemble.ts`

**Location:** `api/src/services/phd-ensemble.ts`

**Function:** `generateWithPHDEnsemble(topicTitle, subject, category)`

**Architecture:** TRUE Parallel Ensemble
- Model 1 (GPT-5/o3) generates Paper A
- Model 2 (Claude Opus 4) generates Paper B
- Both run **in parallel** (independently)
- Model 3 (GPT-4o) fact-checks both, consolidates best-of-breed

---

## Current Integration Points

### 1. Manager Module Creation ✅
**Location:** `module-creation-agent.ts` → `enrichContentBlocks()`

```typescript
const ensembleResult = await generateWithPHDEnsemble(
  topic,
  `Create training content on ${topic} suitable for workplace learning`,
  'general'
);

// Use best-of-breed sections
for (const section of ensembleResult.finalSections) {
  contentBlock.content = section.content.substring(0, 500) + '...';
}
```

### 2. Learner Content Generation 🔜
**Location:** TBD - will be connected when de-stubbed

**Planned Flow:**
```typescript
// In content-generator.ts or similar
const ensembleResult = await generateWithPHDEnsemble(
  learnerTopic,
  learnerSubject,
  detectedCategory
);

// Transform ensemble output to learner format
const learningItems = transformToLearningItems(ensembleResult);
```

### 3. Content Refresh 🔜
**Location:** TBD - future epic

**Planned Flow:**
```typescript
// Background job
const newContent = await generateWithPHDEnsemble(
  existingContent.title,
  existingContent.subject,
  existingContent.category
);

// Model 3 compares old vs new
const updates = compareAndSuggestUpdates(existingContent, newContent);
```

---

## Integration Checklist

When adding a new feature that needs content generation:

- [ ] **DO** call `generateWithPHDEnsemble()` from `phd-ensemble.ts`
- [ ] **DO** pass appropriate `category` for domain optimizations
- [ ] **DO** handle errors gracefully (ensemble can be expensive/slow)
- [ ] **DO** log the call for cost tracking
- [ ] **DO** cache results where appropriate
- [ ] **DON'T** create a new content generator
- [ ] **DON'T** bypass the ensemble with single-model calls
- [ ] **DON'T** modify ensemble without updating all integration points

---

## Quality Standards

The ensemble guarantees:
- ✅ Frontier-level quality (GPT-5, Claude Opus 4, GPT-4o)
- ✅ Fact-checked content (Model 3 verifies all claims)
- ✅ Best-of-breed output (combines strengths of both models)
- ✅ 30+ authoritative citations
- ✅ Real-world examples and code samples
- ✅ Accessible language (no jargon)

---

## Required Configuration

```env
# In .env.local
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...

# Model selection (optional, defaults shown)
LLM_PHD_MODEL_1=gpt-5
LLM_PHD_MODEL_1_FALLBACK=o3
LLM_PHD_MODEL_2=claude-opus-4
LLM_PHD_MODEL_3=gpt-4o
```

---

## Performance

- **Cost:** ~$0.65-1.10 per comprehensive topic
- **Time:** ~35-70 seconds (parallel execution)
- **Output:** 6,000-10,000 words, 5-7 sections, 40-80 citations

---

## Documentation

📖 **Complete Architecture:** `docs/ARCHITECTURE_ENSEMBLE.md`

Read this document for:
- Detailed architecture diagrams
- Integration patterns
- Best practices
- Monitoring & debugging
- Future enhancements

---

## Questions?

**Before creating a new content generator, ask:**
1. Can I use `generateWithPHDEnsemble()` for this?
2. What transformation do I need to apply to ensemble output?
3. How do I integrate with the existing ensemble?

**Answer:** Almost always YES to #1. Focus on #2 and #3.

---

## Summary

**One Engine. Multiple Entry Points. Consistent Quality.**

Every content generation need should route through the PhD ensemble. This ensures quality, maintainability, and shared improvements across all features.

