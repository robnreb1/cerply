# 🎯 Epic 9: True Adaptive Difficulty Engine - Ready to Start

**Date:** 2025-10-13  
**Status:** ✅ ALL PREREQUISITES MET - READY FOR NEW AGENT  
**Prompt File:** `EPIC9_IMPLEMENTATION_PROMPT_v2.md`

---

## ✅ Confirmation: Epic 8 Complete

### PR #616 Merged Successfully
- **Merged to:** `main` branch
- **Files changed:** 93 files
- **Lines added:** 26,172+
- **Includes:** Epic 8 (Phases 1-8), P0 (Content Hierarchy), Epic 7 docs, security fixes

### Epic 8 Status
- ✅ All 8 phases delivered (Infrastructure, LLM, Free-text, Partial Credit, Confusion, Caching, Intent Router, E2E)
- ✅ 90 tests passing (100% pass rate)
- ✅ 93.8% intent accuracy (exceeds 90% target)
- ✅ Production-ready backend
- ✅ Merged to production via PR #616

**Documented in:**
- `docs/EPIC_MASTER_PLAN.md` v1.3 (Epic 8 marked ✅ Complete)
- `docs/functional-spec.md` §29 (Epic 8 ✅ COMPLETE)
- `EPIC8_AND_PR616_RECONCILIATION.md` (comprehensive verification)

---

## 📋 Epic 9 Priority Confirmation

### Epic Order (from EPIC_MASTER_PLAN.md v1.3)

| Priority | Epic | Status | Next? |
|----------|------|--------|-------|
| **Phase 3** | Epic 7 (Gamification) | ✅ Complete | No |
| **Phase 4** | Epic 8 (Conversational UI) | ✅ Complete | No |
| **Phase 4** | **Epic 9 (Adaptive Difficulty)** | 📋 Planned | **✅ YES - NEXT** |
| Phase 5 | Epic 6.6 (Batch Seeding) | 📋 Planned | After Epic 9 |
| Phase 5 | Epic 6.7 (Content Lifecycle) | 📋 Planned | After Epic 9 |

### Why Epic 9 is Next Priority

1. **Dependency Ready:** Requires Epic 7 ✅ + Epic 8 ✅ + P0 ✅ (all complete)
2. **Business Impact:** Core learning science differentiator (adaptive personalization)
3. **User Value:** Drives 60-80% completion rates (vs industry 30-40%)
4. **Foundation for:** Epic 10 (Enhanced Certification), Epic 6.7 (Content Lifecycle)
5. **Strategic:** Delivers on BRD L-2 (Adaptive lesson plans)

**Confirmed: Epic 9 is the correct next priority** ✅

---

## 📁 Prompt File Details

### New Prompt: `EPIC9_IMPLEMENTATION_PROMPT_v2.md`

**Why v2.0?**
- Original `EPIC9_IMPLEMENTATION_PROMPT.md` (v1.0) created pre-governance
- v2.0 includes **statutory requirements header** (EPIC_MASTER_PLAN, ADR, FSD, BRD)
- Updated for **Epic 8 completion** (confusion tracking available)
- Updated for **P0 migration** (new content hierarchy schema)
- Includes all governance patterns established in Epic 7/8

### What's in the Prompt (20 pages, 2,500+ lines)

**Section 1: Statutory Requirements** (MANDATORY READ)
- Master governance docs (EPIC_MASTER_PLAN, ADR, FSD, BRD)
- Epic-specific dependencies (Epic 7, Epic 8, P0)
- Reading order requirements

**Section 2: Epic 9 Context**
- Current platform status (what's complete)
- Business goals (adaptive difficulty)
- 4 difficulty levels (Bloom's Taxonomy)

**Section 3: Implementation Plan (13h, 7 phases)**
- Phase 1: Database schema (2h) - 2 new tables
- Phase 2: Adaptive service (3h) - Core algorithms
- Phase 3: API routes (2h) - 4 new endpoints
- Phase 4: Integration (3h) - Learn routes, daily selector, intent router
- Phase 5: Learning style detection (2h) - Visual/verbal/kinesthetic
- Phase 6: Testing (1.5h) - 25+ tests, 80%+ coverage
- Phase 7: Documentation (1.5h) - FSD, delivery summary, feature flags

**Section 4: Code Patterns & Examples**
- Mastery calculation (time-weighted algorithm)
- Difficulty recommendation (Bloom's levels)
- Learning style detection (confusion pattern analysis)

**Section 5: Acceptance Criteria**
- Functional requirements (4 difficulty levels, mastery calc, learning styles)
- API requirements (4 endpoints, feature flags, RBAC)
- Database requirements (2 tables, migration header, foreign keys)
- Integration requirements (no breaking changes to Epic 7/8)
- Testing requirements (25+ tests, 80%+ coverage, smoke tests)
- Documentation requirements (FSD update, delivery summary, [spec] commit)

**Section 6: Testing Instructions**
- Local testing setup
- Staging testing
- Smoke tests

**Section 7: Reference Documentation**
- Epic 8 confusion tracking (data source)
- P0 content hierarchy (schema)
- Epic 7 gamification (progress data)

**Section 8: Quick Start Checklist**
- Before you start (read governance docs)
- Implementation order (7 phases)
- After completion (tests, docs, PR)

**Section 9: Common Pitfalls & Solutions**
- Ignoring Epic 8 confusion data
- Wrong foreign key types
- Forgetting time decay
- Not testing edge cases
- Skipping migration header
- Breaking Epic 7/8 functionality

**Section 10: Success Metrics**
- Performance targets (< 100ms mastery calc)
- Quality targets (80%+ coverage)
- Business metrics (+10% completion rate)

---

## 🔑 Key Information for New Agent

### Prerequisites (ALL COMPLETE ✅)

1. **Epic 7: Gamification** ✅
   - Provides: `learner_levels` table, `countCorrectAttempts()` service
   - Status: Complete, in production
   - Location: `docs/functional-spec.md` §28

2. **Epic 8: Conversational UI** ✅
   - Provides: `confusion_log` table, partial credit scoring, free-text validation
   - Status: Complete, merged via PR #616
   - Location: `docs/functional-spec.md` §29

3. **P0: Content Hierarchy** ✅
   - Provides: 5-tier schema (Subject > Topic > Module > Quiz > Question)
   - Status: Migrated to staging + production
   - Location: `docs/functional-spec.md` §31

### What Epic 9 Will Build

**2 New Database Tables:**
- `learner_profiles` - Learning style, response time, consistency
- `topic_comprehension` - Mastery per topic, difficulty level, attempt counters

**4 New API Endpoints:**
- `GET /api/adaptive/profile/:userId` - Learner profile + weak topics
- `GET /api/adaptive/topics/:topicId/difficulty/:userId` - Recommended difficulty
- `POST /api/adaptive/attempt` - Record attempt + update adaptive data
- `GET /api/adaptive/analytics/:userId` - Adaptive learning dashboard

**1 New Service:**
- `api/src/services/adaptive.ts` - Core adaptive logic (mastery calc, difficulty recommendation, learning style detection)

**Integrations:**
- Update `api/src/routes/learn.ts` to call adaptive tracking
- Update `api/src/services/delivery.ts` to filter by difficulty
- Update `api/src/services/intent-router.ts` to provide adaptive insights

### Feature Flag
- `FF_ADAPTIVE_DIFFICULTY_V1=true` - Gates all adaptive endpoints

### Estimated Effort
- **13 hours total** (7 phases)
- Original v1.0 estimated: 12-16h
- v2.0 confirms: 13h (mid-range)

---

## 📊 Epic Master Plan Compliance

### Epic 9 Entry (from EPIC_MASTER_PLAN.md v1.3, line 38)

```markdown
| **9** | P1 | 📋 Planned | L-2 | §30 | EPIC9_IMPLEMENTATION_PROMPT.md | 13h |
```

**Status:** 📋 Planned (ready to start)  
**Priority:** P1 (Core Learning Science)  
**BRD Requirement:** L-2 (Adaptive lesson plans with dynamic difficulty)  
**FSD Section:** §30  
**Prompt:** ✅ `EPIC9_IMPLEMENTATION_PROMPT_v2.md` (updated with governance)  
**Effort:** 13h

### Dependencies (EPIC_MASTER_PLAN.md Dependency Graph)

```
Epic 9: Adaptive Difficulty (requires Epic 8 for confusion + Epic 0 for quality)
    ├─ Epic 7: Gamification ✅ COMPLETE
    ├─ Epic 8: Conversational UI ✅ COMPLETE
    └─ Epic 0: Platform Foundations ✅ COMPLETE
```

**All dependencies satisfied** ✅

---

## 🎯 Prompt for New Agent

### Copy This to New Agent

```
You are implementing Epic 9: True Adaptive Difficulty Engine for Cerply, a B2B enterprise learning platform.

**READ THIS FIRST (MANDATORY):**
Open and read `EPIC9_IMPLEMENTATION_PROMPT_v2.md` in full. This is your complete specification.

**STATUTORY REQUIREMENTS:**
Before writing ANY code, you MUST read these documents in order:
1. `docs/EPIC_MASTER_PLAN.md` v1.3 - Epic 9 scope, dependencies, acceptance criteria
2. `docs/ARCHITECTURE_DECISIONS.md` v1.2 - Immutable architectural patterns
3. `docs/functional-spec.md` §30 - Epic 9 technical specification
4. `docs/brd/cerply-brd.md` L-2 - Adaptive lesson plans requirement

**YOUR TASK:**
Implement adaptive difficulty engine (13 hours, 7 phases):
- Phase 1: Database schema (2h) - 2 new tables
- Phase 2: Adaptive service (3h) - Mastery calc, difficulty recommendation, learning style detection
- Phase 3: API routes (2h) - 4 new endpoints
- Phase 4: Integration (3h) - Learn routes, daily selector, intent router
- Phase 5: Learning style detection (2h) - Visual/verbal/kinesthetic
- Phase 6: Testing (1.5h) - 25+ tests, 80%+ coverage
- Phase 7: Documentation (1.5h) - FSD update, delivery summary

**ACCEPTANCE CRITERIA:**
- 4 difficulty levels (recall, application, analysis, synthesis)
- Mastery calculation uses time-weighted scoring with 4 signals
- Learning style detection (visual/verbal/kinesthetic)
- 4 new API endpoints (feature flag gated)
- 2 new database tables (with proper migration header)
- 25+ tests (80%+ coverage)
- Updated FSD §30, EPIC_MASTER_PLAN.md, delivery summary

**PREREQUISITES (ALL COMPLETE):**
- ✅ Epic 7 (Gamification) - Provides learner progression data
- ✅ Epic 8 (Conversational UI) - Provides confusion tracking
- ✅ P0 (Content Hierarchy) - Provides 5-tier schema

**CRITICAL PATTERNS:**
- Use Epic 8's `confusion_log` table for mastery calculation
- Use Epic 7's `attempts` table with `partial_credit` field
- Query new 5-tier schema (Subject > Topic > Module > Quiz > Question)
- Foreign keys: TEXT for user_id, UUID for topic_id
- Feature flag: `FF_ADAPTIVE_DIFFICULTY_V1`
- RBAC: `requireAnyRole(['admin', 'manager', 'learner'])` + self-checks
- Error envelopes: `{ error: { code, message } }`
- Commit with: `feat(epic9): adaptive difficulty engine [spec]`

**START HERE:**
1. Read `EPIC9_IMPLEMENTATION_PROMPT_v2.md` (20 pages)
2. Read governance docs (EPIC_MASTER_PLAN, ADR, FSD §30)
3. Begin Phase 1 (database schema)

Proceed with implementation. Report progress after each phase.
```

---

## ✅ Readiness Checklist

### Documentation
- [x] Epic 9 prompt created (`EPIC9_IMPLEMENTATION_PROMPT_v2.md`)
- [x] Statutory requirements header included
- [x] All governance docs referenced (EPIC_MASTER_PLAN, ADR, FSD, BRD)
- [x] Epic 8 completion verified
- [x] P0 content hierarchy documented
- [x] Code patterns & examples included
- [x] Acceptance criteria from EPIC_MASTER_PLAN included
- [x] Testing instructions provided
- [x] Common pitfalls documented

### Prerequisites
- [x] Epic 7 complete (gamification)
- [x] Epic 8 complete (conversational UI, confusion tracking)
- [x] P0 complete (content hierarchy migration)
- [x] PR #616 merged to main
- [x] All governance docs up to date

### Environment
- [x] `main` branch updated (pulled PR #616)
- [x] Database schema current (5-tier hierarchy)
- [x] `confusion_log` table available
- [x] `attempts` table has `partial_credit` field
- [x] Feature flag pattern established (`FF_*_V1`)

---

## 🚀 Next Steps

### Immediate
1. ✅ **Confirm Epic 9 priority** (DONE)
2. ✅ **Create Epic 9 prompt v2.0** (DONE)
3. ⏭️ **Give prompt to new agent** (READY)

### New Agent Workflow
1. Open `EPIC9_IMPLEMENTATION_PROMPT_v2.md`
2. Read statutory requirements (4 docs)
3. Implement 7 phases (13 hours)
4. Run tests (25+ tests, 80%+ coverage)
5. Update documentation (FSD, EPIC_MASTER_PLAN)
6. Create delivery summary
7. Commit with `[spec]` tag
8. Create PR → staging → main

### After Epic 9 Complete
**Option A:** Epic 6.6 (Batch Content Seeding) - 10h  
**Option B:** Epic 6.7 (Content Lifecycle Management) - 8h  
**Option C:** Epic 10 (Enhanced Certification) - 10h

**Recommended:** Epic 6.6 (seed 100 topics for production launch)

---

## 📚 Reference Files

### Prompt
- **`EPIC9_IMPLEMENTATION_PROMPT_v2.md`** - Main prompt for new agent (20 pages, 2,500+ lines)

### Governance
- **`docs/EPIC_MASTER_PLAN.md`** v1.3 - Epic 9 scope (line 38)
- **`docs/ARCHITECTURE_DECISIONS.md`** v1.2 - Architectural patterns
- **`docs/functional-spec.md`** §30 - Epic 9 technical spec
- **`docs/brd/cerply-brd.md`** L-2 - Adaptive lesson plans requirement

### Dependencies
- **`docs/functional-spec.md`** §28 - Epic 7 (Gamification)
- **`docs/functional-spec.md`** §29 - Epic 8 (Conversational UI)
- **`docs/functional-spec.md`** §31 - P0 (Content Hierarchy)

### Verification
- **`EPIC8_AND_PR616_RECONCILIATION.md`** - Epic 8 completion verification
- **`P0_MIGRATION_SUCCESS.md`** - P0 migration verification

---

## 🎉 Summary

✅ **Epic 8 Complete** - PR #616 merged, 26K+ lines in production  
✅ **Epic 9 Confirmed** - Correct next priority per EPIC_MASTER_PLAN  
✅ **Prompt Ready** - `EPIC9_IMPLEMENTATION_PROMPT_v2.md` with full governance  
✅ **All Prerequisites Met** - Epic 7, Epic 8, P0 all complete  
✅ **Documentation Compliant** - Statutory requirements, ADR patterns, acceptance criteria  

**Status:** READY FOR NEW AGENT TO START EPIC 9 🚀

**Next Action:** Copy prompt text above and give to new agent

---

**Epic 9 Ready to Start - 2025-10-13**

