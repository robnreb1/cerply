# Epic 14 P0 Features - Implementation Plan

## Overview
Adding 3 critical features to Manager Workflows based on OKR gap analysis:
1. **Difficulty Level** - Let managers set/adjust module difficulty
2. **Content Pause** - Let managers pause problematic modules
3. **Question Analytics** - Track question-level performance

---

## ✅ Migrations Created

### 028_add_module_difficulty_and_pause.sql
- `ALTER TABLE manager_modules ADD COLUMN difficulty_level TEXT`
- `ALTER TABLE manager_modules ADD COLUMN paused_at TIMESTAMPTZ`
- Constraints: difficulty must be 'beginner', 'intermediate', 'advanced', or 'expert'
- Index on `paused_at` for fast filtering

### 029_add_question_performance_tracking.sql
- New table: `question_performance_stats`
- Tracks: attempts, correct/incorrect count, avg time, perceived difficulty
- Engagement: skip count, hint requests
- Timestamps: first/last attempted, last updated
- Unique constraint: (question_id, module_id)

---

## 🔧 Schema Updates
- ✅ Added Epic 14 tables to `api/src/db/schema.ts`
- ✅ Includes all P0 fields (difficulty_level, paused_at, question stats)

---

## 📝 API Routes to Update

### 1. Module Creation (POST /api/curator/modules/create)
**Add:**
- `difficultyLevel` parameter (optional, enum)

### 2. Module Update (PUT /api/curator/modules/{id})
**Add:**
- `difficultyLevel` parameter (can be changed)

### 3. Pause/Unpause Endpoints (NEW)
**Create:**
- `POST /api/curator/modules/{id}/pause` - Sets `paused_at` to NOW()
- `POST /api/curator/modules/{id}/unpause` - Sets `paused_at` to NULL
- Returns: Updated module with status

### 4. Module Analytics (GET /api/curator/modules/{id}/analytics)
**Add:**
- `questionStats` array with per-question metrics:
  ```json
  {
    "questionStats": [
      {
        "questionId": "uuid",
        "attemptsCount": 150,
        "correctCount": 120,
        "successRate": 0.80,
        "avgTimeSeconds": 45.2,
        "perceivedDifficulty": "appropriate",
        "skipCount": 5,
        "hintRequestsCount": 12
      }
    ]
  }
  ```

### 5. Question Scoring (POST /api/learn/score OR similar)
**Update:**
- After scoring, update `question_performance_stats` table
- Increment counts, recalculate averages
- Set perceived difficulty based on success rate thresholds

---

## 🎨 Web UI Updates (Future - Not P0 for API)

### Manager Module Dashboard
- Show difficulty badge on modules
- Show "Paused" status indicator
- Pause/Resume button

### Module Analytics Page
- Question breakdown table
- Sort by success rate, avg time
- Highlight problematic questions (success rate < 50%)
- "Edit Question" button

### Module Creation/Edit Form
- Difficulty dropdown selector
- Default to "intermediate"

---

## 🧪 Testing Plan

1. **Migration Test**
   - Run migrations on local DB
   - Verify columns added
   - Test constraints

2. **API Test**
   - Create module with difficulty level
   - Pause/unpause module
   - Submit answers and check question stats update
   - Fetch analytics and verify question breakdown

3. **Integration Test**
   - Full flow: Create → Assign → Learn → Track → Analyze
   - Verify all metrics appear correctly

---

## 📊 Success Metrics

After implementation, managers can:
- ✅ Set difficulty when creating modules
- ✅ Pause modules that have issues
- ✅ See which questions are too hard/easy
- ✅ Make data-driven content improvements

---

## ⏱️ Estimated Effort

- ✅ Migrations: 30 min (DONE)
- ✅ Schema: 15 min (DONE)
- ⏳ API Routes: 3 hours
  - Create/update endpoints: 30 min
  - Pause/unpause endpoints: 45 min
  - Analytics enhancement: 90 min
  - Question scoring integration: 45 min
- ⏳ Testing: 1 hour
- **Total: ~5 hours remaining**

---

## 🚀 Next Steps

1. Update API routes (manager-modules.ts)
2. Run migrations locally
3. Test endpoints with curl
4. Deploy to staging
5. Test full flow with staging UI
6. Update functional spec

---

## 📌 Future Enhancements (Post-MVP)

- **Learning Partner Role** - Role variant that can create but not assign
- **Auto Content Refresh** - Detect source changes and suggest updates
- **Natural Language Refinement** - "Make this question easier" via AI

