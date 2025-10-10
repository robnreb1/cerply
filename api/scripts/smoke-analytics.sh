#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:8080}"
ADMIN_TOKEN="${ADMIN_TOKEN:-dev-admin-token-12345}"
TEAM_ID="${TEAM_ID:-}"
ORG_ID="${ORG_ID:-}"

hdr_admin=(-H "x-admin-token: ${ADMIN_TOKEN}")
hdr_json=(-H "accept: application/json")

# Helper: curl + status capture
curl_json () {
  local url="$1"; shift
  local -a headers=("$@")
  http_code=$(curl -sS -o /tmp/resp.json -w "%{http_code}" "${headers[@]}" "${url}")
  if [[ "${http_code}" != "200" ]]; then
    echo "FAIL (${http_code}) → $(cat /tmp/resp.json)"
    exit 1
  fi
  cat /tmp/resp.json
}

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Epic 4: Manager Dashboard Analytics - Smoke Test"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "API Base: ${API_BASE}"
echo "Feature Flags Required:"
echo "  - FF_MANAGER_DASHBOARD_V1=true"
echo "  - FF_ANALYTICS_PILOT_V1=true"
echo ""

# Discover TEAM_ID / ORG_ID if not provided
if [[ -z "${TEAM_ID}" || -z "${ORG_ID}" ]]; then
  echo "Discovering TEAM_ID/ORG_ID from /api/teams …"
  teams_json=$(curl_json "${API_BASE}/api/teams" "${hdr_admin[@]}" "${hdr_json[@]}")
  count=$(jq 'length' <<<"${teams_json}")
  if [[ "${count}" -eq 0 ]]; then
    echo "No teams found. Please create a team first (POST /api/teams)."
    exit 1
  fi
  TEAM_ID=$(jq -r '.[0].id' <<<"${teams_json}")
  ORG_ID=$(jq -r '.[0].org_id' <<<"${teams_json}")
fi

echo "Using:"
echo "  TEAM_ID=${TEAM_ID}"
echo "  ORG_ID=${ORG_ID}"
echo ""

hdr_org=(-H "x-org-id: ${ORG_ID}")

echo "─────────────────────────────────────────────────────────────"
echo " Manager Analytics Endpoints (FF_MANAGER_DASHBOARD_V1)"
echo "─────────────────────────────────────────────────────────────"

echo -n "✓ Test: GET /api/manager/teams/:teamId/analytics … "
analytics_json=$(curl_json "${API_BASE}/api/manager/teams/${TEAM_ID}/analytics" "${hdr_admin[@]}" "${hdr_org[@]}" "${hdr_json[@]}")
# Validate shape (allow zeros)
jq -e 'has("avgComprehension") and has("activeLearners") and has("atRiskCount") and has("totalAttempts") and has("completionRate")' >/dev/null <<<"${analytics_json}" \
  && echo "OK" || { echo "Invalid analytics shape: ${analytics_json}"; exit 1; }

echo -n "✓ Test: GET /api/manager/teams/:teamId/at-risk … "
risk_json=$(curl_json "${API_BASE}/api/manager/teams/${TEAM_ID}/at-risk" "${hdr_admin[@]}" "${hdr_org[@]}" "${hdr_json[@]}")
# Should be an object with learners array (could be empty)
jq -e 'has("learners") and (.learners | type=="array") and has("total")' >/dev/null <<<"${risk_json}" \
  && echo "OK" || { echo "Invalid at-risk payload: ${risk_json}"; exit 1; }

echo -n "✓ Test: GET /api/manager/teams/:teamId/retention … "
retention_json=$(curl_json "${API_BASE}/api/manager/teams/${TEAM_ID}/retention" "${hdr_admin[@]}" "${hdr_org[@]}" "${hdr_json[@]}")
# Accept empty array (no activity yet)
if jq -e 'type=="array"' >/dev/null <<<"${retention_json}"; then
  if [[ "$(jq 'length' <<<"${retention_json}")" -eq 0 ]]; then
    echo "OK (no data yet)"
  else
    jq -e '.[0] | has("dayOffset") and has("retentionRate")' >/dev/null <<<"${retention_json}" \
      && echo "OK" || { echo "Invalid retention row: ${retention_json}"; exit 1; }
  fi
else
  echo "Invalid retention payload: ${retention_json}"
  exit 1
fi

echo ""
echo "─────────────────────────────────────────────────────────────"
echo " Admin Analytics Endpoints (FF_ANALYTICS_PILOT_V1)"
echo "─────────────────────────────────────────────────────────────"

echo -n "✓ Test: GET /api/analytics/organization/:orgId/overview … "
org_json=$(curl_json "${API_BASE}/api/analytics/organization/${ORG_ID}/overview" "${hdr_admin[@]}" "${hdr_org[@]}" "${hdr_json[@]}")
jq -e 'has("organizationId") and has("totalTeams") and has("activeLearners") and has("avgComprehension") and has("totalAtRiskCount")' >/dev/null <<<"${org_json}" \
  && echo "OK" || { echo "Invalid overview payload: ${org_json}"; exit 1; }

echo -n "✓ Test: GET /api/analytics/organization/:orgId/export?format=csv … "
http_code=$(curl -sS -o /tmp/export.csv -w "%{http_code}" "${hdr_admin[@]}" "${hdr_org[@]}" "${API_BASE}/api/analytics/organization/${ORG_ID}/export?format=csv")
if [[ "${http_code}" != "200" ]]; then
  echo "FAIL (${http_code})"; cat /tmp/export.csv; exit 1
fi
head -1 /tmp/export.csv | grep -q "team_id" && echo "OK" || { echo "CSV header missing team_id"; exit 1; }

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✅ All Analytics Smoke Tests Passed!"
echo "════════════════════════════════════════════════════════════"

