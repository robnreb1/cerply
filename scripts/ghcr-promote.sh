#!/usr/bin/env bash
set -euo pipefail
# Usage:
#   GHCR_IMAGE=ghcr.io/<owner>/<name> \
#   SOURCE_TAG=<tag or @digest> TARGET_TAG=prod \
#   bash scripts/ghcr-promote.sh
#
# Examples:
#   GHCR_IMAGE=ghcr.io/robnreb1/cerply-api SOURCE_TAG=sha-abcdef TARGET_TAG=prod bash scripts/ghcr-promote.sh
#   GHCR_IMAGE=ghcr.io/robnreb1/cerply-api SOURCE_TAG='@sha256:...' TARGET_TAG=prod bash scripts/ghcr-promote.sh
#
# Requires: one of oras | crane | (fallback) docker buildx imagetools + docker login
: "${GHCR_IMAGE:?missing GHCR_IMAGE}"
: "${SOURCE_TAG:?missing SOURCE_TAG}"
: "${TARGET_TAG:=prod}"
: "${DRY_RUN:=0}"

echo "==> Promote ${GHCR_IMAGE}:${SOURCE_TAG} → ${TARGET_TAG}"

if command -v oras >/dev/null 2>&1; then
  SRC="${GHCR_IMAGE}:${SOURCE_TAG}"
  [[ "$SOURCE_TAG" == @sha256:* ]] && SRC="${GHCR_IMAGE}${SOURCE_TAG}"
  CMD=(oras copy --concurrency 3 "$SRC" "${GHCR_IMAGE}:${TARGET_TAG}")
elif command -v crane >/dev/null 2>&1; then
  SRC="${GHCR_IMAGE}:${SOURCE_TAG}"
  [[ "$SOURCE_TAG" == @sha256:* ]] && SRC="${GHCR_IMAGE}${SOURCE_TAG}"
  CMD=(crane copy "$SRC" "${GHCR_IMAGE}:${TARGET_TAG}")
else
  # Fallback: recreate manifest tag using docker buildx imagetools (multi-arch friendly)
  # Resolve digest first (supports tag or digest input)
  REF="${GHCR_IMAGE}:${SOURCE_TAG}"
  [[ "$SOURCE_TAG" == @sha256:* ]] && REF="${GHCR_IMAGE}${SOURCE_TAG}"
  echo "-> resolving digest for $REF"
  DIGEST=$(docker buildx imagetools inspect "$REF" --format '{{json .Manifest.Digest}}' | tr -d '"')
  [[ -z "$DIGEST" || "$DIGEST" == "null" ]] && { echo "ERR: cannot resolve digest"; exit 1; }
  SRC="${GHCR_IMAGE}@${DIGEST}"
  CMD=(docker buildx imagetools create --tag "${GHCR_IMAGE}:${TARGET_TAG}" "$SRC")
fi

echo "-> ${CMD[*]}"
if [[ "$DRY_RUN" == "1" ]]; then
  echo "DRY_RUN=1 (no push)"; exit 0
fi
"${CMD[@]}"
echo "OK: promoted to ${GHCR_IMAGE}:${TARGET_TAG}"


