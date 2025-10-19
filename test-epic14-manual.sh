#!/bin/bash
# Epic 14 Manual Testing Script
# Run each test interactively with prompts

set -e

API_URL="${API_URL:-http://localhost:8080}"
ADMIN_TOKEN="${ADMIN_TOKEN:-dev-admin-token}"
TEST_USER_ID="00000000-0000-0000-0000-000000000001"

echo "🧪 Epic 14 Manual Testing Script"
echo "=================================="
echo ""
echo "API URL: $API_URL"
echo "Admin Token: $ADMIN_TOKEN"
echo ""

# Test 1: List topics
echo "📋 Test 1: Listing topics..."
echo "curl $API_URL/api/topics -H 'x-admin-token: $ADMIN_TOKEN'"
TOPICS=$(curl -s "$API_URL/api/topics" -H "x-admin-token: $ADMIN_TOKEN")
echo "$TOPICS" | jq -r '.[:5] | .[] | "\(.id) - \(.title // "Untitled")"'
echo ""

# Get first topic ID
TOPIC_ID=$(echo "$TOPICS" | jq -r '.[0].id // empty')

if [ -z "$TOPIC_ID" ]; then
  echo "❌ No topics found! Create a topic first."
  exit 1
fi

echo "✅ Using topic: $TOPIC_ID"
echo ""

# Test 2: Create module
echo "📝 Test 2: Creating module..."
read -p "Press Enter to create module..."

MODULE_RESPONSE=$(curl -s -X POST "$API_URL/api/manager-modules" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -d '{
    "topicId": "'"$TOPIC_ID"'",
    "title": "Test Module - Python Fundamentals",
    "description": "Testing Epic 14 module creation",
    "isMandatory": true,
    "targetRoles": ["engineer"],
    "estimatedMinutes": 120
  }')

echo "$MODULE_RESPONSE" | jq
MODULE_ID=$(echo "$MODULE_RESPONSE" | jq -r '.id // empty')

if [ -z "$MODULE_ID" ]; then
  echo "❌ Failed to create module!"
  echo "$MODULE_RESPONSE"
  exit 1
fi

echo ""
echo "✅ Module created: $MODULE_ID"
echo ""

# Test 3: View module
echo "👀 Test 3: Viewing module details..."
read -p "Press Enter to view module..."

curl -s "$API_URL/api/manager-modules/$MODULE_ID" \
  -H "x-admin-token: $ADMIN_TOKEN" | jq
echo ""

# Test 4: Add proprietary content
echo "📄 Test 4: Adding proprietary content..."
read -p "Press Enter to add content..."

CONTENT_RESPONSE=$(curl -s -X POST "$API_URL/api/manager-modules/$MODULE_ID/content" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -d '{
    "contentType": "case_study",
    "title": "Company Python Best Practices",
    "content": "Internal best practices:\n1. Use type hints\n2. Write tests with pytest\n3. Follow PEP 8"
  }')

echo "$CONTENT_RESPONSE" | jq
echo ""

# Test 5: Update module status
echo "🔄 Test 5: Activating module..."
read -p "Press Enter to activate..."

UPDATE_RESPONSE=$(curl -s -X PATCH "$API_URL/api/manager-modules/$MODULE_ID" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -d '{"status": "active"}')

echo "$UPDATE_RESPONSE" | jq
echo ""

# Test 6: List modules
echo "📋 Test 6: Listing all modules..."
read -p "Press Enter to list modules..."

curl -s "$API_URL/api/manager-modules?status=active" \
  -H "x-admin-token: $ADMIN_TOKEN" | jq
echo ""

# Test 7: View analytics
echo "📊 Test 7: Viewing module analytics..."
read -p "Press Enter to view analytics..."

curl -s "$API_URL/api/manager-modules/$MODULE_ID/analytics" \
  -H "x-admin-token: $ADMIN_TOKEN" | jq
echo ""

# Test 8: Archive module
echo "🗄️  Test 8: Archiving module..."
read -p "Press Enter to archive (cleanup)..."

ARCHIVE_RESPONSE=$(curl -s -X DELETE "$API_URL/api/manager-modules/$MODULE_ID" \
  -H "x-admin-token: $ADMIN_TOKEN")

echo "$ARCHIVE_RESPONSE" | jq
echo ""

echo "✅ All tests completed!"
echo ""
echo "Summary:"
echo "- Module ID: $MODULE_ID"
echo "- Topic ID: $TOPIC_ID"
echo "- Status: Archived"

