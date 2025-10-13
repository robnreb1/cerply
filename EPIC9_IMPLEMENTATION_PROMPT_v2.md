# Epic 9: True Adaptive Difficulty Engine — Implementation Prompt v2.0

**Date Created:** 2025-10-13  
**Status:** READY TO START  
**Estimated Effort:** 13 hours  
**Priority:** P1 (Core Learning Science)  
**Prerequisites:** ✅ Epic 7 (Gamification), ✅ Epic 8 (Conversational UI & Confusion Tracking), ✅ P0 (Content Hierarchy)

---

## 🔒 STATUTORY REQUIREMENTS (MUST READ FIRST)

Before writing ANY code, you MUST read these documents in order:

### 1. Master Governance Documents (MANDATORY)
- **`docs/EPIC_MASTER_PLAN.md`** v1.3 - Epic 9 scope, dependencies, acceptance criteria
- **`docs/ARCHITECTURE_DECISIONS.md`** v1.2 - Immutable architectural patterns
- **`docs/functional-spec.md`** §30 - Epic 9 technical specification
- **`docs/brd/cerply-brd.md`** L-2 - Adaptive lesson plans requirement

### 2. Epic 9 Specific Documentation
- **`EPIC9_IMPLEMENTATION_PROMPT.md`** - Original specification (v1.0, pre-governance)
- **`docs/spec/flags.md`** - Feature flag conventions
- **`docs/AGENT_WORKFLOW.md`** - Development workflow requirements

### 3. Dependencies (COMPLETED - Your Foundation)
- **Epic 7 (`docs/functional-spec.md` §28):** Gamification system provides `learner_levels` table, `countCorrectAttempts()` service
- **Epic 8 (`docs/functional-spec.md` §29):** Provides `confusion_log` table, intent router, free-text validation, partial credit scoring
- **P0 Content Hierarchy (`docs/functional-spec.md` §31):** New 5-tier structure (Subject > Topic > Module > Quiz > Question)

---

## 📊 Epic 9 Status & Context

### Current Platform Status (as of 2025-10-13)

| Component | Status | Relevance to Epic 9 |
|-----------|--------|---------------------|
| **Epic 7: Gamification** | ✅ COMPLETE | Provides learner progression data |
| **Epic 8: Conversational UI** | ✅ COMPLETE | Provides confusion tracking signals |
| **P0: Content Hierarchy** | ✅ COMPLETE | New schema requires adaptation |
| **Database:** | ✅ PRODUCTION | Staging + production both migrated |
| **`confusion_log` table** | ✅ AVAILABLE | Epic 8 confusion tracking active |
| **Partial credit scoring** | ✅ AVAILABLE | Epic 8 free-text validation |
| **`learner_profiles` table** | ❌ NOT EXISTS | You will create this |
| **`topic_comprehension` table** | ❌ NOT EXISTS | You will create this |

---

## 🎯 Epic 9 Requirements Summary

### Business Goal (from BRD L-2)
> "Adaptive lesson plans that dynamically adjust difficulty based on learner performance"

### What You're Building

**Adaptive Difficulty Engine** that:
1. **Tracks performance signals** - Correctness, latency, confusion, partial credit
2. **Calculates mastery** - Per-topic comprehension scores (0.0 - 1.0)
3. **Detects learning styles** - Visual/verbal/kinesthetic preferences
4. **Adjusts difficulty** - 4 levels (Recall → Application → Analysis → Synthesis)
5. **Identifies weaknesses** - Topics with comprehension < 0.70

### 4 Difficulty Levels (Bloom's Taxonomy)

| Level | Description | Example Question | Target Mastery |
|-------|-------------|------------------|----------------|
| **Recall** | Remember facts | "What does API stand for?" | < 0.50 mastery |
| **Application** | Apply concepts | "How would you use an API to fetch data?" | 0.50 - 0.75 mastery |
| **Analysis** | Break down problems | "Why might this API call fail?" | 0.75 - 0.90 mastery |
| **Synthesis** | Create new solutions | "Design an API for X use case" | > 0.90 mastery |

---

## 📋 Implementation Plan (13 hours)

### Phase 1: Database Schema (2h)
**Deliverable:** Migration `018_adaptive_difficulty.sql`

**Tables to Create:**
1. **`learner_profiles`**
   ```sql
   CREATE TABLE learner_profiles (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     learning_style TEXT, -- 'visual' | 'verbal' | 'kinesthetic' | 'unknown'
     avg_response_time DECIMAL(10,2), -- milliseconds
     consistency_score DECIMAL(3,2), -- 0.00 - 1.00
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW(),
     UNIQUE(user_id)
   );
   ```

2. **`topic_comprehension`**
   ```sql
   CREATE TABLE topic_comprehension (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
     mastery_level DECIMAL(3,2) NOT NULL DEFAULT 0.00, -- 0.00 - 1.00
     difficulty_level TEXT NOT NULL DEFAULT 'recall', -- 'recall' | 'application' | 'analysis' | 'synthesis'
     attempts_count INTEGER DEFAULT 0,
     correct_count INTEGER DEFAULT 0,
     partial_credit_sum DECIMAL(10,2) DEFAULT 0.00,
     confusion_count INTEGER DEFAULT 0,
     last_practiced_at TIMESTAMPTZ,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW(),
     UNIQUE(user_id, topic_id)
   );
   CREATE INDEX idx_topic_comprehension_user ON topic_comprehension(user_id);
   CREATE INDEX idx_topic_comprehension_topic ON topic_comprehension(topic_id);
   CREATE INDEX idx_topic_comprehension_mastery ON topic_comprehension(mastery_level);
   ```

3. **Extend `attempts` table** (if not already done by Epic 8):
   ```sql
   ALTER TABLE attempts ADD COLUMN IF NOT EXISTS response_time_ms INTEGER;
   ALTER TABLE attempts ADD COLUMN IF NOT EXISTS difficulty_level TEXT;
   ```

**Acceptance:**
- [x] Migration runs cleanly on both PostgreSQL and SQLite
- [x] Migration includes Epic/BRD/FSD header comment
- [x] All foreign keys use proper types (TEXT for user_id, UUID for topic_id)
- [x] Indexes created for query optimization
- [x] Updated `api/src/db/schema.ts` with Drizzle definitions

---

### Phase 2: Adaptive Service Core (3h)
**Deliverable:** `api/src/services/adaptive.ts`

**Key Functions:**

1. **`calculateMasteryLevel(userId, topicId)`**
   - Fetches all attempts for user+topic
   - Calculates weighted mastery:
     - Recent attempts weighted more (time decay)
     - Correctness: 0.4 weight
     - Partial credit: 0.3 weight
     - Confusion (inverse): 0.2 weight
     - Response time (normalized): 0.1 weight
   - Returns mastery score 0.00 - 1.00

2. **`recommendDifficultyLevel(userId, topicId)`**
   - Gets current mastery level
   - Maps to difficulty:
     - < 0.50 → "recall"
     - 0.50 - 0.75 → "application"
     - 0.75 - 0.90 → "analysis"
     - > 0.90 → "synthesis"
   - Considers recent performance trend (3-attempt window)
   - Returns `{ difficulty, confidence, reasoning }`

3. **`detectLearningStyle(userId)`**
   - Analyzes attempt patterns:
     - High confusion on text → "visual" learner
     - High confusion on diagrams → "verbal" learner
     - Consistent performance → "balanced"
   - Uses confusion_log queries + attempt metadata
   - Returns `{ style, confidence, signals }`

4. **`identifyWeakTopics(userId, threshold = 0.70)`**
   - Queries topic_comprehension for mastery < threshold
   - Sorts by: (1) attempts_count DESC, (2) mastery_level ASC
   - Returns array of `{ topicId, topicTitle, mastery, attempts }`

5. **`updateLearnerProfile(userId, signals)`**
   - Updates `learner_profiles` with:
     - New learning style detection results
     - Updated avg_response_time (rolling average)
     - Consistency score (std dev of recent attempts)
   - Called after every N attempts (e.g., every 5)

6. **`recordAttemptForAdaptive(userId, topicId, attemptData)`**
   - Upserts `topic_comprehension` row
   - Recalculates mastery_level
   - Updates difficulty_level if mastery crosses thresholds
   - Increments counters (attempts_count, correct_count, etc.)

**Acceptance:**
- [x] All functions have JSDoc comments
- [x] Unit tests cover happy path + edge cases (20 tests minimum)
- [x] Error handling for missing data
- [x] Performance < 100ms for mastery calculations
- [x] TypeScript strict mode compliance

---

### Phase 3: API Routes (2h)
**Deliverable:** `api/src/routes/adaptive.ts`

**Endpoints:**

1. **`GET /api/adaptive/profile/:userId`**
   - Feature flag: `FF_ADAPTIVE_DIFFICULTY_V1`
   - RBAC: `requireAnyRole(['admin', 'manager', 'learner'])` + self-check
   - Returns learner profile + weak topics
   - Response:
     ```json
     {
       "profile": {
         "userId": "...",
         "learningStyle": "visual",
         "avgResponseTime": 3500,
         "consistencyScore": 0.82
       },
       "weakTopics": [
         { "topicId": "...", "title": "...", "mastery": 0.45, "attempts": 12 }
       ]
     }
     ```

2. **`GET /api/adaptive/topics/:topicId/difficulty/:userId`**
   - Feature flag: `FF_ADAPTIVE_DIFFICULTY_V1`
   - RBAC: `requireAnyRole(['admin', 'manager', 'learner'])` + self-check
   - Returns recommended difficulty for next question
   - Response:
     ```json
     {
       "difficulty": "application",
       "masteryLevel": 0.68,
       "confidence": 0.92,
       "reasoning": "Consistent performance on recall, ready for application"
     }
     ```

3. **`POST /api/adaptive/attempt`**
   - Feature flag: `FF_ADAPTIVE_DIFFICULTY_V1`
   - RBAC: `requireLearner()`
   - Records attempt + updates adaptive data
   - Body:
     ```json
     {
       "userId": "...",
       "topicId": "...",
       "questionId": "...",
       "correct": true,
       "partialCredit": 0.85,
       "responseTimeMs": 4200,
       "difficultyLevel": "application"
     }
     ```
   - Response: `{ success: true, newMastery: 0.72 }`

4. **`GET /api/adaptive/analytics/:userId`**
   - Feature flag: `FF_ADAPTIVE_DIFFICULTY_V1`
   - RBAC: `requireAnyRole(['admin', 'manager'])` OR self (learner)
   - Returns adaptive learning analytics dashboard data
   - Response:
     ```json
     {
       "overallMastery": 0.68,
       "topicBreakdown": [...],
       "learningStyle": "visual",
       "strengthTopics": [...],
       "weakTopics": [...]
     }
     ```

**Acceptance:**
- [x] All routes return error envelope `{ error: { code, message } }` on failure
- [x] Feature flags gated correctly
- [x] RBAC middleware enforced (no admin bypass in production)
- [x] Session management via `getSession(req)`
- [x] Input validation (UUID formats, numeric ranges)
- [x] Smoke tests: `api/scripts/smoke-adaptive.sh`

---

### Phase 4: Integration with Existing Systems (3h)

**4.1: Update Learn Routes** (`api/src/routes/learn.ts`)
- Modify `POST /api/learn/submit` to call `recordAttemptForAdaptive()`
- Add difficulty level to attempt metadata
- Ensure Epic 8's partial credit is passed through

**4.2: Update Daily Question Selector** (`api/src/services/delivery.ts`)
- Current: Uses spaced repetition only
- New: Add difficulty-based filtering
  - Get user's mastery per topic
  - Select questions matching recommended difficulty
  - Fall back to spaced repetition if no adaptive match

**4.3: Conversational Intent Router** (`api/src/services/intent-router.ts`)
- Epic 8 already has "progress" intent
- Enhance to return adaptive insights:
  - "How am I doing?" → Include weak topics
  - "What's hard for me?" → Return low-mastery topics
  - "Show my progress" → Mastery level chart data

**Acceptance:**
- [x] Existing learn flow works with adaptive tracking
- [x] No breaking changes to Epic 7 or Epic 8 functionality
- [x] Adaptive data flows through submission → gamification → analytics
- [x] Intent router provides adaptive responses

---

### Phase 5: Learning Style Detection Logic (2h)
**Deliverable:** Enhanced `detectLearningStyle()` in `adaptive.ts`

**Detection Algorithm:**

1. **Confusion Pattern Analysis**
   ```typescript
   // Query confusion_log for patterns
   const confusionByType = await db
     .select({ type: questions.type, count: sql<number>`count(*)` })
     .from(confusionLog)
     .innerJoin(questions, eq(confusionLog.questionId, questions.id))
     .where(eq(confusionLog.userId, userId))
     .groupBy(questions.type);
   
   // Visual learners: struggle with text-heavy questions
   // Verbal learners: struggle with diagram questions
   // Kinesthetic learners: prefer interactive/scenario questions
   ```

2. **Response Time Patterns**
   - Fast + accurate on certain types → preferred style
   - Slow + confused on others → non-preferred style

3. **Confidence Score**
   - Based on sample size (need 20+ attempts minimum)
   - Based on consistency (std dev of performance by type)

**Acceptance:**
- [x] Detects 4 styles: visual, verbal, kinesthetic, balanced
- [x] Confidence score 0.0 - 1.0
- [x] Minimum 20 attempts before classification
- [x] Updates `learner_profiles.learning_style`

---

### Phase 6: Testing & Validation (1.5h)

**Unit Tests** (`api/tests/adaptive.test.ts`)
- [x] 15 tests for adaptive service functions
- [x] Mock DB queries
- [x] Edge cases: new user, no data, extreme values

**Integration Tests** (`api/tests/adaptive-integration.test.ts`)
- [x] 10 tests for API routes
- [x] Test adaptive flow: submit attempt → check mastery → get recommendation
- [x] Test RBAC enforcement

**Smoke Tests** (`api/scripts/smoke-adaptive.sh`)
```bash
#!/bin/bash
# Test adaptive endpoints with real API
curl -X GET http://localhost:8080/api/adaptive/profile/$USER_ID \
  -H "x-admin-token: $ADMIN_TOKEN"
# ... more curl tests
```

**Acceptance:**
- [x] All tests passing (25 minimum)
- [x] Code coverage > 80% (ADR requirement)
- [x] Smoke tests verified on staging database

---

### Phase 7: Documentation & Deployment (1.5h)

**Documentation Updates:**
1. **`docs/functional-spec.md` §30**
   - Change status: "📋 PLANNED" → "✅ COMPLETE"
   - Add implementation date
   - Add curl examples for acceptance criteria

2. **`EPIC9_DELIVERY_SUMMARY.md`** (new file)
   - What was delivered
   - Performance metrics achieved
   - Known limitations
   - Next steps

3. **Feature Flag Registry** (`docs/spec/flags.md`)
   - Add `FF_ADAPTIVE_DIFFICULTY_V1` documentation

4. **Update `docs/EPIC_MASTER_PLAN.md`**
   - Mark Epic 9 as Complete
   - Update effort hours (estimated vs actual)

**Deployment Checklist:**
- [x] Run migration on staging database
- [x] Enable feature flag: `FF_ADAPTIVE_DIFFICULTY_V1=true`
- [x] Smoke tests pass on staging
- [x] Commit with `[spec]` tag: `feat(epic9): adaptive difficulty engine [spec]`

---

## 🔧 Code Patterns & Examples

### Pattern 1: Mastery Calculation (Time-Weighted)

```typescript
/**
 * Calculate mastery level for a user+topic with time decay
 * Recent attempts weighted more heavily
 */
async function calculateMasteryLevel(
  userId: string,
  topicId: string
): Promise<number> {
  // Fetch recent 20 attempts
  const attempts = await db
    .select()
    .from(attempts)
    .innerJoin(questions, eq(attempts.questionId, questions.id))
    .innerJoin(quizzes, eq(questions.quizId, quizzes.id))
    .innerJoin(modulesV2, eq(quizzes.moduleId, modulesV2.id))
    .where(
      and(
        eq(attempts.userId, userId),
        eq(modulesV2.topicId, topicId)
      )
    )
    .orderBy(desc(attempts.createdAt))
    .limit(20);

  if (attempts.length === 0) return 0.0;

  // Calculate weighted score
  const now = Date.now();
  let totalScore = 0;
  let totalWeight = 0;

  attempts.forEach((att, idx) => {
    // Time decay: recent attempts weighted more
    const ageMs = now - att.attempts.createdAt.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const timeWeight = Math.exp(-ageDays / 30); // 30-day half-life

    // Performance score (0.0 - 1.0)
    const perfScore = att.attempts.partialCredit ?? (att.attempts.correct ? 1.0 : 0.0);

    // Confusion penalty
    const confusionPenalty = att.attempts.confusionCount ?? 0 > 0 ? 0.1 : 0.0;

    const score = Math.max(0, perfScore - confusionPenalty);
    
    totalScore += score * timeWeight;
    totalWeight += timeWeight;
  });

  return totalWeight > 0 ? totalScore / totalWeight : 0.0;
}
```

### Pattern 2: Difficulty Recommendation

```typescript
/**
 * Recommend next difficulty level based on mastery
 */
async function recommendDifficultyLevel(
  userId: string,
  topicId: string
): Promise<{ difficulty: string; confidence: number; reasoning: string }> {
  const mastery = await calculateMasteryLevel(userId, topicId);

  // Get recent trend (last 3 attempts)
  const recentAttempts = await db
    .select()
    .from(attempts)
    // ... join to get topicId
    .limit(3);

  const recentScores = recentAttempts.map(a => 
    a.partialCredit ?? (a.correct ? 1.0 : 0.0)
  );
  const avgRecent = recentScores.reduce((sum, s) => sum + s, 0) / recentScores.length;

  // Adjust difficulty based on recent performance
  let difficulty: string;
  let reasoning: string;

  if (mastery < 0.50) {
    difficulty = 'recall';
    reasoning = 'Building foundational knowledge';
  } else if (mastery < 0.75) {
    difficulty = avgRecent > 0.8 ? 'analysis' : 'application';
    reasoning = avgRecent > 0.8 
      ? 'Strong recent performance, advancing to analysis'
      : 'Applying concepts to new situations';
  } else if (mastery < 0.90) {
    difficulty = avgRecent > 0.9 ? 'synthesis' : 'analysis';
    reasoning = avgRecent > 0.9
      ? 'Mastery achieved, creating new solutions'
      : 'Breaking down complex problems';
  } else {
    difficulty = 'synthesis';
    reasoning = 'Expert level, designing novel solutions';
  }

  // Confidence based on sample size
  const confidence = Math.min(1.0, recentAttempts.length / 20);

  return { difficulty, confidence, reasoning };
}
```

### Pattern 3: Learning Style Detection

```typescript
/**
 * Detect learning style from confusion patterns
 */
async function detectLearningStyle(
  userId: string
): Promise<{ style: string; confidence: number; signals: object }> {
  // Get confusion by question type
  const confusionData = await db
    .select({
      questionType: questions.type,
      confusionCount: sql<number>`count(*)`,
      avgResponseTime: sql<number>`avg(attempts.response_time_ms)`
    })
    .from(confusionLog)
    .innerJoin(attempts, eq(confusionLog.userId, attempts.userId))
    .innerJoin(questions, eq(confusionLog.questionId, questions.id))
    .where(eq(confusionLog.userId, userId))
    .groupBy(questions.type);

  if (confusionData.length < 3) {
    return { style: 'unknown', confidence: 0.0, signals: {} };
  }

  // Analyze patterns
  const textConfusion = confusionData.find(d => d.questionType === 'text')?.confusionCount ?? 0;
  const diagramConfusion = confusionData.find(d => d.questionType === 'diagram')?.confusionCount ?? 0;
  const scenarioConfusion = confusionData.find(d => d.questionType === 'scenario')?.confusionCount ?? 0;

  let style: string;
  if (textConfusion > diagramConfusion && textConfusion > scenarioConfusion) {
    style = 'visual'; // Struggles with text → visual learner
  } else if (diagramConfusion > textConfusion && diagramConfusion > scenarioConfusion) {
    style = 'verbal'; // Struggles with diagrams → verbal learner
  } else if (scenarioConfusion < textConfusion && scenarioConfusion < diagramConfusion) {
    style = 'kinesthetic'; // Prefers scenarios
  } else {
    style = 'balanced';
  }

  const totalAttempts = confusionData.reduce((sum, d) => sum + d.confusionCount, 0);
  const confidence = Math.min(1.0, totalAttempts / 20);

  return {
    style,
    confidence,
    signals: { textConfusion, diagramConfusion, scenarioConfusion }
  };
}
```

---

## ✅ Acceptance Criteria (From EPIC_MASTER_PLAN.md)

### Functional Requirements
- [ ] **4 difficulty levels implemented** (recall, application, analysis, synthesis)
- [ ] **Mastery calculation** uses time-weighted scoring with 4 signals (correctness, latency, confusion, partial credit)
- [ ] **Learning style detection** identifies visual/verbal/kinesthetic with confidence scores
- [ ] **Weak topic identification** returns topics with mastery < 0.70
- [ ] **Adaptive recommendations** adjust difficulty based on recent performance (3-attempt window)

### API Requirements
- [ ] **4 new endpoints** (`/adaptive/profile/:userId`, `/adaptive/topics/:topicId/difficulty/:userId`, `/adaptive/attempt`, `/adaptive/analytics/:userId`)
- [ ] **Feature flag gated** (`FF_ADAPTIVE_DIFFICULTY_V1`)
- [ ] **RBAC enforced** (admin/manager/learner, with self-checks)
- [ ] **Error envelopes** on all failures
- [ ] **Session management** via `getSession(req)`

### Database Requirements
- [ ] **2 new tables** (`learner_profiles`, `topic_comprehension`)
- [ ] **Migration includes header** (Epic/BRD/FSD references)
- [ ] **Foreign keys correct** (TEXT for user_id, UUID for topic_id)
- [ ] **Indexes created** for query optimization
- [ ] **Drizzle schema updated** (`api/src/db/schema.ts`)

### Integration Requirements
- [ ] **Learn routes integrated** (`POST /api/learn/submit` calls `recordAttemptForAdaptive()`)
- [ ] **Daily question selector enhanced** (filters by difficulty)
- [ ] **Intent router updated** (adaptive insights in progress queries)
- [ ] **No breaking changes** to Epic 7 or Epic 8

### Testing Requirements
- [ ] **25+ tests** (15 unit, 10 integration)
- [ ] **80%+ code coverage** (ADR requirement)
- [ ] **Smoke tests** (`api/scripts/smoke-adaptive.sh`)
- [ ] **Staging verification** (run tests on staging database)

### Documentation Requirements
- [ ] **FSD §30 updated** (status → COMPLETE, add curl examples)
- [ ] **Delivery summary created** (`EPIC9_DELIVERY_SUMMARY.md`)
- [ ] **Feature flag documented** (`docs/spec/flags.md`)
- [ ] **EPIC_MASTER_PLAN.md updated** (mark Epic 9 complete)
- [ ] **Commit with [spec] tag** (`feat(epic9): adaptive difficulty engine [spec]`)

---

## 🧪 Testing Instructions

### Local Testing Setup

1. **Enable feature flag**
   ```bash
   export FF_ADAPTIVE_DIFFICULTY_V1=true
   export DATABASE_URL="postgresql://..."
   ```

2. **Run migration**
   ```bash
   cd api
   npm run migrate
   # Verify: psql $DATABASE_URL -c "\d learner_profiles"
   ```

3. **Run tests**
   ```bash
   npm test -- tests/adaptive.test.ts
   npm test -- tests/adaptive-integration.test.ts
   ```

4. **Smoke tests**
   ```bash
   chmod +x scripts/smoke-adaptive.sh
   ./scripts/smoke-adaptive.sh
   ```

### Staging Testing

```bash
# 1. Apply migration
export DATABASE_URL="postgresql://cerply_app:...@dpg-xxx.render.com/cerply"
psql $DATABASE_URL < api/drizzle/018_adaptive_difficulty.sql

# 2. Verify tables
psql $DATABASE_URL -c "\d learner_profiles"
psql $DATABASE_URL -c "\d topic_comprehension"

# 3. Test API
curl -X GET https://cerply-api-staging-latest.onrender.com/api/adaptive/profile/$USER_ID \
  -H "x-admin-token: $ADMIN_TOKEN"
```

---

## 📚 Reference Documentation

### Epic 8 Confusion Tracking (YOUR DATA SOURCE)

Epic 8 provides the `confusion_log` table:
```sql
CREATE TABLE confusion_log (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  question_id UUID,
  query TEXT NOT NULL,
  explanation_provided TEXT,
  helpful BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**How to use it:**
```typescript
// Count confusion events per topic
const confusionCount = await db
  .select({ count: sql<number>`count(*)` })
  .from(confusionLog)
  .innerJoin(questions, eq(confusionLog.questionId, questions.id))
  .innerJoin(quizzes, eq(questions.quizId, quizzes.id))
  .innerJoin(modulesV2, eq(quizzes.moduleId, modulesV2.id))
  .where(
    and(
      eq(confusionLog.userId, userId),
      eq(modulesV2.topicId, topicId)
    )
  );
```

### P0 Content Hierarchy (YOUR SCHEMA)

**5-Tier Structure:**
```
Subject → Topic → Module → Quiz → Question
```

**Key Tables:**
- `subjects` - Knowledge domains (Computer Science, Finance, etc.)
- `topics` - Content collection (4-6 modules per topic)
- `modules_v2` - Content provision (what learners consume)
- `quizzes` - Assessment groups (1-3 per module)
- `questions` - Individual questions

**Your adaptive system works at TOPIC level:**
- Track mastery per topic
- Recommend difficulty per topic
- Identify weak topics

### Epic 7 Gamification (YOUR PROGRESS DATA)

**Available Data:**
- `learner_levels` table - User progression (Novice → Master)
- `attempts` table - All attempt history with partial credit
- `countCorrectAttempts(userId)` service - Aggregated score

---

## 🚀 Quick Start Checklist

### Before You Start
- [ ] Read `docs/EPIC_MASTER_PLAN.md` v1.3 (Epic 9 section)
- [ ] Read `docs/ARCHITECTURE_DECISIONS.md` v1.2 (patterns to follow)
- [ ] Read `docs/functional-spec.md` §30 (Epic 9 technical spec)
- [ ] Verify Epic 8 is complete: `git log --grep="epic8" -5`
- [ ] Verify P0 migration is done: `psql $DATABASE_URL -c "\d topics"`

### Implementation Order
1. [ ] **Phase 1:** Create database migration (2h)
2. [ ] **Phase 2:** Build adaptive service (3h)
3. [ ] **Phase 3:** Create API routes (2h)
4. [ ] **Phase 4:** Integrate with existing systems (3h)
5. [ ] **Phase 5:** Enhance learning style detection (2h)
6. [ ] **Phase 6:** Test & validate (1.5h)
7. [ ] **Phase 7:** Document & deploy (1.5h)

### After Completion
- [ ] Run all tests (`npm test`)
- [ ] Run smoke tests on staging
- [ ] Update `docs/functional-spec.md` §30
- [ ] Create `EPIC9_DELIVERY_SUMMARY.md`
- [ ] Update `docs/EPIC_MASTER_PLAN.md` (mark complete)
- [ ] Commit with: `feat(epic9): adaptive difficulty engine [spec]`
- [ ] Create PR to merge `epic9` → `staging` → `main`

---

## ⚠️ Common Pitfalls & How to Avoid Them

### Pitfall 1: Ignoring Epic 8 Confusion Data
**Problem:** Building adaptive logic without using confusion_log  
**Solution:** Always query confusion_log when calculating mastery

### Pitfall 2: Wrong Foreign Key Types
**Problem:** Using UUID for user_id (should be TEXT)  
**Solution:** Check existing schema - users.id is TEXT, not UUID

### Pitfall 3: Forgetting Time Decay
**Problem:** Treating all attempts equally (old + new)  
**Solution:** Use exponential decay - recent attempts weighted more

### Pitfall 4: Not Testing Edge Cases
**Problem:** New user with 0 attempts crashes system  
**Solution:** Handle empty data gracefully, return default values

### Pitfall 5: Skipping Migration Header
**Problem:** Migration missing Epic/BRD/FSD references  
**Solution:** Copy header from `016_content_hierarchy_v2.sql`

### Pitfall 6: Breaking Epic 7/8 Functionality
**Problem:** Changing shared code breaks gamification or chat  
**Solution:** Run Epic 7/8 tests after your changes

---

## 🎯 Success Metrics

### Performance Targets
- [ ] Mastery calculation < 100ms
- [ ] API response time < 200ms (p95)
- [ ] Learning style detection < 500ms

### Quality Targets
- [ ] Test coverage > 80%
- [ ] Zero TypeScript errors
- [ ] Zero linter warnings
- [ ] All smoke tests passing

### Business Metrics (Post-Deployment)
- Learner completion rate increase (target: +10% from current 60-80%)
- Reduced confusion queries per learner (target: -20%)
- Improved topic mastery progression (target: faster time to 0.70+)

---

## 📞 Need Help?

### If You Get Stuck:
1. **Check existing epics:** Epic 7 & 8 have similar patterns
2. **Read ADR:** Architectural patterns are documented
3. **Review P0 migration:** Shows how to handle new schema
4. **Ask user:** If unclear, stop and ask for clarification

### Common Questions:

**Q: How do I test without real user data?**  
A: Create seed data in migration or test setup. See `api/scripts/create-test-user.js` for example.

**Q: Should I use BKT or AFM algorithms?**  
A: MVP uses simplified time-weighted scoring. Advanced algorithms (BKT/AFM) are Phase 2.

**Q: How do I handle multiple topics per user?**  
A: `topic_comprehension` table has unique(user_id, topic_id) - one row per user-topic pair.

**Q: What if a topic has no questions at the recommended difficulty?**  
A: Fall back to closest available difficulty (e.g., "analysis" not available → use "application")

---

## 📝 Final Notes

### Why This Matters
Epic 9 is the **learning science differentiator**. Competitors offer static content; Cerply adapts to each learner. This is what drives 60-80% completion rates vs industry 30-40%.

### What Makes This Hard
- **Data quality:** Need enough attempts to make accurate recommendations
- **Edge cases:** New users, sparse data, outlier performance
- **Integration:** Must not break Epic 7 (gamification) or Epic 8 (conversational UI)

### What Makes This Easy
- **Foundation ready:** Epic 8 provides confusion data, Epic 7 provides progression data, P0 provides schema
- **Clear algorithm:** Time-weighted mastery is well-defined
- **Patterns established:** Follow Epic 7/8 code patterns

---

## 🚀 Ready to Start?

✅ **All prerequisites met:**
- Epic 7 complete (gamification)
- Epic 8 complete (confusion tracking)
- P0 complete (content hierarchy)

✅ **All documentation read:**
- EPIC_MASTER_PLAN.md
- ARCHITECTURE_DECISIONS.md
- functional-spec.md §30

✅ **Environment ready:**
- Database access confirmed
- Feature flags understood
- Testing strategy clear

**GO BUILD ADAPTIVE LEARNING!** 🎓

---

**Epic 9 Implementation Prompt v2.0 - Complete**  
**Status:** READY FOR NEW AGENT  
**Last Updated:** 2025-10-13  
**Next Epic:** Epic 6.6 (Batch Content Seeding) or Epic 6.7 (Content Lifecycle)
