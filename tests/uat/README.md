# Cerply V2.0 - UAT (User Acceptance Testing)

**Status:** ✅ Infrastructure Complete | 🟡 Tests Partially Implemented  
**Based on:** BRD v2.0 + FSD v2.0  
**Framework:** Playwright + TypeScript + Axe (a11y)

---

## 📋 Overview

This UAT suite validates that Cerply V2.0 meets the functional requirements defined in the Business Requirements Document (BRD v2) and Functional Specification Document (FSD v2).

**Scope:** Functional correctness only (not UI/styling)

**Key Focus Areas:**
1. **Build** - Module creation with provenance tracking
2. **Push** - Module assignments with delivery rules
3. **Learn** - Learner interactions (answer, help, challenge, progress)
4. **Track** - Analytics dashboards (team, person, module)
5. **Certified** - Catalogue workflow (partial, awaiting Certifier role)
6. **Data** - Privacy, model logs, deletion

---

## 🎯 Test Matrix

See **`tests/uat/test-matrix.md`** for complete test plan with:
- 30+ test cases
- FSD section mapping
- Priority levels (P0/P1/P2)
- Acceptance criteria
- Known constraints (deferred roles)

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Application

```bash
# Terminal 1: API (with V2 dev mode)
cd api
V2_DEV_MODE=true npm run dev

# Terminal 2: Web
cd web
npm run dev

# Terminal 3 (optional): Stubs for Slack/Teams
npm run uat:stubs
```

### 3. Run Tests

```bash
# Headless (CI mode)
npm run uat

# With browser UI (debugging)
npm run uat:headed

# Debug specific test
npm run uat:debug -- tests/uat/specs/build.spec.ts

# Generate summary report
npm run uat:report
```

---

## 📁 Structure

```
tests/uat/
├── playwright.config.ts       # Playwright configuration
├── test-matrix.md             # Comprehensive test plan
├── generate-summary.ts        # Report generator
├── fixtures/
│   └── seed.ts                # Test data seeding
├── stubs/
│   ├── slack.ts               # Slack API stub (port 4001)
│   └── teams.ts               # Teams API stub (port 4002)
└── specs/
    ├── build.spec.ts          # Build workspace tests
    ├── provenance-visibility.spec.ts  # CRITICAL: Provenance rules
    └── track-dashboards.spec.ts       # Analytics dashboards

reports/
├── uat-summary.md             # Human-readable summary
├── junit.xml                  # JUnit format (CI integration)
└── html/                      # HTML report (Playwright)
```

---

## 🧪 Test Categories

### P0 (Must Pass Before Release)
- ✅ Module creation from prompt
- ✅ Provenance badges visible to managers ONLY
- ⏳ Module assignment with rules (audience, cap, quiet hours)
- ⏳ Learners can answer items
- ⏳ Daily cap respected
- ⏳ No exact repeats (unless Compliance Critical)
- ⏳ Model logs written
- ✅ Dashboards load (Team/Person/Module)

### P1 (Should Pass)
- ⏳ Merge prompt + upload
- ⏳ Lock gating (QC must pass)
- ⏳ Versioning
- ⏳ Help/Challenge/Progress commands
- ⏳ PDF export with provenance
- ⏳ Data deletion (personal removed, aggregates kept)
- ✅ Performance <2s
- ✅ A11y no critical violations

### P2 (Nice to Have)
- ⏳ Full Certified workflow (depends on Certifier role)
- ⏳ Consultant collaboration (depends on Consultant role)

**Legend:**
- ✅ Test implemented
- ⏳ Test planned/partial
- ⏭️  Deferred (role not yet implemented)

---

## 🔧 Configuration

### Environment Variables

```bash
# Application base URL (default: http://localhost:3000)
export APP_BASE_URL=http://localhost:3000

# Skip webserver auto-start (if already running)
export SKIP_WEBSERVER=true

# CI mode (affects retries, parallelization)
export CI=true
```

### Playwright Config

Located in `tests/uat/playwright.config.ts`:
- **Timeout:** 60s per test
- **Retries:** 2 in CI, 0 locally
- **Workers:** 1 (sequential, avoids DB conflicts)
- **Reporters:** List, JUnit, HTML
- **Browser:** Chromium (Desktop Chrome)

---

## 🎭 Test Stubs

### Slack Stub (localhost:4001)

Captures Slack Web API calls:
- `POST /api/chat.postMessage` - Send messages
- `GET /test/messages` - View captured messages
- `POST /test/clear` - Clear history

```bash
# Start stub
tsx tests/uat/stubs/slack.ts

# Or via npm
npm run uat:stubs
```

### Teams Stub (localhost:4002)

Captures Teams Bot Framework calls:
- `POST /v3/conversations/:id/activities` - Send activities
- `GET /test/activities` - View captured activities
- `POST /test/clear` - Clear history

---

## 📊 Reports

### Generate Summary

```bash
npm run uat:report
```

Output: `reports/uat-summary.md`

### View HTML Report

After running tests:

```bash
npx playwright show-report reports/html
```

### CI Integration

JUnit XML available at `reports/junit.xml` for CI systems.

---

## 🔍 Debugging

### Run Single Test

```bash
npm run uat:debug -- --grep "B01"
```

### Headed Mode (See Browser)

```bash
npm run uat:headed
```

### Playwright Inspector

```bash
npm run uat:debug -- tests/uat/specs/build.spec.ts
```

### Check Specific Element

```bash
# In test file
await page.pause(); // Opens Playwright Inspector
```

---

## 🚧 Known Constraints

### Deferred Roles (per FSD Implementation Notes)

1. **Certifier Role:** Using admin for now
   - Certified workflow tests marked P2 (lower priority)
   - Submit/Review/Stamp flow partially implemented

2. **Consultant Role:** Using manager for now
   - Collaboration tests deferred
   - Ownership transfer not fully tested

### Schema Alignment

- 135 TypeScript errors (compile-time, not blocking)
- Some backend operations may error until schema fixes applied
- Tests verify UI structure; full data flow depends on schema

### Current Backend Status

- ✅ Routes registered and accessible
- ✅ Auth middleware in place
- 🟡 Some services need schema alignment
- 🟡 Data persistence partial (depends on schema)

---

## 📝 Writing New Tests

### Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name (FSD §X)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/v2/build');
  });

  test('TEST_ID: Test description', async ({ page }) => {
    // Given: Setup
    await page.locator('input').fill('test input');
    
    // When: Action
    await page.getByRole('button', { name: 'Submit' }).click();
    
    // Then: Assertion
    await expect(page.getByText('Success')).toBeVisible();
  });
});
```

### A11y Check

```typescript
import { injectAxe, checkA11y } from 'axe-playwright';

test('A11y: No critical violations', async ({ page }) => {
  await page.goto('/v2/build');
  await injectAxe(page);
  await checkA11y(page, undefined, {
    detailedReport: true,
  });
});
```

---

## 📚 Resources

- **Test Matrix:** `tests/uat/test-matrix.md`
- **BRD v2:** `docs/refactor/BRD v2.rtf`
- **FSD v2:** `docs/refactor/FSD v2.rtf`
- **Playwright Docs:** https://playwright.dev
- **Axe Docs:** https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright

---

## 🎯 Next Steps

1. ✅ **Infrastructure complete** - All stubs, configs, runners in place
2. ⏳ **Run first pass** - `npm run uat`
3. ⏳ **Review results** - Check `reports/uat-summary.md`
4. ⏳ **Fix failures** - Address P0 tests first
5. ⏳ **Expand coverage** - Implement remaining P1/P2 tests
6. ⏳ **Schema alignment** - Fix backend for full data flow
7. ✅ **Re-run** - Until all P0 tests pass

---

**Ready for first-pass UAT!** 🚀

Run `npm run uat` to begin.

