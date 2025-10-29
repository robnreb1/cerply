# Cerply V2.0 - UAT Summary

**Generated:** 10/29/2025, 8:06:39 PM
**Based on:** BRD v2.0 + FSD v2.0
**Test Matrix:** tests/uat/test-matrix.md

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Total Tests** | 0 |
| **✅ Passed** | 0 |
| **❌ Failed** | 0 |
| **⏭️  Skipped** | 0 |
| **Duration** | 0ms |

---

## Results by FSD Section

### 1. Build (FSD §1)
- **B01**: Create module from prompt → 🟡 Pending
- **B02**: Merge prompt + upload → 🟡 Pending
- **B03**: Provenance badges visible to manager → 🟡 Pending
- **B04**: Lock blocked if QC fails → 🟡 Pending

**Status:** ⏳ Not yet run

### 2. Push (FSD §2)
- **P01**: Create module assignment → ⏳ Not implemented
- **P02**: Mandatory vs recommended → ⏳ Not implemented

**Status:** ⏳ Not yet implemented

### 3. Learn (FSD §3)
- **L05**: No provenance visible to learner → 🟡 Pending
- **L06**: No exact repeats → 🟡 Pending

**Status:** ⏳ Partial

### 4. Track (FSD §4)
- **T01**: Team dashboard loads → 🟡 Pending
- **T02**: Person dashboard loads → 🟡 Pending
- **T03**: Module dashboard loads → 🟡 Pending

**Status:** ⏳ Partial

---

## Test Coverage
- **P0 Tests (Must Pass):** ~40% implemented
- **P1 Tests (Should Pass):** ~30% implemented
- **P2 Tests (Nice to Have):** ~10% implemented

---

## How to Run

```bash
# Start application
Terminal 1: cd api && V2_DEV_MODE=true npm run dev
Terminal 2: cd web && npm run dev

# Start stubs (optional)
Terminal 3: npm run uat:stubs

# Run UAT
npm run uat

# Or with headed browser
npm run uat:headed
```

---

## Detailed Results

No test results yet. Run `npm run uat` to generate.

---

**Next Steps:**
1. Review this summary
2. Run tests: `npm run uat`
3. Check detailed HTML report: `reports/html/index.html`
4. Fix failing tests
5. Re-run until all P0 tests pass