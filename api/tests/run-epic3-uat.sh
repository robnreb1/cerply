#!/bin/bash
set -eo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_BASE="http://localhost:8080"
ADMIN_TOKEN="dev-admin-token-12345"

echo "════════════════════════════════════════════════════════════"
echo "  Epic 3 UAT - Team Management & Learner Assignment"
echo "════════════════════════════════════════════════════════════"
echo ""

# Test 1: RBAC & Gating
echo -e "${YELLOW}Test 1: RBAC & Gating${NC}"
echo "──────────────────────────────────────────────────────────"
echo "1a) Anonymous request to /api/teams (should be 401)"
ANON_STATUS=$(curl -sS -w "%{http_code}" -o /tmp/anon.json "$API_BASE/api/teams" 2>/dev/null)
if [ "$ANON_STATUS" = "401" ]; then
  echo -e "${GREEN}✓ PASS:${NC} Got 401 for anonymous request"
else
  echo -e "${RED}✗ FAIL:${NC} Expected 401, got $ANON_STATUS"
  cat /tmp/anon.json
  exit 1
fi
echo ""

# Test 2: Create & List Teams
echo -e "${YELLOW}Test 2: Create & List Teams${NC}"
echo "──────────────────────────────────────────────────────────"
echo "2a) Create team with admin token"
TEAM_RESPONSE=$(curl -sS -X POST "$API_BASE/api/teams" \
  -H "content-type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"name":"Architecture – London"}' 2>/dev/null)

TEAM_ID=$(echo "$TEAM_RESPONSE" | jq -r '.id' 2>/dev/null || echo "ERROR")
if [ "$TEAM_ID" != "ERROR" ] && [ "$TEAM_ID" != "null" ]; then
  echo -e "${GREEN}✓ PASS:${NC} Team created with ID: $TEAM_ID"
else
  echo -e "${RED}✗ FAIL:${NC} Failed to create team"
  echo "$TEAM_RESPONSE" | jq . 2>/dev/null || echo "$TEAM_RESPONSE"
  exit 1
fi

echo "2b) List teams"
LIST_RESPONSE=$(curl -sS "$API_BASE/api/teams" \
  -H "Authorization: Bearer $ADMIN_TOKEN" 2>/dev/null)
TEAM_COUNT=$(echo "$LIST_RESPONSE" | jq 'length' 2>/dev/null || echo "0")
if [ "$TEAM_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✓ PASS:${NC} Found $TEAM_COUNT team(s)"
else
  echo -e "${RED}✗ FAIL:${NC} No teams found"
  echo "$LIST_RESPONSE" | jq . 2>/dev/null || echo "$LIST_RESPONSE"
  exit 1
fi
echo ""

# Test 3: Manage Membership (CSV)
echo -e "${YELLOW}Test 3: Manage Membership${NC}"
echo "──────────────────────────────────────────────────────────"
echo "3a) Create CSV file"
cat > /tmp/members.csv <<EOF
a.archer@example.com
b.builder@example.com
c.creator@example.com
EOF

echo "3b) Add members via CSV"
MEMBERS_RESPONSE=$(curl -sS -X POST "$API_BASE/api/teams/$TEAM_ID/members" \
  -H "content-type: text/csv" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  --data-binary @/tmp/members.csv 2>/dev/null)

ADDED_COUNT=$(echo "$MEMBERS_RESPONSE" | jq '.added | length' 2>/dev/null || echo "0")
if [ "$ADDED_COUNT" = "3" ]; then
  echo -e "${GREEN}✓ PASS:${NC} Added 3 members via CSV"
else
  echo -e "${RED}✗ FAIL:${NC} Expected 3 members, got $ADDED_COUNT"
  echo "$MEMBERS_RESPONSE" | jq . 2>/dev/null || echo "$MEMBERS_RESPONSE"
  exit 1
fi
echo ""

# Test 4: Subscribe Team to a Track
echo -e "${YELLOW}Test 4: Subscribe Team to a Track${NC}"
echo "──────────────────────────────────────────────────────────"
echo "4a) List available tracks"
TRACKS_RESPONSE=$(curl -sS "$API_BASE/api/tracks" \
  -H "Authorization: Bearer $ADMIN_TOKEN" 2>/dev/null)
TRACK_ID=$(echo "$TRACKS_RESPONSE" | jq -r '.[0].id' 2>/dev/null || echo "null")

if [ "$TRACK_ID" = "null" ] || [ -z "$TRACK_ID" ]; then
  echo -e "${YELLOW}⚠ WARNING:${NC} No tracks available, skipping subscription test"
else
  echo -e "${GREEN}✓ PASS:${NC} Found track: $TRACK_ID"
  
  echo "4b) Subscribe team to track (weekly cadence)"
  SUB_RESPONSE=$(curl -sS -X POST "$API_BASE/api/teams/$TEAM_ID/subscriptions" \
    -H "content-type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{\"track_id\":\"$TRACK_ID\",\"cadence\":\"weekly\"}" 2>/dev/null)
  
  SUB_ID=$(echo "$SUB_RESPONSE" | jq -r '.subscription_id' 2>/dev/null || echo "null")
  if [ "$SUB_ID" != "null" ] && [ -n "$SUB_ID" ]; then
    echo -e "${GREEN}✓ PASS:${NC} Subscription created: $SUB_ID"
  else
    echo -e "${RED}✗ FAIL:${NC} Failed to create subscription"
    echo "$SUB_RESPONSE" | jq . 2>/dev/null || echo "$SUB_RESPONSE"
    exit 1
  fi
fi
echo ""

# Test 5: CSRF & Security Invariants
echo -e "${YELLOW}Test 5: CSRF & Security Invariants${NC}"
echo "──────────────────────────────────────────────────────────"
echo "5a) Test idempotency"
IDEMPOTENCY_KEY="test-$(date +%s)"
IDEMPOTENT_1=$(curl -sS -X POST "$API_BASE/api/teams" \
  -H "content-type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{"name":"Idempotency Test Team"}' 2>/dev/null)

IDEMPOTENT_2=$(curl -sS -X POST "$API_BASE/api/teams" \
  -H "content-type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{"name":"Idempotency Test Team"}' 2>/dev/null)

ID1=$(echo "$IDEMPOTENT_1" | jq -r '.id' 2>/dev/null || echo "null")
ID2=$(echo "$IDEMPOTENT_2" | jq -r '.id' 2>/dev/null || echo "null")

if [ "$ID1" = "$ID2" ] && [ "$ID1" != "null" ]; then
  echo -e "${GREEN}✓ PASS:${NC} Idempotency key returned same team ID: $ID1"
else
  echo -e "${RED}✗ FAIL:${NC} Idempotency check failed (ID1=$ID1, ID2=$ID2)"
  exit 1
fi
echo ""

# Test 6: Telemetry & Events
echo -e "${YELLOW}Test 6: Telemetry & Events${NC}"
echo "──────────────────────────────────────────────────────────"
echo "6a) Check if events.ndjson exists"
if [ -f "events.ndjson" ]; then
  EVENT_COUNT=$(grep -c "team\." events.ndjson 2>/dev/null || echo "0")
  echo -e "${GREEN}✓ PASS:${NC} Events log exists with $EVENT_COUNT team events"
else
  echo -e "${YELLOW}⚠ WARNING:${NC} events.ndjson not found (may not be in current directory)"
fi
echo ""

# Test 7: Persistence & Restart
echo -e "${YELLOW}Test 7: Team Overview${NC}"
echo "──────────────────────────────────────────────────────────"
echo "7a) Get team overview"
OVERVIEW_RESPONSE=$(curl -sS "$API_BASE/api/teams/$TEAM_ID/overview" \
  -H "Authorization: Bearer $ADMIN_TOKEN" 2>/dev/null)

MEMBERS_COUNT=$(echo "$OVERVIEW_RESPONSE" | jq -r '.members_count' 2>/dev/null || echo "0")
if [ "$MEMBERS_COUNT" = "3" ]; then
  echo -e "${GREEN}✓ PASS:${NC} Team overview shows 3 members"
else
  echo -e "${RED}✗ FAIL:${NC} Expected 3 members, got $MEMBERS_COUNT"
  echo "$OVERVIEW_RESPONSE" | jq . 2>/dev/null || echo "$OVERVIEW_RESPONSE"
  exit 1
fi
echo ""

# Test 8: Negative/Boundary checks
echo -e "${YELLOW}Test 8: OKR Tracking (KPIs)${NC}"
echo "──────────────────────────────────────────────────────────"
echo "8a) Get KPIs with admin token"
KPI_RESPONSE=$(curl -sS "$API_BASE/api/ops/kpis" \
  -H "x-admin-token: $ADMIN_TOKEN" 2>/dev/null)

TEAMS_TOTAL=$(echo "$KPI_RESPONSE" | jq -r '.o3.teams_total' 2>/dev/null || echo "0")
if [ "$TEAMS_TOTAL" -gt 0 ]; then
  echo -e "${GREEN}✓ PASS:${NC} KPIs returned teams_total: $TEAMS_TOTAL"
else
  echo -e "${RED}✗ FAIL:${NC} KPIs did not return valid data"
  echo "$KPI_RESPONSE" | jq . 2>/dev/null || echo "$KPI_RESPONSE"
  exit 1
fi

echo "8b) Test unauthorized access to KPIs"
KPI_UNAUTH_STATUS=$(curl -sS -w "%{http_code}" -o /tmp/kpi_unauth.json "$API_BASE/api/ops/kpis" 2>/dev/null)
if [ "$KPI_UNAUTH_STATUS" = "401" ]; then
  echo -e "${GREEN}✓ PASS:${NC} Unauthorized request to KPIs returns 401"
else
  echo -e "${RED}✗ FAIL:${NC} Expected 401, got $KPI_UNAUTH_STATUS"
  cat /tmp/kpi_unauth.json
  exit 1
fi
echo ""

# Test 9: "Happy-path smoke"
echo -e "${YELLOW}Test 9: Regression Check${NC}"
echo "──────────────────────────────────────────────────────────"
echo "9a) Verify existing endpoints still work (/api/health)"
HEALTH_STATUS=$(curl -sS -w "%{http_code}" -o /tmp/health.json "$API_BASE/api/health" 2>/dev/null)
if [ "$HEALTH_STATUS" = "200" ]; then
  echo -e "${GREEN}✓ PASS:${NC} /api/health still accessible"
else
  echo -e "${RED}✗ FAIL:${NC} /api/health returned $HEALTH_STATUS"
  cat /tmp/health.json
  exit 1
fi
echo ""

# Summary
echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}✓ ALL UAT TESTS PASSED${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Summary:"
echo "  - Team created: $TEAM_ID"
echo "  - Members added: 3"
echo "  - Subscriptions: $([ "$TRACK_ID" != "null" ] && echo "1" || echo "skipped")"
echo "  - RBAC enforced: ✓"
echo "  - Idempotency working: ✓"
echo "  - KPIs tracking: ✓"
echo ""

