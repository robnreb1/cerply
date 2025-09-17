#!/usr/bin/env bash
set -euo pipefail
echo "==> CI web smoke"
: "${NEXT_PUBLIC_API_BASE:?Set NEXT_PUBLIC_API_BASE (e.g. https://cerply-api-staging-latest.onrender.com)}"
export NEXT_PUBLIC_API_BASE
export NODE_ENV=production
PORT="${PORT:-3000}"

# Check API health first
code=$(curl -s -o /dev/null -w "%{http_code}" "$NEXT_PUBLIC_API_BASE/api/health" || true)
[ "$code" = "200" ] || { echo "API not healthy ($code)"; exit 1; }

# Build and start Next.js web
# Ensure devDependencies are installed for build (tailwind/postcss)
NPM_CONFIG_PRODUCTION=false npm -w web ci --no-audit --no-fund || NPM_CONFIG_PRODUCTION=false npm -w web install
npm -w web run build
npm -w web run start -- -p "$PORT" >/tmp/web.log 2>&1 & echo $! > /tmp/web.pid

# Wait until home returns 200
BASE="http://localhost:$PORT"
for i in $(seq 1 30); do
  s=$(curl -s -o /dev/null -w "%{http_code}" "$BASE" || true)
  [ "$s" = "200" ] && break
  sleep 1
done
[ "$s" = "200" ] || (echo "Web did not start"; tail -n 100 /tmp/web.log; exit 1)

echo "Home 200; API base: $NEXT_PUBLIC_API_BASE"
kill "$(cat /tmp/web.pid)" || true
echo "OK: web smoke passed"


