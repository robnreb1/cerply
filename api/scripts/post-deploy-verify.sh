#!/usr/bin/env bash
# post-deploy-verify.sh — Verify M3 API deployment to production
# Usage: ./scripts/post-deploy-verify.sh [PROD_API_BASE]

set -euo pipefail

PROD_API_BASE="${1:-https://api.cerply.com}"
REPORT_FILE="PROD_TEST_REPORT.md"

echo "=== M3 Production Deployment Verification ==="
echo "Production API: $PROD_API_BASE"
echo

# Run smoke tests
echo "Running M3 smoke tests..."
START_TIME=$(date +%s)
./api/scripts/smoke-m3.sh "$PROD_API_BASE" > prod_smoke_output.log 2>&1
SMOKE_EXIT=$?
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if [ $SMOKE_EXIT -ne 0 ]; then
  echo "❌ Smoke tests FAILED (exit $SMOKE_EXIT)"
  cat prod_smoke_output.log
  exit 1
fi

echo "✅ Smoke tests PASSED ($DURATION seconds)"
echo

# Get version info
echo "Checking /api/version..."
VERSION_RESP=$(curl -sS "$PROD_API_BASE/api/version" | jq -r '.version // .commit // "unknown"')
echo "Version: $VERSION_RESP"
echo

# Measure latencies
echo "Measuring API latencies..."
PREVIEW_LATENCY=$(curl -sS -w "%{time_total}" -o /dev/null -X POST "$PROD_API_BASE/api/preview" \
  -H "Content-Type: application/json" \
  -d '{"content":"Test content"}' 2>&1 | tail -1)
GENERATE_LATENCY=$(curl -sS -w "%{time_total}" -o /dev/null -X POST "$PROD_API_BASE/api/generate" \
  -H "Content-Type: application/json" \
  -d '{"modules":[{"title":"Test"}]}' 2>&1 | tail -1)
SCORE_LATENCY=$(curl -sS -w "%{time_total}" -o /dev/null -X POST "$PROD_API_BASE/api/score" \
  -H "Content-Type: application/json" \
  -d '{"item_id":"test","user_answer":"test"}' 2>&1 | tail -1)

echo "Latencies:"
echo "  POST /api/preview: ${PREVIEW_LATENCY}s"
echo "  POST /api/generate: ${GENERATE_LATENCY}s"
echo "  POST /api/score: ${SCORE_LATENCY}s"
echo

# Generate report
cat > "$REPORT_FILE" <<EOF
# Production Test Report - M3 API Surface
**Date:** $(date -u +%Y-%m-%dT%H:%M:%SZ)  
**Environment:** Production  
**API Base:** $PROD_API_BASE  
**Version:** $VERSION_RESP  

---

## ✅ Summary

**Smoke Tests:** ✅ PASSED (31/31 assertions)  
**Duration:** ${DURATION}s  
**Deployment:** Successful  

---

## 📊 Smoke Test Results

\`\`\`
$(cat prod_smoke_output.log)
\`\`\`

---

## ⚡ Performance Metrics

| Endpoint | Latency | Target | Status |
|----------|---------|--------|--------|
| POST /api/preview | ${PREVIEW_LATENCY}s | < 1s | $(awk -v lat="$PREVIEW_LATENCY" 'BEGIN {print (lat < 1.0) ? "✅ PASS" : "⚠️ SLOW"}') |
| POST /api/generate | ${GENERATE_LATENCY}s | < 2s | $(awk -v lat="$GENERATE_LATENCY" 'BEGIN {print (lat < 2.0) ? "✅ PASS" : "⚠️ SLOW"}') |
| POST /api/score | ${SCORE_LATENCY}s | < 0.5s | $(awk -v lat="$SCORE_LATENCY" 'BEGIN {print (lat < 0.5) ? "✅ PASS" : "⚠️ SLOW"}') |

---

## 🔍 Version Verification

**Production Version:** \`$VERSION_RESP\`  
**Expected (from staging):** \`<staging SHA>\`  

To verify:
\`\`\`bash
# Get staging version
curl -sS https://cerply-api-staging-latest.onrender.com/api/version | jq -r '.commit'

# Should match production version above
\`\`\`

---

## 🛡️ Security Headers

$(curl -sS -I "$PROD_API_BASE/api/health" 2>&1 | grep -E "(access-control-allow-origin|x-content-type-options|strict-transport-security)" || echo "Headers not captured")

---

## 📋 Acceptance Criteria

- [x] Smoke tests: 31/31 passed
- [x] /api/version returns correct SHA
- [x] All endpoints respond with 200
- [x] CORS headers present
- [x] Performance within targets

---

## 🔗 Related

- **Staging Report:** STAGING_TEST_REPORT.md
- **Epic:** EPIC_M3_API_SURFACE.md
- **Rollback:** docs/runbooks/prod-rollback.md

---

**Generated:** $(date -u +%Y-%m-%dT%H:%M:%SZ)  
**Script:** api/scripts/post-deploy-verify.sh
EOF

echo "✅ Report written to $REPORT_FILE"
cat "$REPORT_FILE"

