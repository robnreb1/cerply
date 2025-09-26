#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-robnreb1/cerply}"
DAYS="${DAYS:-14}"

# Ensure deps
command -v jq >/dev/null || { echo "jq is required"; exit 1; }
command -v gh >/dev/null || { echo "gh is required"; exit 1; }

# Pull all launch-scoped issues/PRs
JSON=$(gh issue list -R "$REPO" --label 'scope:launch' --state all --limit 1000 \
  --json number,state,labels,title,updatedAt,url)

# Build bucket stats for ALL, P0, P1
TABLE=$(jq -r '
  . as $rows
  | def bucket($name):
      (if $name=="ALL" then . else map(select(any(.labels[].name; .==$name))) end) as $x
      | {bucket:$name, total:($x|length), closed:($x|map(select(.state=="CLOSED"))|length)};
  [bucket("ALL"), bucket("P0"), bucket("P1")]
  | (["Bucket","Done","Total","%"] | @tsv),
    (.[] | [ .bucket, .closed, .total,
             (if .total==0 then "0" else ((.closed*100/.total)|floor|tostring) end) ] | @tsv)
' <<<"$JSON")

# Remaining open
REMAIN=$(jq 'map(select(.state!="CLOSED")) | length' <<<"$JSON")

# 14-day average throughput
AVG=$(gh issue list -R "$REPO" --label 'scope:launch' --state closed --limit 1000 --json closedAt \
  | jq -r '.[].closedAt' \
  | awk -F'T' '{print $1}' \
  | sort \
  | uniq -c \
  | tail -n "$DAYS" \
  | awk '{sum+=$1; n++} END{if(n==0)print 0; else print sum/n}')

# ETA days (simple)
if awk "BEGIN{exit !($AVG==0)}"; then
  ETA="n/a"
else
  ETA=$(awk -v r="$REMAIN" -v v="$AVG" 'BEGIN{printf("%.1f", r/v)}')
fi

# Emit a markdown block for docs/PR/Epic comments
printf '# Launch snapshot\n\n```\n%s\n```\n\n- Remaining (scope:launch): %s\n- 14-day avg throughput (items/day): %s\n- ETA (days, simple): %s\n' \
  "$TABLE" "$REMAIN" "$AVG" "$ETA"
