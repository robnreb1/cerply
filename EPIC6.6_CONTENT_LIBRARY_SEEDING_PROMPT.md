# Epic 6.6: Content Library Seeding - Implementation Prompt

**Version:** 1.0  
**Date:** 2025-10-16  
**Status:** Ready for implementation  
**Owner:** Cerply Engineering (Agent to be assigned)

---

## Executive Summary

**Goal:** Build a content library of 400 high-quality topics (soft skills + financial services) using the 3-LLM ensemble generation pipeline (Epic 6).

**Strategy:** Phased approach
- **Phase 1:** Generate 20 topics for UAT validation (quality gates)
- **Phase 2:** Scale to 400 topics or $100 budget (whichever hits first)

**Why Phased:**
- Validate quality before mass generation
- Test cost assumptions (<$0.30/topic target)
- Ensure canon storage works at scale
- User approves content before large spend

**Timeline:** 12 hours (2 weeks)

---

## Problem Statement

### Current State

- Epic 6 (Ensemble Generation) provides the 3-LLM pipeline
- Epic 6.5 (Research Mode) enables topic-based content generation
- **Missing:** Batch processing infrastructure to generate content at scale

### Target State

- **400 topics** (or $100 spent) in canon storage
- Each topic: 4-6 modules, quality score >0.90, citation accuracy >95%
- Progress dashboard for monitoring
- Cost tracking and budget enforcement
- Automated quality validation

---

## Scope & Deliverables

### Phase 1: UAT Pilot (20 Topics) - 6 hours

**Goal:** Generate 20 topics, validate quality, get user approval before scaling.

**Deliverables:**

1. **CSV Upload System**
   - `POST /api/content/batch/upload` endpoint
   - Accept CSV format: `title, category, difficulty`
   - Example:
     ```csv
     title,category,difficulty
     Active Listening,Soft Skills,beginner
     Conflict Resolution,Soft Skills,intermediate
     Risk Management,Financial Services,advanced
     ```
   - Validate CSV structure
   - Return `batchId` for tracking

2. **Batch Queue System**
   - Queue 20 topics for generation
   - Process sequentially (not parallel) to avoid LLM rate limits
   - Status: `queued`, `generating`, `completed`, `failed`
   - Store in `batch_jobs` table

3. **Progress Dashboard**
   - `GET /api/content/batch/:batchId/progress`
   - Return:
     ```json
     {
       "batchId": "...",
       "phase": "uat",
       "totalTopics": 20,
       "completed": 15,
       "pending": 5,
       "failed": 0,
       "totalCost": 4.20,
       "avgCost": 0.28,
       "avgQuality": 0.93,
       "avgCitationAccuracy": 0.96
     }
     ```

4. **Quality Validation Pipeline**
   - After each topic generated, validate:
     - Quality score >0.90 (from Epic 6 quality evaluation)
     - Citation accuracy >95% (from fact-checker)
     - Cost per topic <$0.30 (target, not hard limit for UAT)
     - No ethical flags
   - Flag any topics that fail quality gates for manual review

5. **Manual UAT Approval Gate**
   - After 20 topics generated, pause
   - `POST /api/content/batch/:batchId/approve` - User approves quality
   - `POST /api/content/batch/:batchId/reject` - User rejects, provides feedback
   - Only proceed to Phase 2 after approval

### Phase 2: Scale Production (400 Topics or $100 Budget) - 6 hours

**Goal:** Generate full content library with budget enforcement.

**Deliverables:**

6. **Budget Enforcement**
   - Track cumulative cost across all generations
   - Stop generation if cost reaches $100 (hard ceiling)
   - Stop generation if 400 topics reached (success ceiling)
   - Alert if approaching limits (90% threshold)

7. **Canon Storage Integration**
   - After each topic generated, store in canon
   - Enable content reuse across learners
   - Track canon hit rate (reused vs fresh)

8. **Quality Monitoring**
   - Real-time alerts if:
     - Quality score drops below 0.90 for 3+ consecutive topics
     - Cost per topic exceeds $0.40 (33% over target)
     - Generation failure rate >10%
   - Dashboard shows quality trends over time

9. **Error Handling & Retry Logic**
   - If generation fails (LLM timeout, API error), retry 3x
   - If still fails, skip topic and log error
   - Continue with remaining topics (don't block entire batch)

10. **Batch Completion Report**
    - Generate summary report after batch completes:
      - Total topics generated
      - Total cost spent
      - Avg quality score
      - Avg citation accuracy
      - Avg cost per topic
      - Topics failed (with reasons)
      - Canon storage stats (hit rate)

---

## Technical Specification

### 1. Database Schema

**Migration: `022_batch_generation.sql`**

```sql
-- Batch jobs
CREATE TABLE IF NOT EXISTS batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id TEXT NOT NULL UNIQUE,
  phase TEXT NOT NULL CHECK (phase IN ('uat', 'production')),
  total_topics INTEGER NOT NULL,
  completed_topics INTEGER DEFAULT 0,
  failed_topics INTEGER DEFAULT 0,
  total_cost DECIMAL(10, 2) DEFAULT 0.00,
  avg_quality DECIMAL(3, 2),
  avg_citation_accuracy DECIMAL(3, 2),
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'paused', 'completed', 'failed')),
  approved_by TEXT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Batch topics (individual topics within a batch)
CREATE TABLE IF NOT EXISTS batch_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES batch_jobs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  status TEXT NOT NULL CHECK (status IN ('queued', 'generating', 'completed', 'failed')),
  topic_id TEXT, -- References topics table once generated
  cost DECIMAL(10, 2),
  quality_score DECIMAL(3, 2),
  citation_accuracy DECIMAL(3, 2),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_batch_topics_batch_id ON batch_topics(batch_id);
CREATE INDEX idx_batch_topics_status ON batch_topics(status);
```

### 2. Batch Generation Service

**File:** `api/src/services/batch-generation.ts`

**Key Methods:**
```typescript
class BatchGenerationService {
  // Upload CSV and create batch
  async createBatch(
    csvData: string,
    phase: 'uat' | 'production'
  ): Promise<{ batchId: string }>
  
  // Process batch (call from queue worker)
  async processBatch(batchId: string): Promise<void>
  
  // Generate single topic (calls Epic 6 ensemble)
  async generateTopic(
    title: string,
    category: string,
    difficulty: string
  ): Promise<TopicGenerationResult>
  
  // Validate quality gates
  async validateQuality(
    topicId: string
  ): Promise<{ passed: boolean; reasons: string[] }>
  
  // Get progress stats
  async getBatchProgress(batchId: string): Promise<BatchProgress>
  
  // Approve/reject UAT
  async approveBatch(batchId: string, userId: string): Promise<void>
  async rejectBatch(batchId: string, reason: string): Promise<void>
}
```

**Generation Logic:**
```typescript
async processBatch(batchId: string): Promise<void> {
  const batch = await db.select().from(batchJobs).where(eq(batchJobs.batchId, batchId)).limit(1);
  if (!batch[0]) throw new Error('Batch not found');
  
  // Get all queued topics
  const topics = await db.select().from(batchTopics)
    .where(and(
      eq(batchTopics.batchId, batch[0].id),
      eq(batchTopics.status, 'queued')
    ));
  
  for (const topic of topics) {
    // Check budget ceiling
    if (batch[0].totalCost >= 100) {
      console.log('[batch] Budget ceiling reached ($100), stopping');
      await this.pauseBatch(batchId, 'Budget ceiling reached');
      break;
    }
    
    // Check topic ceiling
    if (batch[0].completedTopics >= 400) {
      console.log('[batch] Topic ceiling reached (400), stopping');
      await this.completeBatch(batchId);
      break;
    }
    
    try {
      // Mark as generating
      await db.update(batchTopics)
        .set({ status: 'generating' })
        .where(eq(batchTopics.id, topic.id));
      
      // Call Epic 6 ensemble generation
      const result = await this.generateTopic(
        topic.title,
        topic.category,
        topic.difficulty
      );
      
      // Validate quality
      const qualityCheck = await this.validateQuality(result.topicId);
      if (!qualityCheck.passed) {
        console.warn('[batch] Quality validation failed:', qualityCheck.reasons);
        // Still mark as completed, but flag for review
      }
      
      // Update topic
      await db.update(batchTopics)
        .set({
          status: 'completed',
          topicId: result.topicId,
          cost: result.cost,
          qualityScore: result.qualityScore,
          citationAccuracy: result.citationAccuracy,
          completedAt: new Date(),
        })
        .where(eq(batchTopics.id, topic.id));
      
      // Update batch stats
      await db.update(batchJobs)
        .set({
          completedTopics: sql`${batchJobs.completedTopics} + 1`,
          totalCost: sql`${batchJobs.totalCost} + ${result.cost}`,
          updatedAt: new Date(),
        })
        .where(eq(batchJobs.id, batch[0].id));
      
    } catch (error: any) {
      console.error('[batch] Generation failed:', error);
      
      // Retry logic
      if (topic.retryCount < 3) {
        await db.update(batchTopics)
          .set({
            status: 'queued',
            retryCount: sql`${batchTopics.retryCount} + 1`,
            errorMessage: error.message,
          })
          .where(eq(batchTopics.id, topic.id));
      } else {
        // Max retries, mark as failed
        await db.update(batchTopics)
          .set({
            status: 'failed',
            errorMessage: error.message,
          })
          .where(eq(batchTopics.id, topic.id));
        
        await db.update(batchJobs)
          .set({
            failedTopics: sql`${batchJobs.failedTopics} + 1`,
          })
          .where(eq(batchJobs.id, batch[0].id));
      }
    }
  }
  
  // Check if batch is complete
  const remainingTopics = await db.select()
    .from(batchTopics)
    .where(and(
      eq(batchTopics.batchId, batch[0].id),
      or(
        eq(batchTopics.status, 'queued'),
        eq(batchTopics.status, 'generating')
      )
    ));
  
  if (remainingTopics.length === 0) {
    await this.completeBatch(batchId);
  }
}
```

### 3. API Routes

**File:** `api/src/routes/batch-content.ts`

```typescript
// Upload CSV and create batch
app.post(
  '/api/content/batch/upload',
  requireManager,
  async (req, reply) => {
    const { csvData, phase } = req.body;
    
    // Parse CSV
    const topics = parseCSV(csvData);
    
    // Create batch
    const batchService = new BatchGenerationService();
    const { batchId } = await batchService.createBatch(topics, phase);
    
    return reply.send({
      batchId,
      status: 'queued',
      totalTopics: topics.length,
      phase,
    });
  }
);

// Get batch progress
app.get(
  '/api/content/batch/:batchId/progress',
  requireManager,
  async (req, reply) => {
    const { batchId } = req.params;
    const batchService = new BatchGenerationService();
    const progress = await batchService.getBatchProgress(batchId);
    
    return reply.send(progress);
  }
);

// Approve UAT batch
app.post(
  '/api/content/batch/:batchId/approve',
  requireManager,
  async (req, reply) => {
    const { batchId } = req.params;
    const userId = req.user.id;
    
    const batchService = new BatchGenerationService();
    await batchService.approveBatch(batchId, userId);
    
    return reply.send({ success: true });
  }
);

// Reject UAT batch
app.post(
  '/api/content/batch/:batchId/reject',
  requireManager,
  async (req, reply) => {
    const { batchId } = req.params;
    const { reason } = req.body;
    
    const batchService = new BatchGenerationService();
    await batchService.rejectBatch(batchId, reason);
    
    return reply.send({ success: true });
  }
);
```

### 4. Quality Validation

**File:** `api/src/services/batch-quality.ts`

```typescript
async validateQuality(topicId: string): Promise<QualityValidationResult> {
  const topic = await db.select().from(topics).where(eq(topics.id, topicId)).limit(1);
  if (!topic[0]) throw new Error('Topic not found');
  
  const failures: string[] = [];
  
  // Check quality score
  if (topic[0].qualityScore < 0.90) {
    failures.push(`Quality score too low: ${topic[0].qualityScore} (target: >0.90)`);
  }
  
  // Check citation accuracy
  if (topic[0].citationAccuracy < 0.95) {
    failures.push(`Citation accuracy too low: ${topic[0].citationAccuracy} (target: >0.95)`);
  }
  
  // Check ethical flags
  if (topic[0].ethicalFlags && topic[0].ethicalFlags.length > 0) {
    failures.push(`Ethical flags detected: ${topic[0].ethicalFlags.join(', ')}`);
  }
  
  // Check modules generated
  const modules = await db.select().from(modulesV2).where(eq(modulesV2.topicId, topicId));
  if (modules.length < 4) {
    failures.push(`Insufficient modules: ${modules.length} (target: 4-6)`);
  }
  if (modules.length > 6) {
    failures.push(`Too many modules: ${modules.length} (target: 4-6)`);
  }
  
  return {
    passed: failures.length === 0,
    reasons: failures,
  };
}
```

---

## CSV Template

Provide this CSV template to users for uploading topics:

**File:** `topics_pilot.csv` (20 topics for UAT)

```csv
title,category,difficulty
Active Listening,Soft Skills,beginner
Conflict Resolution,Soft Skills,intermediate
Emotional Intelligence,Soft Skills,intermediate
Time Management,Soft Skills,beginner
Delegation Skills,Soft Skills,intermediate
Negotiation Techniques,Soft Skills,advanced
Presentation Skills,Soft Skills,intermediate
Team Building,Soft Skills,beginner
Critical Thinking,Soft Skills,advanced
Stress Management,Soft Skills,beginner
Risk Management,Financial Services,advanced
Financial Modeling,Financial Services,advanced
Portfolio Management,Financial Services,intermediate
Regulatory Compliance,Financial Services,intermediate
Anti-Money Laundering,Financial Services,advanced
Credit Risk Analysis,Financial Services,advanced
Derivatives Trading,Financial Services,advanced
Fixed Income Securities,Financial Services,intermediate
Corporate Finance,Financial Services,intermediate
Investment Banking,Financial Services,advanced
```

**File:** `topics_full.csv` (400 topics for production)

Generate a full 400-topic CSV with:
- 200 soft skills topics (communication, leadership, productivity, etc.)
- 200 financial services topics (risk, compliance, trading, analysis, etc.)

---

## Progress Dashboard UI (Optional)

**Manager UI:** `web/app/manager/content/batch/page.tsx`

Display:
- Batch list (all batches)
- Batch details (progress, cost, quality)
- Topic list (status, quality scores)
- Approve/reject buttons for UAT phase
- Real-time updates (poll every 5s)

**Wireframe:**
```
┌─────────────────────────────────────────────┐
│ Batch Content Generation                    │
│                                             │
│ Batch: UAT Pilot (20 topics)               │
│ Status: ⏳ Generating...                    │
│                                             │
│ Progress: [████████░░] 15/20 (75%)         │
│ Cost: $4.20 / $6.00 estimated              │
│ Avg Quality: 0.93 (target: >0.90) ✅       │
│ Avg Citations: 0.96 (target: >0.95) ✅     │
│                                             │
│ Topics:                                     │
│ ✅ Active Listening (0.95, $0.28)          │
│ ✅ Conflict Resolution (0.91, $0.26)       │
│ ⏳ Emotional Intelligence (generating...)   │
│ ⏸️ Time Management (queued)                │
│ ...                                         │
│                                             │
│ [Pause Batch] [Approve UAT] [Reject UAT]  │
└─────────────────────────────────────────────┘
```

---

## Testing Strategy

### Unit Tests (api/tests/batch-generation.test.ts)

1. **CSV Parsing**
   - Valid CSV → parse correctly
   - Invalid CSV (missing columns) → reject
   - Empty CSV → reject

2. **Batch Creation**
   - Create UAT batch (20 topics)
   - Create production batch (400 topics)
   - Validate batch_id uniqueness

3. **Quality Validation**
   - Topic with quality >0.90 → pass
   - Topic with quality <0.90 → fail
   - Topic with ethical flags → fail

4. **Budget Enforcement**
   - Cost reaches $100 → stop generation
   - Cost at $95 → alert but continue
   - 400 topics reached → stop generation

5. **Retry Logic**
   - Generation fails once → retry (queue)
   - Generation fails 3x → mark as failed

### Integration Tests

6. **End-to-End Batch**
   - Upload CSV → Create batch → Generate 5 topics → Validate quality
   - Assert: All 5 topics completed, quality >0.90

7. **UAT Approval Flow**
   - Generate 20 topics → Pause → Approve → Continue to Phase 2

8. **Budget Ceiling**
   - Start batch with $100 ceiling → Generate until $100 → Stop

### Manual Testing

9. **Generate 20 Topics (UAT)**
   - Upload `topics_pilot.csv`
   - Monitor progress dashboard
   - Validate quality of 3 random topics
   - Approve UAT

10. **Generate 400 Topics (Production)**
    - Upload `topics_full.csv`
    - Monitor cost tracking
    - Validate canon storage integration
    - Check final report

---

## Success Criteria

### Phase 1 (UAT Pilot)

- [ ] 20 topics generated successfully
- [ ] Avg quality score >0.90
- [ ] Avg citation accuracy >0.95
- [ ] Avg cost per topic <$0.30
- [ ] Zero ethical flags
- [ ] User approves quality

### Phase 2 (Production Scale)

- [ ] 400 topics generated OR $100 spent (whichever first)
- [ ] Budget enforcement works (stops at $100)
- [ ] Avg quality maintained >0.90
- [ ] Canon storage populated (>70% reuse rate after 100 topics)
- [ ] Zero critical failures (batch doesn't halt)

### Overall

- [ ] Batch completion report generated
- [ ] Quality trends visible in dashboard
- [ ] Cost per topic stays <$0.30 average
- [ ] Manager can pause/resume batches
- [ ] Retry logic handles transient failures

---

## Cost Analysis

### Assumptions

- Epic 6 3-LLM pipeline cost: ~$0.25-0.30 per topic
- Each topic: 4-6 modules
- Each module: 5-10 questions + guidance

### Budget Breakdown

**Phase 1 (20 topics):**
- Expected cost: 20 × $0.30 = $6.00
- Buffer (10%): $0.60
- Total budget: $6.60

**Phase 2 (400 topics):**
- Expected cost: 400 × $0.30 = $120.00
- Hard ceiling: $100.00
- **Result:** Will generate ~333 topics before hitting $100 ceiling

**Alternative:** If cost per topic is lower (e.g., $0.25):
- $100 / $0.25 = 400 topics ✅ (hits topic ceiling first)

### Monitoring

- Track actual cost per topic after 20 UAT topics
- Adjust Phase 2 expectations based on real data
- If cost >$0.35/topic, reduce Phase 2 target to ~285 topics

---

## Risk Mitigation

### Risk: LLM rate limits during batch

**Mitigation:**
- Process topics sequentially, not in parallel
- Add 2-second delay between generations
- Implement exponential backoff on 429 errors
- Retry 3x with increasing delays (5s, 10s, 20s)

### Risk: Quality drops midway through batch

**Mitigation:**
- Real-time quality monitoring
- Alert if 3+ consecutive topics fail quality gates
- Pause batch automatically, notify manager
- Manager reviews and decides to continue or abort

### Risk: Budget exceeded due to cost variance

**Mitigation:**
- Hard ceiling enforcement ($100 absolute max)
- Alert at 90% threshold ($90)
- Manager can lower ceiling via API if needed
- Track cost per topic trend, predict total before continuing

### Risk: Canon storage doesn't scale to 400 topics

**Mitigation:**
- Test canon with 50+ topics during UAT
- Monitor memory usage and performance
- Increase LRU cache size if needed (from 1000 to 2000)
- Consider Redis for production canon store

---

## Appendix: Parallel Execution with Epic 13

### Independence Validation

**Epic 6.6 (Content Generation)** and **Epic 13 (Agent Orchestrator)** are independent:

| Aspect | Epic 6.6 | Epic 13 |
|--------|----------|---------|
| **Code Layer** | Backend batch processing, queue workers | Conversational UI, intent routing |
| **Files** | `batch-generation.ts`, `batch-content.ts` | `agent-orchestrator.ts`, `agent-tools.ts` |
| **Database** | `batch_jobs`, `batch_topics` | `agent_conversations`, `agent_tool_calls` |
| **API Endpoints** | `/api/content/batch/*` | `/api/agent/*` |
| **Dependencies** | Epic 6 (ensemble generation) | Epic 8 + 9 (completed) |

**Conclusion:** These epics can run in parallel with different engineers.

---

## Questions for Implementation Agent

1. **CSV Format:** Should we support additional columns (e.g., `target_audience`, `learning_objectives`)? (Recommendation: Start simple, expand later)

2. **Parallel Generation:** Should we support parallel topic generation (e.g., 5 at a time) to speed up? (Recommendation: No for Phase 1, test in Phase 2 if needed)

3. **Canon Integration:** Should canon storage happen immediately after generation, or as a separate batch step? (Recommendation: Immediate, part of generation flow)

4. **UI Dashboard:** Should we build a full React dashboard, or use a simple progress API endpoint for CLI monitoring? (Recommendation: API first, UI optional)

5. **Batch Pausing:** Should managers be able to pause/resume batches mid-generation? (Recommendation: Yes, useful for quality review)

---

## Final Notes

This epic is **content-focused**, not conversational. It's about building a library of high-quality learning materials at scale. The phased approach (20 UAT → 400 production) ensures we validate assumptions before spending $100.

**Key Insight:** The $100 budget ceiling is a **safety net**, not a target. If we can generate 400 topics for $80, great! If we hit $100 at 333 topics, that's still a win.

**Go/No-Go Decision Point:** After Phase 1 (20 topics), review:
- Actual cost per topic (target: <$0.30)
- Quality scores (target: >0.90)
- User satisfaction with content

If any metric fails, pause and tune before Phase 2.

---

**Ready to implement?** This prompt contains everything needed to build Epic 6.6. Hand it to a new agent and they can execute autonomously. Return here with outcomes for integration with Epic 13.

---

**End of Implementation Prompt**

