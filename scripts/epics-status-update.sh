#!/usr/bin/env bash
set -euo pipefail
ORG="${ORG:-robnreb1}"
REPO="${REPO:-cerply}"
PROJECT="${PROJECT:-2}"     # user project number
# labels we use as swimlanes
gh label create "status:done"        -R "$ORG/$REPO" 2>/dev/null || true
gh label create "status:in-progress" -R "$ORG/$REPO" 2>/dev/null || true
gh label create "status:todo"        -R "$ORG/$REPO" 2>/dev/null || true

comment() { gh issue comment "$1" -R "$ORG/$REPO" -b "$2" >/dev/null; }
setlbls() { gh issue edit "$1" -R "$ORG/$REPO" --add-label "$2" >/dev/null; }
cleans()  { gh issue edit "$1" -R "$ORG/$REPO" --remove-label "status:done,status:in-progress,status:todo" >/dev/null || true; }

stamp_done()        { cleans "$1"; setlbls "$1" "epic,status:done";        comment "$1" "✅ Status: **Done** — $(date +%F)"; }
stamp_progress()    { cleans "$1"; setlbls "$1" "epic,status:in-progress"; comment "$1" "⏳ Status: **In progress** — $(date +%F)"; }
stamp_todo()        { cleans "$1"; setlbls "$1" "epic,status:todo";        comment "$1" "🟡 Status: **Todo** — $(date +%F)"; }

# Map numbers → status
stamp_progress 47   # Orchestrator & Loop-Guard
stamp_done     48   # Learner Engine
stamp_done     49   # Persistence Uplift
stamp_done     50   # Auth & Session
stamp_progress 51   # Infra & Deployment
stamp_progress 52   # Observability & Ledger
stamp_todo     53   # GTM Readiness
stamp_todo     54   # Certified Content (Admin)
stamp_progress 55   # Security & Compliance
stamp_todo     56   # Web UX & Reliability
stamp_todo     57   # Groups/Challenges
stamp_progress 58   # Docs & Spec Hygiene
stamp_todo     59   # Launch Orchestration

echo "OK: labels/comments updated on $ORG/$REPO (Project #$PROJECT)."
