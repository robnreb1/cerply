## 9) Acceptance criteria
- Curator edit ≤ 4 min/item; median item quality ≥ 70 (when flag on).
- Import supports: text, base64 (`.pdf/.docx` stub), transcript batching.
- Learn loop: submit/next cycle works; correctness feedback present.
- Style page renders brand tokens; AA on primary/on-primary.
- Prompts library: `/prompts` lists & renders &gt;0 prompts in dev, fetches via Next.js rewrite proxy; prompt detail view works; API `GET /api/prompts` reachable.
- Coverage UI: `/coverage` renders summary and gaps from `/evidence/coverage` (stub) via proxy (no CORS issues).
- Smoke script passes for `/style` and `/coverage` endpoints (HTTP 200).
- Vercel proxy working: /api/health returns 200 JSON via Next proxy (no 404).
- /api/prompts returns a response (not 404) on Vercel.
- POST /api/curator/quality/compute returns 200/400 (not 404/405).
- /debug/env renders; build-time env shown; API health check on page passes.
- Tailwind styling present; feature flags honored on Vercel.
- `/debug/env` shows NEXT_PUBLIC_* as expected and API health JSON in Vercel.
- Preview & Prod on Vercel resolve via custom domain; /debug/env shows correct vars; /api/health and /api/prompts return non-404 via proxy.

## 10) Non-functional / Dev UX
- API background control:
  - Start: scripts/api-start.sh (uses PORT, default 3001)
  - Stop:  scripts/api-stop.sh
  - Logs:  tail -n 100 /tmp/cerply-api.log

## 11) Change log
- **2025-08-19**: Expanded acceptance criteria to include `/prompts` and coverage smoke; spec reconciled.
- **2025-08-19**: Added Next.js rewrite to proxy `/api/*` to backend; fixed `/prompts` page fetching via proxy.
- **2025-08-19**: Added feature-flagged routes (connectors, quality, certified, marketplace, groups), OPTIONS preflight, brand tokens page; spec reconciled to v2.3.
- **2025-08-19**: Added prompt library system with auto-indexing, API endpoints, and web UI; spec reconciled to v2.5.
- **2025-08-19**: Added Evidence Coverage UI at /coverage with summary KPIs and gaps, smoke test script, updated package scripts; spec reconciled to v2.4.
- **2025-08-17**: Initial spec + items generate + learn MVP.
- **2025-08-19**: Added /debug/env runtime page and vercel smoke script.
- **2025-01-27**: Staging domains (Vercel + Render), proxy correctness, debug page verified.
