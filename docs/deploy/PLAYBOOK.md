# Cerply — Deploy Playbook

## TL;DR
1) Merge to `main` → CI builds & pushes API image to GHCR.
2) Render service uses the pinned GHCR tag.
3) Verify:
   - `GET /__routes.json` → 200 JSON with `"hasDbHealth": true`
   - `GET /api/health` → 200 JSON (`x-api: api-health`)
   - Staging/Prod smoke workflows green

## Checklists
### Build
- [ ] CI green for **Build & Push API Docker image**
- [ ] Image tag noted (e.g., `sha-<short>` or `build-<runid>`)

### Promote (optional)
- [ ] Promote `:sha-<short>` → `:prod` (oras/skopeo or GH API)
- [ ] Update Render pinned tag (UI)
- [ ] Smoke tests green

## Rollback
- Switch Render to previous GHCR tag
- Re-run Smoke
- Verify `/api/health`, `/api/db/health`, and `/__routes.json`

## Troubleshooting
- **npm ci EUSAGE in Docker**: ensure root `package-lock.json` is valid and included in build context; `workspaces` declared.
- **Routes 404**: hit `/__routes.json` to confirm route presence; check `x-api` headers.
- **DB health missing**: verify migrations applied; env `DATABASE_URL` set for that env.


