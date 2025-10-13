# Agent Workflow - Cerply Development
**Version:** 1.0  
**Status:** MANDATORY (All agents must follow)  
**Last Updated:** 2025-10-13  
**Owner:** Cerply Engineering

---

## Purpose

This document defines the **mandatory workflow** that ALL agents (AI or human) must follow when implementing features, fixing bugs, or modifying Cerply codebase. This workflow ensures consistency, traceability, and prevents scope drift.

---

## Pre-Implementation Phase (MANDATORY)

### Step 1: Read Master Documents (1-2 hours)

**You MUST read these documents IN ORDER before writing any code:**

1. **docs/ARCHITECTURE_DECISIONS.md** (30-45 min)
   - **Status:** LOCKED v1.0
   - **Purpose:** Immutable architectural principles
   - **What to extract:** Code patterns, conventions, tech stack
   - **Rule:** NO deviations without explicit approval

2. **docs/EPIC_MASTER_PLAN.md** (30-45 min)
   - **Status:** LOCKED v1.0
   - **Purpose:** Single source of truth for epic scope
   - **What to extract:** Locked scope for your epic, dependencies, acceptance
   - **Rule:** NO scope expansion without approval

3. **docs/brd/cerply-brd.md** (15-30 min)
   - **Status:** Living document (business requirements)
   - **Purpose:** Business requirements and user stories
   - **What to extract:** Specific requirements (e.g., AU-1, L-12, B-3)
   - **Focus:** Only read sections relevant to your epic

4. **docs/functional-spec.md** (15-30 min)
   - **Status:** Living document (technical specs)
   - **Purpose:** Implementation history and technical details
   - **What to extract:** Existing implementations, patterns, §sections
   - **Focus:** Read related sections to understand context

### Step 2: Read Epic-Specific Documents (30-60 min)

5. **[EPIC_X_IMPLEMENTATION_PROMPT.md]**
   - **Purpose:** Detailed implementation guide for your epic
   - **What to extract:** Phase-by-phase implementation steps, code examples
   - **Rule:** Follow structure exactly unless justification provided

6. **Previous Epic Prompts** (Optional but recommended)
   - Read 1-2 previous epic prompts to understand patterns
   - Examples: EPIC7_IMPLEMENTATION_PROMPT.md, EPIC8_IMPLEMENTATION_PROMPT.md

### Step 3: Verify Environment (10 min)

```bash
# Check you have access to required tools
node --version    # Should be 20.x
npm --version     # Should be 10.x
psql --version    # Should be 15.x

# Check environment variables are set
echo $DATABASE_URL
echo $OPENAI_API_KEY
echo $FF_[FEATURE]_V1  # Feature flag for your epic

# Check API and Web servers can start
cd api && npm install && npm run dev  # Should start on :8080
cd web && npm install && npm run dev  # Should start on :3000
```

### Step 4: Create Implementation Checklist (10 min)

Copy the "Quick Start Checklist" from your epic's implementation prompt and track your progress.

**Total Pre-Implementation Time: 2-3 hours**

---

## Implementation Phase (MANDATORY)

### Step 5: Follow Epic Implementation Plan

**Rules:**
- ✅ Implement phases in the order specified in the prompt
- ✅ Use code patterns from ARCHITECTURE_DECISIONS.md
- ✅ Follow naming conventions exactly
- ✅ Add migration headers with Epic/BRD/FSD references
- ✅ Use feature flags for all new features
- ✅ Extract business logic to service layer (not inline in routes)
- ✅ Use RBAC middleware for all protected routes
- ✅ Return error envelopes for all failures
- ❌ NO skipping phases without justification
- ❌ NO introducing new patterns without approval
- ❌ NO expanding scope beyond locked requirements

### Step 6: Test as You Go

After each phase, run tests:

```bash
# Unit tests (after implementing service)
cd api
npm run test src/services/[your-service].test.ts

# Route tests (after implementing routes)
npm run test tests/[your-feature]-routes.test.ts

# Smoke tests (after completing all phases)
./scripts/smoke-[your-feature].sh

# Linting (continuously)
npm run lint
```

**Rule:** Fix linting errors immediately. Do not accumulate technical debt.

### Step 7: Document as You Go

**During implementation:**
- Add JSDoc comments to all public functions
- Update inline comments for complex logic
- Track open questions in your implementation prompt

**After implementation:**
- Update docs/functional-spec.md with new §section
- Update docs/spec/flags.md with feature flags
- Update docs/spec/use-cases.md if user-facing

---

## Post-Implementation Phase (MANDATORY)

### Step 8: Comprehensive Testing (2-3 hours)

**Unit Tests:**
```bash
cd api
npm run test                     # All tests
npm run test:coverage            # Check coverage
```

**Expected:**
- All tests pass
- Coverage > 80% for new code

**Route Tests:**
```bash
cd api
npm run test tests/              # All route tests
```

**Expected:**
- All routes return correct status codes
- RBAC enforcement verified
- Feature flag gating verified

**Smoke Tests:**
```bash
cd api
./scripts/smoke-[your-feature].sh
```

**Expected:**
- All critical paths return 200
- Error cases return correct error envelopes

**E2E Tests (Manual):**
1. Follow E2E test scenarios from your implementation prompt
2. Test happy path
3. Test error cases
4. Test RBAC (try accessing as wrong role)

### Step 9: Documentation Updates (1 hour)

**File 1: docs/functional-spec.md**

Add new section:

```markdown
## [XX]) [Feature Name] (Epic [X]) — ✅ IMPLEMENTED

**Covers BRD:** [XX-X] ([Requirement])

**Epic Status:** ✅ IMPLEMENTED [DATE] | Epic: Epic [X] | Tests: `api/tests/[feature].test.ts`

[Description]

**Key Features:**
- [Feature 1]
- [Feature 2]

**API Routes:**
- [METHOD] /api/[resource] - [Description]

**Database Schema:**
- [table_name] ([columns])

**Feature Flags:**
- FF_[FEATURE]_V1 - [Description]
```

**File 2: docs/spec/flags.md**

Add:

```markdown
[Feature Name] (Epic [X])
- FF_[FEATURE]_V1 (default: false) - [Description]
- [CONFIG_VAR] (default: [value]) - [Description]
```

**File 3: docs/spec/use-cases.md** (if user-facing)

Update relevant use case with implementation status.

### Step 10: Commit with Traceability (10 min)

**Commit Message Format:**

```
<type>([scope]): <subject> [tags]

[optional body explaining what and why]

Refs: BRD [XX-X], FSD §[XX], Epic [X]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `chore`: Maintenance
- `docs`: Documentation only
- `test`: Test updates

**Tags:**
- `[spec]`: Changes to functional spec or BRD
- `[breaking]`: Breaking API changes

**Example:**

```
feat(chat): Epic 8 conversational learning interface [spec]

Implements natural language chat with intent routing, LLM explanations,
and free-text answer validation. Includes confusion tracking for adaptive
difficulty signals.

Key deliverables:
- Chat panel with Cmd+K shortcut
- Intent router (5 intents)
- Explanation engine with caching
- Free-text validator (fuzzy + LLM)
- 5 API routes with RBAC

Refs: BRD L-12, L-18; FSD §29; Epic 8
```

**Commit command:**

```bash
git add .
git commit -m "feat([feature]): Epic [X] [feature name] [spec]"
git push origin [branch]
```

### Step 11: Create Pull Request (15 min)

**PR Title:**

```
feat(Epic [X]): [Feature Name]
```

**PR Description:**

```markdown
## Epic [X]: [Feature Name]

**BRD Requirements:** [XX-X], [XX-Y]
**FSD Section:** §[XX]
**Implementation Prompt:** [EPIC_X_IMPLEMENTATION_PROMPT.md]

### Summary
[1-2 sentence summary]

### Key Deliverables
- [ ] [Deliverable 1]
- [ ] [Deliverable 2]
- [ ] [Deliverable 3]

### Testing
- [X] Unit tests pass (coverage: XX%)
- [X] Route tests pass
- [X] Smoke tests pass
- [X] E2E tests completed manually

### Documentation
- [X] Functional spec updated (§[XX])
- [X] Feature flags documented
- [X] Use cases updated (if applicable)

### Acceptance Examples
\`\`\`bash
# Example 1
curl [endpoint]
# → [expected result]

# Example 2
curl [endpoint]
# → [expected result]
\`\`\`

### Checklist
- [X] Read ARCHITECTURE_DECISIONS.md
- [X] Read EPIC_MASTER_PLAN.md
- [X] Read BRD [XX-X]
- [X] Followed implementation prompt exactly
- [X] All tests pass
- [X] Documentation updated
- [X] No linter warnings
- [X] No scope expansion

### Traceability
- **BRD:** docs/brd/cerply-brd.md ([XX-X], [XX-Y])
- **FSD:** docs/functional-spec.md (§[XX])
- **Epic Plan:** docs/EPIC_MASTER_PLAN.md (Epic [X])
- **ADR:** docs/ARCHITECTURE_DECISIONS.md (all patterns followed)
```

### Step 12: Handoff (10 min)

**If handing off to another agent:**
1. Document any open questions or TODOs
2. List any deviations from the implementation prompt (with justification)
3. Provide context on any tricky implementation decisions
4. Update epic status in EPIC_MASTER_PLAN.md (if authorized)

---

## Common Pitfalls (AVOID)

### ❌ Pitfall 1: Skipping Master Documents

**Problem:** Agent starts coding without reading ARCHITECTURE_DECISIONS.md or EPIC_MASTER_PLAN.md

**Result:** Code doesn't follow patterns, scope drift, rework required

**Solution:** ALWAYS read master documents first (2-3 hours investment saves days of rework)

### ❌ Pitfall 2: Scope Expansion

**Problem:** Agent adds "nice to have" features beyond locked scope

**Result:** Increased complexity, delayed delivery, unexpected bugs

**Solution:** Stick to locked scope in EPIC_MASTER_PLAN.md. If you see gaps, raise them but don't implement without approval.

### ❌ Pitfall 3: Ignoring Traceability

**Problem:** Code doesn't map back to BRD requirements or FSD sections

**Result:** Impossible to verify all requirements met, audit trail broken

**Solution:** Use traceability matrix from implementation prompt. Every deliverable should trace to BRD.

### ❌ Pitfall 4: Inline Business Logic in Routes

**Problem:** Complex logic implemented directly in route handlers

**Result:** Untestable code, duplication, hard to maintain

**Solution:** Extract to service layer. Routes should be thin (RBAC + call service + return result).

### ❌ Pitfall 5: Missing Feature Flags

**Problem:** New feature not gated by feature flag

**Result:** Cannot roll back, cannot A/B test, all-or-nothing deployment

**Solution:** ALL new features get `FF_[FEATURE]_V1=true|false` flag.

### ❌ Pitfall 6: No RBAC

**Problem:** Protected routes don't use RBAC middleware

**Result:** Security vulnerability, unauthorized access

**Solution:** ALWAYS use `requireLearner`, `requireManager`, etc. and `return reply`.

### ❌ Pitfall 7: Inconsistent Error Envelopes

**Problem:** API returns different error formats

**Result:** Frontend can't handle errors consistently

**Solution:** ALWAYS return `{ error: { code, message, details? } }`.

### ❌ Pitfall 8: Missing Migration Headers

**Problem:** SQL migrations don't include Epic/BRD/FSD references

**Result:** No traceability, hard to understand why schema changed

**Solution:** ALWAYS include migration header:
```sql
------------------------------------------------------------------------------
-- Epic [X]: [Feature]
-- BRD: [XX-X]
-- FSD: §[XX]
------------------------------------------------------------------------------
```

### ❌ Pitfall 9: Skipping Tests

**Problem:** Code committed without unit/route/smoke tests

**Result:** Bugs in production, regression, broken builds

**Solution:** Write tests as you implement. Aim for >80% coverage.

### ❌ Pitfall 10: No Documentation Updates

**Problem:** Code merged without updating functional spec or flags

**Result:** Next agent has no context, features undiscoverable

**Solution:** ALWAYS update docs/functional-spec.md and docs/spec/flags.md with `[spec]` tag.

---

## Emergency Procedures

### Scenario 1: Discovered Architectural Flaw

**Symptoms:** Realize a pattern in ARCHITECTURE_DECISIONS.md doesn't work for your epic

**Action:**
1. ❌ Do NOT implement a workaround
2. ✅ Document the issue clearly
3. ✅ Propose alternative pattern with justification
4. ✅ Get approval from project owner
5. ✅ Update ARCHITECTURE_DECISIONS.md (with version bump)

### Scenario 2: Scope Ambiguity

**Symptoms:** Implementation prompt is unclear or contradicts BRD

**Action:**
1. ❌ Do NOT make assumptions
2. ✅ Document the ambiguity
3. ✅ Propose 2-3 options with trade-offs
4. ✅ Get clarification from project owner
5. ✅ Update epic prompt and EPIC_MASTER_PLAN.md if needed

### Scenario 3: Dependency Missing

**Symptoms:** Your epic depends on another epic that's incomplete

**Action:**
1. ❌ Do NOT implement the dependency yourself
2. ✅ Verify dependency graph in EPIC_MASTER_PLAN.md
3. ✅ If dependency truly missing, escalate
4. ✅ Wait for dependency to complete or get approval to proceed

### Scenario 4: Test Failure After Implementation

**Symptoms:** Tests fail after implementing your feature

**Action:**
1. ❌ Do NOT commit with failing tests
2. ✅ Debug and fix (allocate 2-4 hours)
3. ✅ If test is wrong, update test (document why)
4. ✅ If implementation is wrong, fix implementation
5. ✅ Ensure all tests pass before commit

---

## Checklist for Every Implementation

**Pre-Implementation:**
- [ ] Read ARCHITECTURE_DECISIONS.md (30-45 min)
- [ ] Read EPIC_MASTER_PLAN.md (30-45 min)
- [ ] Read BRD sections for epic (15-30 min)
- [ ] Read functional spec related sections (15-30 min)
- [ ] Read epic implementation prompt (30-60 min)
- [ ] Verify environment setup (10 min)
- [ ] Create implementation checklist (10 min)

**Implementation:**
- [ ] Follow phases in order
- [ ] Use patterns from ADR
- [ ] Feature flags for new features
- [ ] RBAC middleware for protected routes
- [ ] Service layer for business logic
- [ ] Error envelopes for failures
- [ ] Migration headers with traceability
- [ ] Test after each phase

**Post-Implementation:**
- [ ] All unit tests pass (>80% coverage)
- [ ] All route tests pass
- [ ] All smoke tests pass
- [ ] E2E tests completed manually
- [ ] Functional spec updated (§XX)
- [ ] Feature flags documented
- [ ] Use cases updated (if applicable)
- [ ] Commit with traceability
- [ ] PR created with full description
- [ ] No linter warnings

---

## Version History

### v1.0 (2025-10-13)
- Initial agent workflow creation
- Defined mandatory pre-implementation phase
- Established implementation and post-implementation phases
- Documented common pitfalls
- Created emergency procedures
- Defined comprehensive checklist

---

## Approval Process

**To modify this workflow:**
1. Create GitHub issue with proposed change
2. Justify with examples of where current workflow failed
3. Get approval from project owner
4. Update version number
5. Document change in version history

**Status:** MANDATORY - All agents must follow this workflow

---

**End of Agent Workflow**

