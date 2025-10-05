# Cerply Web – ER-MUI & M2 Proxy

This is the Next.js web application for Cerply, implementing the **Enterprise-Ready Minimalist UI (ER-MUI)** and **M2 Proxy** architecture per the Functional Spec.

## Architecture Overview

### M2 Proxy (§13)

The web app uses **Next.js rewrites** to proxy all `/api/*` requests to the backend API without CORS issues. This replaces the legacy M1 edge canaries.

**Configuration:**
- `NEXT_PUBLIC_API_BASE` environment variable specifies the backend API URL
- Rewrites are configured in `next.config.cjs`
- All `/api/*` paths are transparently forwarded to `${NEXT_PUBLIC_API_BASE}/api/*`

**Key endpoints:**
- `/api/health` → backend health check (must return 200 JSON, never 404)
- `/api/prompts` → prompts list (must return 200 JSON, never 404)
- `/debug/env` → internal debug page showing proxy configuration and health

### ER-MUI Components (§14-§17)

Minimalist, enterprise-ready UI components optimized for professional use:

**Components:**
- `components/ui/InputAction.tsx` – Main input with cycling placeholders, drag-drop, paste, and file upload
- `components/ui/TrustBadgesRow.tsx` – Trust indicators (Audit-ready, Expert-reviewed, Adaptive, Private by default)
- `components/ui/ModuleCard.tsx` & `ModuleStack.tsx` – Learning module display
- `components/ui/IconRow.tsx` – Navigation icons (Certified, Curate, Guild, Account, Upload)
- `lib/copy.ts` – Centralized copy tokens for consistency and i18n

**Home Page:**
- Simple centered input as primary interaction
- Top bar tagline: "Helping you master what matters." (italic)
- Icon row beneath input (Upload emphasized)
- Trust badges at bottom (or prominent in enterprise mode)
- Progressive disclosure: modules appear after submission

## Development

### Setup

```bash
cd web
npm install
```

### Environment Variables

Copy `.env.example` and customize:

```bash
cp .env.example .env.local
```

Key variables:
- `NEXT_PUBLIC_API_BASE` – Backend API URL (default: staging)
- `NEXT_PUBLIC_ENTERPRISE_MODE` – `'true'` enables prominent trust badges

### Run Locally

```bash
# Standard mode
npm run dev
# → http://localhost:3000

# Enterprise mode
npm run dev:ent
# → http://localhost:3001
```

### Build

```bash
npm run build
npm run start
```

## Testing

### Smoke Tests

Verify M2 proxy endpoints (never 404):

```bash
# Local (requires web server running)
npm run start &
sleep 5
WEB_BASE=http://localhost:3000 npm run smoke:web

# Expected output:
# ==> Testing: /api/health
#     Status: 500 (not 404 - proxy working)
# ==> Testing: /api/prompts  
#     Status: 500 (not 404 - proxy working)
# ==> Testing /debug/env page
#     Status: 200
# ✅ All smoke tests passed

# Staging (with bypass token)
WEB_BASE=https://cerply-staging.vercel.app \
  VERCEL_BYPASS=your-token \
  npm run smoke:web
```

### Playwright E2E Tests

```bash
# All tests
npm run test:e2e

# Home page only
npm run test:e2e:home
```

**Home page test coverage:**
- Cycling placeholders (3.5s interval)
- Top bar tagline display
- Icon row presence (5 icons, Upload emphasized)
- Trust badges visibility
- Keyboard operability (Tab, Enter)
- Paste, URL, file upload support
- Processing state and module display

### Lighthouse Accessibility

Run Lighthouse CI to verify a11y score ≥ 90 (mobile & desktop):

```bash
# Requires local server running
npm run start &
sleep 5
npm run lighthouse

# Expected output:
# Mobile A11y Score: 96
# Desktop A11y Score: 96
# ✅ PASS: Both mobile (96) and desktop (96) meet the minimum A11y score of 90
```

**Acceptance criteria (FSD §17):**
- Mobile a11y score ≥ 90
- Desktop a11y score ≥ 90
- All interactive elements keyboard-accessible
- ARIA labels present on inputs/buttons

## Acceptance Checklist (M2 + ER-MUI)

### Proxy M2 (§13)
- [x] `/api/health` returns 200 JSON via proxy (not 404)
- [x] `/api/prompts` returns 200 JSON via proxy (not 404)
- [x] M1 canary routes removed (`app/ping/route.ts`, `app/api/health/route.ts`, `app/api/prompts/route.ts`)
- [x] `/debug/env` page shows `NEXT_PUBLIC_API_BASE` and health JSON
- [x] Smoke script passes: `npm run smoke:web`

### ER-MUI (§14-§17)
- [x] Home shows centered `InputAction` with cycling placeholders
- [x] Top bar displays: "Helping you master what matters." (italic)
- [x] Icon row with 5 icons: Certified, Curate, Guild, Account, Upload (Upload emphasized)
- [x] Trust badges at bottom (consumer) or prominent (enterprise)
- [x] Paste, URL, drag-drop, and file upload supported
- [x] Processing state: "Got it. Building your learning modules…"
- [x] Module cards appear after processing (grid layout)
- [x] Keyboard operable (Tab, Enter)
- [x] Lighthouse a11y ≥ 90 (mobile & desktop)

## CI Integration

### GitHub Actions

Add to `.github/workflows/`:

```yaml
- name: Build web
  run: |
    cd web
    npm ci
    npm run build

- name: Smoke test (M2 proxy)
  run: |
    cd web
    npm run start &
    sleep 5
    npm run smoke:web

- name: Lighthouse CI
  run: |
    cd web
    npm run start &
    sleep 5
    npm run lighthouse
```

## Troubleshooting

### Proxy 404 Issues

If `/api/health` or `/api/prompts` return 404:

1. Check `NEXT_PUBLIC_API_BASE` is set correctly
2. Verify backend is running and accessible
3. Review `next.config.cjs` rewrites
4. Check `/debug/env` page for configuration

### Accessibility Score < 90

Common issues:
- Missing `aria-label` on inputs/buttons
- Insufficient color contrast
- Non-keyboard-operable elements
- Missing focus indicators

Run Lighthouse in Chrome DevTools for detailed diagnostics.

### Playwright Tests Failing

Ensure Next.js dev server is running:

```bash
npm run dev &
npm run test:e2e:home
```

For CI, use `npm run start` (production build).

## File Structure

```
web/
├── app/
│   ├── page.tsx           # ER-MUI home page
│   ├── debug/
│   │   └── env/
│   │       └── page.tsx   # Debug/proxy verification page
│   └── layout.tsx
├── components/
│   └── ui/
│       ├── InputAction.tsx      # Main input component
│       ├── TrustBadgesRow.tsx   # Trust badges
│       ├── ModuleCard.tsx       # Module card
│       ├── ModuleStack.tsx      # Module grid
│       └── IconRow.tsx          # Navigation icons
├── lib/
│   └── copy.ts            # Centralized copy tokens
├── e2e/
│   └── home.spec.ts       # Playwright tests
├── scripts/
│   ├── web-smoke.sh       # Smoke tests (M2 proxy)
│   └── lighthouse-ci.sh   # A11y checks
├── next.config.cjs        # Rewrites for M2 proxy
├── .env.example           # Environment template
└── README.md              # This file
```

## Deployment

### Vercel

1. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_API_BASE=https://api-stg.cerply.com`
   - `NEXT_PUBLIC_ENTERPRISE_MODE=false`

2. Deploy:
   ```bash
   vercel --prod
   ```

3. Verify with smoke test:
   ```bash
   WEB_BASE=https://your-app.vercel.app \
     VERCEL_BYPASS=your-token \
     npm run smoke:web
   ```

### Render / Other Platforms

1. Build command: `npm run build`
2. Start command: `npm run start`
3. Set environment variables via platform UI
4. Ensure health check endpoint: `/_next/health` or `/api/health`

## Contributing

When making changes:

1. Update components in `components/ui/`
2. Update copy tokens in `lib/copy.ts`
3. Add Playwright tests in `e2e/`
4. Run smoke tests: `npm run smoke:web`
5. Run Lighthouse: `npm run lighthouse`
6. Ensure a11y score ≥ 90
7. Update this README if architecture changes

## Support

For issues or questions:
- Check `/debug/env` for configuration
- Review FSD sections §13-§17
- Run smoke tests with verbose curl output
- Check Lighthouse report in Chrome DevTools

