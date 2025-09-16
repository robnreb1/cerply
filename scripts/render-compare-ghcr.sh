#!/usr/bin/env bash
set -euo pipefail
: "${RENDER_TOKEN:?RENDER_TOKEN is required}"
: "${RENDER_SERVICE_ID:?RENDER_SERVICE_ID is required}"
OWNER="${OWNER:-$(gh api user -q .login)}"
PKG="${PKG:-cerply-api}"

echo "==> GHCR latest:"
LATEST_DIGEST=$(gh api -H "Accept: application/vnd.github+json" \
  "/users/$OWNER/packages/container/$PKG/versions?per_page=1" \
  | jq -r '.[0].name')
echo "GHCR digest: $LATEST_DIGEST"

echo "==> Render latest deploy image:"
R_IMG=$(curl -s -H "Authorization: Bearer $RENDER_TOKEN" \
  "https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys?limit=1" \
  | jq -r '.[0].image.url')
echo "Render image: $R_IMG"

if [[ "$R_IMG" == *"$LATEST_DIGEST"* ]]; then
  echo "✓ Render is on latest GHCR image."
  exit 0
else
  echo "✖ Render not on latest. Expected digest suffix: $LATEST_DIGEST"
  exit 1
fi


