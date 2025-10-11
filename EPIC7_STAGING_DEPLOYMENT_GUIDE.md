# Epic 7: Staging & Production Deployment Guide 🚀

**Status:** PR #525 Merged ✅  
**Next Steps:** Deploy to Staging → UAT → Production

---

## 📋 Current Status

### ✅ Completed
- [x] PR #525 merged to `main`
- [x] Staging database deployed (7 Epic 7 tables)
- [x] Staging migrations applied
- [x] All tests passing

### ⏳ In Progress
- [ ] Render staging deployment (auto-deploy from main)
- [ ] Verify Epic 7 routes available
- [ ] Run UAT on staging
- [ ] Setup production database

---

## 🚀 Step 1: Verify Render Staging Deployment

### **Check Deployment Status**

Go to: **https://dashboard.render.com**

1. Find your **cerply-api-staging** service
2. Check the "Events" tab
3. Look for latest deployment from `main` branch
4. Wait for status: **"Live"** (usually 2-5 minutes)

### **Manual Deploy (if needed)**

If auto-deploy didn't trigger:
1. Go to your Render web service
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
3. Wait for deployment to complete

### **Verify Deployment**

Once deployed, test the endpoints:

```bash
STAGING_URL="https://cerply-api-staging-latest.onrender.com"

# Test 1: Health Check (should work)
curl https://$STAGING_URL/api/health | jq

# Test 2: Epic 7 KPIs (should return counters, not 404)
curl https://$STAGING_URL/api/ops/kpis | jq '.epic7'

# Expected result:
# {
#   "badges_awarded": 0,
#   "levels_changed": 0,
#   "certificates_issued": 0,
#   "certificates_downloaded": 0,
#   "certificates_revoked": 0,
#   "notifications_marked_read": 0
# }

# Test 3: Learner Levels (should return data or proper error, not 404)
curl "https://$STAGING_URL/api/learners/00000000-0000-0000-0000-000000000001/levels"
```

### **Expected Results**
- ✅ Health endpoint returns `{ "ok": true }`
- ✅ KPIs endpoint shows Epic 7 counters (all at 0)
- ✅ Epic 7 routes return proper responses (not 404)

---

## 🧪 Step 2: User Acceptance Testing (UAT)

Once staging deployment is verified, run the UAT scenarios from `docs/uat/EPIC7_UAT_PLAN.md`.

### **Quick UAT Checklist**

#### **Test 1: Learner Progression**
```bash
# Create test user first (if needed)
# Then check progression
curl "$STAGING_URL/api/learners/[USER_ID]/levels"
```

#### **Test 2: Achievement Badges**
```bash
# Check available badges
curl "$STAGING_URL/api/learners/[USER_ID]/badges"

# Should return array of earned badges
```

#### **Test 3: Certificates**
```bash
# List certificates
curl "$STAGING_URL/api/learners/[USER_ID]/certificates"

# Download certificate (if any exist)
curl "$STAGING_URL/api/certificates/[CERT_ID]/download" -o test-cert.pdf

# Verify certificate
curl "$STAGING_URL/api/certificates/[CERT_ID]/verify?signature=..."
```

#### **Test 4: Manager Notifications**
```bash
# Get notifications (requires manager session)
curl "$STAGING_URL/api/manager/notifications"

# Get unread count
curl "$STAGING_URL/api/manager/notifications/unread/count"
```

### **Full UAT**
For complete UAT instructions, see: `docs/uat/EPIC7_UAT_PLAN.md` (8 scenarios)

---

## 🗄️ Step 3: Production Database Setup

### **Option A: Create New Production Database in Render**

#### **1. Create Database**
1. Go to Render Dashboard → **"New"** → **"PostgreSQL"**
2. Name: `cerply-db-prod`
3. Database: `cerply`
4. User: Will be auto-generated (e.g., `cerply_prod`)
5. Region: **Frankfurt (EU Central)** (or closest to users)
6. Plan: **Starter** ($7/month) or higher for production

#### **2. Get Connection Details**
Once created, note:
- **External Database URL** (full URL with password)
- **Username**
- **Password**
- **Hostname**

#### **3. Apply Migrations**

**Important:** Production uses **UUID-based schema**, not the staging text-based schema.

```bash
# Set production database URL
export PROD_DB_URL="postgresql://cerply_prod:[PASSWORD]@[HOSTNAME].frankfurt-postgres.render.com:5432/cerply"

# Apply migrations (standard versions, not *_staging.sql)
cd api

# Core gamification tables
psql "$PROD_DB_URL" < drizzle/010_gamification.sql

# Idempotency keys
psql "$PROD_DB_URL" < drizzle/011_idempotency.sql

# Certificate revocation
psql "$PROD_DB_URL" < drizzle/012_cert_revocation.sql

# Audit events
psql "$PROD_DB_URL" < drizzle/013_audit_events.sql

# Verify tables created
psql "$PROD_DB_URL" -c "\dt" | grep -E "(learner_levels|certificates|badges|audit_events)"
```

### **Option B: Upgrade Staging to Production Schema**

If you want to use the same database for both:

1. **Not recommended** - Keep staging and production separate
2. If you must share, use different database names within same PostgreSQL instance

---

## 🌐 Step 4: Production Web Service Setup

### **Create Production Web Service in Render**

1. Go to Render Dashboard → **"New"** → **"Web Service"**
2. Connect your GitHub repository
3. Settings:
   - **Name:** `cerply-api-prod`
   - **Branch:** `main`
   - **Build Command:** `cd api && npm install && npm run build`
   - **Start Command:** `cd api && npm start`
   - **Environment:** `Node`

### **Environment Variables (Production)**

**Critical - Security:**
```bash
NODE_ENV=production              # ← MUST be "production" (disables admin bypass)
PORT=8080
```

**Database:**
```bash
DATABASE_URL=postgresql://cerply_prod:[PASSWORD]@[PROD_HOSTNAME].frankfurt-postgres.render.com:5432/cerply
```

**Epic 7 Feature Flags:**
```bash
FF_GAMIFICATION_V1=true
FF_CERTIFICATES_V1=true
FF_MANAGER_NOTIFICATIONS_V1=true
```

**Audit & Monitoring:**
```bash
PERSIST_AUDIT_EVENTS=true       # Enable database audit storage
RETAIN_AUDIT_DAYS=180          # 180-day retention
```

**Security:**
```bash
ADMIN_TOKEN=[SECURE-RANDOM-TOKEN]  # Set but won't work in NODE_ENV=production
```

**Other Required Variables:**
```bash
# Add any other env vars your app needs:
# - API keys (OpenAI, Slack, etc.)
# - Auth secrets
# - Feature flags for other epics
```

---

## 🔒 Step 5: Production Verification

### **After Production Deployment**

```bash
PROD_URL="https://cerply-api-prod.onrender.com"  # Your actual prod URL

# Test 1: Health Check
curl https://$PROD_URL/api/health | jq

# Test 2: Admin Bypass Should Be DENIED
curl "https://$PROD_URL/api/learners/00000000-0000-0000-0000-000000000001/levels" \
  -H 'x-admin-token: any-token'
# Expected: 401 Unauthorized (admin bypass OFF in production)

# Test 3: UUID Validation
curl "https://$PROD_URL/api/learners/not-a-uuid/levels"
# Expected: 400 Bad Request

# Test 4: Epic 7 KPIs
curl https://$PROD_URL/api/ops/kpis | jq '.epic7'
# Expected: All counters at 0
```

### **Security Checklist**
- ✅ `NODE_ENV=production` is set
- ✅ Admin token bypass returns 401 (tested)
- ✅ UUID validation returns 400 (tested)
- ✅ Database credentials secure
- ✅ HTTPS enabled (Render default)

---

## 🏃 Step 6: Gradual Rollout Plan

### **Week 1: Pilot (1-2 Organizations)**

1. **Select Pilot Customers**
   - Choose 1-2 friendly organizations
   - Ideally active users who can provide feedback

2. **Enable Epic 7 for Pilots**
   ```sql
   -- Option: Per-org feature flags (if implemented)
   UPDATE organizations 
   SET features = features || '{"epic7_enabled": true}'
   WHERE id IN ('pilot-org-1', 'pilot-org-2');
   ```

3. **Monitor for 48 Hours**
   - Check `/api/ops/kpis` daily
   - Watch for errors in logs
   - Collect user feedback

### **Week 2: Expanded Beta (10-20% of Users)**

If pilot successful:
1. Enable for 10-20% of organizations
2. Monitor KPIs and error rates
3. Gather feedback

### **Week 3-4: General Availability**

If beta successful:
1. Enable for all organizations
2. Announce via email/blog
3. Update documentation
4. Plan Epic 7.5 (Web UI)

---

## 📊 Step 7: Monitoring & Observability

### **Daily Monitoring (First Week)**

```bash
# Check Epic 7 KPIs
curl https://cerply-api-prod.onrender.com/api/ops/kpis | jq '.epic7'

# Monitor trends:
# - Are badges being awarded?
# - Are certificates being issued?
# - Are managers engaging with notifications?
```

### **Setup Alerts**

In your monitoring tool (Render, Datadog, etc.), create alerts for:
- **5xx Error Rate** > 1% on Epic 7 routes
- **Certificate Download Failures** > 5 per hour
- **Database Query Time** > 500ms on Epic 7 tables
- **Audit GC Failures** (daily/weekly cron jobs)

### **Logs to Watch**

```bash
# Audit events
grep "\[audit\]" api-logs.log

# Epic 7 errors
grep "gamification\|certificates\|badges" api-logs.log | grep ERROR

# Performance issues
grep "slow query" api-logs.log
```

---

## 🔧 Step 8: Cleanup Cron Jobs

### **Setup Cron Jobs (Required)**

#### **Daily: Cleanup Idempotency Keys**
```bash
# Cron: Every day at 2 AM
0 2 * * * cd /app/api && npx tsx scripts/cleanup-idempotency-keys.ts >> /var/log/cerply/cleanup-idempotency.log 2>&1
```

#### **Weekly: Cleanup Audit Events**
```bash
# Cron: Every Sunday at 3 AM
0 3 * * 0 cd /app/api && RETAIN_AUDIT_DAYS=180 npx tsx scripts/cleanup-audit-events.ts >> /var/log/cerply/cleanup-audit.log 2>&1
```

### **Alternative: GitHub Actions**

If you don't have cron access, create GitHub Actions workflows:

**.github/workflows/cleanup-idempotency.yml:**
```yaml
name: Cleanup Idempotency Keys
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd api && npm install
      - run: cd api && npx tsx scripts/cleanup-idempotency-keys.ts
        env:
          DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
```

---

## 📚 Documentation Checklist

Before going live:

- [ ] Update `README.md` with Epic 7 features
- [ ] Update API documentation (if separate)
- [ ] Create user-facing docs for certificates
- [ ] Create admin guide for certificate revocation
- [ ] Document manager notification preferences
- [ ] Update changelog with Epic 7 release notes

---

## ✅ Success Criteria

### **Immediate (Day 1)**
- [ ] Staging deployment verified
- [ ] All Epic 7 routes returning data (not 404)
- [ ] Health checks passing
- [ ] No 5xx errors

### **Short-Term (Week 1)**
- [ ] Pilot organizations using features
- [ ] Badges being awarded
- [ ] Certificates being downloaded
- [ ] Manager notifications appearing
- [ ] Zero critical bugs

### **Medium-Term (Month 1)**
- [ ] KPI trends showing engagement
- [ ] User feedback positive
- [ ] Database performance stable
- [ ] Cleanup crons running successfully

---

## 🆘 Troubleshooting

### **Issue: Epic 7 Routes Return 404**
**Solution:**
1. Check Render deployment status
2. Verify `main` branch has Epic 7 code
3. Check build logs for errors
4. Manually trigger deployment if needed

### **Issue: Database Connection Errors**
**Solution:**
1. Verify `DATABASE_URL` is correct (full URL with domain)
2. Check database is "Available" in Render
3. Test connection: `psql "$DATABASE_URL" -c "SELECT 1;"`
4. Verify migrations were applied

### **Issue: Admin Bypass Still Works in Production**
**Solution:**
1. **Critical Security Issue!**
2. Verify `NODE_ENV=production` in Render environment variables
3. Restart the service
4. Test again - should return 401

### **Issue: Certificates Not Generating**
**Solution:**
1. Check feature flag: `FF_CERTIFICATES_V1=true`
2. Check logs for PDF generation errors
3. Verify certificate table has data
4. Check Ed25519 key generation (mock should work)

---

## 📞 Support

**Documentation:**
- `EPIC7_DONE_DONE_DELIVERY.md` - Complete overview
- `EPIC7_STAGING_SETUP_COMPLETE.md` - Staging database setup
- `EPIC7_FINAL_WRAP_UP.md` - Deployment procedures
- `docs/uat/EPIC7_UAT_PLAN.md` - Testing scenarios

**Contact:**
- GitHub Issues (tag: `epic:7-gamification`)
- Render Support (for infrastructure)

---

## 🎯 Summary

**Staging:**
1. ✅ Database deployed
2. ⏳ Wait for Render auto-deploy
3. ⏳ Verify routes available
4. ⏳ Run UAT

**Production:**
1. ⏳ Create production database
2. ⏳ Apply migrations
3. ⏳ Setup web service
4. ⏳ Configure environment variables
5. ⏳ Deploy and verify
6. ⏳ Setup monitoring & crons
7. ⏳ Gradual rollout

**You're here:** Waiting for staging deployment to complete (2-5 minutes after PR merge)

**Next immediate step:** Check Render dashboard for deployment status! 🚀

