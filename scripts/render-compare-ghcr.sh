#!/usr/bin/env bash
set -euo pipefail
: "${RENDER_TOKEN:?RENDER_TOKEN is required}"
: "${RENDER_SERVICE_ID:?RENDER_SERVICE_ID is required}"
OWNER="${OWNER:-$(gh api user -q .login)}"
PKG="${PKG:-cerply-api}"

if [[ -n "${ORG:-}" ]]; then
  LATEST_DIGEST=$(gh api -H "Accept: application/vnd.github+json" \
    "/orgs/$ORG/packages/container/$PKG/versions?per_page=1" | jq -r '.[0].name')
else
  LATEST_DIGEST=$(gh api -H "Accept: application/vnd.github+json" \
    "/users/$OWNER/packages/container/$PKG/versions?per_page=1" | jq -r '.[0].name')
fi
echo "GHCR latest digest: $LATEST_DIGEST"

R_IMG=$(curl -s -H "Authorization: Bearer $RENDER_TOKEN" \
  "https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys?limit=1" \
  | jq -r '.[0].image.url')
echo "Render deployed image: $R_IMG"

if [[ "$R_IMG" == *"$LATEST_DIGEST"* ]]; then
  echo "✓ Render is on the latest GHCR image."
  exit 0
else
  echo "✖ Render is NOT on the latest. Expected digest suffix: $LATEST_DIGEST"
  exit 1
fi


