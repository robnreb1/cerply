# Session v0 (Anonymous) — CSRF Double-Submit

- Flags: `AUTH_ENABLED=true`, `AUTH_REQUIRE_SESSION=false`, `AUTH_COOKIE_NAME=sid`, `AUTH_SESSION_TTL_SECONDS=604800`.
- Store: in-memory by default; uses `REDIS_URL` if present.
- Cookies:
  - `${AUTH_COOKIE_NAME}`: HttpOnly, Secure (prod), SameSite=Lax, Path=/, Max-Age=TTL.
  - `csrf`: non-HttpOnly, Secure (prod), SameSite=Lax, Path=/, Max-Age=TTL.
- CSRF: required for any non-GET under `/api/` via double submit: `X-CSRF-Token` header AND `csrf` cookie equal to the session token.
- CORS invariants: `OPTIONS` → 204; non-OPTIONS responses include `Access-Control-Allow-Origin: *` and never `Access-Control-Allow-Credentials: true`.

## Endpoints

POST `/api/auth/session`
- Creates a session and sets cookies. Returns:
```json
{ "session_id": "...", "csrf_token": "...", "expires_at": "ISO-8601" }
```

GET `/api/auth/session`
- Returns current session details or `401` if missing.

DELETE `/api/auth/session`
- Deletes session; clears cookies.

## Guards
- If `AUTH_REQUIRE_SESSION=true`, mutating routes under `/api/orchestrator/*` and `/api/certified/*` return `401` when session is missing.
- All non-GET `/api/*` require CSRF header + cookie; failure returns `403 { error: { code: "CSRF" } }`.

## Curl examples

```bash
# Create session
curl -sS -D- -o /tmp/body.$$ -X POST "$API/api/auth/session" \
  -H 'origin: https://app.cerply.com' -H 'content-type: application/json' --data '{}' | tr -d '\r'
SID_COOKIE=$(printf "%s\n" "$CREATE" | awk -F': ' 'tolower($1)=="set-cookie"{print $2}' | head -n1 | cut -d';' -f1)
CSRF=$(jq -r '.csrf_token' /tmp/body.$$)

# Orchestrator without CSRF → 403
curl -sS -D- -o /dev/null -X POST "$API/api/orchestrator/jobs" \
  -H 'origin: https://app.cerply.com' -H 'content-type: application/json' \
  -H "cookie: $SID_COOKIE" \
  --data '{"goal":"healthcheck","steps":[],"limits":{"maxSteps":1,"maxWallMs":3000}}' | sed -n '1,20p'

# With CSRF (header + non-HttpOnly cookie)
curl -sS -D- -o /dev/null -X POST "$API/api/orchestrator/jobs" \
  -H 'origin: https://app.cerply.com' -H 'content-type: application/json' \
  -H "cookie: $SID_COOKIE; csrf=$CSRF" -H "x-csrf-token: $CSRF" \
  --data '{"goal":"healthcheck","steps":[],"limits":{"maxSteps":1,"maxWallMs":3000}}' | sed -n '1,20p'
```

## Notes
- OAuth/identity is out-of-scope for this slice; to be added later.
- OpenAPI updated under `api/openapi/build/openapi.json`.
