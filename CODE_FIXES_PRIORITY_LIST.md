# Code Fixes Priority List
**Date:** 2025-10-13  
**Source:** Epic Reconciliation Reports (5 agents, 4 epics)  
**Total Estimated Effort:** 11 hours

---

## Priority 1: Documentation ✅ COMPLETE

These fixes are **complete** as part of the reconciliation process.

| Fix | File | Effort | Status |
|-----|------|--------|--------|
| Update FSD §29 (Epic 8) | docs/functional-spec.md | 30 min | ✅ Done |
| Add Epic 0 to Master Plan | docs/EPIC_MASTER_PLAN.md | 1 hour | ✅ Done |
| Add 16 env vars to registry | docs/EPIC_MASTER_PLAN.md | 1 hour | ✅ Done |
| Add 18 new patterns to ADR | docs/ARCHITECTURE_DECISIONS.md | 1 hour | ✅ Done |
| Update Epic 6 model config | docs/EPIC_MASTER_PLAN.md | 15 min | ✅ Done |

---

## Priority 2: Compliance (Before Next Epic)

These fixes should be completed **before starting Epic 9** to maintain governance compliance.

### Fix 1: Add Migration Header (Epic 6)
**File:** `api/drizzle/010_research_citations.sql`  
**Effort:** 5 minutes  
**Severity:** Low (documentation only, no functional impact)

**Current State:**
```sql
-- No header present
CREATE TABLE research_citations (...);
```

**Required Fix:**
```sql
------------------------------------------------------------------------------
-- Epic 6.5: Research-Driven Content Generation
-- BRD: B-3.1 (Topic-based research mode)
-- FSD: §27 (Research-Driven Content Generation)
-- Roadmap: docs/MVP_B2B_ROADMAP.md (Epic 6.5, lines 650-700)
------------------------------------------------------------------------------

CREATE TABLE research_citations (...);
```

**Acceptance:** Migration header matches ADR §5 format

---

### Fix 2: Resolve Feature Flag Conflict (Epic 6 vs Platform)
**Files:** `api/src/lib/canon.ts`, `docs/EPIC_MASTER_PLAN.md`  
**Effort:** 30 minutes  
**Severity:** Medium (governance confusion)

**Issue:** `FF_CONTENT_CANON_V1` registered for Epic 6 in Master Plan but implemented/used by Platform v1 canon store.

**Option A: Use flag in Platform v1 (Recommended)**
```typescript
// api/src/lib/canon.ts
const FF_CONTENT_CANON_V1 = process.env.FF_CONTENT_CANON_V1 === 'true';

export function canonizeContent(...) {
  if (!FF_CONTENT_CANON_V1) {
    return null; // Canon disabled
  }
  // ... existing logic
}
```

**Option B: Rename Epic 6 flag**
```markdown
# EPIC_MASTER_PLAN.md
- OLD: FF_CONTENT_CANON_V1 (Epic 6)
- NEW: FF_ENSEMBLE_CANON_INTEGRATION_V1 (Epic 6)
```

**Recommendation:** Option A - Platform v1 owns `FF_CONTENT_CANON_V1`, Epic 6 consumes it

**Acceptance:** No feature flag conflicts in Master Plan

---

### Fix 3: Add RBAC to Epic 6 Content Routes
**File:** `api/src/routes/content.ts` (or wherever `/api/content/generate` is)  
**Effort:** 1 hour  
**Severity:** Medium (security pattern deviation)

**Current State:**
```typescript
// Uses x-admin-token header check (implicit)
app.post('/api/content/generate', async (req, reply) => {
  // No requireManager() call
  const session = getSession(req);
  ...
});
```

**Required Fix:**
```typescript
import { requireManager } from '../middleware/rbac';

app.post('/api/content/generate', async (req, reply) => {
  if (!requireManager(req, reply)) return reply; // ALWAYS return reply
  
  const session = getSession(req);
  // ... existing logic
});
```

**Alternative:** Document as exception in ADR
```markdown
## RBAC Middleware (UPDATED)

**Exceptions:**
- `/api/content/generate` is public in MVP (no sensitive data)
- Production will add authentication when enterprise features enabled
```

**Recommendation:** Add RBAC now (1 hour) OR document exception (15 min)

**Acceptance:** All content routes use `requireManager()` OR exception documented in ADR

---

## Priority 3: Quality (Before Production)

These fixes improve quality but are not blocking for Epic 9 to start.

### Fix 4: Increase Epic 7 Test Coverage (60% → 80%)
**Files:** `api/tests/gamification.test.ts`, `api/tests/badges.test.ts`, `api/tests/certificates.test.ts`  
**Effort:** 3 hours  
**Severity:** Medium (quality gap)

**Missing Tests:**
1. **Badge detection edge cases** (`api/src/services/badges.ts`)
   - Speed Demon: Exactly 10s threshold
   - Perfectionist: Streak break handling
   - 7-Day Consistent: Timezone edge cases

2. **Certificate verification failures** (`api/src/services/certificates.ts`)
   - Invalid signature format
   - Revoked certificate check
   - Expired certificate check

3. **Notification preference logic** (`api/src/services/notifications.ts`)
   - Digest aggregation (when implemented)
   - Preference defaults

**Acceptance:** Test coverage ≥80% for Epic 7

---

### Fix 5: Increase Epic 8 Test Coverage (20% → 80%)
**Files:** `api/tests/chat-learning.test.ts`, `web/e2e/chat-panel.spec.ts`  
**Effort:** 4 hours  
**Severity:** High (blocks Phase 2-8)

**Missing Tests:**
1. **Route tests** (`api/tests/chat-learning.test.ts`)
   - POST /api/chat/message (all 5 intents)
   - GET /api/chat/sessions (pagination)
   - GET /api/chat/sessions/:id (ownership check)
   - POST /api/chat/explanation (mock OpenAI)
   - POST /api/chat/feedback

2. **E2E tests** (`web/e2e/chat-panel.spec.ts`)
   - Open chat with Cmd+K
   - Send message, receive response
   - Session persists across page reload
   - Close chat with Escape

3. **Service tests**
   - `api/tests/explanation-engine.test.ts` (mock LLM calls)
   - `api/tests/free-text-validator.test.ts` (fuzzy matching + LLM)

**Acceptance:** Test coverage ≥80% for Epic 8 before Phase 2-8

---

### Fix 6: Add JSDoc Comments
**Files:** All new services (12 files across Epics 6, 7, 8, Platform)  
**Effort:** 2 hours  
**Severity:** Low (maintainability)

**Missing JSDoc:**
- `api/src/services/adaptive.ts` (Epic 9, not yet implemented)
- `api/src/services/intent-router.ts` (Epic 8) - Partial
- `api/src/services/explanation-engine.ts` (Epic 8)
- `api/src/services/free-text-validator.ts` (Epic 8)
- `api/src/lib/profileAdapt.ts` (Platform v1)

**Pattern:**
```typescript
/**
 * Classifies user query into intent categories using pattern matching
 * 
 * @param query - User's natural language query (e.g., "How am I doing?")
 * @returns Intent classification with confidence score (0.0-1.0) and extracted entities
 * 
 * @example
 * const result = classifyIntent("How am I doing?");
 * // Returns: { intent: 'progress', confidence: 0.95 }
 */
export function classifyIntent(query: string): IntentResult {
  // ...
}
```

**Acceptance:** All public functions have JSDoc with description, params, returns, examples

---

## Summary Table

| Priority | Fix | Epic | Effort | Severity | Blocking? |
|----------|-----|------|--------|----------|-----------|
| ✅ P1 | Documentation updates | All | 3.75h | High | Yes (done) |
| ⚠️ P2 | Migration header | 6 | 5 min | Low | No |
| ⚠️ P2 | Feature flag conflict | 6/Platform | 30 min | Medium | No |
| ⚠️ P2 | RBAC compliance | 6 | 1 hour | Medium | No |
| ⚠️ P3 | Epic 7 test coverage | 7 | 3 hours | Medium | No |
| ⚠️ P3 | Epic 8 test coverage | 8 | 4 hours | High | **Yes** (for Phase 2-8) |
| ⚠️ P3 | JSDoc comments | All | 2 hours | Low | No |

**Total P2+P3 Effort:** 11 hours  
**Blocking for Epic 9:** None (Epic 9 can start)  
**Blocking for Epic 8 Phase 2-8:** Fix 5 (test coverage)

---

## Recommended Sequence

### Sprint 1: Compliance (2 hours)
1. Add migration header to `010_research_citations.sql` (5 min)
2. Resolve feature flag conflict (30 min)
3. Add RBAC or document exception (1 hour)

### Sprint 2: Epic 8 Testing (4 hours)
**Before starting Epic 8 Phase 2-8:**
1. Add route tests for chat-learning.ts (2 hours)
2. Add E2E tests for ChatPanel (1 hour)
3. Add service tests (explanation, validator) (1 hour)

### Sprint 3: Polish (5 hours)
**Before production deployment:**
1. Increase Epic 7 test coverage (3 hours)
2. Add JSDoc comments to all services (2 hours)

---

## Acceptance Criteria

### For Each Fix:
- [ ] Code change committed with proper message (`fix(epic6): add migration header [spec]`)
- [ ] Tests pass (if applicable)
- [ ] Linter clean
- [ ] Documentation updated (if needed)
- [ ] Reviewed by another developer

### For Overall Quality:
- [ ] All Priority 2 fixes complete before Epic 9 starts
- [ ] Epic 8 test coverage ≥80% before Phase 2-8
- [ ] No linter warnings across all epics
- [ ] All public functions have JSDoc
- [ ] No feature flag conflicts in Master Plan

---

## Notes

1. **Epic 9 Not Blocked:** Priority 2 fixes don't block Epic 9 from starting
2. **Epic 8 Phase 2-8 Blocked:** Must complete Fix 5 (test coverage) first
3. **Production Readiness:** Complete all Priority 3 fixes before deploying to production
4. **Tech Debt:** Track as GitHub issues with labels `tech-debt`, `testing`, `documentation`

---

**Next Steps:**
1. Create GitHub issues for each fix
2. Assign to developers or AI agents
3. Track in project board
4. Review in weekly standup

---

**End of Priority List**

