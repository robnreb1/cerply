# Render Deployment Setup

**Last Updated:** 2025-10-06  
**Status:** ✅ Active (Blueprint removed, manual management)

---

## 🚀 Services

### Production: `cerply-api-prod`

**Configuration:**
- **Service Name:** cerply-api-prod
- **Branch:** main
- **Runtime:** Docker (Image)
- **Region:** Frankfurt
- **URL:** https://api.cerply.com
- **Health Check:** `/api/health`
- **Auto-Deploy:** ✅ Yes (on push to main)

**Required Environment Variables:**
```
CERTIFIED_ENABLED=true
RETENTION_ENABLED=true
OPENAI_API_KEY=<secret>
DATABASE_URL=<connection-string>
LLM_PREVIEW=1
LLM_PLANNER_MODEL=gpt-4o-mini
LLM_PLANNER_PROVIDER=openai
NODE_ENV=production
```

**Access:**
- Dashboard: https://dashboard.render.com/ → cerply-api-prod
- Logs: Dashboard → Logs tab
- Metrics: Dashboard → Metrics tab

---

### Staging: `cerply-api-staging`

**Configuration:**
- **Service Name:** cerply-api-staging
- **Branch:** staging
- **Runtime:** Docker (Image)
- **Region:** Frankfurt
- **URL:** https://cerply-api-staging.onrender.com (or Render-provided URL)
- **Health Check:** `/api/health`
- **Auto-Deploy:** ✅ Yes (on push to staging)

**Required Environment Variables:**
```
CERTIFIED_ENABLED=true
RETENTION_ENABLED=true
OPENAI_API_KEY=<secret>
DATABASE_URL=<staging-connection-string>
LLM_PREVIEW=1
LLM_PLANNER_MODEL=gpt-4o-mini
LLM_PLANNER_PROVIDER=openai
NODE_ENV=staging
```

**Access:**
- Dashboard: https://dashboard.render.com/ → cerply-api-staging
- Logs: Dashboard → Logs tab
- Metrics: Dashboard → Metrics tab

---

## 🔄 Deployment Process

### Normal Flow

```
1. Feature branch → Create PR to staging
2. Review + Merge to staging
3. Auto-deploy to cerply-api-staging (2-3 minutes)
4. Test on staging
5. staging → Create PR to main
6. Review + Merge to main
7. Auto-deploy to cerply-api-prod (2-3 minutes)
8. Verify production
```

### Emergency Hotfix

```
1. Create hotfix branch from main
2. Make minimal fix
3. Test locally
4. Create PR to main (skip staging if critical)
5. Review + Merge
6. Auto-deploy to production
7. Backport to staging if needed
```

---

## 🧪 Verification After Deploy

### Quick Health Check

**Production:**
```bash
curl https://api.cerply.com/api/health
# Expected: {"ok":true,"env":"production",...}
```

**Staging:**
```bash
curl https://cerply-api-staging.onrender.com/api/health
# Expected: {"ok":true,"env":"staging",...}
```

### Full Smoke Test

**Production:**
```bash
# Run M3 smoke tests
./api/scripts/smoke-m3.sh https://api.cerply.com

# Expected: 31/31 tests passing
```

**Staging:**
```bash
# Run M3 smoke tests
./api/scripts/smoke-m3.sh https://cerply-api-staging.onrender.com

# Expected: 31/31 tests passing
```

---

## 🔧 Adding Environment Variables

### Via Render Dashboard

1. Go to https://dashboard.render.com/
2. Select service (cerply-api-prod or cerply-api-staging)
3. Click "Environment" in left sidebar
4. Click "Add Environment Variable"
5. Enter key and value
6. Click "Save Changes"
7. Service will auto-redeploy (~2-3 minutes)

### Required for Retention Features

**Both services must have:**
- `CERTIFIED_ENABLED=true`
- `RETENTION_ENABLED=true`

Without these, `/certified/study` page will show "Retention preview disabled" error.

---

## 📊 Monitoring

### Health Checks

Render automatically monitors `/api/health` endpoint:
- Frequency: Every 30 seconds
- Timeout: 30 seconds
- Unhealthy threshold: 3 consecutive failures
- Action: Service restart

### Manual Checks

**Check service status:**
```bash
# Production
curl -I https://api.cerply.com/api/health

# Staging
curl -I https://cerply-api-staging.onrender.com/api/health
```

**Check retention endpoints:**
```bash
# Test schedule endpoint
curl -X POST https://api.cerply.com/api/certified/schedule \
  -H "Content-Type: application/json" \
  -d '{"session_id":"test","plan_id":"demo","items":[{"id":"c1","front":"Q","back":"A"}]}'

# Expected: 200 OK with session details
```

---

## 🐛 Troubleshooting

### Service Won't Start

**Check logs:**
1. Dashboard → Service → Logs tab
2. Look for startup errors
3. Common issues:
   - Missing environment variables
   - Database connection failures
   - Port binding issues

**Verify env vars:**
1. Dashboard → Service → Environment
2. Check all required variables are present
3. Verify no typos in variable names

### "Retention preview disabled" Error

**Cause:** Missing environment variables

**Fix:**
1. Go to service → Environment
2. Add: `CERTIFIED_ENABLED=true`
3. Add: `RETENTION_ENABLED=true`
4. Save and wait for redeploy
5. Test: `curl https://api.cerply.com/api/certified/schedule ...`

### Deploy Stuck/Failed

**Check deploy status:**
1. Dashboard → Service → Events
2. Look for build/deploy failures
3. Check logs for error details

**Common fixes:**
- Re-trigger deploy (Dashboard → Manual Deploy)
- Check Dockerfile is valid
- Verify branch exists and has latest code
- Check Render status page: https://status.render.com/

---

## 🔄 Rollback Procedure

### Quick Rollback (Via Dashboard)

1. Dashboard → Service → Events
2. Find last successful deploy
3. Click "Rollback to this deploy"
4. Confirm
5. Wait for rollback (~1-2 minutes)
6. Verify with health check

### Manual Rollback (Via Git)

```bash
# 1. Identify last good commit
git log --oneline -10

# 2. Revert to that commit
git revert <bad-commit-sha>

# 3. Push to trigger redeploy
git push origin main  # or staging
```

### Emergency Rollback Script

See: `api/scripts/retag-prod.sh` (for image-based rollbacks)

---

## 📝 Infrastructure Changes

### ~~Blueprint-Based Management~~ (REMOVED 2025-10-06)

**Previous setup:**
- Used `cerply-staging` blueprint
- Defined in `render.yaml`
- Auto-created services

**Why removed:**
- Caused duplicate services
- Added complexity
- Manual management simpler for 2 services

### Current: Manual Service Management

**Advantages:**
- Clear ownership of services
- No unexpected service creation
- Simpler configuration
- Direct control via dashboard

**Trade-offs:**
- Environment variables must be set manually
- No Infrastructure-as-Code for Render config
- Changes not tracked in Git

---

## 🔐 Secrets Management

### Environment Variables

**Stored in:** Render dashboard (encrypted)

**Access:**
- Dashboard → Service → Environment
- Click eye icon to reveal values
- Never commit secrets to Git

### Rotation Schedule

**OPENAI_API_KEY:**
- Rotate: Every 90 days
- Process: Update in Render dashboard → Redeploy

**DATABASE_URL:**
- Rotate: Per database provider policy
- Update both services simultaneously

**SESSION_SECRET:**
- Rotate: Every 90 days
- Coordinate with web deployment

---

## 📞 Support

### Render Support

- **Dashboard:** https://dashboard.render.com/
- **Status:** https://status.render.com/
- **Docs:** https://render.com/docs
- **Support:** support@render.com

### Internal Contacts

- **DevOps Lead:** @devops-lead
- **Engineering Lead:** @robnreb1
- **On-call:** See PagerDuty schedule

### Useful Links

- **API Repository:** https://github.com/robnreb1/cerply
- **M3 Epic:** EPIC_M3_API_SURFACE.md
- **Smoke Tests:** api/scripts/smoke-m3.sh
- **Infrastructure Cleanup:** RENDER_INFRASTRUCTURE_CLEANUP.md

---

## ✅ Checklist for New Deployments

### Before Merging to Main

- [ ] Code reviewed and approved
- [ ] Tests passing (unit + integration)
- [ ] Smoke tests pass locally
- [ ] Deployed to staging and tested
- [ ] No breaking changes without migration plan
- [ ] Environment variables documented (if new)

### After Merging to Main

- [ ] Wait for auto-deploy to complete
- [ ] Check health endpoint
- [ ] Run production smoke tests
- [ ] Monitor logs for 5 minutes
- [ ] Verify web app functionality
- [ ] Update deployment log (if major release)

### After Adding Environment Variables

- [ ] Added to production service
- [ ] Added to staging service
- [ ] Documented in this file
- [ ] Tested on both environments
- [ ] Added to backup/disaster recovery docs

---

**Last Updated:** 2025-10-06  
**Version:** 1.0  
**Maintainer:** Engineering Team

