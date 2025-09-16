#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-https://api.cerply.com}"

echo "==> Auth acceptance against $BASE"

# 1) Unauthed generate must 401 with WWW-Authenticate
code=$(curl -s -o /dev/null -w "%{http_code}" -H 'content-type: application/json' \
  -d '{"planId":"p","moduleId":"m","types":["explainer"]}' "$BASE/api/ingest/generate")
test "$code" -eq 401
curl -s -D /tmp/gauth.h -o /dev/null -H 'content-type: application/json' \
  -d '{"planId":"p","moduleId":"m"}' "$BASE/api/ingest/generate" | grep -i '^www-authenticate: Session'

# 2) Dev login → callback sets cookie flags
next=$(curl -s -H 'content-type: application/json' -d '{"email":"ops@test.dev"}' "$BASE/api/auth/login" | jq -r .next)
curl -s -D /tmp/cb.h -o /dev/null "$BASE$next"
grep -Ei '^set-cookie:.*HttpOnly' /tmp/cb.h
grep -Ei '^set-cookie:.*SameSite=Lax' /tmp/cb.h
grep -Ei '^set-cookie:.*Max-Age=2592000' /tmp/cb.h

# 3) With cookie, generate must 200 and set impl header
cookie=$(grep -i '^set-cookie:' /tmp/cb.h | head -n1 | sed $'s/\r$//; s/^set-cookie: //; s/;.*$//')
curl -s -D /tmp/gen.h -H 'content-type: application/json' -H "Cookie: $cookie" \
  -d '{"planId":"p","moduleId":"m","types":["explainer"]}' "$BASE/api/ingest/generate" | jq -e '.action=="items"' >/dev/null
grep -i '^x-generate-impl:' /tmp/gen.h >/dev/null

echo "OK: auth acceptance passed."


