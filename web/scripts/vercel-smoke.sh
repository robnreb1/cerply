#!/usr/bin/env bash
set -euo pipefail
APP_URL="${1:-}"
if [ -z "$APP_URL" ]; then echo "Usage: $0 https://your-app.vercel.app"; exit 1; fi

# Extract base URL and bypass token if present
if [[ "$APP_URL" == *"x-vercel-protection-bypass="* ]]; then
  BASE_URL=$(echo "$APP_URL" | cut -d'?' -f1)
  BYPASS_TOKEN=$(echo "$APP_URL" | grep -o 'x-vercel-protection-bypass=[^&]*' | cut -d'=' -f2)
  QUERY_PARAM="?x-vercel-protection-bypass=$BYPASS_TOKEN"
else
  BASE_URL="$APP_URL"
  QUERY_PARAM=""
fi

echo "→ Checking ${BASE_URL}/debug/env${QUERY_PARAM}"
code=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/debug/env${QUERY_PARAM}")
echo "Status: $code"
[ "$code" = "200" ] || (echo "Debug page not OK" && exit 2)

echo "→ Checking ${BASE_URL}/api/health${QUERY_PARAM}"
health_resp=$(curl -fsSL "${BASE_URL}/api/health${QUERY_PARAM}")
echo "Health response: $health_resp"
echo "$health_resp" | jq -e '.ok' > /dev/null || (echo "Health endpoint not returning expected JSON" && exit 3)

echo "→ Checking ${BASE_URL}/api/prompts${QUERY_PARAM}"
prompts_code=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/prompts${QUERY_PARAM}")
echo "Prompts status: $prompts_code"
[ "$prompts_code" != "404" ] || (echo "Prompts endpoint returning 404" && exit 4)

echo "✅ Vercel smoke OK - all endpoints responding correctly"
