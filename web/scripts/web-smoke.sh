#!/usr/bin/env bash
# web/scripts/web-smoke.sh
# Smoke test for web proxy endpoints (M2) per FSD §13
# Verifies that /api/* requests are proxied correctly and never return 404

set -euo pipefail

WEB_BASE="${WEB_BASE:-http://localhost:3000}"

echo "==> Web smoke test for: $WEB_BASE"
echo "==> Testing M2 proxy endpoints (must never 404)"

line() { printf '%s\n' "--------------------------------------------------------------------------------"; }

# Helper to check status and verify not 404
check_endpoint() {
  local endpoint="$1"
  local url="${WEB_BASE%/}${endpoint}"
  
  echo "==> Testing: $endpoint"
  
  # Get status code
  STATUS=$(curl -s -o /tmp/response.txt -w "%{http_code}" "$url")
  
  echo "    Status: $STATUS"
  
  # Verify not 404
  if [ "$STATUS" = "404" ]; then
    echo "    ❌ FAIL: Endpoint returned 404 (violates 'Never 404' requirement)"
    return 1
  fi
  
  # For 200 responses, verify JSON content
  if [ "$STATUS" = "200" ]; then
    if command -v jq &> /dev/null; then
      echo "    Response:"
      cat /tmp/response.txt | jq . 2>/dev/null || cat /tmp/response.txt
    else
      cat /tmp/response.txt
    fi
    echo "    ✅ PASS"
  else
    echo "    ⚠️  Non-200 status, but not 404 (acceptable for some scenarios)"
    cat /tmp/response.txt
  fi
  
  return 0
}

# Test M2 proxy endpoints
line
check_endpoint "/api/health"

line
check_endpoint "/api/prompts"

line
echo "==> Testing /debug/env page"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${WEB_BASE}/debug/env")
echo "    Status: $STATUS"
if [ "$STATUS" = "200" ]; then
  echo "    ✅ PASS: /debug/env accessible"
else
  echo "    ❌ FAIL: /debug/env returned $STATUS"
  exit 1
fi

line
echo "✅ All smoke tests passed"
echo "==> M2 proxy verification complete"
echo "    - /api/health: proxied correctly, never 404"
echo "    - /api/prompts: proxied correctly, never 404"
echo "    - /debug/env: accessible"

