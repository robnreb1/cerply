# Manager Workflow OKR Gap Analysis

## Objective
Create, push and track critical training modules across teams, leveraging the latest learning techniques and research to ensure the knowledge sticks for the long term.

---

## Key Results Status

### ✅ KR1: Create content with public + proprietary inputs
**Status:** ✅ **COVERED** (Epic 14)

**What we have:**
- ✅ Module creation from topics (`POST /api/curator/modules/create`)
- ✅ Proprietary content upload (`POST /api/curator/modules/{id}/content/proprietary`)
- ✅ Support for documents, case studies, policies, videos
- ✅ Content stored with metadata (title, type, upload timestamp)

**What's missing:**
- ⚠️ Natural language interactions for content creation (AI-powered generation)
  - *Recommendation:* This should integrate with existing Agent Orchestrator (Epic 13)
  - *Future Epic:* "Manager AI Content Assistant" - natural language module builder

---

### ✅ KR2: Clear citations and references
**Status:** ✅ **COVERED** (Existing + Epic 14)

**What we have:**
- ✅ Citations system already exists in content_corpus table
- ✅ Module content edits track content provenance
- ✅ Proprietary content has source_url field
- ✅ Integration point ready for AI-generated content with citations

**What's missing:**
- None - citations infrastructure is complete

---

### 🟡 KR3: Create teams and set expectations
**Status:** 🟡 **PARTIALLY COVERED** (Epic 14)

**What we have:**
- ✅ Team creation (`POST /api/curator/teams/create`)
- ✅ Module assignment with due dates (`POST /api/curator/modules/{id}/assign`)
- ✅ Mandatory flag (`is_mandatory` field)
- ✅ Role-based assignment (`roleFilters` in assignment API)

**What's missing:**
- ❌ **Difficulty level** setting at module level
  - *Recommendation:* Add `difficulty_level` ENUM ('beginner', 'intermediate', 'advanced') to `manager_modules` table
  - *Migration:* `ALTER TABLE manager_modules ADD COLUMN difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'expert'));`

---

### 🟡 KR4: Review and refine content with natural language
**Status:** 🟡 **PARTIALLY COVERED** (Epic 14)

**What we have:**
- ✅ Content refinement API (`POST /api/curator/modules/{id}/content/refine`)
- ✅ Edit tracking (`module_content_edits` table)
- ✅ Section, question, and guidance editing
- ✅ Before/after content audit trail

**What's missing:**
- ⚠️ **Natural language prompts** for refinement (e.g., "Make this question easier" → AI rewrites)
  - *Recommendation:* Integrate with Agent Orchestrator (Epic 13)
  - *Future Epic:* "AI Content Refinement Assistant"
- ❌ **Difficulty level adjustment** per question
  - *Recommendation:* Add `difficulty_level` to questions table or store in JSONB metadata

---

### ✅ KR5: Track performance at group and individual level
**Status:** ✅ **COVERED** (Epic 14)

**What we have:**
- ✅ Individual tracking (`module_assignments` table with `mastery_score`, `time_spent_seconds`)
- ✅ Group-level analytics (`GET /api/curator/teams/{id}/progress`)
- ✅ Completion status tracking
- ✅ Time-spent metrics
- ✅ Mastery score (0.00 to 1.00)

**What's missing:**
- None - tracking infrastructure is complete

---

### 🟡 KR6: Track module/question performance and make changes
**Status:** 🟡 **PARTIALLY COVERED** (Epic 14)

**What we have:**
- ✅ Module-level analytics (`GET /api/curator/modules/{id}/analytics`)
- ✅ Content editing via refinement API
- ✅ Module status (draft/active/archived)

**What's missing:**
- ❌ **Question-level performance tracking** (e.g., % correct, avg time per question)
  - *Recommendation:* Add `question_performance_stats` table:
    ```sql
    CREATE TABLE question_performance_stats (
      id UUID PRIMARY KEY,
      question_id UUID NOT NULL,
      module_id UUID NOT NULL REFERENCES manager_modules(id),
      attempts_count INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      avg_time_seconds NUMERIC(8,2),
      last_updated TIMESTAMPTZ DEFAULT NOW()
    );
    ```
- ❌ **Content pausing functionality**
  - *Recommendation:* Add `paused_at` TIMESTAMPTZ to `manager_modules` table
  - *API:* `POST /api/curator/modules/{id}/pause` and `/unpause`
- ❌ **Content type performance** (MCQ vs open-ended, etc.)
  - *Recommendation:* Add `content_type_stats` aggregation in analytics endpoint

---

### ❌ KR7: Learning Partner support
**Status:** ❌ **NOT IN SCOPE** (Future Epic)

**What we have:**
- RBAC system from Epic 2 supports multiple roles

**What's needed:**
- New role: `learning_partner` (similar to `manager` but cannot push content to teams)
- Content creation capabilities (same as manager)
- Restricted assignment capabilities (can create but not assign)

**Recommendation:**
- **Future Epic 17:** "Learning Partner Role"
- **Scope:** Simple role variant with delegated partial authority from managers
- **Effort:** ~1 day (role definition + permission gates)
- **Dependencies:** RBAC (Epic 2), Manager Workflows (Epic 14)
- **Priority:** Post-MVP

---

### ❌ KR8: Automatic content refresh notifications
**Status:** ❌ **NOT IN SCOPE** (Future Epic)

**What we have:**
- Nothing specific to content staleness detection

**What's needed:**
- Source change monitoring (e.g., external docs, policies)
- AI-powered content diff generation
- Notification system for managers
- Content refresh workflow (suggest changes → manager review → approve)

**Recommendation:**
- **Future Epic 18:** "Intelligent Content Refresh"
- **Dependencies:** Manager Workflows (Epic 14), Agent Orchestrator (Epic 13)
- **Priority:** Post-MVP

---

### ✅ KR9: Managers can switch to learner profile
**Status:** ✅ **COVERED** (Epic 15 - Learner Experience)

**What we have:**
- ✅ Users can have multiple roles (RBAC from Epic 2)
- ✅ Session management supports role context
- ✅ Module assignments work for any user

**What's needed (Epic 15):**
- Profile switching UI
- Learner dashboard
- "My Learning" view for managers

**Recommendation:**
- This is naturally part of Epic 15 (Learner Experience)
- No changes needed to Epic 14

---

## Summary

| Key Result | Status | Coverage | Critical Gaps |
|-----------|--------|----------|---------------|
| KR1: Create content (public + proprietary) | ✅ Covered | 90% | Natural language interface (future) |
| KR2: Citations and references | ✅ Covered | 100% | None |
| KR3: Create teams & expectations | 🟡 Partial | 85% | **Difficulty level setting** |
| KR4: Refine content with NL prompts | 🟡 Partial | 70% | **NL refinement**, **question difficulty** |
| KR5: Track group/individual performance | ✅ Covered | 100% | None |
| KR6: Track question/module performance | 🟡 Partial | 60% | **Question-level analytics**, **pause content** |
| KR7: Learning Partner support | ❌ Future | 0% | Entire feature (Post-MVP) |
| KR8: Auto content refresh | ❌ Future | 0% | Entire feature (Post-MVP) |
| KR9: Manager as learner | ✅ Covered | 100% | None (Epic 15) |

---

## Recommended Actions

### 🔴 P0 - Must Have for MVP (Add to Epic 14)

1. **Add difficulty level to modules**
   - Migration: Add `difficulty_level` column to `manager_modules`
   - API: Update create/update endpoints to accept difficulty
   - Effort: 1 hour

2. **Add content pause functionality**
   - Migration: Add `paused_at` TIMESTAMPTZ to `manager_modules`
   - API: `POST /api/curator/modules/{id}/pause` and `/unpause`
   - UI: Pause/Resume button in module management
   - Effort: 2 hours

3. **Add question-level performance tracking**
   - Migration: Create `question_performance_stats` table
   - API: Update scoring endpoint to record question stats
   - Analytics: Add question breakdown to module analytics
   - Effort: 4 hours

### 🟡 P1 - Should Have for MVP (Epic 14.5)

4. **Natural language content refinement**
   - Integrate Agent Orchestrator for "Make this easier" type prompts
   - Add refinement suggestions API
   - Effort: 1 day

5. **Question difficulty adjustment**
   - Add difficulty metadata to questions
   - Allow managers to adjust difficulty via UI
   - Effort: 3 hours

### 🟢 P2 - Post-MVP (New Epics)

6. **Learning Partner Collaboration** (Epic 17)
   - New role, approval workflows, handoff system
   - Effort: 1 week

7. **Intelligent Content Refresh** (Epic 18)
   - Source monitoring, AI diff generation, notifications
   - Effort: 2 weeks

---

## Decision Required

**Should we add P0 items to Epic 14 scope before marking it complete?**

- **Option A:** Add P0 items now (difficulty, pause, question stats) - ~7 hours work
- **Option B:** Mark Epic 14 as "MVP Foundation Complete" and create Epic 14.5 for enhancements
- **Option C:** Proceed to Epic 15 and come back to P0 items in a "Manager Polish" epic

**Recommendation:** **Option A** - The P0 items are critical for a usable manager experience and can be added quickly without architectural changes.

---

## Next Steps

1. ✅ Review this gap analysis with stakeholders
2. ⏳ Decide on P0 item inclusion (Option A/B/C)
3. ⏳ Update Epic 14 scope or create Epic 14.5
4. ⏳ Update functional spec with confirmed manager workflow features
5. ⏳ Begin Epic 15 (Learner Experience) once manager scope is finalized

