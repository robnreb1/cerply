#!/usr/bin/env bash
set -euo pipefail
OWNER="${OWNER:-$(gh api user -q .login)}"
PKG="${PKG:-cerply-api}"

if [[ -n "${ORG:-}" ]]; then
  LIST_PATH="/orgs/$ORG/packages/container/$PKG/versions?per_page=10"
else
  LIST_PATH="/users/$OWNER/packages/container/$PKG/versions?per_page=10"
fi

echo "Owner=${ORG:-$OWNER}  Package=$PKG"
echo "==> Versions (updated_at  tags  digest)"
gh api -H "Accept: application/vnd.github+json" "$LIST_PATH" \
| jq -r '.[] | [.updated_at, (.metadata.container.tags // [] | join(",")), .name] | @tsv' \
| column -t


