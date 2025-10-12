# Production Epic 7 Setup - Action Plan

## 📊 Current Status

### **What We Have:**
- ✅ Production Database: `cerply-production` (database: `cerply_t8y3`)
- ✅ Production API: `cerply-api-prod` (deployed at https://api.cerply.com)
- ✅ Staging Database: `cerply-db-stg` (Epic 7 tables applied)
- ✅ Staging API: `cerply-api-staging` (Epic 7 working)

### **What We Need to Do:**
1. Apply Epic 7 migrations to production database
2. Configure production API with Epic 7 environment variables
3. Verify Epic 7 is working in production

---

## 🚀 Step-by-Step Instructions

### **Step 1: Apply Epic 7 Migrations to Production Database**

Run these commands on your **local machine**:

```bash
cd api

# Set the production database URL
export DATABASE_URL="postgresql://cerply_app:pB55GwS1h6t0PuxZ35ekDG1eNAZxgIHZ@dpg-d3lrdnt6ubrc73ebjh90-a.frankfurt-postgres.render.com/cerply_t8y3"

# Apply Epic 7 schema
npx drizzle-kit push
```

**Expected Output:**
```
📦 Pulling schema from database...
🔍 Comparing schemas...
📝 Applying changes...

✓ Created table: learner_levels
✓ Created table: certificates
✓ Created table: badges
✓ Created table: learner_badges
✓ Created table: manager_notifications
✓ Created table: idempotency_keys
✓ Created table: audit_events
✓ Inserted badge seed data (17 rows)

✅ All changes applied successfully!
```

**If you see "No changes detected":** Tables already exist - skip to Step 2!

---

### **Step 2: Verify Tables Were Created**

Check the tables using psql:

```bash
# List all tables in production database
psql "$DATABASE_URL" -c "\dt"

# Check specifically for Epic 7 tables
psql "$DATABASE_URL" -c "\dt" | grep -E "(learner_levels|certificates|badges|idempotency|audit)"
```

**Expected Output:**
```
 learner_levels
 certificates
 badges
 learner_badges
 manager_notifications
 idempotency_keys
 audit_events
```

---

### **Step 3: Configure Production API Environment Variables**

**In Render Dashboard:**

1. Go to **"cerply-api-prod"** service
2. Click **"Environment"** tab
3. Add/update these variables:

```bash
# Database Connection
DATABASE_URL=postgresql://cerply_app:pB55GwS1h6t0PuxZ35ekDG1eNAZxgIHZ@dpg-d3lrdnt6ubrc73ebjh90-a.frankfurt-postgres.render.com/cerply_t8y3

# Epic 7 Feature Flags
FF_GAMIFICATION_V1=true
FF_CERTIFICATES_V1=true
FF_MANAGER_NOTIFICATIONS_V1=true

# Environment
NODE_ENV=production
```

4. **Click "Save Changes"**
5. Wait for automatic redeploy (~2-3 minutes)

---

### **Step 4: Verify Production Epic 7**

After the API redeploys, test it:

```bash
PROD_URL="https://api.cerply.com"

# 1. Health check
curl -s $PROD_URL/api/health | jq

# 2. Feature flags (should show Epic 7 flags)
curl -s $PROD_URL/api/flags | jq

# 3. Epic 7 route (should return UNAUTHORIZED, not 404)
curl -s $PROD_URL/api/learners/00000000-0000-0000-0000-000000000001/levels | jq

# 4. KPIs (should include Epic 7 counters)
curl -s $PROD_URL/api/ops/kpis | jq
```

**Expected Results:**
- ✅ Health check returns `{ "ok": true }`
- ✅ Flags endpoint shows Epic 7 flags
- ✅ Epic 7 routes return `UNAUTHORIZED` (proving they exist and are protected)
- ✅ KPIs include: `badges_awarded`, `levels_changed`, `certificates_issued`, etc.

---

## 🎯 Success Criteria

Once complete, you should have:

- ✅ Production database with Epic 7 tables
- ✅ Production API connected to production database
- ✅ Epic 7 feature flags enabled
- ✅ All Epic 7 routes responding (protected by auth)
- ✅ Audit events and idempotency ready

---

## 🚨 Troubleshooting

### **Issue: "Cannot find module 'drizzle-orm'"**
**Solution:** Already fixed in PR #607 - `drizzle-orm` moved to dependencies

### **Issue: Migrations fail with "connection refused"**
**Solution:** Check DATABASE_URL is correct (copy/paste exactly from Render)

### **Issue: After deploy, still getting 404 on Epic 7 routes**
**Solution:** 
1. Check feature flags are set correctly
2. Verify DATABASE_URL is set on the API service
3. Check API logs for errors

### **Issue: "No Shell tab" in Render**
**Solution:** Use local `psql` commands instead (as shown above)

---

## 📝 Quick Checklist

- [ ] Run `npx drizzle-kit push` against production database
- [ ] Verify tables exist with `psql -c "\dt"`
- [ ] Configure `DATABASE_URL` on `cerply-api-prod`
- [ ] Configure Epic 7 feature flags on `cerply-api-prod`
- [ ] Wait for automatic redeploy
- [ ] Test health check, flags, and Epic 7 routes
- [ ] Verify KPIs include Epic 7 counters

---

**Next:** Run the commands above and let me know the results! 🚀

