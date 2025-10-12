# Content Lifecycle Management Specification

**Status:** 📋 Planned (Post Epic 6.5)  
**Epic:** TBD - Content Freshness & Comprehensive Generation  
**Budget Context:** $100 → ~400-500 comprehensive topics

## Overview

Once we have batch content generation capability, we need two key enhancements to maintain quality and maximize catalog value:

1. **Content Freshness & Revalidation**
2. **Comprehensive Topic Generation ("Zoom Out, Zoom In")**

---

## Requirement 1: Content Freshness & Revalidation

### Problem
Generated content can become outdated as:
- Regulations change (GDPR amendments, new compliance requirements)
- Technology evolves (new frameworks, deprecated APIs)
- Best practices shift (security standards, industry guidelines)

### Solution: Triggered Revalidation

**Revalidation Trigger:**
- Content is ≥ 3 months old (configurable threshold)
- AND content is actively used in lessons (not dormant content)

**Revalidation Process:**
1. Fact-checker model receives:
   - Original topic
   - Existing generated modules
   - Current date context
2. Fact-checker validates:
   - Are facts still accurate?
   - Have regulations changed?
   - Is technology still current?
   - Are there new best practices?
3. Output:
   - `status: "current" | "needs_update" | "deprecated"`
   - `changes_detected: string[]` (list of what changed)
   - `confidence: number`

**Cost Efficiency:**
- Revalidation only = ~$0.10 per topic (fact-checker only, no regeneration)
- Full regeneration only if `needs_update` or `deprecated`
- Dormant content never revalidated (cost savings)

### Database Schema Changes

```sql
-- Add to content_generations table
ALTER TABLE content_generations ADD COLUMN last_revalidated_at TIMESTAMPTZ;
ALTER TABLE content_generations ADD COLUMN revalidation_status TEXT; -- 'current', 'needs_update', 'deprecated'
ALTER TABLE content_generations ADD COLUMN revalidation_notes JSONB; -- {changes_detected: [...]}

-- New table for revalidation history
CREATE TABLE content_revalidations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID NOT NULL REFERENCES content_generations(id) ON DELETE CASCADE,
  triggered_by TEXT NOT NULL, -- 'age_threshold', 'manual', 'user_report'
  status TEXT NOT NULL, -- 'current', 'needs_update', 'deprecated'
  changes_detected JSONB,
  fact_checker_output JSONB,
  cost_usd NUMERIC(10,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### API Endpoints

```
GET  /api/content/freshness-check?age_days=90
  → Returns list of content needing revalidation

POST /api/content/revalidate/:generationId
  → Triggers revalidation for specific content

POST /api/content/bulk-revalidate
  Body: { generationIds: string[], priority: 'high' | 'low' }
  → Queue batch revalidation
```

### Configuration

```bash
# Content freshness settings
CONTENT_REVALIDATION_AGE_DAYS=90  # Default: 3 months
CONTENT_REVALIDATION_BATCH_SIZE=50
CONTENT_REVALIDATION_PRIORITY_THRESHOLD=100  # Revalidate if used >100 times
```

---

## Requirement 2: Comprehensive Topic Generation ("Zoom Out, Zoom In")

### Problem
Single-topic generation is inefficient:
- "Teach me async/await" → generates only async/await content
- User later requests "Teach me Promises" → separate generation
- These topics are closely related and should be generated together

### Solution: Comprehensive Generation with Contextual Zoom

**Strategy:**
1. **Zoom Out**: Identify broader topic context
2. **Generate Comprehensive**: Create full topic tree in one generation
3. **Zoom In**: Deliver lessons focused on specific request
4. **Cross-Reference**: Future requests check catalog before regenerating

### Example: "Teach me async/await"

**Zoom Out (Understanding Phase):**
```
User request: "Teach me async/await"

Understanding Model Response:
{
  "requestedTopic": "async/await",
  "comprehensiveScope": "Asynchronous JavaScript Programming",
  "topicTree": [
    "1. JavaScript Execution Model (Event Loop, Call Stack)",
    "2. Callbacks & Callback Hell",
    "3. Promises (foundation for async/await)",
    "4. Async/Await (requested focus)",
    "5. Error Handling in Async Code",
    "6. Practical Patterns & Common Pitfalls"
  ],
  "estimatedModules": 12-15,
  "primaryFocus": "4. Async/Await"
}
```

**Generate Comprehensive:**
- Generate ALL modules in one research pass
- Cost: ~$0.25-0.35 (vs $0.20 x 6 separate topics = $1.20)
- **Savings: ~70% cost reduction**

**Zoom In (Lesson Delivery):**
- User sees lessons 7-10 first (async/await focus)
- Related topics available: "Before this: Promises" / "After this: Error Handling"
- Progress naturally through comprehensive content

**Cross-Reference (Future Requests):**
```
User request: "Teach me Promises"

Understanding Model:
1. Check catalog: "Asynchronous JavaScript Programming" exists
2. Find relevant modules: 4-6 (Promises)
3. Response: "We already have this! Starting lessons..."
4. Cost: $0.003 (understanding only, no regeneration)
```

### Benefits

1. **Cost Efficiency**
   - 1 comprehensive generation vs 5-10 narrow generations
   - ~70-80% cost savings at scale

2. **Quality Improvement**
   - Better context and flow between topics
   - Consistent terminology and examples
   - Progressive complexity

3. **Catalog Growth**
   - $100 budget → 400-500 narrow topics OR 50-80 comprehensive topics
   - 50 comprehensive topics = ~500-800 modules = similar coverage at 1/5 the cost

4. **Future Query Speed**
   - Most requests hit existing catalog
   - Average cost drops from $0.20 to ~$0.01 (90%+ hit rate)

### Implementation Approach

**Phase 1: Understanding Model Enhancement**
```
RESEARCH_PROMPTS.understanding.user = `
The user wants to learn about: "{{TOPIC}}"

Your task:
1. Identify the REQUESTED TOPIC (what user explicitly asked for)
2. Identify the COMPREHENSIVE SCOPE (broader context this topic belongs to)
3. Create a TOPIC TREE covering the full scope (5-8 major concepts)
4. Mark which section(s) most directly address the user's request

Aim for comprehensive coverage that will serve multiple future queries.
Examples:
- "async/await" → Comprehensive: "Asynchronous JavaScript"
- "complex numbers" → Comprehensive: "Numbers in Mathematics" (reals, integers, rationals, complex, quaternions)
- "GDPR compliance" → Comprehensive: "Data Protection & Privacy Law"

Output format:
{
  "requestedTopic": "...",
  "comprehensiveScope": "...",
  "topicTree": [...],
  "primaryFocusIndices": [3, 4],
  "estimatedModules": 12
}
`
```

**Phase 2: Catalog Search**
```typescript
// Before generating, check if comprehensive topic exists
async function checkCatalogForTopic(topic: string): Promise<ExistingContent | null> {
  // Semantic search in content_generations
  // Look for similar comprehensive_scope or modules covering this topic
  // Return existing content if confidence > 0.8
}
```

**Phase 3: Lesson Prioritization**
```typescript
// Deliver lessons in order of relevance to original request
{
  "lessonsStartWith": ["module-7", "module-8", "module-9"], // Primary focus
  "lessonsAvailable": ["module-1", ..., "module-15"],       // Full comprehensive content
  "suggestedSequence": "primary → prerequisites → extensions"
}
```

### Database Schema Changes

```sql
-- Add to content_generations
ALTER TABLE content_generations ADD COLUMN requested_topic TEXT;
ALTER TABLE content_generations ADD COLUMN comprehensive_scope TEXT;
ALTER TABLE content_generations ADD COLUMN topic_tree JSONB;
ALTER TABLE content_generations ADD COLUMN primary_focus_indices INTEGER[];

-- Index for semantic search
CREATE INDEX idx_content_generations_scope ON content_generations USING gin(to_tsvector('english', comprehensive_scope));
```

---

## Implementation Timeline

### Now (Epic 6.5)
✅ Single-topic research mode working
✅ Cost tracking: ~$0.20 per topic

### Next (Epic 6.6 - Batch Generation)
- Batch processing for multiple topics
- Queue management
- Progress tracking UI

### Then (Epic 6.7 - Content Lifecycle)
- Comprehensive topic generation ("zoom out, zoom in")
- Catalog search before generation
- Content freshness & revalidation

### Finally (Epic 6.8 - Optimization)
- Semantic catalog search
- Automatic topic clustering
- Cost analytics dashboard

---

## Success Metrics

### Freshness
- Revalidation triggered: >80% of active content checked within age threshold
- Update rate: <20% of revalidations require full regeneration
- Cost: <$0.10 per revalidation

### Comprehensive Generation
- Catalog hit rate: >70% of queries answered from existing content
- Cost savings: >60% reduction vs narrow topics
- User satisfaction: Comprehensive flow improves completion rates

### Overall
- **$100 → 400-500 topics** (narrow) OR **50-80 comprehensive topics** (500-800 modules)
- Average cost per query: $0.20 → $0.01 (95% reduction after catalog builds)
- Content freshness: 100% of active content < 3 months old

---

## Notes

- These features are post-Epic 6.5 and require batch generation infrastructure
- Prioritize comprehensive generation over freshness (better ROI)
- Consider user feedback loop: "Was this content helpful?" → triggers manual revalidation if many "no" responses

