#!/usr/bin/env bash
set -euo pipefail
: "${SOURCE_TAG:?usage: SOURCE_TAG=<tag> ./scripts/gh-promote-prod.sh}"
DEST_TAG="${DEST_TAG:-prod}"
WF_NAME="Promote API image to :prod"

echo "Triggering workflow: $WF_NAME (source_tag=$SOURCE_TAG dest_tag=$DEST_TAG)"
gh workflow run "$WF_NAME" -f source_tag="$SOURCE_TAG" -f dest_tag="$DEST_TAG" \
  --ref "$(git rev-parse --abbrev-ref HEAD)"
echo "To watch:"
echo "  gh run list --workflow \"$WF_NAME\" --limit 1"
echo "  gh run watch --exit-status"


