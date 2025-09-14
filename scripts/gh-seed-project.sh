#!/usr/bin/env bash
set -euo pipefail
PNUM_ENV="${PNUM:-}"

: "${ORG:?Set ORG=your-user-or-org}"
: "${REPO:?Set REPO=your-repo}"
PROJECT_TITLE="${PROJECT_TITLE:-Cerply v4.1 Launch}"

echo "==> gh auth check" >&2
gh auth status -h github.com >/dev/null

# Resolve your actual login & id
SELF_LOGIN="$(gh api user -q .login)"
SELF_ID="$(gh api user -q .id)"

get_pnum_cli() {
  local owner="$1"
  gh project list --owner "$owner" --json number,title \
    --jq '.[] | select(.title=="'"$PROJECT_TITLE"'") | .number' 2>/dev/null || true
}

get_pnum_gql() {
  gh api graphql \
    -f query='query($login:String!,$title:String!){
      user(login:$login){
        projectsV2(first:50, query:$title){ nodes { number title } }
      }
    }' \
    -F login="$SELF_LOGIN" -F title="$PROJECT_TITLE" \
    -q '.data.user.projectsV2.nodes[] | select(.title=="'"$PROJECT_TITLE"'") | .number' 2>/dev/null || true
}

create_project_gql() {
  gh api graphql \
    -f query='mutation($owner:ID!,$title:String!){
      createProjectV2(input:{ownerId:$owner, title:$title}){
        projectV2{ number title url }
      }
    }' \
    -F owner="$SELF_ID" -F title="$PROJECT_TITLE" \
    -q .data.createProjectV2.projectV2.number
}

echo "==> Locate or create user project: $SELF_LOGIN / '$PROJECT_TITLE'" >&2

if [[ -n "$PNUM_ENV" ]]; then
  PNUM="$PNUM_ENV"
  echo "Using provided PROJECT_NUMBER=$PNUM" >&2
else
  PNUM="$(get_pnum_cli "$SELF_LOGIN")"
  [[ -z "$PNUM" ]] && PNUM="$(get_pnum_gql)"
  if [[ -z "$PNUM" ]]; then
    echo "   Creating via GraphQL…" >&2
    created_num="$(create_project_gql || true)"
    # Poll CLI then GQL up to ~20s
    for i in {1..10}; do
      sleep 2
      PNUM="$(get_pnum_cli "$SELF_LOGIN")"
      [[ -n "$PNUM" ]] && break
      PNUM="$(get_pnum_gql)"
      [[ -n "$PNUM" ]] && break
    done
    [[ -z "$PNUM" && -n "$created_num" ]] && PNUM="$created_num"
  fi
fi

if [[ -z "${PNUM:-}" ]]; then
  echo "ERROR: Could not obtain project number. Try: gh project list --owner $SELF_LOGIN" >&2
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


