# Epic [X]: [Feature Name] — Implementation Prompt Template
**For:** New Agent/Developer  
**Date:** [YYYY-MM-DD]  
**Estimated Effort:** [X] hours ([Y] overnights)  
**Priority:** P[0-2] ([Category])

---

## STATUTORY REQUIREMENTS (READ BEFORE STARTING)

**You MUST read these documents before implementing:**
1. **docs/ARCHITECTURE_DECISIONS.md** - Immutable architectural principles (LOCKED v1.0)
2. **docs/EPIC_MASTER_PLAN.md** - Locked scope for this epic (LOCKED v1.0)
3. **docs/brd/cerply-brd.md** - Business requirements (Source of truth)
4. **docs/functional-spec.md** - Technical specifications (Living document)

**Any deviations from these documents require explicit approval.**

**Critical Rules:**
- ✅ Follow all patterns from ARCHITECTURE_DECISIONS.md
- ✅ Reference locked scope from EPIC_MASTER_PLAN.md
- ✅ Map all deliverables to BRD requirements
- ✅ Update FSD with [spec] tag upon completion
- ❌ NO changes to master documents without approval
- ❌ NO new patterns without justification
- ❌ NO scope expansion beyond locked requirements

---

## Table of Contents

1. [Project Context](#1-project-context)
2. [Traceability Matrix](#2-traceability-matrix)
3. [Epic [X] Requirements](#3-epic-x-requirements)
4. [Implementation Plan](#4-implementation-plan)
5. [Code Patterns & Examples](#5-code-patterns--examples)
6. [Acceptance Criteria](#6-acceptance-criteria)
7. [Testing Instructions](#7-testing-instructions)
8. [Rollout Plan](#8-rollout-plan)
9. [References](#9-references)
10. [Quick Start Checklist](#10-quick-start-checklist)

---

## 1. Project Context

### What is Cerply?

Cerply is a B2B enterprise learning platform that transforms company knowledge into adaptive, personalized learning experiences. The platform achieves 60-80% completion rates (vs 30-40% for traditional LMS) through intelligent personalization.

**Current Status (Epics [1-X-1] Complete):**

| Epic | Status | Key Deliverables |
|------|--------|------------------|
| **Epic 1: D2C Removal** | ✅ Complete | Enterprise-only access |
| **Epic 2: SSO & RBAC** | ✅ Complete | SAML/OIDC, 3 roles |
| [Add completed epics here] | ✅ Complete | [Key deliverables] |

**What's Missing (Epic [X] Goal):**

[Describe the current problem this epic solves]

### Why Epic [X] Matters

**The Problem:** [Describe the user pain point]

**The Cerply Solution:** [Describe how this epic solves it]

**Result:** [Expected impact on business/user metrics]

### Tech Stack

- **API:** Fastify 4.x + Drizzle ORM + PostgreSQL 15
- **Web:** Next.js 14 (App Router) + Tailwind CSS
- **Testing:** Vitest + Playwright
- **[Additional tools if needed]**

### Key Code Patterns (Established in Previous Epics)

1. **Feature Flags:** `FF_[FEATURE]_V1` gates all new features
2. **RBAC Middleware:** `requireLearner(req, reply)` - always `return reply`
3. **Error Envelopes:** `{ error: { code, message, details? } }`
4. **Session Management:** `getSession(req)` for user context
5. **Migration Headers:** Standard format with Epic/BRD/FSD references
6. **Service Layer:** Extract core logic to services (not inline in routes)

### Files to Study Before Starting

**Critical Reading ([X] hours):**
1. **`docs/ARCHITECTURE_DECISIONS.md`** - All patterns (30 min)
2. **`docs/EPIC_MASTER_PLAN.md`** - Epic [X] section (15 min)
3. **`docs/brd/cerply-brd.md`** - BRD requirements [XX-X] (15 min)
4. **`docs/functional-spec.md`** - §[XX] if exists (15 min)
5. **`[EPIC{X-1}_IMPLEMENTATION_PROMPT.md]`** - Previous epic pattern (30 min)
6. **`api/src/routes/[relevant].ts`** - Existing route pattern (15 min)
7. **`api/src/services/[relevant].ts`** - Service layer pattern (15 min)

---

## 2. Traceability Matrix

### BRD to Deliverables Mapping

| BRD Req | Description | Epic Deliverable | Acceptance Criterion | Implementation File |
|---------|-------------|------------------|---------------------|---------------------|
| [XX-X] | [Requirement text] | [Specific deliverable] | [How to verify] | [File path] |
| [XX-X] | [Requirement text] | [Specific deliverable] | [How to verify] | [File path] |

**Example:**
| BRD Req | Description | Epic Deliverable | Acceptance Criterion | Implementation File |
|---------|-------------|------------------|---------------------|---------------------|
| AU-1 | Multi-channel delivery | Slack OAuth flow | User can connect Slack account | api/src/routes/channels.ts |
| L-17 | Channel preferences | Preferences API | User can set quiet hours | api/src/services/channels.ts |

### FSD Section Assignment

**Upon Epic [X] completion:**
- **FSD Section:** §[XX] - [Title]
- **Status:** Will be added post-§[XX-1]
- **Content:** Database schema, API routes, feature flags, acceptance

---

## 3. Epic [X] Requirements

### Goal

[One-sentence description of what this epic achieves]

### User Stories

**Story 1: [Title]**
- **As a [role],** I want to [action],
- **So that** [benefit].
- **Acceptance:** [Specific, testable criterion]

**Story 2: [Title]**
- **As a [role],** I want to [action],
- **So that** [benefit].
- **Acceptance:** [Specific, testable criterion]

[Add 3-5 user stories total]

### Database Schema

#### Table: `[table_name]`

[Description of table purpose]

```sql
CREATE TABLE [table_name] (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  [field_name]        [TYPE] [CONSTRAINTS],
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_[table]_[field] ON [table]([field]);
```

**Example row:**
```json
{
  "id": "uuid-123",
  "userId": "user-abc",
  "fieldName": "value",
  "createdAt": "2025-10-13T10:00:00Z"
}
```

**Explanation:**
- `[field_name]`: [What this field represents and why it exists]

[Add 1-3 tables as needed]

### API Routes

#### 1. `[METHOD] /api/[resource]/[action]`
[Description of what this endpoint does]

**RBAC:** [Role] only ([middleware function])  
**Feature Flag:** `FF_[FEATURE]_V1`

**Request:**
```json
{
  "field": "value"
}
```

**Response:**
```json
{
  "result": "value"
}
```

**Side Effects:**
- [What happens when this endpoint is called]

[Add 3-6 routes as needed]

### Feature Flags

```bash
# Enable [feature]
FF_[FEATURE]_V1=true

# Configuration (optional)
[CONFIG_VAR]=[value]
```

### Environment Variables

```bash
# Required
[REQUIRED_VAR]=value

# Optional (with defaults)
[OPTIONAL_VAR]=value  # default: [default_value]
```

---

## 4. Implementation Plan

### Phase 1: Database Schema ([X] hours)

**File:** `api/drizzle/[XXX]_[feature].sql`

```sql
------------------------------------------------------------------------------
-- Epic [X]: [Feature Name]
-- BRD: [XX-X] ([Requirement description])
-- FSD: Will be added as new section post-§[XX-1] upon Epic [X] completion
-- Roadmap: docs/MVP_B2B_ROADMAP.md (Epic [X], lines XXX-XXX)
------------------------------------------------------------------------------

[SQL statements here]
```

**Update Drizzle Schema:**

**File:** `api/src/db/schema.ts`

[TypeScript schema definitions]

**Run Migration:**
```bash
cd api
npm run db:migrate
```

**Acceptance:**
- [ ] Migration runs without errors
- [ ] [X] new tables created
- [ ] Indexes created
- [ ] Foreign key constraints enforced

---

### Phase 2: [Service Name] Service ([X] hours)

**File:** `api/src/services/[service].ts` (NEW)

[Description of service purpose]

```typescript
/**
 * [Service Name] Service
 * Epic [X]: [Feature Name]
 * [Service description]
 */

[Full code with comments]
```

**Acceptance:**
- [ ] Service function [X] works
- [ ] Error handling implemented
- [ ] [Specific behavior] verified

---

### Phase 3: [Feature] API Routes ([X] hours)

**File:** `api/src/routes/[feature].ts` (NEW)

[Description of routes]

```typescript
/**
 * [Feature] Routes
 * Epic [X]: [Feature Name]
 */

[Full code with RBAC, error envelopes, etc.]
```

**Register Routes:**

**File:** `api/src/index.ts`

Add after [previous] routes:

```typescript
// [Feature] routes (Epic [X])
await safeRegister('./routes/[feature]', ['register[Feature]Routes']);
```

**Acceptance:**
- [ ] [METHOD] /api/[resource] works
- [ ] RBAC enforced
- [ ] Feature flag gates routes
- [ ] Error envelopes returned

---

### Phase 4-7: [Additional Phases]

[Continue with remaining implementation phases]

---

### Phase [Final]: Testing & Documentation ([X] hours)

**Unit Tests:**

**File:** `api/tests/[feature].test.ts` (NEW)

[Test code]

**Route Tests:**

**File:** `api/tests/[feature]-routes.test.ts` (NEW)

[Test code]

**Smoke Tests:**

**File:** `api/scripts/smoke-[feature].sh` (NEW)

[Bash script]

**Documentation Updates:**

**File:** `docs/functional-spec.md`

Add new section:

```markdown
## [XX]) [Feature Name] (Epic [X]) — ✅ IMPLEMENTED

**Covers BRD:** [XX-X] ([Requirement])

**Epic Status:** ✅ IMPLEMENTED [DATE] | Epic: Epic [X] | Tests: `api/tests/[feature].test.ts`

[Description and key features]
```

**File:** `docs/spec/flags.md`

Add:

```markdown
[Feature Name] (Epic [X])
- FF_[FEATURE]_V1 (default: false) - [Description]
- [CONFIG_VAR] (default: [value]) - [Description]
```

**Acceptance:**
- [ ] All tests pass (unit, route, smoke)
- [ ] Documentation updated
- [ ] Feature flags documented
- [ ] Smoke tests executable

---

## 5. Code Patterns & Examples

### Pattern 1: [Pattern Name]

**From:** `docs/ARCHITECTURE_DECISIONS.md` (Section [X])

[Code example showing pattern usage in this epic]

### Pattern 2: [Pattern Name]

[Additional patterns as needed]

---

## 6. Acceptance Criteria

### Database & Schema
- [ ] [Table] table created with indexes
- [ ] Migration runs without errors
- [ ] Foreign key constraints enforced
- [ ] [Specific criterion]

### [Service Name] Service
- [ ] [Function] returns correct result
- [ ] Error handling works
- [ ] [Specific behavior] verified

### [Feature] API Routes
- [ ] [METHOD] /api/[resource] works
- [ ] RBAC enforcement verified
- [ ] Feature flag gating works
- [ ] Error envelopes returned

### [UI Component] (if applicable)
- [ ] Component renders
- [ ] User interaction works
- [ ] [Specific behavior]

### Testing
- [ ] Unit tests pass
- [ ] Route tests pass
- [ ] Smoke tests pass
- [ ] E2E test: [Scenario]

### Documentation
- [ ] Functional spec updated (new section §[XX])
- [ ] Feature flags documented in docs/spec/flags.md
- [ ] Use cases documented (if applicable)
- [ ] API routes documented in openapi.yaml (optional)
- [ ] README updated with [feature] instructions

### Feature Flags
- [ ] FF_[FEATURE]_V1 gates all routes
- [ ] [CONFIG_VAR] configurable
- [ ] Routes return 404 when flags disabled

---

## 7. Testing Instructions

### Unit Tests

Run [feature] service tests:
```bash
cd api
npm run test src/services/[feature].test.ts
```

Expected output:
- [Specific test results]

### Route Tests

Run [feature] route tests:
```bash
cd api
npm run test tests/[feature]-routes.test.ts
```

Expected output:
- All tests pass
- RBAC enforcement verified

### Smoke Tests

**Prerequisites:**
1. API running on http://localhost:8080
2. Feature flags enabled:
   ```bash
   export FF_[FEATURE]_V1=true
   ```

**Run smoke tests:**
```bash
cd api
./scripts/smoke-[feature].sh
```

Expected output:
- [Endpoint] returns 200
- [Specific behavior]

### E2E Tests

**Scenario 1: [Test Name]**
1. [Step 1]
2. [Step 2]
3. Verify [expected result]

**Scenario 2: [Test Name]**
[Steps]

---

## 8. Rollout Plan

### Phase 1: Internal Testing (Week 1)

**Flags:**
```bash
FF_[FEATURE]_V1=false  # Off in production
```

**Actions:**
- Deploy code to staging
- Enable flags in staging only
- Internal team tests
- Fix any bugs

### Phase 2: Beta Users (Week 2)

**Flags:**
```bash
FF_[FEATURE]_V1=true  # Enable in production
```

**Actions:**
- Enable in production
- Invite 10-20 beta users
- Monitor usage and metrics
- Collect feedback

### Phase 3: Full Rollout (Week 3)

**Flags:**
- All flags enabled
- No changes

**Actions:**
- Announce feature
- Update documentation
- Monitor for 1 week

---

## 9. References

### Key Files to Study

1. **`docs/EPIC_MASTER_PLAN.md`** (Epic [X] section) - Locked scope
2. **`docs/ARCHITECTURE_DECISIONS.md`** - All patterns
3. **`docs/brd/cerply-brd.md`** ([XX-X]) - BRD requirements
4. **`[Previous epic prompt]`** - Follow this structure
5. **`api/src/routes/[relevant].ts`** - Route pattern
6. **`api/src/services/[relevant].ts`** - Service pattern

### Dependencies

**API:**
- [Package name] - [Purpose]

**Web:**
- [Package name] - [Purpose]

### External Resources

- [Resource name]: [URL]

---

## 10. Quick Start Checklist

Before starting implementation:

- [ ] Read this prompt fully ([X] min)
- [ ] Review ARCHITECTURE_DECISIONS.md ([X] min)
- [ ] Review EPIC_MASTER_PLAN.md Epic [X] section ([X] min)
- [ ] Review BRD [XX-X] ([X] min)
- [ ] Study [previous epic] for patterns ([X] min)
- [ ] Verify environment variables set ([X] min)
- [ ] Verify feature flags understand ([X] min)

Implementation order:

1. [ ] Phase 1: Database Schema ([X] hours)
2. [ ] Phase 2: [Service] Service ([X] hours)
3. [ ] Phase 3: [Feature] API Routes ([X] hours)
[Continue with all phases]

Post-implementation:

- [ ] Run all tests: `npm run test`
- [ ] Run smoke tests: `./api/scripts/smoke-[feature].sh`
- [ ] Test E2E scenarios manually
- [ ] Update functional spec
- [ ] Update feature flags documentation
- [ ] Commit with `[spec]` tag: `git commit -m "feat([feature]): Epic [X] [feature name] [spec]"`

---

## Total Effort Summary

| Phase | Task | Hours |
|-------|------|-------|
| 1 | Database Schema | [X] |
| 2 | [Service] Service | [X] |
| 3 | [Feature] API Routes | [X] |
[Continue]
| **Total** | | **[X] hours** |

**Estimated:** [X] overnights  
**Priority:** P[X] ([Category])  
**Epic:** [X] of 12  
**Status:** Ready for implementation

---

**End of Epic [X] Implementation Prompt**

Good luck! 🚀

