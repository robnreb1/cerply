#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${1:-cerply-api-prod}"

cat <<'NOTE'
Open Render → Service → Events/Deploys. Confirm the deployed image tag/digest
matches the latest GHCR push from GitHub Actions ("Build & Push API Docker image").
If you have Render API creds, use:

  curl -s -H "Authorization: Bearer $RENDER_TOKEN" \
    "https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys?limit=1" \
    | jq -r '.[0].image.url, .[0].commit'

NOTE


