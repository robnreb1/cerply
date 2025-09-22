EPIC #82: Remove residual debug header and verify.

- Removed any writes of `x-cors-certified-hook` (none present in source).
- Kept certified-scoped CORS override: non-OPTIONS under `/api/certified/*` set `Access-Control-Allow-Origin: *`, and remove `Access-Control-Allow-Credentials`. Preflight `OPTIONS` remains 204 with `ACAO:*`.
- Updated tests to assert absence of `x-cors-certified-hook` on POST responses (stub and mock).
- Verified tests & typecheck locally.

After merge, verify on staging:

STAGING="https://cerply-api-staging-latest.onrender.com"

# OPTIONS: expect 204 + ACAO:*
curl -sS -i -X OPTIONS "$STAGING/api/certified/plan" \
  -H 'Origin: https://app.cerply.com' \
  -H 'Access-Control-Request-Method: POST' | sed -n '1,30p'

# POST: expect ACAO:*; NO ACAC:true; NO x-cors-certified-hook
curl -sS -D- -o /dev/null -X POST "$STAGING/api/certified/plan" \
  -H 'origin: https://app.cerply.com' -H 'content-type: application/json' --data '{}' \
| tr -d '\r' | grep -i -E '^(access-control-allow-origin|access-control-allow-credentials|x-cors-certified-hook):'

Environment note:
- In Render for `cerply-api:staging-latest`, ensure `CERTIFIED_DEBUG_CORS` is unset (do not set to "0").
