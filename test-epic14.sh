#!/bin/bash

# Epic 14: Manager Module Workflows - API Test Script
# Tests all manager module API endpoints

set -e

API_URL="http://localhost:8080"
ADMIN_TOKEN="test-admin-token"

echo "============================================"
echo "Epic 14: Manager Module Workflows - API Test"
echo "============================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Note: This script assumes:${NC}"
echo "1. API server is running at $API_URL"
echo "2. Database migrations have been applied"
echo "3. At least one topic exists in the database"
echo "4. At least one team exists in the database"
echo ""
read -p "Press Enter to continue or Ctrl+C to abort..."
echo ""

# Function to make API calls
call_api() {
  local method=$1
  local endpoint=$2
  local data=$3
  
  echo -e "${YELLOW}[$method]${NC} $endpoint"
  
  if [ -z "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
      -H "x-admin-token: $ADMIN_TOKEN" \
      "$API_URL$endpoint")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
      -H "Content-Type: application/json" \
      -H "x-admin-token: $ADMIN_TOKEN" \
      -d "$data" \
      "$API_URL$endpoint")
  fi
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo -e "${GREEN}✓ Success ($http_code)${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  else
    echo -e "${RED}✗ Failed ($http_code)${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    return 1
  fi
  
  echo ""
  
  # Return the body for extraction
  echo "$body"
}

# 1. Get topics (to find one to use for module creation)
echo -e "${GREEN}=== Step 1: Get Topics ===${NC}"
topics_response=$(call_api "GET" "/api/topics" || echo '{"topics":[]}')
topic_id=$(echo "$topics_response" | jq -r '.topics[0].id // empty' 2>/dev/null || echo "")

if [ -z "$topic_id" ]; then
  echo -e "${RED}No topics found. Please create a topic first.${NC}"
  echo "You can create one via the content generation endpoints."
  exit 1
fi

echo "Using topic ID: $topic_id"
echo ""

# 2. Create a module
echo -e "${GREEN}=== Step 2: Create Module ===${NC}"
create_data=$(cat <<EOF
{
  "topicId": "$topic_id",
  "title": "Test Module - Epic 14",
  "description": "This is a test module created by the Epic 14 test script",
  "isMandatory": false,
  "estimatedMinutes": 30
}
EOF
)

create_response=$(call_api "POST" "/api/curator/modules/create" "$create_data" || echo '{}')
module_id=$(echo "$create_response" | jq -r '.moduleId // .module.id // empty' 2>/dev/null || echo "")

if [ -z "$module_id" ]; then
  echo -e "${RED}Failed to create module${NC}"
  exit 1
fi

echo "Created module ID: $module_id"
echo ""

# 3. List modules
echo -e "${GREEN}=== Step 3: List All Modules ===${NC}"
call_api "GET" "/api/curator/modules"

# 4. Get module details
echo -e "${GREEN}=== Step 4: Get Module Details ===${NC}"
call_api "GET" "/api/curator/modules/$module_id"

# 5. Update module
echo -e "${GREEN}=== Step 5: Update Module ===${NC}"
update_data=$(cat <<EOF
{
  "description": "Updated description - tested at $(date)",
  "status": "draft",
  "isMandatory": true,
  "estimatedMinutes": 45
}
EOF
)
call_api "PUT" "/api/curator/modules/$module_id" "$update_data"

# 6. Add proprietary content
echo -e "${GREEN}=== Step 6: Add Proprietary Content ===${NC}"
proprietary_data=$(cat <<EOF
{
  "contentType": "case_study",
  "title": "Company Case Study Example",
  "content": "This is an example case study from our company...",
  "sourceUrl": "https://example.com/case-study"
}
EOF
)
call_api "POST" "/api/curator/modules/$module_id/proprietary" "$proprietary_data"

# 7. Get teams (to find one for assignment)
echo -e "${GREEN}=== Step 7: Get Teams ===${NC}"
teams_response=$(call_api "GET" "/api/teams" || echo '{"teams":[]}')
team_id=$(echo "$teams_response" | jq -r '.teams[0].id // empty' 2>/dev/null || echo "")

if [ -z "$team_id" ]; then
  echo -e "${YELLOW}No teams found. Skipping assignment test.${NC}"
  echo "You can create a team via the team management endpoints."
else
  echo "Using team ID: $team_id"
  echo ""
  
  # 8. Assign module to team
  echo -e "${GREEN}=== Step 8: Assign Module to Team ===${NC}"
  assign_data=$(cat <<EOF
{
  "teamIds": ["$team_id"],
  "isMandatory": true,
  "dueDate": "2025-12-31"
}
EOF
)
  call_api "POST" "/api/curator/modules/$module_id/assign" "$assign_data"
  
  # 9. Get progress
  echo -e "${GREEN}=== Step 9: Get Module Progress ===${NC}"
  call_api "GET" "/api/curator/modules/$module_id/progress"
  
  # 10. Get analytics
  echo -e "${GREEN}=== Step 10: Get Module Analytics ===${NC}"
  call_api "GET" "/api/curator/modules/$module_id/analytics"
fi

# 11. List modules again (should show updated status)
echo -e "${GREEN}=== Step 11: List Modules (Final) ===${NC}"
call_api "GET" "/api/curator/modules"

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Epic 14 API Test Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Module ID: $module_id"
echo "All endpoints tested successfully!"
echo ""
echo "Next steps:"
echo "1. Visit http://localhost:3000/curator/modules to see the UI"
echo "2. Edit the module at http://localhost:3000/curator/modules/$module_id/edit"
echo "3. View analytics at http://localhost:3000/curator/modules/$module_id/analytics"
echo ""

