# Epic 7 Production Deployment - Fix Required

## 🔍 **What Happened:**

The production deployment workflow failed because of a **header name mismatch** between the API code and the deployment workflow.

### **The Issue:**

The `promote-prod.yml` workflow checks the `/api/version` endpoint and expects these HTTP headers:
- `x-image-tag`
- `x-image-revision`
- `x-image-created`

But the API code was sending:
- `x-image-tag` ✅
- `x-revision` ❌ (should be `x-image-revision`)
- `x-build` ❌ (should be `x-image-created`)

This caused the workflow to fail with: **"header x-image-revision missing or empty"**

---

## ✅ **What I Fixed:**

I've updated `api/src/routes/version.ts` to use the correct header names:

```typescript
// Before:
reply.header('x-revision', commit);
reply.header('x-build', builtAt);

// After:
reply.header('x-image-revision', commit);
reply.header('x-image-created', builtAt);
```

---

## 🚀 **Next Steps to Deploy Epic 7 to Production:**

### **Step 1: Merge the Fix** (5 minutes)

1. **Go to:** https://github.com/robnreb1/cerply/pull/new/fix/version-headers-for-prod-deploy

2. **Create Pull Request:**
   - Title: `fix: correct version endpoint header names for production deployment`
   - Description: 
     ```
     Fixes header names in /api/version endpoint to match promote-prod.yml workflow expectations.
     
     Changes:
     - x-revision → x-image-revision
     - x-build → x-image-created
     
     This unblocks Epic 7 production deployment.
     ```

3. **Merge the PR** once CI passes

---

### **Step 2: Rebuild Staging Image** (3 minutes)

After merging, we need to rebuild the `staging-latest` Docker image with the fix:

1. **Go to:** https://github.com/robnreb1/cerply/actions/workflows/build-docker-staging.yml

2. **Click "Run workflow"**

3. **Select branch:** `staging`

4. **Click "Run workflow"**

5. **Wait ~5 minutes** for the build to complete

**Note:** You may need to merge `main` into `staging` first:
```bash
git checkout staging
git merge main
git push origin staging
```

---

### **Step 3: Promote to Production** (5 minutes)

Once the staging image is rebuilt:

1. **Go to:** https://github.com/robnreb1/cerply/actions/workflows/promote-prod.yml

2. **Click "Run workflow"**

3. **Leave "source_tag" blank** (defaults to `staging-latest`)

4. **Click "Run workflow"**

5. **Wait ~5 minutes** for deployment

---

### **Step 4: Verify Epic 7 in Production** (2 minutes)

After deployment completes:

```bash
PROD_URL="https://api.cerply.com"

# 1. Check version headers
curl -sI $PROD_URL/api/version | grep -E "x-image"

# 2. Check feature flags
curl -s $PROD_URL/api/flags | jq

# 3. Check Epic 7 routes
curl -s $PROD_URL/api/learners/00000000-0000-0000-0000-000000000001/levels | jq

# 4. Check KPIs
curl -s $PROD_URL/api/ops/kpis | jq | grep -E "(badges|certificates|levels)"
```

**✅ Success looks like:**
- Version endpoint returns `x-image-revision`, `x-image-created`, `x-image-tag` headers
- Flags endpoint shows Epic 7 feature flags
- Epic 7 routes return `UNAUTHORIZED` (not `404`)
- KPIs include Epic 7 counters

---

## 📊 **Current Status:**

| Component | Status | Notes |
|-----------|--------|-------|
| **Production Database** | ✅ Ready | All 7 Epic 7 tables created |
| **Environment Variables** | ✅ Set | All feature flags configured |
| **API Code Fix** | ✅ Done | Header names corrected |
| **PR for Fix** | ⏳ Pending | Needs to be created & merged |
| **Staging Image Rebuild** | ⏳ Pending | Needs to run after merge |
| **Production Deployment** | ⏳ Pending | Needs staging image |

---

## 🔄 **Alternative: Quick Fix for Testing**

If you want to test Epic 7 without waiting for the full workflow:

1. **Temporarily disable the header check** in `promote-prod.yml` (comment out lines 108-120)
2. **Rerun the workflow**
3. **After verification, re-enable the check and redeploy with the fix**

**⚠️ Not recommended for production** - better to do it properly with the header fix.

---

## 📝 **Summary:**

- **Root Cause:** Header name mismatch between API code and deployment workflow
- **Fix Applied:** Updated header names in `api/src/routes/version.ts`
- **Next:** Create PR → Merge → Rebuild staging → Promote to prod
- **ETA:** ~20 minutes after PR is merged

---

**Once you create and merge the PR, let me know and I'll guide you through the rebuild and deployment steps!** 🚀

