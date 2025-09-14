#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   export GH_TOKEN=...  # PAT with repo + project scopes
#   ORG="cerply" REPO="cerply" PROJECT_TITLE="Cerply v4.1 Launch" bash scripts/gh-seed-project.sh
#
# Requires: gh (GitHub CLI) and jq.

require() { command -v "$1" >/dev/null || { echo "Missing dependency: $1"; exit 1; }; }
require gh
require jq

ORG="${ORG:-cerply}"
REPO="${REPO:-cerply}"
PROJECT_TITLE="${PROJECT_TITLE:-Cerply v4.1 Launch}"

create_project() {
  echo "==> Creating/locating project: $PROJECT_TITLE"
  # Try to create. If it already exists, capture its id from list.
  if PROJECT_JSON=$(gh project create --owner "$ORG" --title "$PROJECT_TITLE" --format json 2>/dev/null); then
    echo "$PROJECT_JSON" | jq -r .id
    return 0
  fi
  gh project list --owner "$ORG" --format json | jq -r ".[] | select(.title==\"$PROJECT_TITLE\").id"
}

PROJECT_ID="$(create_project || true)"
if [[ -n "$PROJECT_ID" ]]; then
  echo "PROJECT_ID=$PROJECT_ID"
  # Ensure basic fields exist
  if ! gh project field-list "$PROJECT_ID" --format json | jq -e '.[] | select(.name=="Status")' >/dev/null; then
    gh project field-create "$PROJECT_ID" --name Status --type SINGLE_SELECT --options "Todo,In Progress,Done" >/dev/null
  fi
  if ! gh project field-list "$PROJECT_ID" --format json | jq -e '.[] | select(.name=="Epic")' >/dev/null; then
    gh project field-create "$PROJECT_ID" --name Epic --type TEXT >/dev/null
  fi
  FIELD_STATUS_ID="$(gh project field-list "$PROJECT_ID" --format json | jq -r '.[] | select(.name=="Status").id')"
  FIELD_EPIC_ID="$(gh project field-list "$PROJECT_ID" --format json | jq -r '.[] | select(.name=="Epic").id')"
else
  echo "ℹ️  Could not create or locate project; will create issues only."
fi

# Epic titles and bodies (portable arrays for macOS bash)
EPIC_TITLES=(
  "Conversational Orchestrator & Loop-Guard"
  "Learner Engine (MVP)"
  "Persistence Uplift"
  "Auth & Session"
  "Infra & Deployment"
  "Observability & Cost Ledger"
  "GTM Readiness (minimal)"
  "Certified Content (Admin)"
  "Security & Compliance"
  "Web UX & Reliability"
  "Groups/Challenges (flag)"
  "Documentation & Spec Hygiene"
  "Launch Orchestration"
)

EPIC_BODIES=(
  "/api/chat orchestrator; loop-guard; x-planner/x-model; dedupe intents; still-thinking pulse hooks."
  "/learn/next, /learn/submit; scheduler → ReviewSchedule; unit tests; web fetch/submit."
  "Drizzle migrations; seeds; migrate-in-place; fresh-DB acceptance."
  "Magic-link dev flow; cookie flags; 401 with www-authenticate on generate."
  "Render+GHCR+Vercel; SHA tagging; CI build+smoke."
  "__routes.json; event sink; GenLedger; pilot metrics; alarms."
  "One-liner; GIFs; contact/waitlist; getting-started doc."
  "Thin-slice publish; /api/curator/*; web /curator; SLA flag."
  "Rate limits; CORS; headers; budgets; privacy/terms placeholders."
  "Progress pulse; E2E ingest→plan→generate→learn→review; envelope surfaced."
  "Feature-gated social loop; weekly leaderboard."
  "Spec parity; flags; Adaptive RFC+tests."
  "Runbook; rollback; on-call; dashboard; dry run."
)

len=${#EPIC_TITLES[@]}
for (( i=0; i< len; i++ )); do
  title="${EPIC_TITLES[$i]}"
  body="Epic: ${EPIC_TITLES[$i]}\n\n${EPIC_BODIES[$i]}"
  echo "==> Creating issue: $title"
  number=$(gh issue create --repo "$ORG/$REPO" --title "$title" --body "$body" --label "v4.1" --json number --jq .number)
  echo "    #$number"
  if [[ -n "${PROJECT_ID:-}" ]]; then
    echo "    adding to project…"
    item_id=$(gh project item-add "$PROJECT_ID" --url "https://github.com/$ORG/$REPO/issues/$number" --format json | jq -r .id)
    gh project item-edit --id "$item_id" --field-id "$FIELD_STATUS_ID" --single-select-option-name "Todo" >/dev/null
    gh project item-edit --id "$item_id" --field-id "$FIELD_EPIC_ID" --text "$title" >/dev/null
  fi
done

echo "==> Done. If a project was created, open it in GitHub to adjust views."
