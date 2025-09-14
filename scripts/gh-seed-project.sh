#!/usr/bin/env bash
set -euo pipefail

: "${ORG:?Set ORG=your-user-or-org}"
: "${REPO:?Set REPO=your-repo}"
PROJECT_TITLE="${PROJECT_TITLE:-Cerply v4.1 Launch}"

echo "==> gh auth check" >&2
gh auth status -h github.com >/dev/null

# Resolve your actual login; used for listing/adding items
SELF_LOGIN="$(gh api user -q .login)"

# Helper: get project number by title for a given owner
get_pnum() {
  local owner="$1"
  gh project list --owner "$owner" --json number,title \
    --jq '.[] | select(.title=="'"$PROJECT_TITLE"'") | .number' 2>/dev/null || true
}

echo "==> Locate or create user/org project: $SELF_LOGIN / '$PROJECT_TITLE'" >&2
PNUM="$(get_pnum "$SELF_LOGIN")"
if [[ -z "${PNUM:-}" ]]; then
  # Create under @me for best compatibility with older gh
  echo "   Creating project under @me…" >&2
  # Print the number directly from create (gh 2.76 supports --template)
  created_num="$(gh project create --owner "@me" --title "$PROJECT_TITLE" --template '{{.number}}' 2>/dev/null || true)"
  # Poll until visible on your login (eventual consistency)
  for i in {1..10}; do
    sleep 2
    PNUM="$(get_pnum "$SELF_LOGIN")"
    [[ -n "$PNUM" ]] && break
  done
  # If still empty, fall back to the number we captured from create
  if [[ -z "${PNUM:-}" && -n "${created_num:-}" ]]; then
    PNUM="$created_num"
  fi
fi

if [[ -z "${PNUM:-}" ]]; then
  echo "ERROR: Could not obtain project number. Try: gh project list --owner @me and gh project list --owner $SELF_LOGIN" >&2
  exit 1
fi
echo "PROJECT_NUMBER=$PNUM" >&2

echo "==> Ensure 'epic' label exists on $ORG/$REPO" >&2
gh label create -R "$ORG/$REPO" epic -d "Top-level epic" 2>/dev/null || true

create_or_get_issue() {
  local title="$1" body="$2"
  local url
  url="$(gh issue list -R "$ORG/$REPO" --state all --search "in:title \"$title\"" \
    --json url,title --jq '.[] | select(.title=="'"$title"'") | .url' 2>/dev/null | head -n1)"
  if [[ -z "$url" ]]; then
    url="$(gh api -X POST "repos/$ORG/$REPO/issues" \
      -f title="$title" -f body="$body" -f labels='["epic"]' --jq .html_url)"
  fi
  printf "%s" "$url"
}

echo "==> Create/collect epic issues and add to project" >&2
while read -r t; do
  [[ -z "$t" ]] && continue
  echo "  -> $t" >&2
  IU="$(create_or_get_issue "$t" "See docs/launch/plan-v4.1.md")"
  echo "     $IU" >&2
  gh project item-add --owner "$SELF_LOGIN" --number "$PNUM" --url "$IU" >/dev/null
done <<'EOF'
Conversational Orchestrator & Loop-Guard
Learner Engine (MVP)
Persistence Uplift
Auth & Session
Infra & Deployment
Observability + Telemetry & Cost Ledger
GTM Readiness (minimal)
Certified Content (Admin)
Security & Compliance
Web UX & Reliability (behavior-only)
Groups/Challenges (flag)
Documentation & Spec Hygiene
Launch Orchestration
EOF

echo "Done → https://github.com/users/$SELF_LOGIN/projects/$PNUM" >&2


