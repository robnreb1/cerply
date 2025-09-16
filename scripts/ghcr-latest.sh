#!/usr/bin/env bash
set -euo pipefail
OWNER="${OWNER:-$(gh api user -q .login)}"
PKG="${PKG:-cerply-api}"

echo "Owner=$OWNER  Package=$PKG"
echo "==> Versions (updated_at  tags  digest)"
gh api -H "Accept: application/vnd.github+json" \
  "/users/$OWNER/packages/container/$PKG/versions?per_page=10" \
| jq -r '.[] | [.updated_at, (.metadata.container.tags // [] | join(",")), .name] | @tsv' \
| column -t


