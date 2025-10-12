# Epic 7 Deployment Status - Complete Overview

**Date:** 2025-10-12  
**PR #607:** ✅ **MERGED**

---

## ✅ **STAGING: COMPLETE AND VERIFIED**

### **Status: DONE ✅**

**Environment:** `cerply-api-staging-latest.onrender.com`  
**Docker Image:** `ghcr.io/robnreb1/cerply-api:staging-latest`  
**Branch:** `staging`

**Verification Results:**
- ✅ API Health: Passing
- ✅ Epic 7 Routes: All registered
- ✅ Authentication: Working
- ✅ UUID Validation: Working
- ✅ No Runtime Errors: Stable
- ✅ drizzle-orm Fix: Applied

**Evidence:** See `EPIC7_STAGING_VERIFIED.md`

**Conclusion:** Epic 7 is **fully operational** on staging.

---

## 🔄 **PRODUCTION: READY TO DEPLOY**

### **Status: PENDING (Manual Trigger Required)**

**Environment:** `api.cerply.com`  
**Docker Image:** `ghcr.io/robnreb1/cerply-api:prod`  
**Branch:** Promoted from `staging-latest`

### **What's Needed:**

Production uses a **manual promotion workflow** that:
1. Takes the verified `:staging-latest` image
2. Re-tags it as `:prod`
3. Triggers Render production deployment
4. Verifies health at `https://api.cerply.com`

**Workflow:** `.github/workflows/promote-prod.yml`

---

## 🚀 **How to Deploy to Production**

### **Option 1: Deploy Now (Recommended)**

Since Epic 7 is verified on staging, you can deploy to production immediately:

#### **Step 1: Trigger Production Promotion**

Go to GitHub Actions:
1. Visit: https://github.com/robnreb1/cerply/actions/workflows/promote-prod.yml
2. Click **"Run workflow"**
3. Leave source_tag empty (defaults to `staging-latest`)
4. Click **"Run workflow"** button

#### **Step 2: What Happens Automatically**

The workflow will:
1. Pull `staging-latest` image (with Epic 7) ✅
2. Verify it's linux/amd64 ✅
3. Re-tag as `:prod` ✅
4. Trigger Render production deploy 🔄
5. Wait for health check ⏳
6. Verify image headers ✅

**Time:** ~5-10 minutes

#### **Step 3: Verify Production**

After deployment completes:
```bash
PROD_URL="https://api.cerply.com"

# Health check
curl -s $PROD_URL/api/health | jq

# Epic 7 route (will require auth)
curl -s $PROD_URL/api/learners/00000000-0000-0000-0000-000000000001/levels | jq
```

**Expected:** Same responses as staging (UNAUTHORIZED for protected routes)

---

### **Option 2: Deploy Later**

If you prefer to wait:

**Reasons to Deploy Later:**
- Want more time to test on staging
- Waiting for a specific release window
- Need to configure production environment variables first

**When Ready:**
- Follow the same steps above
- The `:staging-latest` image will always have the latest staging code

---

## 📋 **Production Checklist**

Before deploying to production, verify:

### **1. Environment Variables**

In Render Dashboard → Production Service → Environment:

```bash
# Epic 7 Feature Flags (Required)
FF_GAMIFICATION_V1=true
FF_CERTIFICATES_V1=true
FF_MANAGER_NOTIFICATIONS_V1=true

# Environment
NODE_ENV=production

# Database
DATABASE_URL=<production-postgres-url>

# Security (Optional but recommended)
ADMIN_TOKEN=<should-not-be-set-in-production>
```

### **2. Database Migrations**

Ensure production database has Epic 7 tables:

```bash
# Run from local machine
cd api
DATABASE_URL="<production-db-url>" npm run migrate
```

**Required Migrations:**
- `010_gamification.sql` - Core tables
- `011_idempotency.sql` - Idempotency keys
- `012_cert_revocation.sql` - Certificate revocation
- `013_audit_events.sql` - Audit events

### **3. Verify Render Production Service**

Ensure production service is configured:
- **Service Name:** cerply-api-production (or similar)
- **Image:** `ghcr.io/robnreb1/cerply-api:prod`
- **Region:** (Your production region)
- **Health Check:** `/api/health`

---

## 🎯 **Deployment Strategy Comparison**

| Aspect | Staging | Production |
|--------|---------|------------|
| **Image Source** | Built from `staging` branch | Promoted from `staging-latest` |
| **Trigger** | Automatic on push to `staging` | Manual workflow dispatch |
| **URL** | cerply-api-staging-latest.onrender.com | api.cerply.com |
| **Epic 7 Status** | ✅ DEPLOYED & VERIFIED | ⏳ READY TO DEPLOY |
| **Database** | Staging DB (Frankfurt) | Production DB (TBD) |
| **Environment** | `NODE_ENV=staging` | `NODE_ENV=production` |

---

## ⚠️ **Important Notes**

### **Admin Token Bypass**

In production (`NODE_ENV=production`), the admin token bypass is **DISABLED**:
```typescript
// api/src/middleware/rbac.ts
const isProduction = process.env.NODE_ENV === 'production';
const allowAdminBypass = !isProduction; // False in production
```

This means:
- ✅ Better security in production
- ✅ All requests must use proper SSO authentication
- ⚠️ Testing requires real user sessions (no admin token shortcut)

### **Epic 7 Dependencies**

Epic 7 requires:
- PostgreSQL database with migrations applied
- Environment variables set correctly
- SSO/RBAC system configured for authentication
- drizzle-orm installed (✅ fixed in staging)

---

## 📊 **Current Status Summary**

### ✅ **What's Complete:**

1. ✅ **Code:** Epic 7 merged to main
2. ✅ **Staging:** Deployed and verified working
3. ✅ **Docker:** staging-latest image includes Epic 7
4. ✅ **Dependencies:** drizzle-orm fix applied
5. ✅ **CI:** All tests passing
6. ✅ **Documentation:** Complete deployment guides

### ⏳ **What's Pending:**

1. ⏳ **Production:** Needs manual promotion trigger
2. ⏳ **Prod DB:** May need migrations applied
3. ⏳ **Prod Env Vars:** May need feature flags set
4. ⏳ **Prod Verification:** After deployment

---

## 🎯 **Recommendation**

### **Deploy to Production Now?**

**YES** - if:
- ✅ Production database exists and is ready
- ✅ Production Render service is configured
- ✅ You're comfortable with Epic 7 on staging
- ✅ You have a rollback plan if needed

**WAIT** - if:
- ⏳ You want more staging testing time
- ⏳ Production database needs setup
- ⏳ You prefer scheduled deployment windows
- ⏳ You need to coordinate with team/users

---

## 📚 **Related Documentation**

- [EPIC7_STAGING_VERIFIED.md](./EPIC7_STAGING_VERIFIED.md) - Staging verification results
- [RENDER_DEPLOYMENT_FIX.md](./RENDER_DEPLOYMENT_FIX.md) - Dependency fix details
- [RENDER_DEPLOYMENT_ARCHITECTURE.md](./RENDER_DEPLOYMENT_ARCHITECTURE.md) - Complete deployment architecture
- [EPIC7_DONE_DONE_DELIVERY.md](./EPIC7_DONE_DONE_DELIVERY.md) - Epic 7 delivery summary

---

## ✅ **Final Answer to Your Question**

> **"Have we resolved epic 7 for staging and prod? Do we need to do the latter?"**

### **Staging: YES ✅ RESOLVED**
Epic 7 is deployed, verified, and working perfectly on staging.

### **Production: READY ⏳ NEEDS MANUAL TRIGGER**
Epic 7 is **ready** for production but requires you to:
1. Manually trigger the promotion workflow
2. Ensure production environment variables are set
3. Apply database migrations to production

**You should deploy to production** if you want users to have access to Epic 7 features (gamification, certificates, badges, etc.).

**You can wait** if you prefer more testing time or need to coordinate with your team first.

---

**Next Step:** Your decision on production deployment timing 🚀

