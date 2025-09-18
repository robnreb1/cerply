# PR Checklist

- [ ] CI green on branch
- [ ] If this promotes to prod, paste /api/version JSON + headers for staging and prod after deploy
- [ ] No references to legacy service names (✅ cerply-api-staging-latest, ✅ cerply-api-prod)

## Staging verification

```bash
BASE="https://cerply-api-staging-latest.onrender.com"
curl -sS -D /tmp/stg.h "$BASE/api/version" | jq .
grep -Ei '^(x-image-(tag|revision|created)|x-runtime-channel|x-api):' /tmp/stg.h || true
```

## Prod verification

```bash
BASE="https://api.cerply.com"
curl -sS -D /tmp/prod.h "$BASE/api/version" | jq .
grep -Ei '^(x-image-(tag|revision|created)|x-runtime-channel|x-api):' /tmp/prod.h || true
```
