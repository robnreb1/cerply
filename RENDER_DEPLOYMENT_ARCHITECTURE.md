# Render Deployment Architecture

**Last Updated:** 2025-10-12  
**Status:** ✅ Active Configuration

---

## 🐳 Docker-Based Deployment

### **Key Facts**
- **Both Production and Staging** use **Docker image** builds
- Render does **NOT** deploy directly from Git branches
- Docker images are built from the repository and then deployed

### **Deployment Environments**

#### **Staging**
- **Service Name:** `cerply-api-staging-latest`
- **Build Method:** Docker image
- **Region:** Frankfurt (EU)
- **Database:** `dpg-d324843uibrs739hldp0-a.frankfurt-postgres.render.com`
- **Health Check:** `/api/health`

#### **Production (Main)**
- **Service Name:** TBD
- **Build Method:** Docker image
- **Region:** TBD
- **Database:** TBD

---

## 📦 Deployment Process

### **Docker Configuration**

The repository contains **two Dockerfiles**:
- **`/Dockerfile`** (root) - Multi-stage build for API with Prisma support
- **`/api/Dockerfile`** - Simpler API-only build

**Render uses:** `/Dockerfile` (root)

**Build Stages:**
1. **deps** - Install dependencies (Node 20 Alpine)
2. **builder** - Compile TypeScript to JavaScript
3. **runner** - Production runtime (Node 20 Debian Bullseye for Prisma)

**Key Features:**
- Installs only API workspace dependencies (`-w api`)
- Includes Prisma client generation
- OpenSSL 1.1 for Prisma compatibility
- Health check: `http://127.0.0.1:8080/api/health`
- Exposes port 8080

### **How Code Reaches Staging/Production**

1. **Code Push:**
   ```bash
   git push origin main
   ```

2. **Render Detects Change:**
   - Render webhook triggers on main branch push
   - Starts Docker build process using `/Dockerfile`

3. **Docker Build:**
   ```bash
   # Render executes (simplified):
   docker build -t cerply-api:latest .
   
   # Build includes:
   # - npm ci (install deps)
   # - npm run build (compile TypeScript)
   # - Prisma client generation
   # - Production-only node_modules
   ```

4. **Image Deployment:**
   - Built image is deployed to service
   - Container starts: `node api/dist/index.js`
   - Health check must pass: `/api/health`
   - Old instance replaced once new one is healthy

5. **Environment Variables Loaded:**
   - Render injects all env vars from dashboard
   - App reads feature flags, DATABASE_URL, etc.

### **Force Redeploy**

To deploy without code changes (e.g., after environment variable updates):
- Go to Render Dashboard → Service → **Manual Deploy** → **Deploy latest commit**
- Rebuilds Docker image with current env vars
- Redeployes with new configuration

---

## 🔍 Render Dashboard Settings to Verify

In your Render dashboard for **cerply-api-staging-latest**, verify these settings:

### **Settings → Build & Deploy**
- **Dockerfile Path:** `./Dockerfile` (root)
- **Docker Context:** `.` (root directory)
- **Auto-Deploy:** ✅ Enabled (for main branch)
- **Branch:** `main`

### **Environment Tab**
- All Epic 7 feature flags present (see below)
- DATABASE_URL pointing to Frankfurt PostgreSQL
- NODE_ENV set appropriately

### **Logs Tab**
After deployment, you should see:
```
==> Building...
Building image from Dockerfile...
Step 1/X : FROM node:20-alpine AS deps
...
==> Deploying...
==> Health check passed
==> Your service is live 🎉
```

---

## 🔧 Epic 7 Deployment Checklist

### **Environment Variables (Required)**

Both staging and production need these set in Render Dashboard → Environment:

```bash
# Epic 7 Feature Flags
FF_GAMIFICATION_V1=true
FF_CERTIFICATES_V1=true
FF_MANAGER_NOTIFICATIONS_V1=true

# Environment
NODE_ENV=staging  # or production

# Database (Staging example)
DATABASE_URL=postgresql://cerply_app:ZTv6yzkW3EaO7Hf3n4y12VrdRGtikO8T@dpg-d324843uibrs739hldp0-a.frankfurt-postgres.render.com:5432/cerply

# Optional: Admin token for testing (non-production only)
ADMIN_TOKEN=your-secure-token-here
```

### **Post-Deployment Verification**

After Docker image deploys successfully:

```bash
# Set your environment URL
STAGING_URL="https://cerply-api-staging-latest.onrender.com"

# 1. Health check
curl -s $STAGING_URL/api/health | jq

# 2. Feature flags should show Epic 7 flags
curl -s $STAGING_URL/api/flags | jq

# 3. Epic 7 KPIs should show counters (not null)
curl -s $STAGING_URL/api/ops/kpis | jq '.epic7'

# 4. Test a gamification route
curl -s "$STAGING_URL/api/learners/00000000-0000-0000-0000-000000000001/levels?limit=10" | jq
```

---

## 🗄️ Database Migrations

### **Staging Database**

Migrations must be run **manually** after Docker deployment:

```bash
# From local machine
cd api

# Run migrations against staging
DATABASE_URL="postgresql://cerply_app:ZTv6yzkW3EaO7Hf3n4y12VrdRGtikO8T@dpg-d324843uibrs739hldp0-a.frankfurt-postgres.render.com:5432/cerply" \
  npm run migrate
```

**Epic 7 Migrations:**
- `010_gamification_staging.sql` - Core tables (staging-compatible with text IDs)
- `011_idempotency_staging.sql` - Idempotency keys
- `012_cert_revocation.sql` - Certificate revocation
- `013_audit_events_staging.sql` - Audit events

---

## 🚨 Common Issues

### **Issue: Feature Flags Not Working After Deploy**

**Symptom:** Routes return 404 or "Feature not enabled"

**Cause:** Environment variables not set or Docker image built before vars were added

**Fix:**
1. Verify env vars in Render Dashboard → Environment
2. **Manual Deploy** to rebuild with current env vars
3. Wait for health check to pass
4. Test with `curl $URL/api/flags`

### **Issue: Old Code Running After Merge**

**Symptom:** New routes/features don't exist after PR merge

**Cause:** Render hasn't rebuilt the Docker image yet

**Fix:**
1. Check Render Dashboard → Deployment logs
2. Look for recent build triggered by GitHub push
3. If no build, trigger **Manual Deploy**
4. Verify commit hash matches latest main

### **Issue: Health Check Failing**

**Symptom:** Deployment hangs on "Starting service..."

**Causes:**
- Database connection error (invalid DATABASE_URL)
- App not binding to correct PORT
- Missing required env vars
- Build command failure

**Fix:**
1. Check logs for error messages
2. Verify DATABASE_URL includes full domain + port
3. Ensure PORT env var is not hardcoded (Render sets it)
4. Check build logs for npm/Docker errors

---

## 📝 Deployment Workflow Summary

```mermaid
graph LR
    A[Git Push to main] --> B[Render Webhook]
    B --> C[Docker Build]
    C --> D{Build Success?}
    D -->|Yes| E[Deploy Image]
    D -->|No| F[Build Failed]
    E --> G{Health Check}
    G -->|Pass| H[Route Traffic]
    G -->|Fail| I[Rollback]
    H --> J[✅ Live]
```

**Key Takeaway:** Changes require both:
1. ✅ Code merged to main (triggers rebuild)
2. ✅ Environment variables set in Render
3. ✅ Manual deploy if env vars changed after last build

---

## 🔐 Security Notes

- **Never commit** `DATABASE_URL` or `ADMIN_TOKEN` to Git
- Use Render's encrypted environment variables
- `ADMIN_TOKEN` bypass is **disabled** in production (`NODE_ENV=production`)
- Staging should use separate database from production
- Connection strings should use SSL by default

---

## 📚 Related Documentation

- [EPIC7_IMPLEMENTATION_PROMPT.md](./EPIC7_IMPLEMENTATION_PROMPT.md) - Epic 7 requirements
- [EPIC7_DONE_DONE_DELIVERY.md](./EPIC7_DONE_DONE_DELIVERY.md) - Delivery summary
- [EPIC7_FINAL_WRAP_UP.md](./EPIC7_FINAL_WRAP_UP.md) - Final wrap-up
- [docs/functional-spec.md](./docs/functional-spec.md) - Epic 7 in functional spec

---

**For Render Dashboard Access:**
- Staging: [Render Dashboard](https://dashboard.render.com)
- Service: cerply-api-staging-latest
- Database: cerply PostgreSQL (Frankfurt)

