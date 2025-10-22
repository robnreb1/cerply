# Cerply Ensemble Architecture

## Overview

Cerply uses a **single, unified ensemble engine** for all content generation across the platform. This document describes the architecture and explains how different user interactions leverage the same underlying engine.

---

## Core Principle: One Engine, Multiple Entry Points

**Key Concept:** We do NOT build separate content generation engines for different features. Instead, we have ONE high-quality ensemble that serves all use cases:

- ✅ Manager module creation
- ✅ Learner content generation
- ✅ Content refresh/updates (future)
- ✅ Any future content generation needs

This approach ensures:
- **Consistent quality** across all user experiences
- **Single codebase** to maintain and improve
- **Shared improvements** benefit all features simultaneously
- **Cost efficiency** through shared infrastructure

---

## The Ensemble Engine

### Location
`api/src/services/phd-ensemble.ts`

### Architecture: TRUE Parallel Ensemble

The ensemble uses a **three-model pipeline** where Models 1 & 2 work **independently and in parallel**, then Model 3 consolidates:

```
┌─────────────────────────────────────────────────────────┐
│                    CONTENT REQUEST                       │
│  (Manager creates module, Learner generates content)    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  PhD Ensemble Service  │
         │  (phd-ensemble.ts)     │
         └───────────┬────────────┘
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
    ┌─────────┐           ┌─────────┐
    │ Model 1 │           │ Model 2 │
    │ GPT-5   │ PARALLEL  │ Claude  │
    │  (o3)   │ ◄────────►│ Opus 4  │
    └────┬────┘           └────┬────┘
         │                     │
         │   Paper A           │   Paper B
         │                     │
         └──────────┬──────────┘
                    │
                    ▼
              ┌──────────┐
              │ Model 3  │
              │  GPT-4o  │
              │          │
              │ Fact-    │
              │ Check &  │
              │ Consoli- │
              │ date     │
              └────┬─────┘
                   │
                   ▼
         ┌─────────────────┐
         │  Best-of-Breed  │
         │     Content     │
         └─────────────────┘
```

### Three-Model Pipeline

#### **Step 1 & 2: Parallel Generation**

**Model 1 (GPT-5 / o3 fallback)**
- Generates comprehensive research paper A
- Includes: sections, citations, code examples, diagrams
- Works **independently** (does NOT see Model 2's output)
- Optimized for: technical depth, code examples

**Model 2 (Claude Opus 4)**
- Generates comprehensive research paper B
- Includes: sections, citations, practical examples
- Works **independently** (does NOT see Model 1's output)
- Optimized for: pedagogical clarity, accessibility

**Key:** Both models run **in parallel** using `Promise.all()`. They never see each other's work.

#### **Step 3: Consolidation**

**Model 3 (GPT-4o)**
- Receives BOTH Paper A and Paper B
- Fact-checks every claim in both papers
- Compares section by section
- Chooses best content from each paper
- Creates best-of-breed consolidated output

**Decision Making:**
- "Use Model 1's section" (better technical depth)
- "Use Model 2's section" (clearer explanations)
- "Merge both sections" (complementary strengths)

**Outputs:**
- Accuracy scores for each model
- Flagged issues per model
- Section-by-section source decisions with reasoning
- Final consolidated content
- Deduped citations

---

## Integration Points

### 1. Manager Module Creation

**User Flow:**
1. Manager has conversational interaction via AI agent
2. Agent generates module preview with content blocks
3. For AI-generated text blocks, `enrichContentBlocks()` is called
4. Calls `generateWithPHDEnsemble(topic, subject, 'general')`
5. Ensemble returns comprehensive content
6. Content truncated to 500 chars for preview display
7. Full content stored in database when module is created

**Code Location:**
- Entry point: `api/src/routes/manager-modules.ts` → `/api/curator/modules/conversation`
- Agent: `api/src/services/module-creation-agent.ts` → `enrichContentBlocks()`
- Ensemble: `api/src/services/phd-ensemble.ts` → `generateWithPHDEnsemble()`

**Example:**
```typescript
// Manager agent calls ensemble
const ensembleResult = await generateWithPHDEnsemble(
  'FX Trading in Volatile Markets',
  'Create training content on FX trading suitable for workplace learning',
  'general'
);

// Use best-of-breed sections to enrich content blocks
for (const section of ensembleResult.finalSections) {
  contentBlock.content = section.content.substring(0, 500) + '...';
}
```

### 2. Learner Content Generation

**User Flow:**
1. Learner submits topic or uploads content
2. System calls `/api/ingest/generate` or `/api/items/generate`
3. Content generation service calls ensemble
4. Ensemble returns structured learning content
5. Content formatted into explanations, questions, assessments

**Code Location (when de-stubbed):**
- Entry point: `api/src/routes/ingest.ts` → `/api/ingest/generate`
- Generator: `api/src/services/content-generator.ts` (to be updated)
- Ensemble: `api/src/services/phd-ensemble.ts` → `generateWithPHDEnsemble()`

**Status:** Currently stubbed; will be connected to ensemble in future epic

### 3. Content Refresh (Future)

**Planned Flow:**
1. Background job checks content age
2. For outdated content, calls ensemble with refresh mode
3. Model 3 compares existing content vs. new generated content
4. Flags what's outdated and suggests updates
5. Manager reviews and approves changes

**Architecture:**
- Use same `generateWithPHDEnsemble()` function
- Model 3 role expands: "compare old vs new content"
- Additional prompt: "identify what changed in the field"

---

## API Configuration

### Environment Variables

```env
# Model 1: OpenAI (Primary + Fallback)
LLM_PHD_MODEL_1=gpt-5
LLM_PHD_MODEL_1_FALLBACK=o3

# Model 2: Anthropic
LLM_PHD_MODEL_2=claude-opus-4

# Model 3: OpenAI Consolidation
LLM_PHD_MODEL_3=gpt-4o

# Required API Keys
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
```

### Ensemble Function Signature

```typescript
export async function generateWithPHDEnsemble(
  topicTitle: string,
  subject: string,
  category?: 'python_coding' | 'enterprise_architecture' | 'tech_startup_uk' | 'general'
): Promise<PHDEnsembleResult>
```

**Parameters:**
- `topicTitle`: Short title (e.g., "FX Trading in Volatile Markets")
- `subject`: Detailed description of what to generate
- `category`: Optional domain-specific optimizations

**Returns:**
```typescript
{
  model1Output: ResearchPaperOutput;        // Paper A
  model2Output: ResearchPaperOutput;        // Paper B
  consolidationOutput: ConsolidationOutput; // Model 3's analysis
  finalSections: ContentSection[];          // Best-of-breed result
  suggestedModules: SuggestedModule[];      // Learning modules
  citations: Citation[];                    // Deduped citations
  consolidationNotes: string[];             // What Model 3 did
  totalCost: number;                        // USD
  totalTime: number;                        // milliseconds
}
```

---

## Quality Standards

The ensemble is designed to produce **frontier-level quality**:

### Content Standards
- ✅ Encyclopedia-level depth
- ✅ Accessible language (NO academic jargon)
- ✅ Every claim cited from authoritative sources
- ✅ 30+ authoritative citations minimum
- ✅ Real-world examples and applications
- ✅ Code examples for technical topics
- ✅ Diagrams (Mermaid syntax)
- ✅ Formulas with explanations

### Fact-Checking Standards
- ✅ Every statistical claim verified
- ✅ Every date and name checked
- ✅ Citations matched to claims
- ✅ Hallucinations flagged
- ✅ Outdated information identified
- ✅ 95%+ accuracy target

### Best-of-Breed Selection
- ✅ Section-by-section comparison
- ✅ Explicit reasoning for choices
- ✅ Transparent decision-making
- ✅ Complementary content merged

---

## Performance Characteristics

### Cost
- Model 1 (GPT-5): ~$0.30-0.50 per generation
- Model 2 (Claude Opus 4): ~$0.20-0.35 per generation
- Model 3 (GPT-4o): ~$0.15-0.25 per consolidation
- **Total: ~$0.65-1.10 per topic** (comprehensive content)

### Time
- Models 1 & 2 (parallel): ~20-40 seconds each
- Model 3 (consolidation): ~15-30 seconds
- **Total: ~35-70 seconds** (end-to-end)

### Output Size
- Model 1: 4,000-6,000 words
- Model 2: 4,000-6,000 words
- Final: 6,000-10,000 words (best-of-breed)
- Citations: 40-80 (deduped)
- Sections: 5-7 major sections

---

## Development Guidelines

### DO ✅
- **Use the ensemble** for any content generation needs
- **Call `generateWithPHDEnsemble()`** from any service
- **Pass category** when known for domain optimizations
- **Handle errors gracefully** (ensemble can be expensive)
- **Cache results** where appropriate
- **Log ensemble calls** for cost tracking

### DON'T ❌
- **Don't create separate generators** for different features
- **Don't bypass the ensemble** with single-model calls
- **Don't modify ensemble logic** without updating all integration points
- **Don't skip Model 3** consolidation (quality relies on it)
- **Don't run in production** without both API keys

---

## Future Enhancements

### Planned Improvements
1. **Content Refresh Mode**
   - Model 3 compares old content vs. new generated content
   - Identifies what's outdated
   - Suggests specific updates

2. **Proprietary Content Integration**
   - Upload manager's company docs
   - Model 1 & 2 incorporate proprietary content
   - Model 3 ensures it's ring-fenced appropriately

3. **Multi-Language Support**
   - Generate content in multiple languages
   - Maintain quality across translations

4. **Domain-Specific Tuning**
   - Fine-tune prompts per category
   - Add more categories beyond current 4

5. **Incremental Updates**
   - Update specific sections without regenerating everything
   - Model 3 validates consistency

---

## Monitoring & Debugging

### Log Patterns

```
[PHD-Ensemble] Starting TRUE PARALLEL generation for: [topic]
[PHD-Ensemble] Model 1: gpt-5, Model 2: claude-opus-4, Model 3: gpt-4o
[PHD-Ensemble] Running Model 1 & Model 2 in PARALLEL...
[PHD-MODEL1] Generating with gpt-5...
[PHD-MODEL2] Generating with claude-opus-4...
[PHD-Ensemble] Model 1 generated 6 sections, 4500 words
[PHD-Ensemble] Model 2 generated 7 sections, 5200 words
[PHD-CONSOLIDATE] Fact-checking and consolidating with gpt-4o...
[PHD-Ensemble] ✅ Completed in 45.2s for $0.87
[PHD-Ensemble] Model 1 accuracy: 0.96
[PHD-Ensemble] Model 2 accuracy: 0.94
[PHD-Ensemble] Final: 6 sections, 8500 words
```

### Key Metrics to Track
- **Success rate** (% of successful generations)
- **Average cost** per generation
- **Average time** per generation
- **Accuracy scores** (Model 1 vs Model 2)
- **Section source distribution** (which model wins?)
- **API errors** (by model)

### Common Issues

**Issue:** "ANTHROPIC_API_KEY not configured"
- **Solution:** Add key to `.env.local`
- **Fallback:** Content enrichment skipped, uses basic descriptions

**Issue:** "Model 1 failed, retrying with fallback"
- **Solution:** Automatic fallback to o3
- **Impact:** Slightly lower quality, but still good

**Issue:** "Consolidation returned invalid JSON"
- **Solution:** Retry or use longer timeout
- **Prevention:** Validate Model 3 prompts

---

## Testing

### Unit Tests
```bash
# Test ensemble function
npm test -- phd-ensemble.test.ts
```

### Integration Tests
```bash
# Test manager module content enrichment
npm test -- manager-modules.test.ts

# Test learner content generation (when implemented)
npm test -- content-generator.test.ts
```

### Manual Testing
1. Create a manager module via conversational UI
2. Watch console logs for ensemble execution
3. Expand content blocks to verify real content
4. Check citations and quality

---

## Summary

**One Engine. Multiple Entry Points. Consistent Quality.**

The Cerply ensemble architecture ensures that whether content is generated for managers, learners, or future features, it's always backed by the same high-quality, fact-checked, best-of-breed process. This unified approach makes the system easier to maintain, improves quality across the board, and ensures that improvements benefit all users simultaneously.

