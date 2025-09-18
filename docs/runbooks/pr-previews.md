# PR Preview Deploys (opt-in, label-gated)

**What it does**
- Add the `preview` label to a PR → deploys a Vercel preview of **web**.
- Posts a sticky PR comment with the preview URL.
- Auto-tears down when you remove the label or close the PR.
- Nightly sweep deletes previews older than **48h** or orphaned PRs.
- Vercel free-plan rate limits → job posts a **neutral** check and never blocks merges.

**When to use**
- UI reviews, stakeholder demos, or QA on PRs that touch `web/**`.

**How to use**
1) Ensure secrets exist: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.  
2) (One-time) create label: `preview`.  
3) Add label to your PR → wait for the comment with the URL.  
4) Remove label / close PR to tear down.

**Env & Routing**
- Previews use `NEXT_PUBLIC_API_BASE=${PREVIEW_API_ORIGIN}` (defaults to staging-latest).
- No changes to prod/staging release workflows.

**Failure modes**
- **429 / limit hit** → preview skipped; neutral check; merge unblocked.
- Any other deploy error → also non-blocking; see job logs.

**Costs**
- Opt-in only. Nightly sweep curbs orphan costs.

**Do not**
- Reintroduce legacy hosts, raw Render hooks, non-amd64 images, or per-workspace installs.



> Note: `/api/version` on Vercel previews may return **401** (protection). Validate required runtime headers via the **staging API**: `https://cerply-api-staging-latest.onrender.com/api/version`.
