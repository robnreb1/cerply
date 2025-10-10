#!/bin/bash
# Smoke tests for Epic 7: Gamification & Certification System

set -e

API_BASE="${API_BASE:-http://localhost:8080}"
ADMIN_TOKEN="${ADMIN_TOKEN:-dev-admin-token-12345}"

echo "=== Epic 7: Gamification - Smoke Tests ==="
echo "API Base: $API_BASE"
echo ""

# Test 1: Get learner levels for a user
echo "Test 1: Get learner levels..."
curl -sS "${API_BASE}/api/learners/test-user-id/levels" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  | jq -e 'has("levels")' && echo "✓ Learner levels endpoint works" || echo "✗ Learner levels endpoint failed"
echo ""

# Test 2: Get learner badges
echo "Test 2: Get learner badges..."
curl -sS "${API_BASE}/api/learners/test-user-id/badges" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  | jq -e 'has("badges")' && echo "✓ Learner badges endpoint works" || echo "✗ Learner badges endpoint failed"
echo ""

# Test 3: Get learner certificates
echo "Test 3: Get learner certificates..."
curl -sS "${API_BASE}/api/learners/test-user-id/certificates" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  | jq -e 'has("certificates")' && echo "✓ Learner certificates endpoint works" || echo "✗ Learner certificates endpoint failed"
echo ""

# Test 4: Get manager notifications
echo "Test 4: Get manager notifications..."
curl -sS "${API_BASE}/api/manager/notifications" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  | jq -e 'has("notifications")' && echo "✓ Manager notifications endpoint works" || echo "✗ Manager notifications endpoint failed"
echo ""

echo "=== Smoke Tests Complete ==="
echo ""
echo "Note: Some tests may show empty arrays [] if no data exists yet."
echo "This is expected for a fresh database."
echo ""
echo "To run with feature flags enabled:"
echo "FF_GAMIFICATION_V1=true FF_CERTIFICATES_V1=true FF_MANAGER_NOTIFICATIONS_V1=true bash $0"

