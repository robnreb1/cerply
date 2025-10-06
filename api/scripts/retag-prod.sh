#!/usr/bin/env bash
# retag-prod.sh — Rollback production to a previous SHA
# Usage: ./scripts/retag-prod.sh <previous-sha>

set -euo pipefail

if [ $# -eq 0 ]; then
  echo "Usage: $0 <previous-sha>"
  echo
  echo "Example: $0 abc1234"
  echo
  echo "This will retag ghcr.io/robnreb1/cerply-api:prod-latest to point to <previous-sha>"
  exit 1
fi

PREVIOUS_SHA="$1"
IMAGE_REPO="ghcr.io/robnreb1/cerply-api"
CURRENT_TAG="prod-latest"
ROLLBACK_TAG="prod-rollback-$(date +%Y%m%d-%H%M%S)"

echo "=== Production Rollback ===" 
echo "Target SHA: $PREVIOUS_SHA"
echo "Image: $IMAGE_REPO"
echo

# Check if we're authenticated to GHCR
if ! docker info >/dev/null 2>&1; then
  echo "❌ Docker is not running or not accessible"
  exit 1
fi

# Verify the SHA exists in the registry
echo "Verifying SHA $PREVIOUS_SHA exists..."
if ! docker pull "$IMAGE_REPO:$PREVIOUS_SHA" 2>/dev/null; then
  echo "❌ Image not found: $IMAGE_REPO:$PREVIOUS_SHA"
  echo "Available tags:"
  docker search "$IMAGE_REPO" 2>/dev/null || echo "  (Unable to list tags)"
  exit 1
fi

echo "✅ Image found: $IMAGE_REPO:$PREVIOUS_SHA"
echo

# Tag current prod-latest as rollback backup
echo "Backing up current prod-latest as $ROLLBACK_TAG..."
docker pull "$IMAGE_REPO:$CURRENT_TAG"
docker tag "$IMAGE_REPO:$CURRENT_TAG" "$IMAGE_REPO:$ROLLBACK_TAG"
docker push "$IMAGE_REPO:$ROLLBACK_TAG"
echo "✅ Backup created: $IMAGE_REPO:$ROLLBACK_TAG"
echo

# Retag prod-latest to previous SHA
echo "Retagging prod-latest to $PREVIOUS_SHA..."
docker tag "$IMAGE_REPO:$PREVIOUS_SHA" "$IMAGE_REPO:$CURRENT_TAG"
docker push "$IMAGE_REPO:$CURRENT_TAG"
echo "✅ prod-latest now points to $PREVIOUS_SHA"
echo

# Verify
NEW_TAG=$(docker inspect "$IMAGE_REPO:$CURRENT_TAG" --format='{{.Config.Labels.org.opencontainers.image.revision}}' 2>/dev/null || echo "unknown")
echo "Verification:"
echo "  Expected SHA: $PREVIOUS_SHA"
echo "  Actual SHA: $NEW_TAG"

if [[ "$NEW_TAG" == "$PREVIOUS_SHA"* ]]; then
  echo "✅ Rollback successful!"
else
  echo "⚠️  Warning: SHA mismatch. Manual verification recommended."
fi

echo
echo "Next steps:"
echo "  1. Render will auto-redeploy prod on next webhook trigger, OR"
echo "  2. Manually trigger Render deploy at: https://dashboard.render.com"
echo "  3. Run: ./api/scripts/post-deploy-verify.sh https://api.cerply.com"
echo "  4. If rollback fails, restore with: docker push $IMAGE_REPO:$ROLLBACK_TAG"

