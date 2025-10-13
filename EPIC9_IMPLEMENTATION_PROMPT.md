# Epic 9: True Adaptive Difficulty Engine — Implementation Prompt

**For:** New Agent/Developer  
**Date:** 2025-10-12  
**Estimated Effort:** 12-16 hours (1.5 overnights)  
**Priority:** P1 (Core Learning Science)

---

## Table of Contents

1. [Project Context](#1-project-context)
2. [Epic 9 Requirements](#2-epic-9-requirements)
3. [Implementation Plan](#3-implementation-plan)
4. [Code Patterns & Examples](#4-code-patterns--examples)
5. [Adaptive Algorithm Details](#5-adaptive-algorithm-details)
6. [Acceptance Criteria](#6-acceptance-criteria)
7. [Testing Instructions](#7-testing-instructions)
8. [Rollout Plan](#8-rollout-plan)
9. [References](#9-references)
10. [Quick Start Checklist](#10-quick-start-checklist)

---

## 1. Project Context

### What is Cerply?

Cerply is a B2B enterprise learning platform that transforms company knowledge into adaptive, personalized learning experiences. The platform achieves 60-80% completion rates (vs 30-40% for traditional LMS) through intelligent personalization.

**Current Status (Epics 1-8 Complete):**

| Epic | Status | Key Deliverables |
|------|--------|------------------|
| **Epic 1: D2C Removal** | ✅ Complete | Enterprise-only access |
| **Epic 2: SSO & RBAC** | ✅ Complete | SAML/OIDC, 3 roles |
| **Epic 3: Team Management** | ✅ Complete | Teams, learners, CSV import |
| **Epic 4: Manager Analytics** | ✅ Complete | 7 analytics endpoints |
| **Epic 5: Slack Integration** | ✅ Complete | Slack DM delivery |
| **Epic 6: Ensemble Generation** | ✅ Complete | 3-LLM pipeline |
| **Epic 6.5: Research Mode** | ✅ Complete | Topic-based research |
| **Epic 7: Gamification** | ✅ Complete | Levels, certificates, badges |
| **Epic 8: Conversational UI** | ✅ Complete | Chat, free-text, explanations |

**What's Missing (Epic 9 Goal):**

Currently, Cerply uses spaced repetition but difficulty is **static**:
- All learners get same difficulty questions
- No adjustment based on performance patterns
- No detection of struggling learners
- No learning style adaptation
- No topic-level weakness detection

### Why Epic 9 Matters

**The Problem:** Traditional LMS treats all learners the same. A struggling learner gets overwhelmed with hard questions. An advanced learner gets bored with easy questions. Both disengage.

**The Cerply Solution: True Adaptive Difficulty**
- **Performance Signals:** Correctness + latency + confusion + attempts + spaced recall
- **4 Difficulty Levels:** Recall → Application → Analysis → Synthesis (Bloom's Taxonomy)
- **Adaptive Algorithm:** 3 correct in a row → increase difficulty; 2 wrong → decrease
- **Learning Style Detection:** Visual/Verbal/Kinesthetic → adjust question format
- **Topic Weakness Detection:** Comprehension < 70% → automatic reinforcement

**Result:** Each learner gets personalized difficulty that keeps them in the "flow zone" (not too hard, not too easy), maximizing engagement and retention.

### Tech Stack

Same as Epics 5-8:
- **API:** Fastify 4.x + Drizzle ORM + PostgreSQL 15
- **Web:** Next.js 14 (App Router) + Tailwind CSS
- **Testing:** Vitest + Playwright
- **Cron Jobs:** `node-cron` for background tasks

### Key Code Patterns (Established in Epics 1-8)

1. **Feature Flags:** `FF_ADAPTIVE_DIFFICULTY_V1`, `FF_LEARNING_STYLE_V1`
2. **RBAC Middleware:** `requireLearner(req, reply)` - always `return reply`
3. **Error Envelopes:** `{ error: { code, message, details? } }`
4. **Session Management:** `getSession(req)` for user context
5. **Migration Headers:** Standard format with Epic/BRD/FSD references
6. **Service Layer:** Extract core logic to services (not inline in routes)
7. **Cron Jobs:** Background processing for analytics and updates

### Files to Study Before Starting

**Critical Reading (2 hours):**
1. **`EPIC8_IMPLEMENTATION_PROMPT.md`** - Epic 8 provides confusion signals
2. **`api/src/services/gamification.ts`** - Service layer pattern
3. **`api/src/services/spaced.ts`** - Existing spaced repetition logic
4. **`api/src/routes/learn.ts`** - Existing /learn/next endpoint
5. **`docs/MVP_B2B_ROADMAP.md`** - Epic 9 section (lines 953-1114)

---

## 2. Epic 9 Requirements

### Goal

Implement a true adaptive difficulty engine that dynamically adjusts question difficulty based on real-time learner performance signals (correctness, latency, confusion, attempts, spaced recall), detects learning styles, and identifies weak topics for automatic reinforcement.

### User Stories

**Story 1: Dynamic Difficulty Adjustment**
- **As a learner,** I want questions to get harder when I'm doing well and easier when I'm struggling,
- **So that** I stay engaged and challenged at the right level.
- **Acceptance:** 3 correct in a row → difficulty increases; 2 wrong → difficulty decreases.

**Story 2: Learning Style Adaptation**
- **As a learner,** I want content presented in my preferred format (visual/verbal/kinesthetic),
- **So that** I learn more effectively.
- **Acceptance:** System detects style from behavior and adjusts question format.

**Story 3: Weak Topic Reinforcement**
- **As a learner,** I want extra practice on topics I'm struggling with,
- **So that** I build mastery on weak areas.
- **Acceptance:** Topics with comprehension < 70% receive more questions automatically.

**Story 4: Performance Insights**
- **As a manager,** I want to see learner difficulty profiles and weak topics,
- **So that** I can provide targeted support.
- **Acceptance:** Manager dashboard shows preferred difficulty, learning style, weak topics.

**Story 5: Intelligent Question Selection**
- **As the system,** I want to select next questions based on difficulty, style, weak topics, AND spaced repetition,
- **So that** learners get optimal learning paths.
- **Acceptance:** `/api/learn/next` uses adaptive engine to select questions.

### Performance Signals

The adaptive engine tracks 5 signals:

1. **Correctness:** Right/wrong answers
2. **Latency:** Response time (fast = confident, slow = struggling)
   - Fast: < 10 seconds
   - Normal: 10-30 seconds
   - Slow: > 30 seconds
3. **Confusion:** "I don't understand" queries from Epic 8
4. **Attempts:** Multiple tries on same question
5. **Spaced Recall:** Remembers after 7/14/30 days?

### Difficulty Levels (Bloom's Taxonomy)

Questions are tagged with 1 of 4 difficulty levels:

| Level | Name | Description | Example |
|-------|------|-------------|---------|
| **L1** | Recall | Simple fact recall | "What is the first step in fire safety?" |
| **L2** | Application | Apply knowledge to scenarios | "How would you handle a kitchen fire?" |
| **L3** | Analysis | Compare/contrast, explain why | "Why is raising the alarm better than fighting the fire first?" |
| **L4** | Synthesis | Create solutions, design processes | "Design a fire evacuation plan for a 10-floor building" |

**Default:** New learners start at **L2 (Application)** to avoid boring them with pure recall.

### Adaptive Algorithm

```
1. Start: Learner begins at L2 (Application)

2. After each attempt:
   - Track: correctness, latency, confusion queries
   
3. Increase difficulty if:
   - 3 correct in a row
   - AND avg latency < 15 seconds (confident)
   - AND no confusion queries
   - AND current difficulty < max (default: L4)
   
4. Decrease difficulty if:
   - 2 wrong answers
   - OR avg latency > 30 seconds on last 3 questions
   - OR "I don't understand" query
   - BUT never drop below L1 (avoid discouragement)
   
5. Topic reinforcement:
   - If topic comprehension < 70% after 5 attempts
   - Flag for reinforcement
   - Prioritize weak topics in next question selection
   
6. Learning style adaptation:
   - Detect style from behavior (clicks, time, interactions)
   - Adjust question format accordingly
```

### Database Schema

#### Migration: Add Difficulty to Items

**File:** `api/drizzle/012_adaptive_difficulty.sql`

```sql
-- Add difficulty and style columns to items
ALTER TABLE items ADD COLUMN difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 4);
ALTER TABLE items ADD COLUMN question_style TEXT CHECK (question_style IN ('visual', 'verbal', 'kinesthetic', 'mixed'));
ALTER TABLE items ADD COLUMN topic TEXT; -- e.g., 'fire-safety.evacuation', 'fire-safety.extinguishers'

-- Default existing questions to L2 (Application)
UPDATE items SET difficulty_level = 2 WHERE difficulty_level IS NULL;
UPDATE items SET question_style = 'mixed' WHERE question_style IS NULL;

CREATE INDEX idx_items_difficulty ON items(difficulty_level);
CREATE INDEX idx_items_topic ON items(topic);
```

#### Table: `learner_profiles`

Tracks adaptive preferences per learner.

```sql
CREATE TABLE learner_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  preferred_difficulty  INTEGER NOT NULL DEFAULT 2 CHECK (preferred_difficulty BETWEEN 1 AND 4),
  preferred_style       TEXT CHECK (preferred_style IN ('visual', 'verbal', 'kinesthetic')),
  avg_latency_ms        INTEGER,
  consistency_score     NUMERIC(3,2) CHECK (consistency_score BETWEEN 0 AND 1),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_learner_profiles_user ON learner_profiles(user_id);
```

**Example row:**
```json
{
  "id": "prof-123",
  "user_id": "user-abc",
  "preferred_difficulty": 3,
  "preferred_style": "visual",
  "avg_latency_ms": 12000,
  "consistency_score": 0.85,
  "updated_at": "2025-10-12T10:00:00Z"
}
```

**Explanation:**
- `preferred_difficulty`: Current optimal difficulty level (1-4)
- `preferred_style`: Detected learning style (or null if not detected yet)
- `avg_latency_ms`: Rolling average response time
- `consistency_score`: 0.0 to 1.0 (how consistent performance is)

#### Table: `topic_comprehension`

Tracks comprehension per topic per learner.

```sql
CREATE TABLE topic_comprehension (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id            UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  topic               TEXT NOT NULL,
  attempts            INTEGER NOT NULL DEFAULT 0,
  correct             INTEGER NOT NULL DEFAULT 0,
  avg_latency_ms      INTEGER,
  comprehension       NUMERIC(3,2) CHECK (comprehension BETWEEN 0 AND 1),
  needs_reinforcement BOOLEAN DEFAULT false,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, track_id, topic)
);

CREATE INDEX idx_topic_comprehension_user_track ON topic_comprehension(user_id, track_id);
CREATE INDEX idx_topic_comprehension_weak ON topic_comprehension(needs_reinforcement) WHERE needs_reinforcement = true;
```

**Example row:**
```json
{
  "id": "comp-456",
  "user_id": "user-abc",
  "track_id": "track-fire-safety",
  "topic": "fire-safety.evacuation",
  "attempts": 8,
  "correct": 5,
  "avg_latency_ms": 18000,
  "comprehension": 0.625,
  "needs_reinforcement": true,
  "updated_at": "2025-10-12T10:05:00Z"
}
```

**Explanation:**
- `comprehension`: `correct / attempts` (0.0 to 1.0)
- `needs_reinforcement`: `true` if comprehension < 0.70 after 5+ attempts

### API Routes

#### 1. `GET /api/adaptive/profile/:userId`
Get learner's adaptive profile.

**RBAC:** Learner (self) or Manager (their team)  
**Feature Flag:** `FF_ADAPTIVE_DIFFICULTY_V1`

**Response:**
```json
{
  "userId": "user-abc",
  "preferredDifficulty": 3,
  "preferredStyle": "visual",
  "avgLatencyMs": 12000,
  "consistencyScore": 0.85,
  "updatedAt": "2025-10-12T10:00:00Z"
}
```

#### 2. `GET /api/adaptive/next/:userId/:trackId`
Get next question using adaptive selection.

**RBAC:** Learner only  
**Feature Flag:** `FF_ADAPTIVE_DIFFICULTY_V1`

**Response:**
```json
{
  "questionId": "item-fire-q15",
  "difficultyLevel": 3,
  "questionStyle": "visual",
  "topic": "fire-safety.evacuation",
  "stem": "You're on the 5th floor when the fire alarm sounds. What's your first action?",
  "options": ["A", "B", "C", "D"],
  "reason": "weak_topic"
}
```

**`reason` field explains why this question was selected:**
- `weak_topic`: Topic comprehension < 70%
- `spaced_review`: Due for spaced repetition
- `difficulty_progression`: Normal difficulty progression
- `style_match`: Matches learner's preferred style

#### 3. `POST /api/adaptive/feedback`
Update profile based on attempt (called after `/api/learn/submit`).

**RBAC:** Learner only  
**Feature Flag:** `FF_ADAPTIVE_DIFFICULTY_V1`

**Request:**
```json
{
  "userId": "user-abc",
  "trackId": "track-fire-safety",
  "questionId": "item-fire-q15",
  "topic": "fire-safety.evacuation",
  "correct": false,
  "latencyMs": 35000,
  "confusionQuery": null
}
```

**Response:**
```json
{
  "ok": true,
  "difficultyChanged": true,
  "newDifficulty": 2,
  "message": "Difficulty decreased to L2 (Application). You're doing great - keep practicing!",
  "weakTopics": ["fire-safety.evacuation"]
}
```

**Side Effects:**
- Updates `learner_profiles` (preferred_difficulty, avg_latency)
- Updates `topic_comprehension` (attempts, correct, comprehension, needs_reinforcement)
- May adjust difficulty up/down based on recent performance

#### 4. `GET /api/adaptive/weak-topics/:userId/:trackId`
Get topics needing reinforcement.

**RBAC:** Learner (self) or Manager (their team)  
**Feature Flag:** `FF_ADAPTIVE_DIFFICULTY_V1`

**Response:**
```json
{
  "weakTopics": [
    {
      "topic": "fire-safety.evacuation",
      "attempts": 8,
      "correct": 5,
      "comprehension": 0.625,
      "avgLatencyMs": 18000,
      "needsReinforcement": true
    },
    {
      "topic": "fire-safety.extinguishers",
      "attempts": 6,
      "correct": 3,
      "comprehension": 0.50,
      "avgLatencyMs": 22000,
      "needsReinforcement": true
    }
  ]
}
```

#### 5. `POST /api/learn/submit` (Enhanced)
Extend existing endpoint to trigger adaptive feedback.

**Changes:**
- After recording attempt, call `adaptive.updateProfile()` if flag enabled
- Return `difficultyChanged` and `newDifficulty` in response

**Request:** (existing)
```json
{
  "questionId": "item-fire-q15",
  "answerIndex": 2,
  "latencyMs": 15000
}
```

**Response:** (enhanced)
```json
{
  "correct": true,
  "feedback": "Correct! Well done.",
  "score": 1,
  "difficultyChanged": false,
  "newDifficulty": 2,
  "weakTopics": []
}
```

#### 6. `GET /api/learn/next` (Enhanced)
Extend existing endpoint to use adaptive engine.

**Changes:**
- If `FF_ADAPTIVE_DIFFICULTY_V1` enabled, call `adaptive.getNextQuestion()` instead of simple spaced repetition
- Return `difficultyLevel`, `reason` fields

**Response:** (enhanced)
```json
{
  "questionId": "item-fire-q15",
  "difficultyLevel": 3,
  "reason": "weak_topic",
  "stem": "...",
  "options": ["A", "B", "C", "D"]
}
```

### Feature Flags

```bash
# Enable adaptive difficulty engine
FF_ADAPTIVE_DIFFICULTY_V1=true

# Enable learning style detection
FF_LEARNING_STYLE_V1=true

# Minimum difficulty level (1-4, default: 1)
ADAPTIVE_MIN_DIFFICULTY=1

# Maximum difficulty level (1-4, default: 4)
ADAPTIVE_MAX_DIFFICULTY=4

# Weak topic threshold (0.0-1.0, default: 0.70)
WEAK_TOPIC_THRESHOLD=0.70

# Minimum attempts before flagging weak topic (default: 5)
MIN_ATTEMPTS_BEFORE_FLAG=5
```

---

## 3. Implementation Plan

### Phase 1: Database Schema (1.5 hours)

**File:** `api/drizzle/012_adaptive_difficulty.sql`

```sql
------------------------------------------------------------------------------
-- Epic 9: True Adaptive Difficulty Engine
-- BRD: L-2 (Adaptive lesson plans with dynamic difficulty adjustment)
-- FSD: Will be added as new section post-§29 upon Epic 9 completion
-- Roadmap: docs/MVP_B2B_ROADMAP.md (Epic 9, lines 953-1114)
------------------------------------------------------------------------------

-- Add difficulty and style columns to items
ALTER TABLE items ADD COLUMN IF NOT EXISTS difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 4);
ALTER TABLE items ADD COLUMN IF NOT EXISTS question_style TEXT CHECK (question_style IN ('visual', 'verbal', 'kinesthetic', 'mixed'));
ALTER TABLE items ADD COLUMN IF NOT EXISTS topic TEXT;

-- Default existing questions to L2 (Application)
UPDATE items SET difficulty_level = 2 WHERE difficulty_level IS NULL;
UPDATE items SET question_style = 'mixed' WHERE question_style IS NULL;

CREATE INDEX IF NOT EXISTS idx_items_difficulty ON items(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_items_topic ON items(topic);

-- Learner adaptive profiles
CREATE TABLE IF NOT EXISTS learner_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preferred_difficulty  INTEGER NOT NULL DEFAULT 2 CHECK (preferred_difficulty BETWEEN 1 AND 4),
  preferred_style       TEXT CHECK (preferred_style IN ('visual', 'verbal', 'kinesthetic')),
  avg_latency_ms        INTEGER,
  consistency_score     NUMERIC(3,2) CHECK (consistency_score BETWEEN 0 AND 1),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_learner_profiles_user ON learner_profiles(user_id);

-- Topic-level comprehension tracking
CREATE TABLE IF NOT EXISTS topic_comprehension (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id            UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  topic               TEXT NOT NULL,
  attempts            INTEGER NOT NULL DEFAULT 0,
  correct             INTEGER NOT NULL DEFAULT 0,
  avg_latency_ms      INTEGER,
  comprehension       NUMERIC(3,2) CHECK (comprehension BETWEEN 0 AND 1),
  needs_reinforcement BOOLEAN DEFAULT false,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, track_id, topic)
);

CREATE INDEX IF NOT EXISTS idx_topic_comprehension_user_track ON topic_comprehension(user_id, track_id);
CREATE INDEX IF NOT EXISTS idx_topic_comprehension_weak ON topic_comprehension(needs_reinforcement) WHERE needs_reinforcement = true;
```

**Update Drizzle Schema:**

**File:** `api/src/db/schema.ts`

Add to `items` table:

```typescript
export const items = pgTable('items', {
  // ... existing fields ...
  difficultyLevel: integer('difficulty_level').default(2), // 1-4
  questionStyle: text('question_style').default('mixed'), // 'visual' | 'verbal' | 'kinesthetic' | 'mixed'
  topic: text('topic'), // e.g., 'fire-safety.evacuation'
});
```

Add new tables:

```typescript
export const learnerProfiles = pgTable('learner_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  preferredDifficulty: integer('preferred_difficulty').notNull().default(2), // 1-4
  preferredStyle: text('preferred_style'), // 'visual' | 'verbal' | 'kinesthetic'
  avgLatencyMs: integer('avg_latency_ms'),
  consistencyScore: numeric('consistency_score', { precision: 3, scale: 2 }), // 0.00 to 1.00
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const topicComprehension = pgTable('topic_comprehension', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  trackId: uuid('track_id').notNull().references(() => tracks.id, { onDelete: 'cascade' }),
  topic: text('topic').notNull(),
  attempts: integer('attempts').notNull().default(0),
  correct: integer('correct').notNull().default(0),
  avgLatencyMs: integer('avg_latency_ms'),
  comprehension: numeric('comprehension', { precision: 3, scale: 2 }), // 0.00 to 1.00
  needsReinforcement: boolean('needs_reinforcement').default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueUserTrackTopic: unique().on(table.userId, table.trackId, table.topic),
}));
```

**Run Migration:**
```bash
cd api
npm run db:migrate
```

**Acceptance:**
- [ ] Migration runs without errors
- [ ] `items` table has 3 new columns
- [ ] 2 new tables created
- [ ] Indexes created
- [ ] Unique constraints enforced
- [ ] Existing items default to difficulty_level=2

---

### Phase 2: Adaptive Service Core (3 hours)

**File:** `api/src/services/adaptive.ts` (NEW)

```typescript
/**
 * Adaptive Difficulty Engine Service
 * Epic 9: True Adaptive Difficulty Engine
 * Dynamically adjusts question difficulty based on performance signals
 */

import { db } from '../db';
import { learnerProfiles, topicComprehension, items, attempts, confusionLog } from '../db/schema';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';

const FF_ADAPTIVE_DIFFICULTY_V1 = process.env.FF_ADAPTIVE_DIFFICULTY_V1 === 'true';
const FF_LEARNING_STYLE_V1 = process.env.FF_LEARNING_STYLE_V1 === 'true';
const ADAPTIVE_MIN_DIFFICULTY = parseInt(process.env.ADAPTIVE_MIN_DIFFICULTY || '1', 10);
const ADAPTIVE_MAX_DIFFICULTY = parseInt(process.env.ADAPTIVE_MAX_DIFFICULTY || '4', 10);
const WEAK_TOPIC_THRESHOLD = parseFloat(process.env.WEAK_TOPIC_THRESHOLD || '0.70');
const MIN_ATTEMPTS_BEFORE_FLAG = parseInt(process.env.MIN_ATTEMPTS_BEFORE_FLAG || '5', 10);

export interface AdaptiveProfile {
  userId: string;
  preferredDifficulty: number;
  preferredStyle: string | null;
  avgLatencyMs: number | null;
  consistencyScore: number | null;
  updatedAt: Date;
}

export interface TopicComprehensionData {
  topic: string;
  attempts: number;
  correct: number;
  comprehension: number;
  avgLatencyMs: number | null;
  needsReinforcement: boolean;
}

export interface NextQuestionResult {
  questionId: string;
  difficultyLevel: number;
  questionStyle: string;
  topic: string | null;
  reason: 'weak_topic' | 'spaced_review' | 'difficulty_progression' | 'style_match';
}

/**
 * Get or create learner profile
 */
export async function getLearnerProfile(userId: string): Promise<AdaptiveProfile> {
  let [profile] = await db.select()
    .from(learnerProfiles)
    .where(eq(learnerProfiles.userId, userId))
    .limit(1);

  if (!profile) {
    // Create profile with defaults
    [profile] = await db.insert(learnerProfiles)
      .values({
        userId,
        preferredDifficulty: 2, // Start at L2 (Application)
        avgLatencyMs: null,
        consistencyScore: null,
      })
      .returning();
  }

  return {
    userId: profile.userId,
    preferredDifficulty: profile.preferredDifficulty,
    preferredStyle: profile.preferredStyle,
    avgLatencyMs: profile.avgLatencyMs,
    consistencyScore: profile.consistencyScore ? parseFloat(profile.consistencyScore) : null,
    updatedAt: profile.updatedAt,
  };
}

/**
 * Update learner profile based on recent attempt
 */
export async function updateProfile(
  userId: string,
  trackId: string,
  questionId: string,
  topic: string | null,
  correct: boolean,
  latencyMs: number | null,
  confusionQuery: string | null
): Promise<{
  difficultyChanged: boolean;
  newDifficulty: number;
  message: string;
  weakTopics: string[];
}> {
  if (!FF_ADAPTIVE_DIFFICULTY_V1) {
    return {
      difficultyChanged: false,
      newDifficulty: 2,
      message: 'Adaptive difficulty not enabled',
      weakTopics: [],
    };
  }

  // Get current profile
  const profile = await getLearnerProfile(userId);

  // Update topic comprehension
  if (topic) {
    await updateTopicComprehension(userId, trackId, topic, correct, latencyMs);
  }

  // Get recent attempts (last 5)
  const recentAttempts = await db.select()
    .from(attempts)
    .where(eq(attempts.userId, userId))
    .orderBy(desc(attempts.createdAt))
    .limit(5);

  // Calculate metrics
  const recentCorrect = recentAttempts.filter(a => a.correct).length;
  const recentWrong = recentAttempts.filter(a => !a.correct).length;
  const avgLatency = recentAttempts.length > 0
    ? recentAttempts.reduce((sum, a) => sum + (a.latencyMs || 0), 0) / recentAttempts.length
    : null;

  // Check for confusion queries
  const hasConfusion = confusionQuery !== null;

  // Determine if difficulty should change
  let newDifficulty = profile.preferredDifficulty;
  let difficultyChanged = false;
  let message = 'Keep going!';

  // Increase difficulty: 3 correct in a row + low latency + no confusion
  if (recentCorrect >= 3 && avgLatency && avgLatency < 15000 && !hasConfusion) {
    if (newDifficulty < ADAPTIVE_MAX_DIFFICULTY) {
      newDifficulty += 1;
      difficultyChanged = true;
      message = `Great work! Difficulty increased to L${newDifficulty}. You're crushing it! 🎉`;
    }
  }
  // Decrease difficulty: 2 wrong OR high latency OR confusion
  else if (recentWrong >= 2 || (avgLatency && avgLatency > 30000) || hasConfusion) {
    if (newDifficulty > ADAPTIVE_MIN_DIFFICULTY) {
      newDifficulty -= 1;
      difficultyChanged = true;
      message = `Difficulty decreased to L${newDifficulty}. You're doing great - keep practicing!`;
    }
  }

  // Calculate consistency score (variance in performance)
  const consistencyScore = recentAttempts.length >= 3
    ? calculateConsistencyScore(recentAttempts)
    : null;

  // Update profile
  await db.update(learnerProfiles)
    .set({
      preferredDifficulty: newDifficulty,
      avgLatencyMs: avgLatency ? Math.round(avgLatency) : null,
      consistencyScore: consistencyScore ? consistencyScore.toFixed(2) : null,
      updatedAt: new Date(),
    })
    .where(eq(learnerProfiles.userId, userId));

  // Get weak topics
  const weakTopicsData = await getWeakTopics(userId, trackId);
  const weakTopics = weakTopicsData.map(t => t.topic);

  return {
    difficultyChanged,
    newDifficulty,
    message,
    weakTopics,
  };
}

/**
 * Update topic comprehension
 */
async function updateTopicComprehension(
  userId: string,
  trackId: string,
  topic: string,
  correct: boolean,
  latencyMs: number | null
): Promise<void> {
  // Get or create topic comprehension record
  let [record] = await db.select()
    .from(topicComprehension)
    .where(and(
      eq(topicComprehension.userId, userId),
      eq(topicComprehension.trackId, trackId),
      eq(topicComprehension.topic, topic)
    ))
    .limit(1);

  if (!record) {
    // Create new record
    [record] = await db.insert(topicComprehension)
      .values({
        userId,
        trackId,
        topic,
        attempts: 1,
        correct: correct ? 1 : 0,
        avgLatencyMs: latencyMs,
        comprehension: correct ? '1.00' : '0.00',
        needsReinforcement: false,
      })
      .returning();
  } else {
    // Update existing record
    const newAttempts = record.attempts + 1;
    const newCorrect = record.correct + (correct ? 1 : 0);
    const newComprehension = newCorrect / newAttempts;

    // Update average latency (exponential moving average)
    const newAvgLatency = latencyMs
      ? (record.avgLatencyMs ? Math.round(record.avgLatencyMs * 0.7 + latencyMs * 0.3) : latencyMs)
      : record.avgLatencyMs;

    // Flag for reinforcement if comprehension < threshold after min attempts
    const needsReinforcement = newAttempts >= MIN_ATTEMPTS_BEFORE_FLAG && newComprehension < WEAK_TOPIC_THRESHOLD;

    await db.update(topicComprehension)
      .set({
        attempts: newAttempts,
        correct: newCorrect,
        comprehension: newComprehension.toFixed(2),
        avgLatencyMs: newAvgLatency,
        needsReinforcement,
        updatedAt: new Date(),
      })
      .where(eq(topicComprehension.id, record.id));
  }
}

/**
 * Get weak topics for a learner in a track
 */
export async function getWeakTopics(
  userId: string,
  trackId: string
): Promise<TopicComprehensionData[]> {
  const records = await db.select()
    .from(topicComprehension)
    .where(and(
      eq(topicComprehension.userId, userId),
      eq(topicComprehension.trackId, trackId),
      eq(topicComprehension.needsReinforcement, true)
    ));

  return records.map(r => ({
    topic: r.topic,
    attempts: r.attempts,
    correct: r.correct,
    comprehension: parseFloat(r.comprehension || '0'),
    avgLatencyMs: r.avgLatencyMs,
    needsReinforcement: r.needsReinforcement || false,
  }));
}

/**
 * Get next question using adaptive selection
 */
export async function getNextQuestion(
  userId: string,
  trackId: string
): Promise<NextQuestionResult | null> {
  if (!FF_ADAPTIVE_DIFFICULTY_V1) {
    return null; // Fallback to non-adaptive selection
  }

  const profile = await getLearnerProfile(userId);
  const weakTopics = await getWeakTopics(userId, trackId);

  // Priority 1: Weak topics (if any)
  if (weakTopics.length > 0) {
    const weakTopic = weakTopics[0].topic; // Pick first weak topic
    const question = await findQuestionByTopic(trackId, weakTopic, profile.preferredDifficulty);
    
    if (question) {
      return {
        questionId: question.id,
        difficultyLevel: question.difficultyLevel || 2,
        questionStyle: question.questionStyle || 'mixed',
        topic: question.topic,
        reason: 'weak_topic',
      };
    }
  }

  // Priority 2: Difficulty progression
  const question = await findQuestionByDifficulty(trackId, profile.preferredDifficulty, profile.preferredStyle);
  
  if (question) {
    return {
      questionId: question.id,
      difficultyLevel: question.difficultyLevel || 2,
      questionStyle: question.questionStyle || 'mixed',
      topic: question.topic,
      reason: profile.preferredStyle ? 'style_match' : 'difficulty_progression',
    };
  }

  return null;
}

/**
 * Find question by topic and difficulty
 */
async function findQuestionByTopic(
  trackId: string,
  topic: string,
  preferredDifficulty: number
): Promise<any> {
  const [question] = await db.select()
    .from(items)
    .where(and(
      eq(items.topic, topic),
      eq(items.difficultyLevel, preferredDifficulty)
    ))
    .limit(1);

  return question || null;
}

/**
 * Find question by difficulty and style
 */
async function findQuestionByDifficulty(
  trackId: string,
  preferredDifficulty: number,
  preferredStyle: string | null
): Promise<any> {
  if (preferredStyle) {
    // Try to match style first
    const [question] = await db.select()
      .from(items)
      .where(and(
        eq(items.difficultyLevel, preferredDifficulty),
        eq(items.questionStyle, preferredStyle)
      ))
      .limit(1);

    if (question) return question;
  }

  // Fallback: any question at preferred difficulty
  const [question] = await db.select()
    .from(items)
    .where(eq(items.difficultyLevel, preferredDifficulty))
    .limit(1);

  return question || null;
}

/**
 * Calculate consistency score (0.0 to 1.0)
 * Higher score = more consistent performance
 */
function calculateConsistencyScore(recentAttempts: any[]): number {
  if (recentAttempts.length < 3) return 0.5;

  const correctCount = recentAttempts.filter(a => a.correct).length;
  const correctRate = correctCount / recentAttempts.length;

  // Perfect consistency: all correct or all wrong
  // Low consistency: mixed results
  const deviation = Math.abs(correctRate - 0.5) * 2; // 0 to 1
  return deviation;
}

/**
 * Detect learning style from behavior
 * (Placeholder for future implementation with FF_LEARNING_STYLE_V1)
 */
export async function detectLearningStyle(userId: string): Promise<'visual' | 'verbal' | 'kinesthetic' | null> {
  if (!FF_LEARNING_STYLE_V1) {
    return null;
  }

  // TODO: Implement learning style detection
  // Analyze:
  // - Click patterns (e.g., clicks "Show diagram" frequently → visual)
  // - Time on explanations (reads full text → verbal)
  // - Interaction with examples (interactive scenarios → kinesthetic)

  return null;
}
```

**Acceptance:**
- [ ] `getLearnerProfile()` creates profile if not exists
- [ ] `updateProfile()` adjusts difficulty based on algorithm
- [ ] 3 correct → difficulty increases
- [ ] 2 wrong → difficulty decreases
- [ ] Confusion query → difficulty decreases
- [ ] Topic comprehension tracked per topic
- [ ] Weak topics flagged when comprehension < 70% after 5 attempts
- [ ] `getNextQuestion()` prioritizes weak topics

---

### Phase 3: Adaptive API Routes (2 hours)

**File:** `api/src/routes/adaptive.ts` (NEW)

```typescript
/**
 * Adaptive Difficulty Routes
 * Epic 9: True Adaptive Difficulty Engine
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireLearner, requireManager, getSession } from '../middleware/rbac';
import {
  getLearnerProfile,
  updateProfile,
  getWeakTopics,
  getNextQuestion,
} from '../services/adaptive';

const FF_ADAPTIVE_DIFFICULTY_V1 = process.env.FF_ADAPTIVE_DIFFICULTY_V1 === 'true';

export async function registerAdaptiveRoutes(app: FastifyInstance) {
  /**
   * GET /api/adaptive/profile/:userId
   * Get learner's adaptive profile
   */
  app.get(
    '/api/adaptive/profile/:userId',
    async (req: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
      if (!FF_ADAPTIVE_DIFFICULTY_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      // RBAC: Learner can view own profile, Manager can view their team's profiles
      const session = getSession(req);
      const { userId } = req.params;

      if (session.role === 'learner' && session.userId !== userId) {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Cannot view other learner profiles' }
        });
      }

      try {
        const profile = await getLearnerProfile(userId);
        return reply.send(profile);
      } catch (err: any) {
        return reply.status(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: err.message || 'Failed to get profile'
          }
        });
      }
    }
  );

  /**
   * GET /api/adaptive/next/:userId/:trackId
   * Get next question using adaptive selection
   */
  app.get(
    '/api/adaptive/next/:userId/:trackId',
    async (req: FastifyRequest<{ Params: { userId: string; trackId: string } }>, reply: FastifyReply) => {
      if (!FF_ADAPTIVE_DIFFICULTY_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireLearner(req, reply)) return reply;

      const session = getSession(req);
      const { userId, trackId } = req.params;

      if (session.userId !== userId) {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Cannot get questions for other learners' }
        });
      }

      try {
        const result = await getNextQuestion(userId, trackId);

        if (!result) {
          return reply.status(404).send({
            error: { code: 'NOT_FOUND', message: 'No questions available' }
          });
        }

        return reply.send(result);
      } catch (err: any) {
        return reply.status(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: err.message || 'Failed to get next question'
          }
        });
      }
    }
  );

  /**
   * POST /api/adaptive/feedback
   * Update profile based on attempt
   */
  app.post(
    '/api/adaptive/feedback',
    async (req: FastifyRequest<{
      Body: {
        userId: string;
        trackId: string;
        questionId: string;
        topic: string | null;
        correct: boolean;
        latencyMs: number | null;
        confusionQuery: string | null;
      }
    }>, reply: FastifyReply) => {
      if (!FF_ADAPTIVE_DIFFICULTY_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireLearner(req, reply)) return reply;

      const session = getSession(req);
      const { userId, trackId, questionId, topic, correct, latencyMs, confusionQuery } = req.body;

      if (session.userId !== userId) {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Cannot update other learner profiles' }
        });
      }

      try {
        const result = await updateProfile(userId, trackId, questionId, topic, correct, latencyMs, confusionQuery);
        return reply.send(result);
      } catch (err: any) {
        return reply.status(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: err.message || 'Failed to update profile'
          }
        });
      }
    }
  );

  /**
   * GET /api/adaptive/weak-topics/:userId/:trackId
   * Get topics needing reinforcement
   */
  app.get(
    '/api/adaptive/weak-topics/:userId/:trackId',
    async (req: FastifyRequest<{ Params: { userId: string; trackId: string } }>, reply: FastifyReply) => {
      if (!FF_ADAPTIVE_DIFFICULTY_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      const session = getSession(req);
      const { userId, trackId } = req.params;

      // RBAC: Learner (self) or Manager (their team)
      if (session.role === 'learner' && session.userId !== userId) {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Cannot view other learner weak topics' }
        });
      }

      try {
        const weakTopics = await getWeakTopics(userId, trackId);
        return reply.send({ weakTopics });
      } catch (err: any) {
        return reply.status(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: err.message || 'Failed to get weak topics'
          }
        });
      }
    }
  );
}
```

**Register Routes:**

**File:** `api/src/index.ts`

Add after chat routes:

```typescript
// Adaptive routes (Epic 9)
await safeRegister('./routes/adaptive', ['registerAdaptiveRoutes']);
```

**Acceptance:**
- [ ] GET /api/adaptive/profile/:userId returns profile
- [ ] GET /api/adaptive/next/:userId/:trackId returns adaptive question
- [ ] POST /api/adaptive/feedback updates profile
- [ ] GET /api/adaptive/weak-topics/:userId/:trackId returns weak topics
- [ ] All routes enforce RBAC (learner self, manager team)
- [ ] Feature flag gates all routes

---

### Phase 4: Enhance Learn Routes (1.5 hours)

**File:** `api/src/routes/learn.ts` (MODIFY)

Enhance `/api/learn/submit` and `/api/learn/next` to use adaptive engine.

**Add imports:**

```typescript
import { updateProfile, getNextQuestion } from '../services/adaptive';
const FF_ADAPTIVE_DIFFICULTY_V1 = process.env.FF_ADAPTIVE_DIFFICULTY_V1 === 'true';
```

**Modify POST /api/learn/submit:**

```typescript
app.post('/api/learn/submit', async (req, reply) => {
  const { questionId, answerIndex, answerText, latencyMs } = req.body;

  if (!requireLearner(req, reply)) return reply;

  const session = getSession(req);

  // ... existing validation and attempt recording logic ...

  // After recording attempt, trigger adaptive feedback
  let difficultyChanged = false;
  let newDifficulty = 2;
  let weakTopics: string[] = [];

  if (FF_ADAPTIVE_DIFFICULTY_V1) {
    try {
      // Get question details
      const [question] = await db.select().from(items).where(eq(items.id, questionId)).limit(1);
      
      if (question) {
        const result = await updateProfile(
          session.userId,
          question.trackId, // Assuming items have trackId
          questionId,
          question.topic,
          correct,
          latencyMs || null,
          null // confusionQuery comes from chat, not here
        );

        difficultyChanged = result.difficultyChanged;
        newDifficulty = result.newDifficulty;
        weakTopics = result.weakTopics;
      }
    } catch (err) {
      console.error('[Learn] Adaptive feedback error:', err);
    }
  }

  return reply.send({
    correct,
    feedback: correct ? 'Correct! Well done.' : 'Incorrect. Try again!',
    score: correct ? 1 : 0,
    difficultyChanged,
    newDifficulty,
    weakTopics,
  });
});
```

**Modify GET /api/learn/next:**

```typescript
app.get('/api/learn/next', async (req, reply) => {
  if (!requireLearner(req, reply)) return reply;

  const session = getSession(req);
  const { trackId } = req.query;

  if (!trackId) {
    return reply.status(400).send({
      error: { code: 'BAD_REQUEST', message: 'trackId required' }
    });
  }

  // Try adaptive selection first
  if (FF_ADAPTIVE_DIFFICULTY_V1) {
    try {
      const adaptiveResult = await getNextQuestion(session.userId, trackId as string);
      
      if (adaptiveResult) {
        // Fetch full question details
        const [question] = await db.select().from(items).where(eq(items.id, adaptiveResult.questionId)).limit(1);
        
        if (question) {
          return reply.send({
            questionId: question.id,
            stem: question.stem,
            options: question.options,
            difficultyLevel: adaptiveResult.difficultyLevel,
            reason: adaptiveResult.reason,
          });
        }
      }
    } catch (err) {
      console.error('[Learn] Adaptive selection error:', err);
    }
  }

  // Fallback to existing spaced repetition logic
  // ... existing code ...
});
```

**Acceptance:**
- [ ] `/api/learn/submit` calls `updateProfile()` after recording attempt
- [ ] Response includes `difficultyChanged`, `newDifficulty`, `weakTopics`
- [ ] `/api/learn/next` uses adaptive engine when flag enabled
- [ ] Fallback to spaced repetition if adaptive fails

---

### Phase 5: Manager Dashboard Enhancement (2 hours)

Add adaptive metrics to manager dashboard.

**File:** `web/app/manager/dashboard/page.tsx` (MODIFY)

Add a new "Adaptive Insights" section:

```tsx
import { useEffect, useState } from 'react';

interface AdaptiveInsight {
  userId: string;
  learnerName: string;
  preferredDifficulty: number;
  preferredStyle: string | null;
  weakTopics: string[];
}

export default function ManagerDashboard() {
  const [adaptiveInsights, setAdaptiveInsights] = useState<AdaptiveInsight[]>([]);

  useEffect(() => {
    // Fetch adaptive insights for all team members
    fetch('/api/manager/adaptive-insights')
      .then(res => res.json())
      .then(data => setAdaptiveInsights(data.insights || []))
      .catch(err => console.error('Failed to fetch adaptive insights:', err));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Manager Dashboard</h1>

      {/* Existing analytics sections */}

      {/* Adaptive Insights */}
      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Adaptive Insights</h2>
        <div className="bg-white rounded-lg shadow p-6">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Learner</th>
                <th className="text-left p-2">Difficulty Level</th>
                <th className="text-left p-2">Learning Style</th>
                <th className="text-left p-2">Weak Topics</th>
              </tr>
            </thead>
            <tbody>
              {adaptiveInsights.map(insight => (
                <tr key={insight.userId} className="border-b">
                  <td className="p-2">{insight.learnerName}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded ${
                      insight.preferredDifficulty === 1 ? 'bg-green-100 text-green-800' :
                      insight.preferredDifficulty === 2 ? 'bg-blue-100 text-blue-800' :
                      insight.preferredDifficulty === 3 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      L{insight.preferredDifficulty}
                    </span>
                  </td>
                  <td className="p-2">
                    {insight.preferredStyle || 'Detecting...'}
                  </td>
                  <td className="p-2">
                    {insight.weakTopics.length > 0 ? (
                      <ul className="list-disc list-inside">
                        {insight.weakTopics.map(topic => (
                          <li key={topic} className="text-sm text-red-600">{topic}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-green-600">No weak topics</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
```

**API Route:**

**File:** `api/src/routes/manager.ts` (MODIFY)

Add new endpoint:

```typescript
app.get('/api/manager/adaptive-insights', async (req, reply) => {
  if (!requireManager(req, reply)) return reply;

  const session = getSession(req);

  // Get all learners in manager's team
  const learners = await getTeamMembers(session.orgId, session.userId);

  // Get adaptive profiles for each learner
  const insights = await Promise.all(
    learners.map(async (learner) => {
      const profile = await getLearnerProfile(learner.id);
      const weakTopics = await getWeakTopics(learner.id, learner.trackId); // Assume default track

      return {
        userId: learner.id,
        learnerName: learner.name,
        preferredDifficulty: profile.preferredDifficulty,
        preferredStyle: profile.preferredStyle,
        weakTopics: weakTopics.map(t => t.topic),
      };
    })
  );

  return reply.send({ insights });
});
```

**Acceptance:**
- [ ] Manager dashboard shows adaptive insights table
- [ ] Displays preferred difficulty level (L1-L4)
- [ ] Displays learning style (or "Detecting...")
- [ ] Lists weak topics per learner
- [ ] Color-coded difficulty levels

---

### Phase 6: Background Jobs (1.5 hours)

Add cron jobs for weak topic detection and learning style detection.

**File:** `api/src/cron/adaptiveScheduler.ts` (NEW)

```typescript
/**
 * Adaptive Scheduler
 * Epic 9: Background jobs for adaptive difficulty engine
 */

import cron from 'node-cron';
import { db } from '../db';
import { learnerProfiles, topicComprehension } from '../db/schema';
import { eq, lt } from 'drizzle-orm';
import { detectLearningStyle } from '../services/adaptive';

const FF_ADAPTIVE_DIFFICULTY_V1 = process.env.FF_ADAPTIVE_DIFFICULTY_V1 === 'true';
const FF_LEARNING_STYLE_V1 = process.env.FF_LEARNING_STYLE_V1 === 'true';

/**
 * Weak Topic Detection
 * Runs hourly to flag topics needing reinforcement
 */
export function startWeakTopicDetection() {
  if (!FF_ADAPTIVE_DIFFICULTY_V1) return;

  cron.schedule('0 * * * *', async () => {
    console.log('[Adaptive Scheduler] Running weak topic detection...');

    try {
      // Logic is already in updateProfile, but this ensures consistency
      const topics = await db.select().from(topicComprehension);

      for (const topic of topics) {
        const comprehension = parseFloat(topic.comprehension || '0');
        const needsReinforcement = topic.attempts >= 5 && comprehension < 0.70;

        if (topic.needsReinforcement !== needsReinforcement) {
          await db.update(topicComprehension)
            .set({ needsReinforcement })
            .where(eq(topicComprehension.id, topic.id));
        }
      }

      console.log('[Adaptive Scheduler] Weak topic detection complete');
    } catch (err) {
      console.error('[Adaptive Scheduler] Weak topic detection error:', err);
    }
  });
}

/**
 * Learning Style Detection
 * Runs daily to detect preferred learning styles
 */
export function startLearningStyleDetection() {
  if (!FF_LEARNING_STYLE_V1) return;

  cron.schedule('0 0 * * *', async () => {
    console.log('[Adaptive Scheduler] Running learning style detection...');

    try {
      const profiles = await db.select().from(learnerProfiles);

      for (const profile of profiles) {
        // Only detect if not already set
        if (!profile.preferredStyle) {
          const style = await detectLearningStyle(profile.userId);

          if (style) {
            await db.update(learnerProfiles)
              .set({ preferredStyle: style })
              .where(eq(learnerProfiles.userId, profile.userId));
          }
        }
      }

      console.log('[Adaptive Scheduler] Learning style detection complete');
    } catch (err) {
      console.error('[Adaptive Scheduler] Learning style detection error:', err);
    }
  });
}
```

**Initialize Cron Jobs:**

**File:** `api/src/index.ts`

Add after route registration:

```typescript
import { startWeakTopicDetection, startLearningStyleDetection } from './cron/adaptiveScheduler';

// Start adaptive cron jobs
startWeakTopicDetection();
startLearningStyleDetection();
```

**Acceptance:**
- [ ] Weak topic detection runs hourly
- [ ] Learning style detection runs daily
- [ ] Cron jobs only run when flags enabled
- [ ] Errors logged but don't crash server

---

### Phase 7: Testing & Documentation (2 hours)

**Unit Tests:**

**File:** `api/tests/adaptive.test.ts` (NEW)

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getLearnerProfile, updateProfile, getWeakTopics } from '../src/services/adaptive';
import { db } from '../src/db';
import { learnerProfiles, topicComprehension } from '../src/db/schema';

describe('Adaptive Service', () => {
  beforeAll(async () => {
    process.env.FF_ADAPTIVE_DIFFICULTY_V1 = 'true';
  });

  it('should create learner profile with default difficulty 2', async () => {
    const profile = await getLearnerProfile('test-user-1');
    expect(profile.preferredDifficulty).toBe(2);
  });

  it('should increase difficulty after 3 correct answers', async () => {
    // Simulate 3 correct attempts
    await updateProfile('test-user-2', 'track-1', 'q1', 'topic-1', true, 10000, null);
    await updateProfile('test-user-2', 'track-1', 'q2', 'topic-1', true, 10000, null);
    const result = await updateProfile('test-user-2', 'track-1', 'q3', 'topic-1', true, 10000, null);

    expect(result.difficultyChanged).toBe(true);
    expect(result.newDifficulty).toBe(3);
  });

  it('should decrease difficulty after 2 wrong answers', async () => {
    await updateProfile('test-user-3', 'track-1', 'q1', 'topic-1', false, 35000, null);
    const result = await updateProfile('test-user-3', 'track-1', 'q2', 'topic-1', false, 35000, null);

    expect(result.difficultyChanged).toBe(true);
    expect(result.newDifficulty).toBe(1);
  });

  it('should flag weak topics when comprehension < 70%', async () => {
    // Simulate 5 attempts with 3 correct (60% comprehension)
    await updateProfile('test-user-4', 'track-1', 'q1', 'weak-topic', true, 15000, null);
    await updateProfile('test-user-4', 'track-1', 'q2', 'weak-topic', false, 20000, null);
    await updateProfile('test-user-4', 'track-1', 'q3', 'weak-topic', true, 18000, null);
    await updateProfile('test-user-4', 'track-1', 'q4', 'weak-topic', false, 25000, null);
    await updateProfile('test-user-4', 'track-1', 'q5', 'weak-topic', true, 17000, null);

    const weakTopics = await getWeakTopics('test-user-4', 'track-1');
    expect(weakTopics.length).toBeGreaterThan(0);
    expect(weakTopics[0].needsReinforcement).toBe(true);
  });
});
```

**Route Tests:**

**File:** `api/tests/adaptive-routes.test.ts` (NEW)

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { build } from '../src/app';
import { FastifyInstance } from 'fastify';

describe('Adaptive Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.FF_ADAPTIVE_DIFFICULTY_V1 = 'true';
    app = await build();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/adaptive/profile/:userId requires authentication', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/adaptive/profile/test-user',
    });

    expect(response.statusCode).toBe(401);
  });

  it('GET /api/adaptive/profile/:userId returns profile', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/adaptive/profile/test-user',
      headers: { cookie: 'cerply.sid=test-session' },
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json.preferredDifficulty).toBeDefined();
  });

  // Add more tests...
});
```

**Smoke Tests:**

**File:** `api/scripts/smoke-adaptive.sh` (NEW)

```bash
#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:8080}"
ADMIN_TOKEN="${ADMIN_TOKEN:-dev-admin-token-12345}"
USER_ID="${USER_ID:-test-user-123}"
TRACK_ID="${TRACK_ID:-test-track-456}"

echo "🔍 Smoke Testing Epic 9: Adaptive Difficulty"
echo "API: $API_BASE"
echo ""

# Test 1: Get profile
echo "Test 1: GET /api/adaptive/profile/:userId"
curl "$API_BASE/api/adaptive/profile/$USER_ID" \
  -H "x-admin-token: $ADMIN_TOKEN" | jq
echo ""

# Test 2: Get next adaptive question
echo "Test 2: GET /api/adaptive/next/:userId/:trackId"
curl "$API_BASE/api/adaptive/next/$USER_ID/$TRACK_ID" \
  -H "x-admin-token: $ADMIN_TOKEN" | jq
echo ""

# Test 3: Get weak topics
echo "Test 3: GET /api/adaptive/weak-topics/:userId/:trackId"
curl "$API_BASE/api/adaptive/weak-topics/$USER_ID/$TRACK_ID" \
  -H "x-admin-token: $ADMIN_TOKEN" | jq
echo ""

# Test 4: Submit adaptive feedback
echo "Test 4: POST /api/adaptive/feedback"
curl -X POST "$API_BASE/api/adaptive/feedback" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "trackId": "'$TRACK_ID'",
    "questionId": "q1",
    "topic": "test-topic",
    "correct": true,
    "latencyMs": 12000,
    "confusionQuery": null
  }' | jq
echo ""

echo "✅ Smoke tests complete"
```

Make executable:
```bash
chmod +x api/scripts/smoke-adaptive.sh
```

**Documentation:**

**File:** `docs/functional-spec.md`

Add new section:

```markdown
## 30) True Adaptive Difficulty Engine (Epic 9) — ✅ IMPLEMENTED

**Covers BRD:** L-2 (Adaptive lesson plans with dynamic difficulty adjustment)

**Epic Status:** ✅ IMPLEMENTED 2025-10-12 | Epic: Epic 9 | Tests: `api/tests/adaptive.test.ts`

Dynamic difficulty adjustment based on real-time learner performance signals (correctness, latency, confusion, attempts, spaced recall).

**Key Features:**
- 4 difficulty levels (L1: Recall, L2: Application, L3: Analysis, L4: Synthesis)
- Adaptive algorithm: 3 correct → increase difficulty; 2 wrong → decrease
- Topic weakness detection: Comprehension < 70% → automatic reinforcement
- Learning style adaptation: Visual/Verbal/Kinesthetic (future phase)
- Performance signals: Correctness + latency + confusion + attempts + spaced recall

**API Routes:**
- GET /api/adaptive/profile/:userId - Get learner's adaptive profile
- GET /api/adaptive/next/:userId/:trackId - Get next question (difficulty-adjusted)
- POST /api/adaptive/feedback - Update profile based on attempt
- GET /api/adaptive/weak-topics/:userId/:trackId - Get topics needing reinforcement

**Database Schema:**
- learner_profiles (id, user_id, preferred_difficulty, preferred_style, avg_latency_ms, consistency_score)
- topic_comprehension (id, user_id, track_id, topic, attempts, correct, comprehension, needs_reinforcement)
- items (difficulty_level, question_style, topic) - enhanced columns

**Feature Flags:**
- FF_ADAPTIVE_DIFFICULTY_V1 - Enable adaptive difficulty
- FF_LEARNING_STYLE_V1 - Enable learning style detection (future)
- ADAPTIVE_MIN_DIFFICULTY - Minimum difficulty level (default: 1)
- ADAPTIVE_MAX_DIFFICULTY - Maximum difficulty level (default: 4)
- WEAK_TOPIC_THRESHOLD - Comprehension threshold for weak topics (default: 0.70)
```

**File:** `docs/spec/flags.md`

Add:

```markdown
Adaptive Difficulty Engine (Epic 9)
- FF_ADAPTIVE_DIFFICULTY_V1 (default: false) - Enable adaptive difficulty engine
- FF_LEARNING_STYLE_V1 (default: false) - Enable learning style detection
- ADAPTIVE_MIN_DIFFICULTY (default: 1) - Minimum difficulty level (1-4)
- ADAPTIVE_MAX_DIFFICULTY (default: 4) - Maximum difficulty level (1-4)
- WEAK_TOPIC_THRESHOLD (default: 0.70) - Comprehension threshold for weak topics
- MIN_ATTEMPTS_BEFORE_FLAG (default: 5) - Minimum attempts before flagging weak topic
```

**Acceptance:**
- [ ] All tests pass (unit, route, smoke)
- [ ] Documentation updated
- [ ] Feature flags documented
- [ ] Smoke tests executable

---

## 5. Adaptive Algorithm Details

### Algorithm Pseudocode

```
function selectNextQuestion(userId, trackId):
  profile = getLearnerProfile(userId)
  weakTopics = getWeakTopics(userId, trackId)
  
  // Priority 1: Weak topics (comprehension < 70%)
  if weakTopics.length > 0:
    topic = weakTopics[0]
    question = findQuestionByTopic(topic, profile.preferredDifficulty)
    if question:
      return question, reason="weak_topic"
  
  // Priority 2: Difficulty progression
  question = findQuestionByDifficulty(profile.preferredDifficulty, profile.preferredStyle)
  if question:
    return question, reason="difficulty_progression"
  
  // Priority 3: Fallback to spaced repetition
  return spacedRepetitionQuestion(userId, trackId)

function updateProfileAfterAttempt(userId, trackId, correct, latencyMs, confusionQuery):
  recentAttempts = getRecentAttempts(userId, limit=5)
  
  // Count recent performance
  recentCorrect = count(recentAttempts where correct=true)
  recentWrong = count(recentAttempts where correct=false)
  avgLatency = average(recentAttempts.latencyMs)
  
  // Determine difficulty change
  if recentCorrect >= 3 AND avgLatency < 15000 AND confusionQuery is null:
    if profile.preferredDifficulty < MAX_DIFFICULTY:
      profile.preferredDifficulty += 1
      message = "Difficulty increased! 🎉"
  
  else if recentWrong >= 2 OR avgLatency > 30000 OR confusionQuery is not null:
    if profile.preferredDifficulty > MIN_DIFFICULTY:
      profile.preferredDifficulty -= 1
      message = "Difficulty decreased. Keep practicing!"
  
  // Update topic comprehension
  topicComp = getTopicComprehension(userId, trackId, topic)
  topicComp.attempts += 1
  topicComp.correct += (correct ? 1 : 0)
  topicComp.comprehension = topicComp.correct / topicComp.attempts
  
  if topicComp.attempts >= 5 AND topicComp.comprehension < 0.70:
    topicComp.needsReinforcement = true
  
  saveProfile(profile)
  saveTopicComprehension(topicComp)
```

### Latency Interpretation

| Latency | Interpretation | Action |
|---------|----------------|--------|
| < 10s | Very confident | Increase difficulty if pattern continues |
| 10-30s | Normal | No action |
| > 30s | Struggling | Decrease difficulty if pattern continues |

### Consistency Score

Measures how consistent learner performance is:

```
consistencyScore = abs(correctRate - 0.5) * 2

Examples:
- 5/5 correct → correctRate=1.0 → consistency=1.0 (perfect)
- 0/5 correct → correctRate=0.0 → consistency=1.0 (consistently wrong)
- 3/5 correct → correctRate=0.6 → consistency=0.2 (inconsistent)
```

Higher consistency = easier to predict optimal difficulty.

---

## 6. Acceptance Criteria

### Database & Schema
- [ ] items table has 3 new columns (difficulty_level, question_style, topic)
- [ ] learner_profiles table created with indexes
- [ ] topic_comprehension table created with indexes
- [ ] Migration runs without errors
- [ ] Existing questions default to L2 (Application)

### Adaptive Service
- [ ] `getLearnerProfile()` creates profile with default difficulty 2
- [ ] `updateProfile()` increases difficulty after 3 correct
- [ ] `updateProfile()` decreases difficulty after 2 wrong
- [ ] `updateProfile()` decreases difficulty after high latency (>30s)
- [ ] `updateProfile()` decreases difficulty after confusion query
- [ ] Never drops below MIN_DIFFICULTY (default: 1)
- [ ] Never exceeds MAX_DIFFICULTY (default: 4)
- [ ] Topic comprehension tracked per topic
- [ ] Weak topics flagged when comprehension < 70% after 5 attempts
- [ ] `getNextQuestion()` prioritizes weak topics
- [ ] `getNextQuestion()` matches learning style if available

### Adaptive API Routes
- [ ] GET /api/adaptive/profile/:userId returns profile
- [ ] GET /api/adaptive/next/:userId/:trackId returns adaptive question
- [ ] POST /api/adaptive/feedback updates profile and returns result
- [ ] GET /api/adaptive/weak-topics/:userId/:trackId returns weak topics
- [ ] All routes enforce RBAC (learner self, manager team)
- [ ] Feature flag gates all routes (return 404 if disabled)
- [ ] Error envelopes returned on failures

### Learn Route Enhancement
- [ ] POST /api/learn/submit calls adaptive feedback after recording attempt
- [ ] Response includes difficultyChanged, newDifficulty, weakTopics
- [ ] GET /api/learn/next uses adaptive engine when flag enabled
- [ ] Fallback to spaced repetition if adaptive fails or disabled

### Manager Dashboard
- [ ] Manager dashboard shows adaptive insights table
- [ ] Displays preferred difficulty level (L1-L4) per learner
- [ ] Displays learning style (or "Detecting...")
- [ ] Lists weak topics per learner
- [ ] Color-coded difficulty levels (green/blue/yellow/red)

### Background Jobs
- [ ] Weak topic detection cron runs hourly
- [ ] Learning style detection cron runs daily
- [ ] Cron jobs only run when flags enabled
- [ ] Errors logged but don't crash server

### Testing
- [ ] Unit tests pass for adaptive service
- [ ] Unit tests verify difficulty increase (3 correct)
- [ ] Unit tests verify difficulty decrease (2 wrong)
- [ ] Unit tests verify weak topic flagging
- [ ] Route tests pass for all endpoints
- [ ] Route tests verify RBAC enforcement
- [ ] Smoke tests pass for all 4 endpoints
- [ ] E2E test: 3 correct → harder question
- [ ] E2E test: 2 wrong → easier question

### Documentation
- [ ] Functional spec updated (new section §30)
- [ ] Feature flags documented in docs/spec/flags.md
- [ ] Use cases documented in docs/spec/use-cases.md
- [ ] API routes documented in openapi.yaml
- [ ] README updated with adaptive instructions

### Feature Flags
- [ ] FF_ADAPTIVE_DIFFICULTY_V1 gates adaptive routes and logic
- [ ] FF_LEARNING_STYLE_V1 gates style detection (future)
- [ ] ADAPTIVE_MIN_DIFFICULTY configurable
- [ ] ADAPTIVE_MAX_DIFFICULTY configurable
- [ ] WEAK_TOPIC_THRESHOLD configurable
- [ ] Routes return 404 when flags disabled

---

## 7. Testing Instructions

### Unit Tests

Run adaptive service tests:
```bash
cd api
npm run test src/services/adaptive.test.ts
```

Expected output:
- Profile created with default difficulty 2
- Difficulty increases after 3 correct
- Difficulty decreases after 2 wrong
- Weak topics flagged correctly

### Route Tests

Run adaptive route tests:
```bash
cd api
npm run test tests/adaptive-routes.test.ts
```

Expected output:
- All tests pass
- RBAC enforcement verified
- Feature flag gating verified

### Smoke Tests

**Prerequisites:**
1. API running on http://localhost:8080
2. Feature flags enabled:
   ```bash
   export FF_ADAPTIVE_DIFFICULTY_V1=true
   export FF_LEARNING_STYLE_V1=true
   ```

**Run smoke tests:**
```bash
cd api
./scripts/smoke-adaptive.sh
```

Expected output:
- GET /api/adaptive/profile/:userId returns 200
- GET /api/adaptive/next/:userId/:trackId returns 200 with difficultyLevel
- POST /api/adaptive/feedback returns 200 with difficultyChanged
- GET /api/adaptive/weak-topics/:userId/:trackId returns 200 with array

### E2E Tests

**Scenario 1: Difficulty Progression**
1. Login as learner
2. Navigate to /learn
3. Answer 3 questions correctly with low latency (<10s each)
4. Verify difficulty increased to L3
5. Answer 2 questions incorrectly
6. Verify difficulty decreased to L2

**Scenario 2: Weak Topic Detection**
1. Answer 5 questions on "fire-safety.evacuation"
2. Get 3 correct, 2 wrong (60% comprehension)
3. Navigate to /manager/dashboard (as manager)
4. Verify "fire-safety.evacuation" listed as weak topic
5. As learner, request next question
6. Verify question is on "fire-safety.evacuation" (weak topic prioritized)

**Scenario 3: Confusion Trigger**
1. Answer question incorrectly
2. Open chat (Cmd+K)
3. Type "I don't understand this answer"
4. Verify explanation returned (from Epic 8)
5. Submit next question
6. Verify difficulty decreased due to confusion signal

---

## 8. Rollout Plan

### Phase 1: Internal Testing (Week 1)

**Flags:**
```bash
FF_ADAPTIVE_DIFFICULTY_V1=false  # Off in production
FF_LEARNING_STYLE_V1=false
```

**Actions:**
- Deploy code to staging
- Enable flags in staging only
- Internal team tests adaptive logic
- Validate difficulty transitions (3 correct → increase, 2 wrong → decrease)
- Monitor weak topic detection
- Fix any bugs

### Phase 2: Shadow Mode (Week 2)

**Flags:**
```bash
FF_ADAPTIVE_DIFFICULTY_V1=true  # Enable in production
FF_LEARNING_STYLE_V1=false  # Keep off for now
```

**Actions:**
- Enable adaptive in production BUT don't use for question selection yet
- Only log adaptive decisions (don't enforce)
- Compare adaptive selections vs spaced repetition
- Monitor performance metrics
- Tune algorithm parameters if needed

### Phase 3: Beta Users (Week 3)

**Flags:**
```bash
FF_ADAPTIVE_DIFFICULTY_V1=true  # Fully enabled
FF_LEARNING_STYLE_V1=false
```

**Actions:**
- Use adaptive engine for question selection (not just logging)
- Invite 10-20 beta learners
- Monitor engagement metrics
- Collect feedback on difficulty feel
- Refine weak topic threshold if needed

### Phase 4: Full Rollout (Week 4)

**Flags:**
- All flags enabled
- No changes

**Actions:**
- Announce feature to all learners
- Update documentation
- Monitor for 1 week
- Prepare Epic 6.6 (Content Library Seeding) to leverage difficulty tagging

---

## 9. References

### Key Files to Study

1. **`docs/MVP_B2B_ROADMAP.md`** (lines 953-1114) - Epic 9 requirements
2. **`docs/brd/cerply-brd.md`** (L-2) - BRD requirements
3. **`EPIC8_IMPLEMENTATION_PROMPT.md`** - Epic 8 provides confusion signals
4. **`api/src/services/spaced.ts`** - Existing spaced repetition logic
5. **`api/src/routes/learn.ts`** - Existing learn routes
6. **`api/src/services/gamification.ts`** - Service layer pattern

### Dependencies

**API:**
- `node-cron` - Cron jobs for background tasks (already installed from Epic 7)
- No new dependencies required

### External Resources

- Bloom's Taxonomy: https://en.wikipedia.org/wiki/Bloom%27s_taxonomy
- Adaptive Learning: https://en.wikipedia.org/wiki/Adaptive_learning
- Learning Styles: https://en.wikipedia.org/wiki/Learning_styles

---

## 10. Quick Start Checklist

Before starting implementation:

- [ ] Read this prompt fully (30 min)
- [ ] Review Epic 8 for confusion tracking (30 min)
- [ ] Review BRD L-2 (15 min)
- [ ] Study `api/src/services/spaced.ts` for spaced repetition (15 min)
- [ ] Study `api/src/routes/learn.ts` for existing logic (15 min)
- [ ] Verify feature flags understand: `FF_ADAPTIVE_DIFFICULTY_V1`, `FF_LEARNING_STYLE_V1` (5 min)

Implementation order:

1. [ ] Phase 1: Database Schema (1.5 hours)
2. [ ] Phase 2: Adaptive Service Core (3 hours)
3. [ ] Phase 3: Adaptive API Routes (2 hours)
4. [ ] Phase 4: Enhance Learn Routes (1.5 hours)
5. [ ] Phase 5: Manager Dashboard Enhancement (2 hours)
6. [ ] Phase 6: Background Jobs (1.5 hours)
7. [ ] Phase 7: Testing & Documentation (2 hours)

Post-implementation:

- [ ] Run all tests: `npm run test`
- [ ] Run smoke tests: `./api/scripts/smoke-adaptive.sh`
- [ ] Test E2E scenarios manually
- [ ] Update functional spec
- [ ] Update feature flags documentation
- [ ] Commit with `[spec]` tag: `git commit -m "feat(adaptive): Epic 9 true adaptive difficulty [spec]"`

---

## Total Effort Summary

| Phase | Task | Hours |
|-------|------|-------|
| 1 | Database Schema | 1.5 |
| 2 | Adaptive Service Core | 3 |
| 3 | Adaptive API Routes | 2 |
| 4 | Enhance Learn Routes | 1.5 |
| 5 | Manager Dashboard Enhancement | 2 |
| 6 | Background Jobs | 1.5 |
| 7 | Testing & Documentation | 2 |
| **Total** | | **13.5 hours** |

**Estimated:** 1.5 overnights  
**Priority:** P1 (Core Learning Science)  
**Epic:** 9 of 12  
**Status:** Ready for implementation

---

**End of Epic 9 Implementation Prompt**

Good luck! 🚀

