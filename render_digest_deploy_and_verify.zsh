#!/usr/bin/env zsh
set -euo pipefail

# ===== config =====
: "${RENDER_API_KEY:?Render API key missing}"
: "${SERVICE_ID:?Render service id missing}"
REPO="${REPO:-robnreb1/cerply}"
PR_NUM="${PR_NUM:-}"
STAGING="${STAGING:-https://cerply-api-staging-latest.onrender.com}"

# Optional: helps GHCR digest resolution
GH_TOKEN="${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}"

echo "Resolving GHCR digest for ghcr.io/robnreb1/cerply-api:staging-latest …"
DIGEST="${DIGEST:-}"

# Try docker (preferred)
if [[ -z "$DIGEST" ]] && command -v docker >/dev/null 2>&1; then
  if [ -n "$GH_TOKEN" ]; then
    ( echo "$GH_TOKEN" \
      | docker login ghcr.io -u "$(gh api user -q .login 2>/dev/null || echo gh-user)" --password-stdin \
    ) >/dev/null 2>&1 || true
  fi
  DIGEST="$(docker manifest inspect ghcr.io/robnreb1/cerply-api:staging-latest -v 2>/dev/null \
            | jq -r '.[0].Digest // empty')"
fi

# Fallback to HTTPS HEAD
if [ -z "$DIGEST" ]; then
  AUTH=()
  [ -n "$GH_TOKEN" ] && AUTH=(-H "Authorization: Bearer $GH_TOKEN")
  DIGEST="$(curl -fsSI "${AUTH[@]}" \
    -H 'Accept: application/vnd.oci.image.index.v1+json' \
    https://ghcr.io/v2/robnreb1/cerply-api/manifests/staging-latest \
    | awk -F': ' 'tolower($1)=="docker-content-digest"{print $2}' | tr -d '\r')"
fi

[ -n "$DIGEST" ] || { echo "❌ Could not resolve GHCR digest"; exit 1; }
IMAGE_URL="ghcr.io/robnreb1/cerply-api@${DIGEST}"
echo "Using digest: $DIGEST"

# Create Render deploy pinned to digest (try multiple payload shapes)
CREATE_JSON="$(mktemp)"
REQ_JSON="$(mktemp)"

# Attempt 1: image.imagePath
jq -n --arg img "$IMAGE_URL" '{clearCache:false, image:{imagePath:$img}}' > "$REQ_JSON"
HTTP_A="$(
  curl -sS -X POST "https://api.render.com/v1/services/$SERVICE_ID/deploys" \
      -H "Authorization: Bearer $RENDER_API_KEY" \
      -H "Content-Type: application/json" \
      --data-binary @"$REQ_JSON" \
      -o "$CREATE_JSON" -w 'HTTP=%{http_code}'
)"
echo "$HTTP_A image.imagePath"
DEPLOY_ID="$(jq -r '.id // empty' "$CREATE_JSON" 2>/dev/null || echo)"

# Attempt 2: imageUrl
if [ -z "$DEPLOY_ID" ]; then
  jq -n --arg img "$IMAGE_URL" '{clearCache:false, imageUrl:$img}' > "$REQ_JSON"
  HTTP_B="$(
    curl -sS -X POST "https://api.render.com/v1/services/$SERVICE_ID/deploys" \
        -H "Authorization: Bearer $RENDER_API_KEY" \
        -H "Content-Type: application/json" \
        --data-binary @"$REQ_JSON" \
        -o "$CREATE_JSON" -w 'HTTP=%{http_code}'
  )"
  echo "$HTTP_B imageUrl"
  DEPLOY_ID="$(jq -r '.id // empty' "$CREATE_JSON" 2>/dev/null || echo)"
fi

# Attempt 3: image.url
if [ -z "$DEPLOY_ID" ]; then
  jq -n --arg img "$IMAGE_URL" '{clearCache:false, image:{url:$img}}' > "$REQ_JSON"
  HTTP_C="$(
    curl -sS -X POST "https://api.render.com/v1/services/$SERVICE_ID/deploys" \
        -H "Authorization: Bearer $RENDER_API_KEY" \
        -H "Content-Type: application/json" \
        --data-binary @"$REQ_JSON" \
        -o "$CREATE_JSON" -w 'HTTP=%{http_code}'
  )"
  echo "$HTTP_C image.url"
  DEPLOY_ID="$(jq -r '.id // empty' "$CREATE_JSON" 2>/dev/null || echo)"
fi

if [ -z "$DEPLOY_ID" ]; then
  echo "❌ Deploy not created; response:"
  jq . "$CREATE_JSON" 2>/dev/null || cat "$CREATE_JSON"
  exit 1
fi
echo "Deploy ID: $DEPLOY_ID"

# Wait for live/succeeded
for i in {1..60}; do
  STATUS="$(curl -sS "https://api.render.com/v1/deploys/$DEPLOY_ID" \
            -H "Authorization: Bearer $RENDER_API_KEY" | jq -r '.status // empty')"
  echo "deploy status: ${STATUS:-?}"
  case "$STATUS" in
    live|succeeded) break ;;
    failed) echo "❌ Render deploy failed"; exit 1 ;;
    *) sleep 5 ;;
  esac
done

# Verify CORS headers
echo "--- OPTIONS headers ---"
H_OPT="$(curl -sS -D- -o /dev/null -X OPTIONS "$STAGING/api/certified/plan" \
  -H 'Origin: https://app.cerply.com' \
  -H 'Access-Control-Request-Method: POST' | tr -d '\r')"
printf "%s\n" "$H_OPT" | sed -n '1,30p'

echo "--- POST headers ---"
H_POST="$(curl -sS -D- -o /dev/null -X POST "$STAGING/api/certified/plan" \
  -H 'origin: https://app.cerply.com' \
  -H 'content-type: application/json' --data '{}' | tr -d '\r')"
printf "%s\n" "$H_POST" | sed -n '1,60p'

# Validate: ACAO:* present, NO ACAC:true, NO debug header
echo "$H_POST" | grep -iq '^access-control-allow-origin:[[:space:]]*\*$' \
  || { echo "❌ missing ACAO:* on POST"; exit 1; }
if echo "$H_POST" | grep -iq '^access-control-allow-credentials:[[:space:]]*true'; then
  echo "❌ ACAC:true present on POST"; exit 1
fi
if echo "$H_POST" | grep -iq '^x-cors-certified-hook:'; then
  echo "❌ debug header present on POST"; exit 1
fi
echo "✅ CORS OK on POST: ACAO:*, no ACAC:true, no debug header."

# Optional: comment back to PR
if [ -n "$PR_NUM" ] && command -v gh >/dev/null 2>&1; then
  TMP="$(mktemp)"
  {
    echo "Epic #82 — Staging CORS verification (pinned ${DIGEST})"
    echo
    echo "OPTIONS /api/certified/plan:"
    echo '```'; printf "%s\n" "$H_OPT" | sed -n '1,30p'; echo '```'
    echo
    echo "POST /api/certified/plan:"
    echo '```'; printf "%s\n" "$H_POST" | sed -n '1,60p'; echo '```'
  } > "$TMP"
  gh pr comment "$PR_NUM" -R "$REPO" -F "$TMP" || true
fi
