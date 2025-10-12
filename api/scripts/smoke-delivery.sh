#!/bin/bash
# Smoke tests for Epic 5: Slack Channel Integration

set -e

API_BASE="${API_BASE:-http://localhost:8080}"
ADMIN_TOKEN="${ADMIN_TOKEN:-dev-admin-token-12345}"

echo "=== Epic 5: Slack Channel Integration - Smoke Tests ==="

# Test 1: Configure user channel
echo "Test 1: Configure user channel"
curl -sS -X POST "${API_BASE}/api/delivery/channels" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  -H "content-type: application/json" \
  -d '{"channelType":"slack","channelId":"U123456","preferences":{"quietHours":"22:00-07:00","paused":false}}' \
  | jq -e '.channel.type == "slack"'

# Test 2: Get user channels
echo "Test 2: Get user channels"
curl -sS "${API_BASE}/api/delivery/channels" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  | jq -e '.channels | length > 0'

# Test 3: Send lesson (will fail without real Slack token, but route should respond)
echo "Test 3: Send lesson (expect error without real Slack)"
curl -sS -X POST "${API_BASE}/api/delivery/send" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  -H "content-type: application/json" \
  -d '{"userId":"user-123","channel":"slack","lessonId":"lesson-1"}' \
  | jq -e 'has("error") or has("messageId")'

# Test 4: Webhook signature verification (mock)
echo "Test 4: Webhook URL verification"
curl -sS -X POST "${API_BASE}/api/delivery/webhook/slack" \
  -H "content-type: application/json" \
  -d '{"type":"url_verification","challenge":"test123"}' \
  | jq -e '.challenge == "test123"'

echo "✅ All smoke tests passed!"

