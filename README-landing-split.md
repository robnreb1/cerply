# Cerply Landing Split – Marketing Site & App Gating

This document provides an overview of the landing page split architecture, where the marketing site and product app are separated with proper gating.

## Overview

- **Marketing Site**: `web-marketing/` → `www.cerply.com`
  - Static landing page with waitlist, SEO, analytics
  - Lightweight, fast, accessible (Lighthouse scores ≥ 95)
  
- **Product App**: `web/` → `app.cerply.com`
  - Gated behind authentication/beta invite codes
  - Redirects anonymous users to marketing site
  - Existing functionality unchanged

## Quick Start

### 1. Install Dependencies

```bash
# Marketing site
cd web-marketing
npm install

# App (if not already installed)
cd ../web
npm install
```

### 2. Configure Environment Variables

#### Marketing Site (`web-marketing/.env.local`)

```bash
NEXT_PUBLIC_SITE_URL=https://www.cerply.com

# Optional: Analytics
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=cerply.com

# Optional: Supabase for waitlist (graceful fallback to mailto if not set)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
```

#### App (`web/.env.local`)

Add these to your existing env vars:

```bash
MARKETING_BASE_URL=https://www.cerply.com
APP_ALLOWLIST_ROUTES=/$,/api/health,/auth,/debug/env
BETA_INVITE_CODES=demo123,friend456
```

### 3. Run Development Servers

```bash
# Terminal 1: Marketing site (port 3002)
cd web-marketing
npm run dev

# Terminal 2: App (port 3000)
cd web
npm run dev

# Terminal 3: API (port 8080) - if needed
cd api
npm run dev
```

Visit:
- Marketing: http://localhost:3002
- App: http://localhost:3000 (will redirect to marketing if not authenticated)

### 4. Test Beta Access

To access the gated app without full auth:

```bash
# Option 1: Use header
curl -H "x-beta-key: demo123" http://localhost:3000/learn

# Option 2: Use cookie
curl -b "beta=demo123" http://localhost:3000/learn
```

Or in browser dev tools:
```js
document.cookie = 'beta=demo123; path=/';
```

Then refresh the page.

---

## Architecture

### Marketing Site Features

- ✅ **Hero** with exact positioning copy
- ✅ **Value props**: Certified, Adaptive, Enterprise-ready
- ✅ **How it works**: 3-step process
- ✅ **Founder note** with mailto link
- ✅ **Waitlist form** with Supabase adapter (graceful fallback to mailto)
- ✅ **SEO**: Meta tags, OG, Twitter cards, schema.org, robots.txt, sitemap.xml
- ✅ **Analytics**: Plausible integration (opt-in)
- ✅ **Privacy & Terms** pages
- ✅ **Accessibility**: Keyboard navigation, ARIA labels, semantic HTML

### App Gating

The app uses Next.js middleware (`web/middleware.ts`) to:

1. **Allowlist** certain routes (health, auth, debug)
2. **Check session cookie** (`cerply.sid`) for authenticated users
3. **Accept beta codes** via `x-beta-key` header or `beta` cookie
4. **Redirect** anonymous users to marketing site

Allowlisted routes (configurable via `APP_ALLOWLIST_ROUTES`):
- `/` (exact match with `$` suffix)
- `/api/health`
- `/auth`
- `/debug/env`

---

## Testing

### Smoke Tests

#### Marketing Site

```bash
cd web-marketing
SITE_URL=http://localhost:3002 npm run smoke:www
```

Tests:
- ✅ Hero copy present
- ✅ Robots.txt allows crawling
- ✅ Sitemap.xml exists
- ✅ Waitlist API responds (200 or 501 with fallback)
- ✅ Privacy and Terms pages exist

#### App Gating

```bash
cd web
APP_URL=http://localhost:3000 MARKETING_BASE_URL=http://localhost:3002 npm run smoke:gate
```

Tests:
- ✅ Anonymous redirects to marketing (production only)
- ✅ Beta key allows access
- ✅ Health endpoint allowlisted
- ✅ Robots.txt disallows crawling

### Lighthouse

```bash
cd web-marketing
SITE_URL=http://localhost:3002 npm run lighthouse
```

Validates:
- ✅ Performance ≥ 95
- ✅ Accessibility ≥ 95
- ✅ SEO ≥ 95

**Note**: Lighthouse requires the dev server to be running and Chrome installed.

---

## Deployment

See [docs/DEPLOY_LANDING_AND_GATING.md](./docs/DEPLOY_LANDING_AND_GATING.md) for detailed Vercel deployment instructions, including:

- DNS configuration
- Environment variables
- Supabase setup (optional)
- Domain mapping

---

## Project Structure

```
web-marketing/                 # Marketing site (Next.js App Router)
├── app/
│   ├── layout.tsx            # Root layout with SEO, analytics
│   ├── page.tsx              # Landing page
│   ├── robots.ts             # Robots.txt (allow crawling)
│   ├── sitemap.ts            # Sitemap.xml
│   ├── opengraph-image.tsx   # OG image generation
│   ├── api/
│   │   └── waitlist/
│   │       └── route.ts      # Waitlist API (Supabase adapter)
│   ├── privacy/
│   │   └── page.tsx          # Privacy policy
│   ├── terms/
│   │   └── page.tsx          # Terms of service
│   └── waitlist-ok/
│       └── page.tsx          # Waitlist success page
├── components/
│   ├── Hero.tsx              # Hero section
│   ├── WaitlistModal.tsx     # Waitlist form modal
│   ├── ValueProps.tsx        # Value propositions
│   ├── HowItWorks.tsx        # How it works section
│   ├── FounderNote.tsx       # Founder note
│   └── Footer.tsx            # Footer
├── scripts/
│   ├── smoke-www.sh          # Smoke tests
│   └── lighthouse-www.mjs    # Lighthouse validation
├── package.json
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json

web/                          # App (existing)
├── middleware.ts             # NEW: Gating logic
├── public/
│   └── robots.txt            # NEW: Disallow all (while gated)
└── ... (existing app files)

docs/
└── DEPLOY_LANDING_AND_GATING.md  # Deployment guide
```

---

## Waitlist

### With Supabase

If you configure `SUPABASE_URL` and `SUPABASE_ANON_KEY`, signups are stored in a Supabase table:

```sql
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  source text,
  ua text,
  ts timestamptz default now()
);
```

### Without Supabase (Fallback)

If Supabase is not configured, the API returns a 501, and the frontend gracefully falls back to a `mailto:hello@cerply.com` link.

---

## FAQ

### Q: Can I use a different waitlist provider?

Yes! The waitlist API (`web-marketing/app/api/waitlist/route.ts`) is designed with adapters in mind. Replace the Supabase logic with your provider (e.g., Mailchimp, ConvertKit, Airtable).

### Q: How do I add more beta codes?

Update the `BETA_INVITE_CODES` env var in the app project:

```bash
BETA_INVITE_CODES=demo123,friend456,newcode789
```

Redeploy or restart the dev server.

### Q: Can I customize the landing page copy?

Yes! Edit the components in `web-marketing/components/`. The copy is intentionally simple and non-templated.

### Q: How do I remove gating when the app goes public?

1. Remove or update `web/middleware.ts` to allow all routes
2. Update `web/public/robots.txt` to allow crawling
3. Redeploy

---

## Scripts Reference

### Marketing Site (`web-marketing`)

| Script | Command | Description |
|--------|---------|-------------|
| dev | `npm run dev` | Start dev server on port 3002 |
| build | `npm run build` | Build for production |
| start | `npm start` | Start production server |
| lint | `npm run lint` | Lint code |
| typecheck | `npm run typecheck` | Type check |
| smoke:www | `npm run smoke:www` | Run smoke tests |
| lighthouse | `npm run lighthouse` | Run Lighthouse validation |

### App (`web`)

| Script | Command | Description |
|--------|---------|-------------|
| dev | `npm run dev` | Start dev server on port 3000 |
| smoke:gate | `npm run smoke:gate` | Run gating smoke tests (add to package.json) |

**Note**: You may need to add `smoke:gate` to `web/package.json`:

```json
{
  "scripts": {
    "smoke:gate": "bash ./scripts/smoke-app-gating.sh"
  }
}
```

---

## Support

For questions, issues, or feature requests:
- Check [docs/DEPLOY_LANDING_AND_GATING.md](./docs/DEPLOY_LANDING_AND_GATING.md)
- Open an issue in the repo
- Contact the dev team

---

## License

© 2025 Cerply. All rights reserved.

