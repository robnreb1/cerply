# Production Sanity Check - PLATFORM_FOUNDATIONS_v1

**Date:** 2025-10-07  
**Status:** ⚠️ **BLOCKED - Services Not Deployed**

## Discovery

Both staging and production Render services are returning:
- HTTP 404 with `x-render-routing: no-server`
- This indicates services are not currently running or deployed

## Required Action

**Before production verification can proceed:**
1. Deploy `main` branch to production Render service
2. Ensure staging service is also running
3. Verify services are responding to root endpoint

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

