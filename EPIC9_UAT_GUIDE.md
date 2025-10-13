# Epic 9: Adaptive Difficulty Engine - UAT Guide

**Date:** 2025-10-13  
**Status:** Ready for Testing  
**Prerequisites:** ✅ Database migration run, ✅ FF_ADAPTIVE_DIFFICULTY_V1=true set in Render

---

## Quick Green-Light Plan (Copy/Paste)

### 1) Preflight (Local or Staging)

```bash
# From repo root
cd api

# Run migration (adds learner_profiles, topic_comprehension, attempts fields)
npm run db:migrate
# OR manually: psql $DATABASE_URL < drizzle/018_adaptive_difficulty.sql

# Start API with the flag
FF_ADAPTIVE_DIFFICULTY_V1=true npm run dev
```

**Verify flag + routes:**

```bash
curl -sS http://localhost:8080/flags | jq
# Expect FF_ADAPTIVE_DIFFICULTY_V1: true
```

---

### 2) Run the Smoke Script for Epic 9

```bash
# Provided by Epic 9 (8 automated tests)
bash api/scripts/smoke-adaptive.sh

# Expected output:
# ✓ PASS - Get learner adaptive profile
# ✓ PASS - Get recommended difficulty for topic
# ✓ PASS - Record adaptive attempt
# ✓ PASS - Get adaptive analytics
# ... (8 total tests)
```

All 8 checks should pass. If they fail, check:
- Database migration ran successfully
- Feature flag is enabled
- Test user/topic IDs exist in database

---

## 3) Manual UAT (API-First)

### Actual Endpoints (from api/src/routes/adaptive.ts)

Epic 9 implements these 4 endpoints:

1. **`GET /api/adaptive/profile/:userId`** - Get learner profile + weak topics
2. **`GET /api/adaptive/topics/:topicId/difficulty/:userId`** - Get recommended difficulty
3. **`POST /api/adaptive/attempt`** - Record attempt and update mastery
4. **`GET /api/adaptive/analytics/:userId`** - Get full adaptive analytics dashboard

### A. Submit Attempts to Generate Adaptive Signals

First, generate some adaptive data by submitting attempts:

```bash
# Submit 6-10 mixed attempts (correct/incorrect, varied latency, partial credit)
# The adaptive tracking happens automatically when FF_ADAPTIVE_DIFFICULTY_V1=true

# Example submission (assumes Epic 8 is enabled for free-text)
curl -sS -X POST http://localhost:8080/api/learn/submit \
  -H "x-admin-token: dev-admin-token" \
  -H "content-type: application/json" \
  -d '{
    "itemId": "<QUESTION_UUID>",
    "answerText": "my free-text answer",
    "responseTimeMs": 2300,
    "planId": "default-plan"
  }'

# Repeat with different questions, some correct, some incorrect
# The learn/submit endpoint automatically calls recordAttemptForAdaptive()
```

### B. Get Learner Profile (includes weak topics)

```bash
# Replace USER_UUID with actual user ID
curl -sS "http://localhost:8080/api/adaptive/profile/USER_UUID" \
  -H "x-admin-token: dev-admin-token" | jq

# Expected response:
# {
#   "profile": {
#     "userId": "...",
#     "learningStyle": "visual",
#     "learningStyleConfidence": 0.85,
#     "avgResponseTime": 3200,
#     "consistencyScore": 0.76
#   },
#   "weakTopics": [
#     {
#       "topicId": "...",
#       "topicTitle": "Machine Learning",
#       "mastery": 0.45,
#       "attemptsCount": 12,
#       "lastPracticedAt": "2025-10-13T..."
#     }
#   ],
#   "learningStyleSignals": {
#     "textConfusion": 5,
#     "diagramConfusion": 2,
#     "scenarioConfusion": 1,
#     "totalAttempts": 8
#   }
# }
```

### C. Get Recommended Difficulty for Topic

```bash
# Replace TOPIC_UUID and USER_UUID
curl -sS "http://localhost:8080/api/adaptive/topics/TOPIC_UUID/difficulty/USER_UUID" \
  -H "x-admin-token: dev-admin-token" | jq

# Expected response:
# {
#   "difficulty": "application",
#   "masteryLevel": 0.68,
#   "confidence": 0.92,
#   "reasoning": "Applying concepts to new situations. Practice using knowledge in different contexts."
# }
```

**Difficulty levels (Bloom's Taxonomy):**
- `recall` - < 0.50 mastery (Remember facts)
- `application` - 0.50-0.75 mastery (Apply concepts)
- `analysis` - 0.75-0.90 mastery (Break down problems)
- `synthesis` - > 0.90 mastery (Create solutions)

### D. Get Full Adaptive Analytics

```bash
# Replace USER_UUID
curl -sS "http://localhost:8080/api/adaptive/analytics/USER_UUID" \
  -H "x-admin-token: dev-admin-token" | jq

# Expected response:
# {
#   "overallMastery": 0.68,
#   "learningStyle": "visual",
#   "learningStyleConfidence": 0.85,
#   "topicBreakdown": [
#     {
#       "topicId": "...",
#       "masteryLevel": 0.72,
#       "difficultyLevel": "application",
#       "attemptsCount": 15,
#       "correctCount": 11,
#       "confusionCount": 2,
#       "lastPracticedAt": "..."
#     }
#   ],
#   "strengthTopics": [...],  // mastery >= 0.80
#   "weakTopics": [...],      // mastery < 0.70
#   "totalTopicsPracticed": 5
# }
```

### E. Record Adaptive Attempt (Direct API)

```bash
# Normally called automatically by /api/learn/submit, but can be called directly
curl -sS -X POST "http://localhost:8080/api/adaptive/attempt" \
  -H "x-admin-token: dev-admin-token" \
  -H "content-type: application/json" \
  -d '{
    "userId": "USER_UUID",
    "topicId": "TOPIC_UUID",
    "questionId": "QUESTION_UUID",
    "correct": true,
    "partialCredit": 0.85,
    "responseTimeMs": 3500,
    "difficultyLevel": "application"
  }' | jq

# Expected response:
# {
#   "success": true,
#   "newMastery": 0.72
# }
```

### F. Chat Intents (Epic 8 Integration)

The intent router has been enhanced with adaptive patterns:

```bash
# Test adaptive intent detection
curl -sS -X POST http://localhost:8080/api/chat/message \
  -H "x-admin-token: dev-admin-token" \
  -H "content-type: application/json" \
  -d '{"message":"what are my weak topics?"}' | jq

# Should route to "progress" intent and include adaptive insights
# The chat handler should then call /api/adaptive/profile to get weak topics

# Other adaptive queries that trigger "progress" intent:
# - "what's hard for me?"
# - "what do I need to practice?"
# - "my learning style"
# - "show my weaknesses"
# - "what should I improve?"
```

---

## 4) Database Spot-Checks (psql)

```bash
# Connect to your database
psql $DATABASE_URL
```

### Check Topic Comprehension (mastery tracking)

```sql
-- Recent adaptive writes (topic mastery)
SELECT 
  tc.topic_id, 
  tc.user_id, 
  tc.mastery_level,
  tc.difficulty_level,
  tc.attempts_count,
  tc.correct_count,
  tc.confusion_count,
  tc.updated_at
FROM topic_comprehension tc
ORDER BY tc.updated_at DESC
LIMIT 10;
```

**What to look for:**
- `mastery_level` between 0.00 and 1.00
- `difficulty_level` is one of: recall/application/analysis/synthesis
- `attempts_count` incrementing
- `mastery_level` increases with correct answers, decreases with incorrect

### Check Learner Profiles

```sql
-- Learner profile present
SELECT 
  user_id, 
  learning_style, 
  avg_response_time,
  consistency_score,
  updated_at
FROM learner_profiles
ORDER BY updated_at DESC
LIMIT 5;
```

**What to look for:**
- `learning_style` is one of: visual/verbal/kinesthetic/balanced/unknown
- `avg_response_time` is reasonable (e.g., 2000-5000ms)
- `consistency_score` between 0.00 and 1.00

### Check Attempts Carry Adaptive Fields

```sql
-- Attempts carry adaptive fields (Epic 9 extensions)
SELECT 
  id, 
  correct, 
  partial_credit,
  response_time_ms,
  difficulty_level,
  validation_method,
  created_at
FROM attempts
ORDER BY created_at DESC
LIMIT 10;
```

**What to look for:**
- `response_time_ms` populated (milliseconds)
- `difficulty_level` set (recall/application/analysis/synthesis)
- `partial_credit` for free-text answers (0.00-1.00)

---

## 5) Rollout on Render

### Environment Variables

Set/confirm these env vars on the API service in Render:

```bash
# Required
FF_ADAPTIVE_DIFFICULTY_V1=true

# Optional (defaults shown)
ADAPTIVE_MIN_DIFFICULTY=1          # 1=recall
ADAPTIVE_MAX_DIFFICULTY=4          # 4=synthesis
WEAK_TOPIC_THRESHOLD=0.70          # mastery threshold
MASTERY_DECAY_DAYS=30              # time decay half-life
```

Keep existing Epic 7/8 flags:
- `FF_GAMIFICATION_V1=true`
- `FF_CONVERSATIONAL_UI_V1=true`
- `FF_FREE_TEXT_ANSWERS_V1=true`

### Deploy and Test

```bash
# Re-run smoke script against staging/production
API_URL="https://your-api-staging.onrender.com" \
TEST_USER_ID="<REAL_USER_UUID>" \
TEST_TOPIC_ID="<REAL_TOPIC_UUID>" \
ADMIN_TOKEN="<REAL_ADMIN_TOKEN>" \
bash api/scripts/smoke-adaptive.sh
```

---

## What to UAT Specifically (Fast Checklist)

- [ ] **Mastery updates**: After submission, `topic_comprehension.mastery_level` moves in right direction
  - Up for correct/high partial credit
  - Down for incorrect/low partial credit
  
- [ ] **Time decay**: Re-query a topic after multiple spaced attempts—mastery reflects recent performance more than old

- [ ] **Difficulty progression**: Recommendations follow thresholds:
  - < 0.50 → recall
  - 0.50-0.75 → application
  - 0.75-0.90 → analysis
  - > 0.90 → synthesis

- [ ] **Learning style detection**: After ~20+ attempts, `learning_style` stabilizes (not "unknown")
  - Confidence > 0.5 indicates reliable classification
  
- [ ] **Weak topics**: With mixed outcomes, profile shows topics with mastery < 0.70
  - List empties as user improves

- [ ] **Chat intents**: Adaptive queries return progress intent:
  - "What's hard for me?" → weak topics
  - "What should I practice?" → recommendations
  
- [ ] **RBAC & flags**: 
  - Endpoints return 404 when flag is off
  - Return 401 without auth
  - Return 200 with valid token
  - Learners can only access own data

- [ ] **Performance**: 
  - Mastery calculation < 100ms
  - API response p95 < 200ms
  - No degradation on `/api/learn/submit`

---

## Nice-to-Have (30-60 min if time permits)

### Backfill Historical Mastery

If you have existing attempts, create a one-off script to seed `topic_comprehension`:

```javascript
// api/scripts/backfill-adaptive.js
import { db } from '../src/db/index.js';
import { recordAttemptForAdaptive } from '../src/services/adaptive.js';
import { attempts, questions, quizzes, modulesV2 } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

// Fetch all historical attempts
const historicalAttempts = await db
  .select()
  .from(attempts)
  .innerJoin(questions, eq(attempts.itemId, questions.id))
  .innerJoin(quizzes, eq(questions.quizId, quizzes.id))
  .innerJoin(modulesV2, eq(quizzes.moduleId, modulesV2.id))
  .where(/* your filters */);

// Process each attempt
for (const att of historicalAttempts) {
  await recordAttemptForAdaptive(att.userId, att.modulesV2.topicId, {
    questionId: att.itemId,
    correct: att.correct === 1,
    partialCredit: att.partialCredit,
    responseTimeMs: att.timeMs,
    difficultyLevel: att.difficultyLevel || 'application',
  });
}

console.log(`Backfilled ${historicalAttempts.length} attempts`);
```

### Pilot Guardrail

Restrict access by organization during pilot:

```typescript
// In adaptive routes, add org check:
const PILOT_ORG_IDS = ['org-uuid-1', 'org-uuid-2'];

if (!PILOT_ORG_IDS.includes(session.organizationId)) {
  return reply.status(403).send({
    error: { code: 'FORBIDDEN', message: 'Adaptive features not available for your organization yet' }
  });
}
```

### Dashboard KPIs

Add Epic 9 counters to `/api/ops/kpis`:

```typescript
// Count adaptive API calls
const adaptiveProfileCalls = await db.select({ count: sql`count(*)` })
  .from(events)
  .where(eq(events.type, 'adaptive.profile'));

const weakTopicsQueried = await db.select({ count: sql`count(*)` })
  .from(events)
  .where(eq(events.type, 'adaptive.weak_topics'));
```

---

## Shipping Plan

### 1. Staging
- [x] Flag on: `FF_ADAPTIVE_DIFFICULTY_V1=true`
- [ ] Run smoke tests (8 pass)
- [ ] Manual UAT (checklist above)
- [ ] DB spot-checks confirm data flowing

### 2. Pilot (1 org, 1-2 weeks)
- [ ] Enable for pilot org only (optional guardrail)
- [ ] Monitor `topic_comprehension` growth
- [ ] Check latency p95 on `/api/learn/submit`
- [ ] Collect feedback on difficulty recommendations

### 3. General Availability
- [ ] Remove pilot restrictions
- [ ] Keep flag as kill-switch
- [ ] Monitor KPIs for 48-72h:
  - Adaptive API call volume
  - Mastery score distribution
  - Learning style classification rates
  - Weak topic identification accuracy

---

## Troubleshooting

### "Endpoints return 404"
- Check: `FF_ADAPTIVE_DIFFICULTY_V1=true` is set
- Verify: `curl http://localhost:8080/flags | jq .FF_ADAPTIVE_DIFFICULTY_V1`

### "No weak topics returned"
- Need 5+ attempts per topic to calculate mastery
- Try submitting more mixed (correct/incorrect) attempts

### "Learning style is 'unknown'"
- Need 20+ attempts minimum for classification
- Need attempts across different question types (mcq/free/explainer)

### "Mastery not updating"
- Check database: `SELECT * FROM topic_comprehension WHERE user_id = '...'`
- Verify attempts table has `response_time_ms` and `difficulty_level` columns
- Check logs for errors in `recordAttemptForAdaptive()`

### "Performance slow"
- Check indexes exist: `\d topic_comprehension` in psql
- Verify migration ran: `SELECT * FROM learner_profiles LIMIT 1`

---

## Success Criteria

✅ **All met when:**
1. Smoke tests pass (8/8)
2. Profile endpoint returns learning style + weak topics
3. Difficulty recommendations match mastery levels
4. Database tables populated after submissions
5. Chat intents detect adaptive queries
6. RBAC enforces access control
7. No performance degradation
8. Feature flag works as kill-switch

---

**Ready for production when staging UAT passes!** 🚀

---

**Created:** 2025-10-13  
**Epic:** Epic 9 - True Adaptive Difficulty Engine  
**Status:** Ready for UAT

