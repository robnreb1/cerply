# Epic Closure: CI + Staging/Prod hardening & migration (Sept 2025)

## Summary
- Root Dockerfile builds API image via Buildx (linux/amd64) with IMAGE_* build args.
- Staging service standardized to image-based: cerply-api:staging-latest at https://cerply-api-staging-latest.onrender.com.
- /api/version contract enforced: JSON image {tag, revision, created} + runtime {channel}; headers mirror values.
- Guard job forbids legacy hosts and raw Render deploy hooks.
- Nightly smoke workflow checks health/version and headers for staging and prod.
- Promote-to-prod via workflow retags by digest and deploys to Render.
- Single root package-lock.json; sub-lockfiles removed; preview cache path fixed.
- Web rewrites proxy through NEXT_PUBLIC_API_BASE; staging points to staging-latest via env.

## Final state

| Area             | Final state                                                                 |
|------------------|------------------------------------------------------------------------------|
| Staging service  | cerply-api:staging-latest (https://cerply-api-staging-latest.onrender.com)  |
| Prod service     | cerply-api-prod (https://api.cerply.com)                                     |
| Image tags       | staging, staging-latest, prod on ghcr.io/robnreb1/cerply-api                 |
| Required headers | x-image-tag, x-image-revision, x-image-created, x-runtime-channel            |
| Env              | RUNTIME_CHANNEL=staging|prod                                                 |
| Deploy hooks     | Staging via secret only; prod via promote workflow                           |
| Lockfiles        | Root package-lock.json only                                                  |

## How to deploy + verify

```bash
# staging
gh workflow run CI --ref staging
curl -fsS -X POST "${RENDER_STAGING_DEPLOY_HOOK}"
BASE="https://cerply-api-staging-latest.onrender.com"
curl -sS -D /tmp/h "$BASE/api/version" | jq .
grep -Ei '^(x-image-(tag|revision|created)|x-runtime-channel|x-api):' /tmp/h

# promote prod
gh workflow run ".github/workflows/promote-prod.yml" --ref main -f source_tag=staging-latest
BASE="https://api.cerply.com"
curl -sS -D /tmp/h "$BASE/api/version" | jq .
grep -Ei '^(x-image-(tag|revision|created)|x-runtime-channel|x-api):' /tmp/h
```

## CI workflows
- ci.yml: build, test, typecheck, docker build & push, staging deploy + header assertions.
- promote-prod.yml: tag promotion → Render deploy → health wait.
- nightly-smoke.yml: staging+prod health + header verification (added in this epic).
- Guard: forbids legacy hosts (cerply-api-staging.onrender.com) and raw https://api.render.com/deploy/srv-...

## Decommissioned / renamed
- Legacy staging service/hosts replaced by cerply-api-staging-latest.onrender.com.
- Sub-lockfiles removed; only root lockfile remains.
- Legacy multi-arch docker workflows removed in favor of explicit linux/amd64.

## Rollback
- Promote a previous immutable tag/digest back to :prod using the promote workflow.

## Owners
- Infra/DevOps: @robnreb1
