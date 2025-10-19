# 🚀 Vercel Staging Deployment Setup

## 🚨 **Current Issue**

Web staging URL returns: **404: DEPLOYMENT_NOT_FOUND**
```
https://cerply-web-staging.vercel.app
```

**Root Cause:** Vercel project isn't configured to deploy the `staging` branch.

---

## ✅ **Solution: Configure Vercel to Deploy Staging Branch**

### **Option A: Vercel Dashboard Setup** ⭐ *Recommended*

1. **Go to Vercel Dashboard:**
   ```
   https://vercel.com/dashboard
   ```

2. **Find the Web Project:**
   - Look for: `cerply-web` or `cerply-web-staging`
   - Owner: `robs-projects-230c6bef` (from your Render logs)

3. **Configure Git Branch:**
   - Go to: **Settings** → **Git**
   - Under **Production Branch**: Should be `main`
   - Under **Preview Branches**: Enable `staging`
   
4. **Create Staging Deployment:**
   - Go to: **Deployments**
   - Click: **Redeploy** or **Deploy Branch**
   - Select: `staging` branch
   - Click: **Deploy**

5. **Set Staging Alias:**
   - After deployment, go to **Domains**
   - Add custom domain/alias: `cerply-web-staging.vercel.app`
   - Point to the `staging` branch deployment

---

### **Option B: Manual Vercel CLI Deployment**

If you have Vercel CLI installed:

```bash
cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/web

# Login to Vercel
npx vercel login

# Deploy staging branch
git checkout staging
npx vercel --prod=false --target=staging

# Or deploy with alias
npx vercel --target=staging --alias=cerply-web-staging
```

---

### **Option C: Push to Trigger Auto-Deploy**

If Git integration is set up correctly:

```bash
# Just push to staging (should auto-deploy)
git push origin main:staging --force
```

Then wait 1-2 minutes for Vercel to detect and deploy.

---

## 🔍 **Verify Deployment**

Once deployed, check:

```bash
curl https://cerply-web-staging.vercel.app
# Should return HTML, not 404
```

**Expected:** Next.js landing page or login screen

---

## ⚙️ **Environment Variables for Staging**

Ensure these are set in Vercel dashboard for the `staging` environment:

```bash
# API Connection
NEXT_PUBLIC_API_URL=https://api-stg.cerply.com

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Feature Flags (Epic 13, 14)
NEXT_PUBLIC_FF_AGENT_ORCHESTRATOR_V1=true
NEXT_PUBLIC_FF_MANAGER_WORKFLOWS_V1=true

# Environment
NEXT_PUBLIC_ENV=staging
```

---

## 📋 **Current Vercel Configuration**

From `web/vercel.json`:
- ✅ Framework: Next.js
- ✅ Build Command: `npm run build`
- ✅ Node Version: 20
- ✅ Function Timeout: 30s

---

## 🎯 **Alternative: Use Main Branch Deployment**

If staging setup is complex, you can test Epic 14 on the **main branch preview**:

```
https://cerply-web.vercel.app
```

Or check recent deployments:
```
https://vercel.com/robs-projects-230c6bef/cerply-web
```

---

## 🆘 **Troubleshooting**

### **Issue 1: Project Not Found**
- **Check:** Is the GitHub repo connected to Vercel?
- **Fix:** Reconnect repo in Vercel dashboard

### **Issue 2: Build Failures**
- **Check:** Vercel build logs
- **Fix:** Ensure `web/package.json` has all dependencies

### **Issue 3: 404 on All Routes**
- **Check:** `vercel.json` configuration
- **Fix:** Ensure `framework: "nextjs"` is set

---

## ✅ **Quick Fix**

**Easiest approach:**

1. Go to https://vercel.com/dashboard
2. Find your `cerply-web` project
3. Click **"Deploy"**
4. Select `staging` branch
5. Wait 1-2 minutes
6. Visit deployment URL

**That should create a working staging deployment!** 🚀

