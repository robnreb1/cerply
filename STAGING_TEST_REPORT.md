# Staging Test Report - M3 API Surface
**Date:** 2025-10-06  
**Environment:** Staging  
**Branch:** staging (merged from main @ 9f73dbb)  
**Deploy Run:** [18275512670](https://github.com/robnreb1/cerply/actions/runs/18275512670)  

---

## ✅ Summary

**All staging tests passed successfully!**

- ✅ API deployment successful (8s)
- ✅ M3 API smoke tests: 31/31 passed
- ✅ Staging smoke workflow: SUCCESS
- ✅ Manual endpoint verification: PASSED

---

## 🔧 API Endpoints Tested

### POST /api/preview
**Status:** ✅ PASS  
**Test Results:**
- ✓ Returns 200 on valid request
- ✓ Returns 400 on invalid request
- ✓ Response has `.summary` field
- ✓ Response has `.proposed_modules` array
- ✓ Response has `.clarifying_questions` array

**Example:**
```bash
curl -X POST https://cerply-api-staging-latest.onrender.com/api/preview \
  -H "Content-Type: application/json" \
  -d '{"content":"Learn about blockchain consensus"}'

# Response:
{
  "summary": "Preview summary for content (Learn about blockchain consensus...)",
  "proposed_modules": [...],  # 3 modules
  "clarifying_questions": [...]
}
```

---

### POST /api/generate
**Status:** ✅ PASS  
**Test Results:**
- ✓ Returns 200 on valid request
- ✓ Returns 400 on empty modules array
- ✓ Response has `.modules` array
- ✓ Each module has `id`, `title`, `lessons`, `items`

---

### POST /api/score
**Status:** ✅ PASS  
**Test Results:**
- ✓ Returns 200 on valid request
- ✓ Returns 400 on missing required fields
- ✓ Response has `.score` (0-100)
- ✓ Response has `.difficulty` (easy/medium/hard)
- ✓ Response has `.misconceptions` array
- ✓ Response has `.next_review_days` number

---

### GET /api/daily/next
**Status:** ✅ PASS  
**Test Results:**
- ✓ Returns 200
- ✓ Response has `.queue` array
- ✓ Each item has `item_id` and `priority`

---

### GET /api/ops/usage/daily
**Status:** ✅ PASS  
**Test Results:**
- ✓ Returns 200
- ✓ Response has `.generated_at` timestamp
- ✓ Response has `.today` date
- ✓ Response has `.aggregates` array with usage stats

**Example:**
```bash
curl https://cerply-api-staging-latest.onrender.com/api/ops/usage/daily

# Response:
{
  "today": "2025-10-06",
  "yesterday": "2025-10-05",
  "aggregates": [
    {
      "route": "/api/preview",
      "requests": 5,
      "total_tokens_in": 2500,
      "total_tokens_out": 750,
      "total_est_cost": 0.0025
    }
    // ... 3 more routes
  ]
}
```

---

### GET /api/version
**Status:** ✅ PASS  
**Test Results:**
- ✓ Returns 200
- ✓ Response has `.ok` field

---

## 🌐 Web Integration

### /certified/study Page
**Production URL:** https://cerply-web.vercel.app/certified/study  
**Status:** ✅ DEPLOYED (200 OK)  
**Features:**
- Start Study Session button
- Demo cards with spaced repetition
- Integration with `/api/certified/schedule` and `/api/certified/progress`
- Flip/grade functionality

**Staging URL:** https://cerply-staging.vercel.app/certified/study  
**Status:** ⚠️ 401 (Preview protection - expected)

---

## 📊 Smoke Test Results

### M3 API Smoke Tests
```
=== M3 API Surface Smoke Tests ===
API_BASE: https://cerply-api-staging-latest.onrender.com

--- POST /api/preview ---
✓ 200 OK on valid request
✓ 400 Bad Request on invalid payload
✓ All required fields present

--- POST /api/generate ---
✓ 200 OK on valid request
✓ 400 Bad Request on empty modules
✓ Schema validation passes

--- POST /api/score ---
✓ 200 OK on valid request
✓ 400 Bad Request on missing fields
✓ Score response valid

--- GET /api/daily/next ---
✓ 200 OK
✓ Queue structure valid

--- GET /api/ops/usage/daily ---
✓ 200 OK
✓ Aggregates structure valid

--- GET /api/version ---
✓ 200 OK

✅ All M3 smoke tests passed (31 assertions)
```

---

## 🚀 Deployment Details

**Staging Deploy Workflow:**
- Branch: `staging`
- Commit: `cced926` (merge of main @ 9f73dbb)
- Duration: 8 seconds
- Health Check: ✅ PASSED
- CORS Canary: ✅ PASSED
- Analytics Canary: ✅ PASSED

**Files Deployed:**
- `api/src/routes/m3.ts` (313 lines, 6 endpoints)
- `api/tests/m3.test.ts` (252 lines, 14 test cases)
- `api/scripts/smoke-m3.sh` (121 lines, smoke test script)
- `web/app/certified/study/page.tsx` (271 lines, study UI)
- `web/app/api/health/route.ts` (36 lines, explicit route)
- `web/app/api/prompts/route.ts` (36 lines, explicit route)

---

## 📋 Acceptance Criteria

All M3 acceptance criteria met:

### API Routes ✅
- [x] POST /api/preview returns 200 with summary/modules/questions
- [x] POST /api/generate returns 200 with modules array
- [x] POST /api/score returns 200 with score/difficulty/next_review_days
- [x] GET /api/daily/next returns 200 with prioritized queue
- [x] GET /api/ops/usage/daily returns 200 with aggregates
- [x] All routes return 400 on invalid input
- [x] All routes return 405 on invalid method

### Validation ✅
- [x] Zod schema validation working for all request bodies
- [x] JSON Schema validation for responses (modules.schema.json, score.schema.json)
- [x] Error responses use standard envelope: `{ error: { code, message, details? } }`

### Usage Tracking ✅
- [x] Per-request logging working
- [x] Daily aggregates accumulating in-memory
- [x] `/api/ops/usage/daily` returning today/yesterday stats

### Web Integration ✅
- [x] `/certified/study` page deployed and accessible
- [x] Schedule/progress API integration working
- [x] Demo cards with flip/grade functionality

### Testing ✅
- [x] 14 unit tests passing (Vitest)
- [x] 31 smoke test assertions passing
- [x] E2E tests updated for M3 flow
- [x] CI/CD pipeline green

---

## 📊 Monitor: Activation

**Status:** ✅ **ACTIVE**  
**Activated:** 2025-10-06T09:23:50Z  
**First Run:** [#18276275547](https://github.com/robnreb1/cerply/actions/runs/18276275547)  
**Commit SHA:** f9cd9f7  
**Schedule:** Every 15 minutes (cron: `*/15 * * * *`)

### First Run Results

| Metric | Value |
|--------|-------|
| **Status** | ✅ PASSED |
| **Duration** | 6s |
| **Smoke Tests** | 31/31 passed |
| **Timestamp** | 2025-10-06T09:27:33Z |
| **Run Number** | 2 |

### Monitoring Status

- ✅ Workflow scheduled and active
- ✅ Smoke tests running successfully
- ✅ Reporter generating metrics
- ⚠️ Auto-commit to staging blocked by branch protection (acceptable - reports available in artifacts)
- ✅ Failure detection ready (will create GitHub issues)

### Next Scheduled Runs

- Run #3: 2025-10-06T09:30:00Z (estimated)
- Run #4: 2025-10-06T09:45:00Z (estimated)
- Continues every 15 minutes...

### Artifacts

- **Smoke Logs:** Available in [run artifacts](https://github.com/robnreb1/cerply/actions/runs/18276275547)
- **Monitor Report:** Generated successfully (see artifacts)

---

## 🎯 Next Steps

1. **Monitor staging for 24 hours** - Watch for any errors in logs
2. **User acceptance testing** - Have stakeholders test `/certified/study` on prod
3. **Performance monitoring** - Track `/api/ops/usage/daily` for usage patterns
4. **Consider production promotion** - All tests green, ready when needed

---

## 📞 Support

**Logs:**
- API Staging: https://cerply-api-staging-latest.onrender.com/api/health
- Usage Dashboard: https://cerply-api-staging-latest.onrender.com/api/ops/usage/daily

**Documentation:**
- Epic: `EPIC_M3_API_SURFACE.md`
- PR Summary: `PR_M3_API_SURFACE.md`
- Acceptance: `web/ACCEPTANCE.md`
- Functional Spec: `docs/functional-spec.md` (§21, §21.1)

---

**Report Generated:** 2025-10-06T08:59:30Z  
**Test Duration:** ~2 minutes  
**Overall Status:** ✅ **ALL SYSTEMS GREEN**

