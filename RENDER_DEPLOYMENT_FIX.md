# Render Deployment Fix - Missing drizzle-orm

**Date:** 2025-10-12  
**Status:** ✅ **FIXED - Rebuild in progress**

---

## 🐛 **The Problem**

Render deployment was crashing with:
```
Error: Cannot find module 'drizzle-orm/node-postgres'
Require stack:
- /app/api/dist/db.js
- /app/api/dist/index.js
```

**Status:** `Exited with status 1`

---

## 🔍 **Root Cause**

**`drizzle-orm` was in `devDependencies` instead of `dependencies`**

**File:** `api/package.json`

```json
{
  "dependencies": {
    "pg": "^8.16.3",
    // drizzle-orm was missing here!
  },
  "devDependencies": {
    "drizzle-orm": "^0.44.6"  // ❌ WRONG - needed at runtime!
  }
}
```

**Why this caused the crash:**

The Dockerfile runs:
```dockerfile
RUN npm ci --omit=dev --include-workspace-root -w api
```

The `--omit=dev` flag **skips `devDependencies`**, so `drizzle-orm` was never installed in the production Docker image!

---

## ✅ **The Fix**

**Moved `drizzle-orm` from `devDependencies` to `dependencies`:**

```json
{
  "dependencies": {
    "dotenv": "^17.2.1",
    "drizzle-orm": "^0.44.6",  // ✅ Moved here
    "fastify": "^4.29.1",
    "pg": "^8.16.3",
    ...
  },
  "devDependencies": {
    "drizzle-kit": "^0.31.5",  // ✅ This can stay in dev (build-time only)
    ...
  }
}
```

**Commit:** `85f3c72` - "fix(api): move drizzle-orm to dependencies (required at runtime)"

**Pushed to:** `staging` branch

---

## 🚀 **What Happens Next**

### **1. GitHub Actions (~10 minutes)**
The push to `staging` triggers `.github/workflows/build-docker-staging.yml`:

```
Push to staging
    ↓
GitHub Actions detects change
    ↓
Checkout staging branch
    ↓
docker build -t ghcr.io/robnreb1/cerply-api:staging-latest .
    ↓
npm ci --omit=dev (now includes drizzle-orm!)
    ↓
Push image to GitHub Container Registry
```

**Monitor:** https://github.com/robnreb1/cerply/actions

### **2. Render Deployment (~3 minutes)**
After Docker image is built, Render detects the new image:

```
Render polls GHCR
    ↓
Detects new :staging-latest tag
    ↓
Pulls new image
    ↓
Starts container
    ↓
Health check: GET /api/health
    ↓
Routes traffic to new container ✅
```

**Monitor:** https://dashboard.render.com → cerply-api-staging

---

## ✅ **Verification**

After deployment completes (~13 minutes from now), verify:

```bash
STAGING_URL="https://cerply-api-staging-latest.onrender.com"

# 1. Health check (should return ok: true)
curl -s $STAGING_URL/api/health | jq

# 2. Feature flags (should show Epic 7 flags)
curl -s $STAGING_URL/api/flags | jq

# 3. Epic 7 KPIs (should show counters)
curl -s $STAGING_URL/api/ops/kpis | jq '.epic7'

# 4. Test Epic 7 route (should return paginated data)
curl -s "$STAGING_URL/api/learners/00000000-0000-0000-0000-000000000001/levels?limit=10" | jq
```

**Expected Results:**
- ✅ `/api/health` returns `{ ok: true }`
- ✅ `/api/flags` returns feature flags object
- ✅ `/api/ops/kpis` returns Epic 7 counters (not null)
- ✅ Epic 7 routes return data (not 404)

---

## 📊 **Timeline**

| Time | Event | Status |
|------|-------|--------|
| **14:35** | Render deployment crashed | ❌ |
| **14:43** | Fix committed & pushed | ✅ |
| **14:44** | GitHub Actions building | 🔄 |
| **14:54** | Docker image complete | ⏳ |
| **14:57** | Render deploying | ⏳ |
| **15:00** | **Epic 7 LIVE on staging!** | 🎉 |

---

## 🔧 **Why This Happened**

**When Epic 7 was initially developed:**
- Drizzle ORM was added to the project
- It was placed in `devDependencies` (common mistake for DB tools)
- Local development worked fine (dev deps installed)
- Tests passed locally (dev deps available)

**Why it only failed in Docker/Render:**
- Dockerfile uses `npm ci --omit=dev` for production
- This strips out devDependencies to reduce image size
- Runtime code tried to `require('drizzle-orm/node-postgres')`
- Module not found → crash

**Lesson Learned:**
- Any module imported at runtime MUST be in `dependencies`
- `devDependencies` are for:
  - Build tools (tsup, esbuild)
  - Test frameworks (vitest)
  - Type definitions (@types/*)
  - CLI tools used during development (drizzle-kit)

---

## 📚 **Related Files**

- **`api/package.json`** - Dependencies fix
- **`Dockerfile`** - Production build process
- **`.github/workflows/build-docker-staging.yml`** - Image build workflow
- **`api/src/db.ts`** - Imports `drizzle-orm/node-postgres`
- **`RENDER_DEPLOYMENT_ARCHITECTURE.md`** - Full deployment docs

---

## ✨ **Summary**

✅ **Root cause identified** - drizzle-orm in wrong dependency section  
✅ **Fix applied** - Moved to dependencies  
✅ **Pushed to staging** - Docker rebuild triggered  
✅ **PR can still merge** - This fix is in staging branch  
✅ **Epic 7 will work** after rebuild completes (~13 mins)

**Next:** Wait for Docker build to complete, then verify Epic 7 works! 🚀

