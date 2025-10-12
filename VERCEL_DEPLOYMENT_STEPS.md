# Vercel Deployment Steps for Cerply Marketing Site

## ✅ Pre-Deployment Checklist Complete

- ✅ `web-marketing/package.json` has Next.js, React, React-DOM in dependencies
- ✅ `web-marketing/package-lock.json` exists
- ✅ `web-marketing/next.config.mjs` exists
- ✅ `web-marketing/app/page.tsx` exists (entry point)
- ✅ `web-marketing/app/layout.tsx` exists
- ✅ `web-marketing/app/robots.ts` exists (generates /robots.txt)
- ✅ `web-marketing/app/sitemap.ts` exists (generates /sitemap.xml)
- ✅ Local build passes: `npm run build --prefix web-marketing` ✓
- ✅ Smoke test script exists: `web-marketing/scripts/smoke-www.sh`
- ✅ Latest changes committed

---

## 📋 Step-by-Step Vercel UI Instructions

### Part 1: Create or Update Project

#### If Creating New Project:

1. **Go to Vercel Dashboard**
   - URL: https://vercel.com/dashboard
   - Log in if needed

2. **Click "Add New..."** → **"Project"**

3. **Import Git Repository**
   - Select your `cerply-cursor-starter-v2-refresh` repository
   - Click **"Import"**

4. **Configure Project**
   - **Project Name**: `cerply-marketing` (or `www-cerply` or whatever you prefer)
   - **Framework Preset**: `Next.js` (should auto-detect)
   - ⚠️ **CRITICAL**: **Root Directory** → Click **"Edit"** → Enter: `web-marketing`
   - **Build & Development Settings**:
     - ✅ **Install Command**: Leave as default (or blank) - Vercel will run `npm install` in `web-marketing/`
     - ✅ **Build Command**: Leave as default - Vercel will run `npm run build`
     - ✅ **Output Directory**: Leave as default (`.next`)
     - ✅ **Development Command**: Leave as default
   - **Node.js Version**: `20.x`

5. **Environment Variables** (click to expand)
   - Click **"Add"** for each:

   | Name | Value | Note |
   |------|-------|------|
   | `NEXT_PUBLIC_SITE_URL` | `https://www.cerply.com` | Or use Vercel preview URL initially |
   | `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | `cerply.com` | Optional - for analytics |
   | `SUPABASE_URL` | `https://xxx.supabase.co` | Optional - leave blank for mailto fallback |
   | `SUPABASE_ANON_KEY` | `eyJ...` | Optional - leave blank for mailto fallback |

6. **Click "Deploy"**
   - Wait for deployment (usually 1-2 minutes)
   - ✅ Should succeed and show "Your project has been successfully deployed!"

---

#### If Updating Existing Project:

1. **Go to Project Settings**
   - Vercel Dashboard → Select `cerply-marketing` project
   - Click **"Settings"** tab

2. **Verify Build & Development Settings**
   - Click **"Build & Development"** in sidebar
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `web-marketing` ⚠️ CRITICAL
   - **Install Command**: (leave blank or default)
   - **Build Command**: (leave blank or default)
   - **Output Directory**: `.next`
   - **Node.js Version**: `20.x`
   - Click **"Save"** if you made changes

3. **Verify Environment Variables**
   - Click **"Environment Variables"** in sidebar
   - Ensure variables listed above are present
   - Add any missing ones

4. **Trigger Redeploy**
   - Click **"Deployments"** tab
   - Find latest deployment
   - Click **"⋯"** (three dots) → **"Redeploy"**
   - Check **"Use existing Build Cache"** → NO (for clean build)
   - Click **"Redeploy"**

---

### Part 2: Configure Custom Domain

1. **Go to Domains Settings**
   - Project → **"Settings"** → **"Domains"**

2. **Add Primary Domain**
   - Click **"Add"**
   - Enter: `www.cerply.com`
   - Click **"Add"**
   - Vercel will show DNS instructions

3. **Add Apex Domain (Optional but Recommended)**
   - Click **"Add"** again
   - Enter: `cerply.com`
   - Vercel will suggest redirecting to `www.cerply.com`
   - ✅ Check **"Redirect to www.cerply.com"**
   - Click **"Add"**

4. **Configure DNS** (in your DNS provider)

   If using **Vercel DNS**:
   - Follow instructions in Vercel to add nameservers to your domain registrar

   If using **Cloudflare** or other DNS:
   - For `www.cerply.com`: Add **CNAME** record → `cname.vercel-dns.com`
   - For `cerply.com`: Add **A** record → Vercel's IP (shown in Vercel UI)
     - Or use **CNAME** flattening if supported

5. **Wait for DNS Propagation**
   - Usually 5-60 minutes
   - Vercel will auto-issue SSL certificate when DNS is detected
   - Status will change from "Invalid Configuration" to "Valid" with 🔒 icon

---

### Part 3: Verification

#### After Deployment Succeeds:

**Get Deployment URL:**
- In Vercel Dashboard → Deployments → Copy the URL
- Format: `https://cerply-marketing-xxx.vercel.app` or `https://www.cerply.com` (after DNS)

**Run These Commands Locally:**

```bash
# Set your deployment URL
DEPLOY_URL="https://your-deployment-url.vercel.app"

# Test 1: Landing page loads
curl -sS "$DEPLOY_URL/" | head -20
# Should see HTML with "Learn anything. Remember everything."

# Test 2: Hero copy is present
curl -sS "$DEPLOY_URL/" | grep "Learn anything"
# Should output: matching line with hero text

# Test 3: Robots.txt (allows crawling)
curl -sS "$DEPLOY_URL/robots.txt"
# Should see:
# User-agent: *
# Allow: /
# Sitemap: https://www.cerply.com/sitemap.xml

# Test 4: Sitemap.xml
curl -sS "$DEPLOY_URL/sitemap.xml"
# Should see XML with <urlset> and site URLs

# Test 5: Privacy page
curl -sS "$DEPLOY_URL/privacy" | grep "Privacy Policy"
# Should output: matching line

# Test 6: Terms page
curl -sS "$DEPLOY_URL/terms" | grep "Terms of Service"
# Should output: matching line

# Test 7: Waitlist API (should return 501 if Supabase not configured)
curl -sS -X POST "$DEPLOY_URL/api/waitlist" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}' | jq .
# Expected: {"ok":false,"error":{"code":"WAITLIST_PROVIDER_NOT_CONFIGURED",...}}
# OR: {"ok":true} if Supabase is configured

# Test 8: Run full smoke test
cd web-marketing
SITE_URL="$DEPLOY_URL" npm run smoke:www
# Should output: 🎉 All smoke tests passed!
```

---

## 🎯 Success Criteria

✅ **Deployment Status**: "Ready" (green checkmark in Vercel)
✅ **Landing Page**: Loads with correct hero copy
✅ **Robots.txt**: Allows crawling
✅ **Sitemap.xml**: Contains site URLs
✅ **Waitlist API**: Returns expected response (501 or 200)
✅ **Privacy & Terms**: Pages load correctly
✅ **Smoke Tests**: All pass

---

## 🐛 Troubleshooting

### Build Fails with "Cannot find module 'next'"

**Cause**: Root directory not set correctly

**Fix**:
1. Settings → Build & Development
2. Root Directory: `web-marketing` ⚠️
3. Save and redeploy

---

### Build Fails with "No package.json found"

**Cause**: Install running at wrong location

**Fix**:
1. Verify `web-marketing/package.json` exists in repo
2. Verify Root Directory is set to `web-marketing`
3. Install Command should be blank (default)

---

### Robots.txt Returns 404

**Cause**: App routing issue

**Fix**:
1. Verify `web-marketing/app/robots.ts` exists
2. Verify it exports a default function returning `MetadataRoute.Robots`
3. Redeploy with clean cache

---

### Waitlist Returns 500 Error

**Cause**: Missing or invalid Supabase credentials

**Fix**:
- This is expected if Supabase is not configured
- The frontend should gracefully fall back to `mailto:hello@cerply.com`
- To fix: Add valid `SUPABASE_URL` and `SUPABASE_ANON_KEY` env vars

---

### Domain Shows "DNS Configuration Error"

**Cause**: DNS not pointing to Vercel yet

**Fix**:
1. Check DNS propagation: `dig www.cerply.com` or `nslookup www.cerply.com`
2. Ensure CNAME points to `cname.vercel-dns.com`
3. Wait 5-60 minutes for propagation
4. Click "Refresh" in Vercel Domains settings

---

## 📝 Post-Deployment Checklist

After successful deployment:

- [ ] Test all routes manually in browser
- [ ] Verify waitlist form opens and handles submission
- [ ] Check mailto fallback works (if Supabase not configured)
- [ ] Test on mobile device
- [ ] Run Lighthouse: `npm run lighthouse --prefix web-marketing`
- [ ] Verify Plausible analytics (if configured)
- [ ] Update DNS to point to Vercel (if using custom domain)
- [ ] Test custom domain after DNS propagation
- [ ] Set up monitoring/alerts in Vercel (optional)

---

## 🔗 Useful Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Vercel Docs - Root Directory**: https://vercel.com/docs/projects/project-configuration#root-directory
- **Vercel Docs - Environment Variables**: https://vercel.com/docs/projects/environment-variables
- **Vercel Docs - Custom Domains**: https://vercel.com/docs/custom-domains

---

## 📊 Expected Build Output

```
Route (app)                              Size     First Load JS
┌ ○ /                                    1.65 kB        97.5 kB
├ ○ /_not-found                          875 B          88.1 kB
├ ƒ /api/waitlist                        0 B                0 B
├ ƒ /opengraph-image                     0 B                0 B
├ ○ /privacy                             181 B          96.1 kB
├ ○ /robots.txt                          0 B                0 B
├ ○ /sitemap.xml                         0 B                0 B
├ ○ /terms                               181 B          96.1 kB
└ ○ /waitlist-ok                         181 B          96.1 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

---

## ✅ Ready to Deploy!

All prerequisites are met. Follow Part 1 above to deploy to Vercel.

**Questions or Issues?**
- Check the Troubleshooting section above
- Review [docs/DEPLOY_LANDING_AND_GATING.md](./docs/DEPLOY_LANDING_AND_GATING.md)
- Check Vercel build logs in Dashboard → Deployments → Click deployment → View logs

