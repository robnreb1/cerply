# Cerply V2.0 - UAT Test Matrix

**Version:** 1.0  
**Date:** October 29, 2025  
**Based on:** BRD v2.0 + FSD v2.0

## Scope & Constraints

**Implemented:**
- Manager/Leader role (admin)
- Learner role
- Basic Build/Push/Learn/Track flows

**Deferred (per FSD Implementation Notes):**
- Distinct Certifier role (using admin for now)
- Distinct Consultant role (using manager for now)
- Full Certified catalogue workflow (partial implementation)

**Test Approach:**
- Focus on functional correctness per FSD acceptance criteria
- Ignore layout/styling (functional only)
- Use stubs for Slack/Teams
- Verify core data flows and business rules

---

## Test Matrix

### 1. Build (FSD §1)

| Test ID | Feature | FSD Section | Steps | Expected Result | Priority |
|---------|---------|-------------|-------|-----------------|----------|
| B01 | Create module from prompt | §1.1, §1.2 | Manager logs in → Navigate to Build → Enter prompt → Submit | Module created with sections, provenance badge "Internal" shown | P0 |
| B02 | Merge prompt + upload | §1.3 | Start with prompt → Upload file → Agent merges content | Module contains both sources, conflicts flagged if any | P0 |
| B03 | Provenance badges visible to manager | §1.1, §7 | Create module → Check Content pane | Badges shown (Internal/Certified Core/Industry/Templates) | P0 |
| B04 | Lock blocked if QC fails | §1.3, §14 | Create module → Introduce QC-failing content → Attempt lock | Lock button disabled or error message shown | P1 |
| B05 | Versioning works | §1.4 | Lock module → Make edit → Lock again | Version increments, lineage tracked | P1 |
| B06 | Storage routing (client content) | §7 | Upload proprietary doc → Check storage | Content stored in Client Library, not referenced | P1 |

### 2. Push (FSD §2)

| Test ID | Feature | FSD Section | Steps | Expected Result | Priority |
|---------|---------|-------------|-------|-----------------|----------|
| P01 | Create module assignment | §2.1a | Manager → Push → Create assignment → Set audience, mandatory, start date, quiet hours, cap | Assignment created with all rules | P0 |
| P02 | Mandatory vs recommended | §2.1a | Create two assignments (one mandatory, one recommended) | Mandatory counts toward cap, recommended doesn't | P1 |
| P03 | Quiet hours respected | §2.2 | Set quiet hours 20:00-08:00 → Check delivery times | No items sent during quiet hours | P1 |
| P04 | Daily cap respected | §2.2 | Set daily cap to 2 → Learner receives items | Max 2 items per day delivered | P0 |

### 3. Learn (FSD §3)

| Test ID | Feature | FSD Section | Steps | Expected Result | Priority |
|---------|---------|-------------|-------|-----------------|----------|
| L01 | Answer item | §3.1 | Learner receives item → Answers | Feedback given, progress tracked | P0 |
| L02 | Request help | §3.2 | Learner → "Help" command | Hint or explanation provided | P1 |
| L03 | Challenge | §3.3 | Learner → "Challenge" command | Harder item or related topic offered | P1 |
| L04 | Progress card | §3.4 | Learner → "How am I doing?" | Progress summary with metrics | P1 |
| L05 | No provenance visible to learner | §7, §3 | Learner views item | No provenance badges shown anywhere | P0 |
| L06 | No exact repeats (unless Compliance Critical) | §2.3, §3 | Learner completes items → Check for repeats | Same item not shown twice unless module flagged Compliance Critical | P0 |

### 4. Track (FSD §4)

| Test ID | Feature | FSD Section | Steps | Expected Result | Priority |
|---------|---------|-------------|-------|-----------------|----------|
| T01 | Team dashboard loads | §4.1 | Manager → Track → Team view | Dashboard shows aggregate metrics (mastery, active users, at-risk) | P0 |
| T02 | Person dashboard loads | §4.2 | Manager → Track → Person view → Select learner | Individual metrics shown (level, weak areas, streak) | P0 |
| T03 | Module dashboard loads | §4.3 | Manager → Track → Module view → Select module | Module metrics shown (freshness, reach, confusing items) | P0 |
| T04 | PDF export includes provenance | §4.3 | Manager → Track → Export PDF | PDF contains module outline + provenance badges | P1 |

### 5. Certified (FSD §5)

| Test ID | Feature | FSD Section | Steps | Expected Result | Priority |
|---------|---------|-------------|-------|-----------------|----------|
| C01 | Submit for review | §5.1 | Manager creates module → Submit to Certified | Submission recorded, status = "pending review" | P2* |
| C02 | Review checklist | §5.2 | Admin reviews submission → Complete checklist | Can approve/reject/request changes | P2* |
| C03 | Stamp module | §5.3 | Admin stamps approved module | Module becomes "Certified Core", read-only | P2* |
| C04 | Wraps allowed and labeled | §5.4 | Manager adds wrap to Certified Core module | Wrap clearly labeled, core uneditable | P1 |
| C05 | Core uneditable | §5 | Attempt to edit Certified Core content | Edit blocked, error shown | P1 |

_*P2 = Lower priority due to deferred Certifier role_

### 6. Data & Privacy (FSD §7)

| Test ID | Feature | FSD Section | Steps | Expected Result | Priority |
|---------|---------|-------------|-------|-----------------|----------|
| D01 | Delete learner (personal data removed) | §7.4 | Delete learner account → Check database | Personal data removed, aggregates retained | P1 |
| D02 | Model logs written | §7, §14 | Create module (triggers model calls) → Check model_logs table | Logs contain model, timestamp, tokens, cost | P0 |

### 7. Performance & A11y (FSD §9)

| Test ID | Feature | FSD Section | Steps | Expected Result | Priority |
|---------|---------|-------------|-------|-----------------|----------|
| N01 | Main dashboard loads quickly | §9 | Navigate to Track dashboard | Loads in <2s with seeded data | P1 |
| N02 | A11y check (Build) | §9 | Run axe on Build page | No critical violations | P1 |
| N03 | A11y check (Learn) | §9 | Run axe on Learn page | No critical violations | P1 |

---

## Test Environment Setup

### Seed Data (tests/uat/fixtures/seed.ts)

1. **Organization:** "Demo Financial Services"
2. **Users:**
   - Manager: manager@demo.com (admin role)
   - Learners: learner1@demo.com, learner2@demo.com, learner3@demo.com
   - (Consultant/Certifier: Use admin for now per deferred roles)

3. **Modules:**
   - Company Module: "Trade Capture Fundamentals" (locked, v1)
   - Certified Core Module: "Compliance Essentials" (read-only, stamped)
   - Draft Module: "Python Basics" (unlocked)

4. **Module Assignment:**
   - "Trade Capture Fundamentals" → Team (Ops EMEA)
   - Mandatory, Start: 2025-11-01, Quiet: 20:00-08:00, Cap: 2

5. **Flags:**
   - "Compliance Essentials" marked as Compliance Critical (allows exact repeats)

### Stubs

- **Slack:** localhost:4001 (captures /chat.postMessage, responds with ok)
- **Teams:** localhost:4002 (captures bot messages, responds with activity ID)

---

## Acceptance Criteria Summary

### Must Pass (P0)
- Module creation from prompt works
- Provenance badges visible to managers, hidden from learners
- Module assignment with rules (audience, mandatory, quiet hours, cap)
- Learners can answer items
- Cap respected (max items/day)
- No exact repeats unless Compliance Critical
- Model logs written
- Team/Person/Module dashboards load

### Should Pass (P1)
- Merge prompt + upload
- Lock gating (QC must pass)
- Versioning
- Help/Challenge/Progress commands
- PDF export with provenance
- Data deletion (personal removed, aggregates kept)
- Performance <2s
- A11y no critical violations

### Nice to Have (P2)
- Full Certified workflow (submit/review/stamp)
- (Depends on Certifier role implementation)

---

## Test Execution

```bash
# Install dependencies
npm install

# Start stubs
node tests/uat/stubs/slack.ts &
node tests/uat/stubs/teams.ts &

# Seed database
npm run seed:uat

# Run tests
npm run uat

# Generate report
npm run uat:report
```

---

## Deliverables

1. ✅ **tests/uat/test-matrix.md** (this file)
2. 🔄 **tests/uat/playwright.config.ts** (Playwright config)
3. 🔄 **tests/uat/specs/*.spec.ts** (Test implementations)
4. 🔄 **tests/uat/stubs/slack.ts** (Slack stub server)
5. 🔄 **tests/uat/stubs/teams.ts** (Teams stub server)
6. 🔄 **tests/uat/fixtures/seed.ts** (Database seeding)
7. 🔄 **reports/uat-summary.md** (Results summary)

---

## Notes

- Tests use V2 dev mode auth (Bearer dev-token)
- Deferred roles (Certifier/Consultant) handled by admin/manager
- Some Certified tests marked P2 (lower priority)
- Focus is functional correctness, not UI polish
- All tests verify FSD acceptance criteria

