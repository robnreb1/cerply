#!/usr/bin/env bash
set -euo pipefail

: "${ORG:?Set ORG=your-user-or-org}"
: "${REPO:?Set REPO=your-repo}"
PROJECT_TITLE="${PROJECT_TITLE:-Cerply v4.1 Launch}"

echo "==> gh auth check" >&2
gh auth status -h github.com >/dev/null

echo "==> Locate or create user/org project: $ORG / '$PROJECT_TITLE'" >&2
get_pnum() {
  gh project list --owner "$ORG" --json number,title \
    --jq '.[] | select(.title=="'"$PROJECT_TITLE"'") | .number' 2>/dev/null || true
}
PNUM="$(get_pnum || true)"
if [[ -z "${PNUM:-}" ]]; then
  gh project create --owner "$ORG" --title "$PROJECT_TITLE" >/dev/null
  sleep 2
  PNUM="$(get_pnum || true)"
fi
if [[ -z "${PNUM:-}" ]]; then
  echo "ERROR: Could not obtain project number. Try: gh project list --owner $ORG" >&2
  exit 1
fi
echo "PROJECT_NUMBER=$PNUM" >&2

echo "==> Ensure 'epic' label exists on $ORG/$REPO" >&2
gh label create -R "$ORG/$REPO" epic -d "Top-level epic" 2>/dev/null || true

create_or_get_issue() {
  local title="$1" body="$2"
  # Prefer existing issue with exact title
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
  gh project item-add --owner "$ORG" --number "$PNUM" --url "$IU" >/dev/null
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

echo "Done → https://github.com/users/$ORG/projects/$PNUM" >&2
------------------------------------------------------------------------------
Make executable: chmod +x scripts/gh-seed-project.sh

Commit message:
chore(ci): robust gh project seeder (user/org-scoped, no reserved fields, gh 2.76 safe)