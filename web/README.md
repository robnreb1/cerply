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
- `/curate` - Curator dashboard (quality bar, item editing)
- `/certified/study` - Retention preview (SM2-lite scheduling, progress tracking)
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

## M3 API Surface Integration

### /certified/study Page

**Purpose:** Preview integration for retention v0 (§21.1)

**Flow:**
1. **Start Session** → `POST /api/certified/schedule`
   - Sends: `{ session_id, plan_id, items[], algo: "sm2-lite" }`
   - Receives: `{ order[], due, meta }`
   - Initializes card order and scheduling

2. **Flip Card** → `POST /api/certified/progress`
   - Sends: `{ session_id, card_id, action: "flip" }`
   - Records user interaction

3. **Grade Card** → `POST /api/certified/progress`
   - Sends: `{ session_id, card_id, action: "grade", grade: 1-5 }`
   - Updates progress snapshot

4. **Load Progress** → `GET /api/certified/progress?sid={session_id}`
   - Receives: `{ session_id, items[], updated_at }`
   - Resumes session from last state

**Preview Mode:**
- Console/alert feedback for API calls
- In-memory progress (no persistent storage yet)
- Deterministic card set (3 sample cards)

**Acceptance:**
- ✓ Can start session and schedule cards
- ✓ Can flip and grade cards
- ✓ Can load progress snapshot
- ✓ All API calls return expected schemas

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
- `/certified/study` integrates with schedule/progress endpoints (M3)

## References

- Functional Spec: `../docs/functional-spec.md`
- M3 EPIC: `../EPIC_M3_API_SURFACE.md`
- Acceptance Tests: `./ACCEPTANCE.md`