# Runbook: Promote to Production

Inputs:
- Source tag: default `staging-latest` (or `sha-<short>`, or `@sha256:<digest>`)

Steps:
```bash
# 1) Run promote workflow
gh workflow run ".github/workflows/promote-prod.yml" --ref main -f source_tag=staging-latest

# 2) Verify headers
BASE="https://api.cerply.com"
curl -sS -D /tmp/h "$BASE/api/version" | jq .
grep -Ei '^(x-image-(tag|revision|created)|x-runtime-channel|x-api):' /tmp/h

# 3) Rollback (promote prior tag/digest)
# list recent versions/tags (user-owned container example)
OWNER=robnreb1 PKG=cerply-api
gh api -H "Accept: application/vnd.github+json" "/users/$OWNER/packages/container/$PKG/versions?per_page=20" \
  | jq -r '.[] | [.updated_at, (.metadata.container.tags // [] | join(",")), .name] | @tsv'
# then promote a prior tag
gh workflow run ".github/workflows/promote-prod.yml" --ref main -f source_tag=sha-xxxxxxxx
```

Common Failures:
- Missing `linux/amd64` in source image: rebuild in CI (platforms: linux/amd64).
- Digest mismatch after promote: ensure retag-by-digest logic runs (no rebuilds).
- Headers empty on prod: confirm build args passed and RUNTIME_CHANNEL=prod set on service.
- Render deploy hook not configured for prod: set secret and retry.
- Health 503 after deploy: check Render logs; retry.
- Wrong source tag: verify GHCR tags exist and point to desired digest.
