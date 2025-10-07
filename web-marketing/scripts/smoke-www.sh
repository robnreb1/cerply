#!/usr/bin/env bash
set -e

# Smoke tests for marketing site (www.cerply.com)

BASE="${SITE_URL:-http://localhost:3002}"

echo "🧪 Running smoke tests for marketing site: $BASE"
echo ""

# Test 1: Landing page has correct hero copy
echo "✓ Test 1: Landing page hero copy"
if curl -sL "$BASE/" | grep -q "Learn anything. Remember everything."; then
  echo "  ✅ Hero copy found"
else
  echo "  ❌ Hero copy not found"
  exit 1
fi

# Test 2: Robots.txt allows crawling
echo "✓ Test 2: robots.txt"
if curl -sL "$BASE/robots.txt" | grep -q "Allow"; then
  echo "  ✅ Robots.txt allows crawling"
else
  echo "  ❌ Robots.txt does not allow crawling"
  exit 1
fi

# Test 3: Sitemap.xml exists
echo "✓ Test 3: sitemap.xml"
if curl -sL "$BASE/sitemap.xml" | grep -q "<urlset"; then
  echo "  ✅ Sitemap.xml found"
else
  echo "  ❌ Sitemap.xml not found"
  exit 1
fi

# Test 4: Waitlist API endpoint
echo "✓ Test 4: Waitlist API"
RESPONSE=$(curl -s -X POST "$BASE/api/waitlist" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}' \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "  ✅ Waitlist API returns 200 (Supabase configured)"
elif [ "$HTTP_CODE" = "501" ]; then
  if echo "$BODY" | grep -q "WAITLIST_PROVIDER_NOT_CONFIGURED"; then
    echo "  ✅ Waitlist API returns 501 with correct reason (Supabase not configured)"
  else
    echo "  ❌ Waitlist API returns 501 but without correct reason"
    echo "  Response: $BODY"
    exit 1
  fi
else
  echo "  ❌ Waitlist API unexpected response: $HTTP_CODE"
  echo "  Response: $BODY"
  exit 1
fi

# Test 5: Privacy and Terms pages exist
echo "✓ Test 5: Privacy and Terms pages"
if curl -sL "$BASE/privacy" | grep -q "Privacy Policy"; then
  echo "  ✅ Privacy page found"
else
  echo "  ❌ Privacy page not found"
  exit 1
fi

if curl -sL "$BASE/terms" | grep -q "Terms of Service"; then
  echo "  ✅ Terms page found"
else
  echo "  ❌ Terms page not found"
  exit 1
fi

echo ""
echo "🎉 All smoke tests passed!"

