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

ORG="${ORG:-@me}"
REPO="${REPO:-cerply}"
PROJECT_TITLE="${PROJECT_TITLE:-Cerply v4.1 Launch}"

create_or_locate_project_number() {
  >&2 echo "==> Creating/locating project: $PROJECT_TITLE (owner: $ORG)"
  # Try list first
  if LIST_JSON=$(gh project list --owner "$ORG" --format json 2>/dev/null); then
    NUM=$(echo "$LIST_JSON" | jq -r ".[] | select(.title==\"$PROJECT_TITLE\").number" | head -n1)
    if [[ -n "${NUM:-}" ]]; then echo "$NUM"; return 0; fi
  fi
  # Create if not found
  if CREATED=$(gh project create --owner "$ORG" --title "$PROJECT_TITLE" --format json 2>/dev/null); then
    echo "$CREATED" | jq -r .number
    return 0
  fi
  return 1
}

PROJECT_NUMBER="$(create_or_locate_project_number || true)"
if [[ -n "${PROJECT_NUMBER:-}" ]]; then
  >&2 echo "PROJECT_NUMBER=$PROJECT_NUMBER"
  # Helpers to support both new and older gh CLIs
  project_field_list() {
    if OUT=$(gh project field-list --owner "$ORG" --number "$PROJECT_NUMBER" --format json 2>/dev/null); then
      echo "$OUT"
    else
      gh project field-list "$PROJECT_NUMBER" --owner "$ORG" --format json
    fi
  }
  project_field_create_single_select() {
    local name="$1" options="$2"
    if gh project field-create --owner "$ORG" --number "$PROJECT_NUMBER" --name "$name" --data-type SINGLE_SELECT --single-select-options "$options" >/dev/null 2>/dev/null; then
      return 0
    else
      gh project field-create "$PROJECT_NUMBER" --owner "$ORG" --name "$name" --data-type SINGLE_SELECT --single-select-options "$options" >/dev/null
    fi
  }
  project_field_create_text() {
    local name="$1"
    if gh project field-create --owner "$ORG" --number "$PROJECT_NUMBER" --name "$name" --data-type TEXT >/dev/null 2>/dev/null; then
      return 0
    else
      gh project field-create "$PROJECT_NUMBER" --owner "$ORG" --name "$name" --data-type TEXT >/dev/null
    fi
  }
  project_item_add() {
    local url="$1"
    if OUT=$(gh project item-add --owner "$ORG" --number "$PROJECT_NUMBER" --url "$url" --format json 2>/dev/null); then
      echo "$OUT" | jq -r .id
    else
      gh project item-add "$PROJECT_NUMBER" --owner "$ORG" --url "$url" --format json | jq -r .id
    fi
  }

  # Ensure basic fields exist
  if ! project_field_list | jq -e '.[] | select(.name=="Status")' >/dev/null; then
    project_field_create_single_select "Status" "Todo,In Progress,Done"
  fi
  if ! project_field_list | jq -e '.[] | select(.name=="Epic")' >/dev/null; then
    project_field_create_text "Epic"
  fi
  FIELD_STATUS_ID="$(project_field_list | jq -r '.[] | select(.name=="Status").id')"
  FIELD_EPIC_ID="$(project_field_list | jq -r '.[] | select(.name=="Epic").id')"
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
  # Older gh versions don't support --json; capture URL from stdout
  url=$(gh issue create --repo "$ORG/$REPO" --title "$title" --body "$body" --label "v4.1" 2>/dev/null || true)
  # Fallback: print to stderr for visibility
  if [[ -z "$url" ]]; then
    >&2 echo "⚠️  gh issue create did not return a URL; attempting to fetch last created issue by title"
    # Try to find issue by title (may return multiple; pick first open)
    url=$(gh issue list --repo "$ORG/$REPO" --state open --search "$title in:title" --limit 1 --json url --jq '.[0].url' 2>/dev/null || true)
  fi
  number=""
  if [[ -n "$url" ]]; then
    number=$(echo "$url" | sed -n 's#.*/issues/\([0-9][0-9]*\).*#\1#p' | head -n1)
  fi
  if [[ -z "$number" ]]; then
    >&2 echo "❌ Could not determine issue number for '$title'"
    continue
  fi
  echo "    #$number ($url)"
  if [[ -n "${PROJECT_NUMBER:-}" ]]; then
    echo "    adding to project…"
    item_id=$(project_item_add "https://github.com/$ORG/$REPO/issues/$number")
    gh project item-edit --id "$item_id" --field-id "$FIELD_STATUS_ID" --single-select-option-name "Todo" >/dev/null
    gh project item-edit --id "$item_id" --field-id "$FIELD_EPIC_ID" --text "$title" >/dev/null
  fi
done

echo "==> Done. If a project was created, open it in GitHub to adjust views."
