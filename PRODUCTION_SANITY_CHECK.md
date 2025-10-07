# Production Sanity Check - PLATFORM_FOUNDATIONS_v1

**Date:** 2025-10-07  
**Status:** ⚠️ **BLOCKED - Services Not Deployed**

## Discovery

**Production URL:** `https://api.cerply.com` ✅

**Current State (2025-10-07):**
- ✅ Health and version endpoints responding
- ⚠️ Running **old code**: SHA `39165b5` (Oct 5, 2025)
- ❌ M3 API endpoints return 404 (not yet deployed)
- ❌ PLATFORM_FOUNDATIONS_v1 features not present

**Root Cause:** Production has not been updated since `main` branch merged PLATFORM_FOUNDATIONS_v1

## Required Action

**To deploy PLATFORM_FOUNDATIONS_v1 to production:**

1. **Trigger Production Deployment**
   - Merge latest `main` branch to production
   - Or manually trigger deploy from Render dashboard
   - Target SHA should be latest from `main` (includes PR #205)

2. **Verify Deployment**
   ```bash
   # Check version matches main
   curl -sS https://api.cerply.com/api/version | jq '.gitSha'
   # Expected: Latest main branch SHA (not 39165b5)
   ```

3. **Run Sanity Checks** (see below)

## Sanity Check Commands (Run Once Deployed)

```bash
# Set production API URL
API=https://api.cerply.com

# 1. Health check
curl -sS $API/api/health
# Expected: { "status": "ok" } or similar

# 2. Version check
curl -sS $API/api/version | jq
# Expected: { "version": "...", "commit": "...", "timestamp": "..." }

# 3. M3 Contracts smoke test
./api/scripts/smoke-m3-contracts.sh $API
# Expected: All assertions pass (31/31)

# 4. Adaptive smoke test
./api/scripts/smoke-adaptive.sh $API
# Expected: Adaptive thresholds working, queue populates
```

## Expected Results

✅ **All responses should include:**
- HTTP 200 (for success paths)
- Envelope structure: `{ data: {...} }` or `{ error: {...} }`
- Observability headers present:
  - `x-canon`: hit | store | bypass
  - `x-quality`: 0.00-1.00
  - `x-cost`: fresh | reuse
  - `x-adapt`: none | easy | hard | review

## Next Steps

1. **Deploy to Render:**
   - Ensure `main` branch triggers production deploy
   - Or manually trigger deploy via Render dashboard

2. **Run verification:**
   - Execute commands above once services are live
   - Document results in this file

3. **Monitor:**
   - Set up 24h production monitor (see step 2 below)
   - Track canon hit rate, quality floor, cost optimization

---

## Notes

- PR #205 (staging → main) merged successfully ✅
- All 43/43 CI checks passing ✅
- Code is ready, just needs deployment ✅

