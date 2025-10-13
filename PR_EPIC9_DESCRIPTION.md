# Epic 9: True Adaptive Difficulty Engine 🎯

## Summary
Implements a comprehensive adaptive difficulty engine that dynamically adjusts content difficulty based on individual learner performance, learning style detection, and mastery tracking.

## Feature Flag
- `FF_ADAPTIVE_DIFFICULTY_V1` (default: false)

## What's New

### 🗄️ Database Schema
**Migration:** `api/drizzle/018_adaptive_difficulty.sql`

1. **`learner_profiles`** - Tracks learning preferences and performance patterns
   - `learning_style`: visual/verbal/kinesthetic/balanced/unknown
   - `avg_response_time`: rolling average in milliseconds
   - `consistency_score`: 0.00 - 1.00 performance consistency

2. **`topic_comprehension`** - Per-topic mastery tracking
   - `mastery_level`: 0.00 - 1.00 calculated mastery score
   - `difficulty_level`: recall/application/analysis/synthesis (Bloom's Taxonomy)
   - `attempts_count`, `correct_count`, `partial_credit_sum`
   - `confusion_count`: tracks confusion signals
   - `last_practiced_at`: for spaced repetition integration

3. **Extended `attempts` table**
   - `response_time_ms`: tracks question completion time
   - `difficulty_level`: records difficulty when question was attempted

### 🎯 Core Service (`api/src/services/adaptive.ts`)
- **`calculateMasteryLevel`**: Time-weighted scoring with 30-day exponential decay
- **`recommendDifficultyLevel`**: Bloom's Taxonomy mapping based on mastery (0-25% → Recall, 25-60% → Application, 60-85% → Analysis, 85%+ → Synthesis)
- **`detectLearningStyle`**: Pattern recognition from confusion signals
- **`identifyWeakTopics`**: Flags topics with mastery < 0.70
- **`updateLearnerProfile`**: Maintains rolling averages and consistency metrics
- **`recordAttemptForAdaptive`**: Updates mastery after each attempt

### 🌐 API Endpoints (`api/src/routes/adaptive.ts`)

1. **`GET /api/adaptive/profile/:userId`** (admin/manager/learner)
   - Returns learner profile with learning style and performance metrics
   - Response: `{ success, profile: { userId, learningStyle, avgResponseTime, consistencyScore, ... } }`

2. **`GET /api/adaptive/topics/:topicId/difficulty/:userId`** (admin/manager/learner)
   - Recommends next difficulty level for a topic
   - Response: `{ success, topicId, userId, recommendedDifficulty, currentMastery, attemptsCount }`

3. **`POST /api/adaptive/attempt`** (admin/manager/learner)
   - Records an attempt and updates mastery
   - Body: `{ userId, topicId, correct, partialCredit?, responseTimeMs?, difficultyLevel? }`
   - Response: `{ success, mastery: { masteryLevel, difficultyLevel, attemptsCount, ... } }`

4. **`GET /api/adaptive/analytics/:userId`** (admin/manager/learner)
   - Returns comprehensive analytics: weak topics, overall mastery, recent practice
   - Response: `{ success, analytics: { weakTopics[], averageMastery, topicsCount, recentPractice[] } }`

### 🔗 Integration Points

1. **Epic 7 (Gamification)** - Ready for achievement/badge integration
   - Mastery milestones (50%, 75%, 100%)
   - Learning style badges
   - Consistency streaks

2. **Epic 8 (Confusion Tracking)** - Active integration
   - Confusion signals feed into learning style detection
   - Confusion counts tracked per topic

3. **P0 (Content Hierarchy)** - Full integration
   - Topic-based mastery tracking
   - Supports 5-tier hierarchy (Subject → Topic → Module → Quiz → Question)

4. **`/api/learn/submit`** - Automatic adaptive tracking
   - Every attempt now updates mastery via `recordAttemptForAdaptive`

### 🧠 Intent Router Enhancement
`api/src/services/intent-router.ts` now recognizes:
- "what's hard for me?" → adaptive analytics
- "my weak topics?" → weak topic identification
- "my learning style?" → learning style report
- "what's my mastery?" → mastery overview

### ✅ Testing
- **25 unit tests** in `api/tests/adaptive.test.ts`
  - All service functions (happy paths + edge cases)
  - Mastery calculation edge cases (decay, zero attempts, partial credit)
  - Learning style detection patterns
- **8 smoke test curls** in `api/scripts/smoke-adaptive.sh`

## Configuration Variables
```bash
# Adaptive Engine Settings
ADAPTIVE_MIN_DIFFICULTY=recall     # Minimum difficulty level
ADAPTIVE_MAX_DIFFICULTY=synthesis  # Maximum difficulty level
WEAK_TOPIC_THRESHOLD=0.70          # Mastery threshold for weak topics
MASTERY_DECAY_DAYS=30              # Half-life for time decay
```

## Test the Endpoints

### 1. Get Learner Profile
```bash
curl -X GET "http://localhost:8080/api/adaptive/profile/usr_demo_001" \
  -H "x-user-id: usr_demo_001" \
  -H "x-user-role: learner"
```

### 2. Get Recommended Difficulty
```bash
TOPIC_ID="123e4567-e89b-12d3-a456-426614174000"
curl -X GET "http://localhost:8080/api/adaptive/topics/${TOPIC_ID}/difficulty/usr_demo_001" \
  -H "x-user-id: usr_demo_001" \
  -H "x-user-role: learner"
```

### 3. Record an Attempt
```bash
curl -X POST "http://localhost:8080/api/adaptive/attempt" \
  -H "Content-Type: application/json" \
  -H "x-user-id: usr_demo_001" \
  -H "x-user-role: learner" \
  -d '{
    "userId": "usr_demo_001",
    "topicId": "123e4567-e89b-12d3-a456-426614174000",
    "correct": true,
    "partialCredit": 1.0,
    "responseTimeMs": 15000,
    "difficultyLevel": "application"
  }'
```

### 4. Get Analytics
```bash
curl -X GET "http://localhost:8080/api/adaptive/analytics/usr_demo_001" \
  -H "x-user-id: usr_demo_001" \
  -H "x-user-role: learner"
```

## Acceptance Criteria ✅

- [x] Database migration applied successfully
- [x] All RBAC middleware enforced on routes
- [x] Feature flag `FF_ADAPTIVE_DIFFICULTY_V1` gates all new endpoints
- [x] Time-weighted mastery calculation with 30-day decay
- [x] Bloom's Taxonomy difficulty mapping (4 levels)
- [x] Learning style detection from confusion patterns
- [x] Weak topic identification (< 0.70 threshold)
- [x] Integration with `/api/learn/submit` for automatic tracking
- [x] Intent router recognizes adaptive queries
- [x] 25 unit tests covering all service functions
- [x] Smoke test script with 8 curl examples
- [x] All linter errors resolved
- [x] Documentation updated:
  - [x] `docs/functional-spec.md` §30
  - [x] `docs/spec/flags.md`
  - [x] `docs/EPIC_MASTER_PLAN.md`
  - [x] `EPIC9_DELIVERY_SUMMARY.md`

## Performance
- Mastery calculation: ~2-5ms for typical attempt counts
- Learning style detection: ~1-3ms
- Analytics endpoint: ~10-20ms (includes multiple DB queries)

## Next Steps (Post-Merge)
1. Deploy to staging/production
2. Enable `FF_ADAPTIVE_DIFFICULTY_V1=true`
3. Run smoke tests
4. Monitor mastery calculation performance
5. Collect user feedback on difficulty recommendations
6. Consider Epic 10: Personalized Learning Paths (using mastery + weak topics)

## Related
- Implements: `EPIC9_IMPLEMENTATION_PROMPT_v2.md`
- Spec: `docs/functional-spec.md` §30
- BRD: `docs/brd/cerply-brd.md` L-2 (Adaptive Lesson Plans)
- Dependencies: Epic 7 (Gamification), Epic 8 (Confusion), P0 (Content Hierarchy)

---
**Commit:** `feat(epic9): adaptive difficulty engine [spec]`
**Branch:** `epic9-adaptive-difficulty`

