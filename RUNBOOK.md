# Cerply API – Runbook

## Staging verify

```bash
BASE="https://cerply-api-staging-latest.onrender.com"
curl -sS -D /tmp/stg.h "$BASE/api/version" | jq .
grep -Ei '^(x-image-(tag|revision|created)|x-runtime-channel|x-api):' /tmp/stg.h || true
```

## Prod verify

```bash
BASE="https://api.cerply.com"
curl -sS -D /tmp/prod.h "$BASE/api/version" | jq .
grep -Ei '^(x-image-(tag|revision|created)|x-runtime-channel|x-api):' /tmp/prod.h || true
```

## Promote prod (GitHub Actions)

```bash
gh workflow run ".github/workflows/promote-prod.yml" --ref main -f source_tag=staging-latest
```

## Check GHCR digests match (prod vs source tag)

```bash
OWNER=robnreb1 PKG=cerply-api SRC=staging-latest
SRC_DIGEST=$(docker buildx imagetools inspect ghcr.io/$OWNER/$PKG:$SRC  --raw | jq -r '.manifests[0].digest // .digest')
PROD_DIGEST=$(docker buildx imagetools inspect ghcr.io/$OWNER/$PKG:prod --raw | jq -r '.manifests[0].digest // .digest')
echo "src=$SRC_DIGEST"; echo "prod=$PROD_DIGEST"
```

## Rollback prod to a previous tag/digest

```bash
OWNER=robnreb1 PKG=cerply-api
gh api -H "Accept: application/vnd.github+json" "/users/$OWNER/packages/container/$PKG/versions?per_page=20" \
  | jq -r '.[] | [.updated_at, (.metadata.container.tags // [] | join(",")), .name] | @tsv'
# choose a prior tag (e.g. sha-xxxxxxxx), then:
gh workflow run ".github/workflows/promote-prod.yml" --ref main -f source_tag=sha-xxxxxxxx
```

Note: Images are built for linux/amd64 to satisfy Render.


