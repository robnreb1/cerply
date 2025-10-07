# Deployment Guide: Landing Site & App Gating

This guide covers deploying the marketing landing site (`web-marketing`) and gating the app (`web`) behind authentication/invite on Vercel.

## Overview

- **Marketing site**: `web-marketing/` → `www.cerply.com`
- **App**: `web/` → `app.cerply.com`

Both projects are in the same monorepo and deployed as separate Vercel projects.

---

## 1. Vercel Projects Setup

### Create Two Projects

1. **Marketing Project**
   - **Framework**: Next.js
   - **Root Directory**: `web-marketing`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

2. **App Project**
   - **Framework**: Next.js
   - **Root Directory**: `web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

---

## 2. Domain Configuration

### In Vercel Dashboard

#### Marketing Project (`www.cerply.com`)
1. Go to **Settings** → **Domains**
2. Add domain: `www.cerply.com`
3. Add domain: `cerply.com` (redirect to `www.cerply.com`)

#### App Project (`app.cerply.com`)
1. Go to **Settings** → **Domains**
2. Add domain: `app.cerply.com`
3. Keep existing staging domains (e.g., `cerply-web-staging.vercel.app`)

### DNS Configuration

In your DNS provider (e.g., Vercel DNS, Cloudflare):

1. **A Record** for `cerply.com` → Vercel IP (or CNAME to Vercel)
2. **CNAME** for `www.cerply.com` → `cname.vercel-dns.com`
3. **CNAME** for `app.cerply.com` → `cname.vercel-dns.com`

---

## 3. Environment Variables

### Marketing Project (`web-marketing`)

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_SITE_URL` | Yes | `https://www.cerply.com` | Canonical site URL |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | No | `cerply.com` | Plausible analytics domain |
| `SUPABASE_URL` | No | `https://xxx.supabase.co` | Supabase project URL |
| `SUPABASE_ANON_KEY` | No | `eyJ...` | Supabase anon/public key |

**Note**: If `SUPABASE_URL` and `SUPABASE_ANON_KEY` are not set, the waitlist API will return a 501 and gracefully fall back to a mailto link.

### App Project (`web`)

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `MARKETING_BASE_URL` | Yes | `https://www.cerply.com` | Marketing site URL for redirects |
| `APP_ALLOWLIST_ROUTES` | Yes | `/$,/api/health,/auth,/debug/env` | Comma-separated routes allowed without auth |
| `BETA_INVITE_CODES` | Yes | `demo123,friend456` | Comma-separated beta invite codes |
| `NEXT_PUBLIC_API_BASE` | Yes | `https://api.cerply.com` | API base URL (existing) |
| *(other existing env vars)* | - | - | Keep all existing env vars |

**Important**: The app middleware will redirect unauthenticated users to `MARKETING_BASE_URL` unless they:
- Have a valid session cookie (`cerply.sid`)
- Provide a beta invite code via `x-beta-key` header or `beta` cookie
- Are accessing an allowlisted route

---

## 4. Supabase Waitlist Table (Optional)

If you want to store waitlist signups in Supabase, create the following table:

```sql
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  source text,
  ua text,
  ts timestamptz default now()
);

-- Enable RLS (Row Level Security)
alter table public.waitlist enable row level security;

-- Policy: Allow inserts from anyone (using anon key)
create policy "Allow public inserts"
  on public.waitlist
  for insert
  with check (true);

-- Optionally, restrict reads to service role only
create policy "Restrict reads to service role"
  on public.waitlist
  for select
  using (false);
```

Then, in the Vercel Marketing project env vars:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anon key (found in Project Settings → API)

---

## 5. Deployment Steps

### First-Time Deployment

1. **Push to GitHub** (assuming monorepo)
   ```bash
   git add .
   git commit -m "feat: add marketing landing site and app gating [spec]"
   git push origin main
   ```

2. **Create Marketing Project on Vercel**
   - Import from GitHub
   - Set root directory: `web-marketing`
   - Add environment variables (see section 3)
   - Deploy

3. **Update App Project on Vercel**
   - Go to existing app project settings
   - Add new environment variables:
     - `MARKETING_BASE_URL`
     - `APP_ALLOWLIST_ROUTES`
     - `BETA_INVITE_CODES`
   - Redeploy

4. **Configure Domains** (see section 2)

### Subsequent Deployments

Both projects auto-deploy on git push. You can configure branch-specific deployments:
- **Marketing**: `main` branch → production
- **App**: `main` branch → production, `staging` branch → staging

---

## 6. Testing Deployment

### Marketing Site

```bash
# Check landing page
curl -sI https://www.cerply.com/ | grep "200 OK"

# Check robots.txt
curl -s https://www.cerply.com/robots.txt | grep "Allow"

# Check sitemap
curl -s https://www.cerply.com/sitemap.xml | grep "<urlset"

# Test waitlist API (with Supabase configured)
curl -X POST https://www.cerply.com/api/waitlist \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}' | jq .

# Test waitlist API (without Supabase - should return 501)
# (If SUPABASE_URL not set)
```

### App Gating

```bash
# Anonymous user should redirect to marketing
curl -sI https://app.cerply.com/ | grep "Location: https://www.cerply.com"

# With beta key, should allow access
curl -sI -H "x-beta-key: demo123" https://app.cerply.com/learn | grep "200"

# Health endpoint should be allowlisted
curl -s https://app.cerply.com/api/health | jq .
```

---

## 7. Rollback

If something goes wrong:

1. **Vercel Dashboard** → Select project → **Deployments**
2. Find previous working deployment
3. Click **⋯** → **Promote to Production**

---

## 8. Monitoring

- **Analytics**: Plausible at `https://plausible.io/cerply.com` (if configured)
- **Vercel Logs**: Check function logs for API errors
- **Supabase Dashboard**: Monitor waitlist table inserts (if configured)

---

## 9. Common Issues

### Issue: Waitlist returns 501

**Cause**: Supabase env vars not set

**Solution**: Either set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in marketing project, or use the mailto fallback (working as designed).

### Issue: App redirects even with session cookie

**Cause**: Middleware not reading session cookie correctly

**Solution**: Ensure your auth system sets the `cerply.sid` cookie with correct domain (`.cerply.com` or `app.cerply.com`).

### Issue: Marketing site has slow performance

**Cause**: Large images or JS bundles

**Solution**: Run Lighthouse locally (`npm run lighthouse` in `web-marketing`) and optimize assets.

---

## 10. Security Considerations

1. **Beta Invite Codes**: Keep `BETA_INVITE_CODES` secret. Rotate them regularly.
2. **Supabase Keys**: Use the **anon key**, not the service role key, in client-facing env vars.
3. **HTTPS**: Ensure all domains use HTTPS (Vercel handles this automatically).
4. **Robots.txt**: The app's `robots.txt` disallows all crawling while gated. Update it when the app goes public.

---

## 11. Future Improvements

- **Waitlist Admin Panel**: Build a simple admin page to view waitlist signups.
- **Beta Code Generation**: Automate beta code creation for new invites.
- **Multi-Factor Auth**: Add MFA for app access beyond beta codes.

---

## Support

For questions or issues, contact the dev team or open an issue in the repo.

