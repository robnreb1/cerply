# Cerply Web (Next.js)

**Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS

## Getting Started

```bash
# Install dependencies
npm install

# Run dev server
npm run dev
# → http://localhost:3000

# Build for production
npm run build

# Run production server
npm start
```

## Key Routes

- `/` - Home with IngestInteraction (chat-first input)
- `/learn` - **Learner MVP** (unified learning flow: topic → preview → session)
- `/curate` - Curator dashboard (quality bar, item editing)
- `/certified/study` - ⚠️ **Deprecated** (use `/learn` instead)
- `/style` - Brand tokens showcase
- `/coverage` - Evidence coverage UI
- `/prompts` - Prompt library
- `/debug/env` - Runtime environment check

## Environment Variables

Required:
- `NEXT_PUBLIC_API_BASE_URL` - API origin (default: `http://localhost:8080`)

Optional:
- `NEXT_PUBLIC_ENTERPRISE_MODE` - `'true'|'false'` for enterprise UI prominence
- `NEXT_PUBLIC_FF_*` - Feature flags (e.g. `NEXT_PUBLIC_FF_CURATOR_DASHBOARD_V1`)

## Learner MVP (`/learn`)

**Purpose:** Unified learner interface (replaces `/certified/study`)

**Files:**
- `web/app/learn/page.tsx` - Main page (4 phases: input → preview → auth → session)
- `web/lib/copy.ts` - Centralized microcopy (15 keys)
- `web/e2e/learner.spec.ts` - E2E tests (17 scenarios)
- `web/scripts/smoke-learner.sh` - Smoke tests (10 checks)

**Flow:**
1. **Topic Input (L-1)**
   - User enters topic (prompt/paste/link) or uploads file (stub)
   - `Cmd+Enter` or "Preview" button → next phase

2. **Preview (L-2)**
   - `POST /api/preview` → `{ summary, proposed_modules, clarifying_questions }`
   - User reviews plan
   - "Looks great, start!" → auth check → session
   - "Refine" → back to input

3. **Auth Gate (L-3)**
   - If not authenticated, blocks start with sign-in CTA
   - Demo mode: sets `localStorage.auth_token`

4. **Session (L-4 to L-14)**
   - `POST /api/generate` → creates learning items
   - `POST /api/certified/schedule` → initializes SM2-lite schedule
   - Card UI: flip → grade (1-5) → score feedback → auto-advance
   - `POST /api/score` → `{ score, difficulty, misconceptions, next_review_days }`
   - `POST /api/certified/progress` → logs flip/grade events
   - **Explain/Why (L-6):** Shows misconceptions from score
   - **NL Ask Cerply (L-13):** Right-rail chat (stub responses)
   - **Completion (L-10):** After 10 items, "Great work!" screen

5. **Session Persistence (L-11)**
   - `localStorage.learn_session_id` → `sess-{timestamp}`
   - `GET /api/certified/progress?sid={session_id}` → resume (manual trigger)

**Fallback Content (L-9):**
- If API response >400ms, shows "While You Wait" box
- Profile teaser, related content suggestions, progress indicators

**Keyboard Nav (L-14):**
- `Cmd/Ctrl+Enter` to submit input/preview
- `Space` to flip card
- `Tab` through all interactive elements
- `Enter` on focused buttons

**A11y:**
- All inputs/buttons have `aria-label`
- Cards have `role="button"` + keyboard support
- Focus rings visible
- Screen reader support (semantic HTML, alert roles)

**Acceptance:**
- ✓ All 14 criteria (L-1 to L-14) implemented
- ✓ 17 E2E scenarios pass
- ✓ 10 smoke checks pass
- ✓ Keyboard + screen reader accessible
- ✓ UAT script ready: `docs/uat/LEARNER_MVP_UAT.md`

## M3 API Surface Integration (Deprecated - use `/learn`)

### /certified/study Page ⚠️ DEPRECATED

**Note:** This page is superseded by `/learn`. Use `/learn` for new work.

**Legacy Flow:** (kept for reference only)
- `POST /api/certified/schedule` → schedule cards
- `POST /api/certified/progress` → log events
- `GET /api/certified/progress?sid=` → resume

## Proxy Configuration

All `/api/*` requests are proxied to `NEXT_PUBLIC_API_BASE_URL` via Next.js rewrite:

```js
// next.config.cjs
async rewrites() {
  return [{
    source: '/api/:path*',
    destination: `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/:path*`
  }];
}
```

## Tailwind Brand Tokens

Use brand tokens from `tailwind.config.cjs`:
- Colors: `brand-surface`, `brand-ink`, `brand-border`, `brand-primary`, `brand-on-primary`
- Spacing: Tailwind defaults
- Border radius: `rounded-12` (12px)
- Shadows: `shadow-md`

Domain-specific accents via `body[data-domain=rc|ima|qpp]` in `app/globals.css`.

## Testing

```bash
# Playwright E2E tests
npm run test:e2e

# Vitest unit tests
npm run test:unit

# Smoke tests (requires API running)
npm run smoke
```

## Deployment

- **Staging:** Vercel (auto-deploy from `main` branch)
- **Production:** Vercel (manual promote via GitHub Actions)

## Acceptance Criteria (from FSD)

- Initial home screen shows single input action with cycling placeholders
- Drag-drop, file upload, and paste/URL accepted
- Trust badges: "Audit-ready · Expert-reviewed · Adaptive · Private by default"
- Lighthouse a11y score ≥ 90
- No blocking CORS issues
- `/learn` implements full learner MVP (L-1 to L-14) ✅
- `/certified/study` integrates with schedule/progress endpoints (M3) ⚠️ Deprecated

## References

- Functional Spec: `../docs/functional-spec.md`
- M3 EPIC: `../EPIC_M3_API_SURFACE.md`
- Acceptance Tests: `./ACCEPTANCE.md`