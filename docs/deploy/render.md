# Render deploy (API → GHCR image)

Service type: Web Service (Docker)

Image:
- Registry: GHCR
- Image: `ghcr.io/<owner>/cerply-api:<tag>`
- For `<tag>`, prefer `main-<shortsha>` from CI or pin to a specific `<shortsha>`.

Health check:
- Path: `/api/health`  (expects 200 JSON)

Env vars (baseline):
- NODE_ENV=production
- REQUIRE_AUTH_FOR_GENERATE=1
- LLM_PREVIEW=1
- LLM_PLANNER_PROVIDER=openai
- LLM_PLANNER_MODEL=gpt-4o-mini
- FF_* toggles per docs/spec
- (optional) BUDGET_LIMIT_CENTS, BUDGET_LOOKBACK_HOURS
- (if using DB) DATABASE_URL=postgres://...

Roll forward/back:
1) Pick desired tag from GitHub → Packages → cerply-api.
2) In Render, edit Image to that tag, Save, Deploy.
3) Verify `__routes.json` and `/api/health`.

What to screenshot for PRs:
- Render “Image Reference” showing the selected tag.
- `/api/health` 200 response headers (x-api present).

