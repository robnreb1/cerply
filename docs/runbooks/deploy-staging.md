# Runbook: Deploy Staging

Inputs:
- Secret: `RENDER_STAGING_DEPLOY_HOOK`
- Branch: `staging`

Steps:
```bash
# 1) Run CI (build/test/typecheck + image build/push + staging deploy)
gh workflow run CI --ref staging

# 2) Trigger staging deploy hook (idempotent)
curl -fsS -X POST "${RENDER_STAGING_DEPLOY_HOOK}"

# 3) Verify headers
BASE="https://cerply-api-staging-latest.onrender.com"
curl -sS -D /tmp/h "$BASE/api/version" | jq .
grep -Ei '^(x-image-(tag|revision|created)|x-runtime-channel|x-api):' /tmp/h
```

Common Failures:
- Vercel preview rate-limit: preview retries/skip; not required for staging deploy.
- Render `x-render-routing: suspend`: ensure the staging-latest service is targeted; retry deploy hook.
- Missing IMAGE_* headers: confirm CI passed IMAGE_* build args and built from root Dockerfile.
- Wrong platform: images must be linux/amd64; rebuild from CI.
- Hook not configured: set `RENDER_STAGING_DEPLOY_HOOK` in repo secrets.
- Health still 503: wait and retry; check Render logs for boot.
