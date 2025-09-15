#!/usr/bin/env bash
set -euo pipefail
OWNER="${OWNER:-$(gh api user -q .login 2>/dev/null || echo "${GITHUB_USER:-$USER}")}" 
REF="${REF:-main}"
SHA="$(git rev-parse HEAD)"
SHORT="${SHA:0:7}"
echo "ghcr.io/${OWNER}/cerply-api:${REF}-${SHORT}"
echo "ghcr.io/${OWNER}/cerply-api:${SHORT}"
echo "ghcr.io/${OWNER}/cerply-api:latest"

