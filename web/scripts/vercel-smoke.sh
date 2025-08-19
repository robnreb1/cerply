#!/usr/bin/env bash
set -euo pipefail
APP_URL="${1:-}"
if [ -z "$APP_URL" ]; then echo "Usage: $0 https://your-app.vercel.app"; exit 1; fi

echo "→ Checking $APP_URL/api/health"
curl -fsSL "$APP_URL/api/health" | jq .

echo "→ Checking $APP_URL/debug/env"
code=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/debug/env")
echo "Status: $code"
[ "$code" = "200" ] || (echo "Debug page not OK" && exit 2)

echo "✅ Smoke OK"
