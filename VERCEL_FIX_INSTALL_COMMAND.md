# 🔧 Vercel Deployment Fix: Install Command Error

## ❌ Error You're Seeing

```
Running "install" command: `npm install --prefix=..`...
Warning: Could not identify Next.js version
Error: No Next.js version detected
```

## 🎯 Root Cause

The **Install Command** is overridden to `npm install --prefix=..` which:
- Runs install in the **parent directory** (repo root)
- Repo root doesn't have `next` in dependencies
- Vercel can't detect Next.js

## ✅ Solution: Clear Install Command Override

### Step 1: Open Project Settings

1. Go to **Vercel Dashboard**: https://vercel.com/dashboard
2. Select your marketing site project
3. Click **"Settings"** tab (top navigation)

### Step 2: Fix Build & Development Settings

1. In the left sidebar, click **"Build & Development"**

2. You should see these fields. Set them EXACTLY as shown:

   ```
   Framework Preset
   ┌─────────────────────────────────┐
   │ Next.js            [Detected] ✓ │
   └─────────────────────────────────┘

   Root Directory
   ┌─────────────────────────────────┐
   │ web-marketing                   │  ← Type this!
   └─────────────────────────────────┘
   
   Build & Output Settings
   
   Install Command
   ┌─────────────────────────────────┐
   │ Override: [OFF] ⚪               │  ← Turn OFF!
   └─────────────────────────────────┘
   
   Build Command
   ┌─────────────────────────────────┐
   │ Override: [OFF] ⚪               │  ← Turn OFF!
   └─────────────────────────────────┘
   
   Output Directory
   ┌─────────────────────────────────┐
   │ Override: [OFF] ⚪               │  ← Turn OFF!
   └─────────────────────────────────┘
   
   Development Command
   ┌─────────────────────────────────┐
   │ Override: [OFF] ⚪               │  ← Turn OFF!
   └─────────────────────────────────┘
   ```

3. **Important**: If you see "Override: ON" next to any command:
   - Click the toggle to turn it **OFF**
   - Or delete the custom command text and it will revert to default

4. Click **"Save"** at the bottom

### Step 3: Redeploy with Clean Cache

1. Click **"Deployments"** tab (top navigation)
2. Find the latest (failed) deployment
3. Click the **"..."** (three dots menu)
4. Click **"Redeploy"**
5. **IMPORTANT**: In the popup:
   - ❌ **UNCHECK** "Use existing Build Cache"
   - ✅ This ensures a clean build
6. Click **"Redeploy"**

### Step 4: Watch Build Logs

The build should now succeed. You'll see:

```
✓ Running "install" command: `npm install`...  ← Notice: no --prefix!
✓ added 297 packages, and audited 298 packages
✓ Running build...
✓ Creating an optimized production build
✓ Compiled successfully
✓ Generating static pages (10/10)
✓ Build completed
```

---

## 📋 What Settings Should Look Like

### ✅ CORRECT Settings (This is what you want)

| Setting | Value | Notes |
|---------|-------|-------|
| **Framework Preset** | `Next.js` | Auto-detected |
| **Root Directory** | `web-marketing` | ⚠️ Must be set! |
| **Install Command** | Override: **OFF** | Let Vercel auto-detect |
| **Build Command** | Override: **OFF** | Let Vercel run `npm run build` |
| **Output Directory** | Override: **OFF** | Auto-detects `.next` |
| **Node.js Version** | `20.x` | Set in dropdown |

### ❌ INCORRECT Settings (What caused the error)

| Setting | Value | Problem |
|---------|-------|---------|
| **Install Command** | `npm install --prefix=..` | Runs in wrong directory! |
| **Install Command** | `npm install` (at repo root) | No Next.js in root! |
| **Root Directory** | (not set) | Can't find package.json |

---

## 🧪 Verification

After successful deployment, test with:

```bash
# Get your deployment URL from Vercel
DEPLOY_URL="https://your-deployment-url.vercel.app"

# Test 1: Site loads
curl -I "$DEPLOY_URL/"
# Expected: HTTP/2 200

# Test 2: Next.js is running
curl -sS "$DEPLOY_URL/" | grep "Learn anything"
# Expected: Line with hero text

# Test 3: Run smoke tests
cd web-marketing
SITE_URL="$DEPLOY_URL" npm run smoke:www
# Expected: 🎉 All smoke tests passed!
```

---

## 🐛 Still Failing? Additional Checks

### Check 1: Verify Root Directory

Run this locally to confirm the structure is correct:

```bash
# This should show package.json with Next.js
cat web-marketing/package.json | grep '"next"'

# Expected output:
#   "next": "^14.2.31",

# This should show the entry point
ls -la web-marketing/app/page.tsx

# Expected: File exists
```

### Check 2: Verify Git Branch

Make sure you're deploying from the correct branch:

1. Vercel Dashboard → Project → Settings → Git
2. **Production Branch**: Should be `main` or your main branch
3. If you committed to a different branch, either:
   - Merge to main, or
   - Change Production Branch setting

### Check 3: Re-import Project (Last Resort)

If nothing works, you may need to delete and re-import:

1. Vercel Dashboard → Project → Settings → General
2. Scroll to bottom → "Delete Project"
3. Confirm deletion
4. Add New Project → Import from Git
5. Select repo
6. **IMMEDIATELY** set Root Directory to `web-marketing` before first deploy
7. Leave all commands as default (Override: OFF)

---

## 📖 Why This Happens

**Monorepo Confusion**: Your repo has multiple projects:
```
cerply-cursor-starter-v2-refresh/
├── api/              ← Backend
├── web/              ← Main app
└── web-marketing/    ← Marketing site (NEW)
```

If Root Directory isn't set, Vercel looks at repo root and sees multiple `package.json` files, gets confused, and may try to install from the wrong location.

**Solution**: Always set Root Directory to `web-marketing` so Vercel knows exactly where to build from.

---

## ✅ Success Checklist

After fixing and redeploying:

- [ ] Build completes successfully (green checkmark)
- [ ] No "Next.js version detected" errors in logs
- [ ] Deployment URL shows landing page with "Learn anything"
- [ ] `/robots.txt` returns proper content
- [ ] `/sitemap.xml` returns XML
- [ ] Smoke tests pass

---

## 🆘 Need More Help?

1. **Check full deployment guide**: `VERCEL_DEPLOYMENT_STEPS.md`
2. **Check build logs**: Vercel Dashboard → Deployments → Click deployment → View Function Logs
3. **Vercel Support**: If issue persists, contact Vercel support with:
   - Project name
   - Deployment URL
   - Build logs
   - Root Directory setting screenshot

---

## 🎉 Once Fixed

After successful deployment:
1. Update DNS to point to Vercel (if using custom domain)
2. Test all routes
3. Run full smoke test suite
4. Monitor first few visitors

**Good luck!** 🚀

