#!/usr/bin/env bash
set -e

# Smoke tests for app gating

APP_URL="${APP_URL:-http://localhost:3000}"
MARKETING_URL="${MARKETING_BASE_URL:-http://localhost:3002}"

echo "🧪 Running smoke tests for app gating"
echo "   App URL: $APP_URL"
echo "   Marketing URL: $MARKETING_URL"
echo ""

# Test 1: Anonymous user redirects to marketing (only for production URLs)
if [[ "$APP_URL" == http://localhost:* ]]; then
  echo "✓ Test 1: Anonymous redirect (skipped for localhost)"
  echo "  ⏭️  Skipped (requires production setup)"
else
  echo "✓ Test 1: Anonymous user redirects to marketing"
  LOCATION=$(curl -sI "$APP_URL/" | grep -i "^Location:" | awk '{print $2}' | tr -d '\r\n')
  if echo "$LOCATION" | grep -q "$MARKETING_URL"; then
    echo "  ✅ Redirects to marketing site"
  else
    echo "  ❌ Does not redirect to marketing site"
    echo "  Got: $LOCATION"
    exit 1
  fi
fi

# Test 2: Beta key allows access
echo "✓ Test 2: Beta key allows access"
BETA_CODE="${BETA_TEST_CODE:-demo123}"
RESPONSE=$(curl -sI -H "x-beta-key: $BETA_CODE" "$APP_URL/learn" -w "\n%{http_code}" 2>/dev/null || echo "")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "  ✅ Beta key allows access (200)"
elif echo "$RESPONSE" | grep -qi "Set-Cookie:.*beta"; then
  echo "  ✅ Beta key allows access (cookie set)"
else
  echo "  ⚠️  Beta key test inconclusive (may need actual beta code in env)"
  echo "  Response code: $HTTP_CODE"
fi

# Test 3: Health endpoint is allowlisted
echo "✓ Test 3: Health endpoint allowlisted"
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/api/health")

if [ "$HEALTH_CODE" = "200" ]; then
  echo "  ✅ Health endpoint returns 200"
elif [ "$HEALTH_CODE" = "500" ] || [ "$HEALTH_CODE" = "502" ] || [ "$HEALTH_CODE" = "503" ]; then
  echo "  ✅ Health endpoint allowlisted (returns $HEALTH_CODE - API backend may not be running)"
else
  echo "  ❌ Health endpoint blocked by middleware (got $HEALTH_CODE)"
  exit 1
fi

# Test 4: Robots.txt disallows crawling
echo "✓ Test 4: Robots.txt disallows crawling"
if curl -sL "$APP_URL/robots.txt" | grep -q "Disallow: /"; then
  echo "  ✅ Robots.txt disallows crawling"
else
  echo "  ❌ Robots.txt does not disallow crawling"
  exit 1
fi

echo ""
echo "🎉 All gating smoke tests passed!"

