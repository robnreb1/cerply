#!/usr/bin/env bash
set -euo pipefail
APP_URL="${1:-}"
if [ -z "$APP_URL" ]; then echo "Usage: $0 https://your-app.vercel.app"; exit 1; fi

echo "→ Checking $APP_URL/debug/env"
code=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/debug/env")
echo "Status: $code"
[ "$code" = "200" ] || (echo "Debug page not OK" && exit 2)

echo "→ Checking $APP_URL/api/health"
health_resp=$(curl -fsSL "$APP_URL/api/health")
echo "Health response: $health_resp"
echo "$health_resp" | jq -e '.ok' > /dev/null || (echo "Health endpoint not returning expected JSON" && exit 3)

echo "→ Checking $APP_URL/api/prompts"
prompts_code=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/api/prompts")
echo "Prompts status: $prompts_code"
[ "$prompts_code" != "404" ] || (echo "Prompts endpoint returning 404" && exit 4)

echo "✅ Vercel smoke OK - all endpoints responding correctly"
