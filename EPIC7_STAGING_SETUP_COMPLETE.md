# Epic 7: Staging Database Setup - Complete ✅

**Date:** 2025-10-11  
**Environment:** Render Staging (`cerply-db-stg`)  
**Status:** ✅ All Epic 7 tables deployed

---

## ✅ What Was Deployed

### **Staging Database Details**
- **Name:** `cerply-db-stg`
- **Provider:** Render PostgreSQL 17
- **Region:** Frankfurt (EU Central)
- **Status:** Available (healthy)
- **Storage:** 9.86% used out of 1GB

### **Connection Info**
```bash
# Corrected DATABASE_URL format (includes full domain + port)
DATABASE_URL="postgresql://cerply_app:ZTv6yzkW3EaO7Hf3n4y12VrdRGtikO8T@dpg-d324843uibrs739hldp0-a.frankfurt-postgres.render.com:5432/cerply"
```

**Important:** The URL needs:
- ✅ Full hostname: `.frankfurt-postgres.render.com`
- ✅ Port: `:5432`
- ❌ Not just: `dpg-d324843uibrs739hldp0-a`

---

## 📊 Epic 7 Tables Deployed

### **Core Gamification Tables**
1. ✅ **`learner_levels`** - User progression per track (5 levels: novice → master)
2. ✅ **`certificates`** - Issued certificates with Ed25519 signatures + revocation
3. ✅ **`badges`** - Achievement badge definitions (7 seeded)
4. ✅ **`learner_badges`** - User badge awards
5. ✅ **`manager_notifications`** - In-app notifications for managers

### **Infrastructure Tables**
6. ✅ **`idempotency_keys`** - Request deduplication (24hr TTL)
7. ✅ **`audit_events`** - Audit trail (180-day retention)

### **Badge Seed Data** (7 badges)
```sql
slug            | name
----------------+---------------
early-bird      | Early Bird
first-correct   | First Steps
night-owl       | Night Owl
perfect-5       | Perfectionist
streak-3        | On Fire
streak-7        | Unstoppable
track-complete  | Track Master
```

---

## 🔧 Schema Differences: Staging vs Local

### **Key Differences**
| Aspect | Local Development | Render Staging |
|--------|------------------|----------------|
| `users.id` type | `uuid` | `text` |
| `organizations` table | ✅ Exists | ❌ Doesn't exist |
| `tracks` table | ✅ Exists | ❌ Doesn't exist |

### **Migration Strategy**
Created **staging-specific migrations** to handle these differences:

1. **`010_gamification_staging.sql`**
   - Uses `text` for `user_id` foreign keys (not `uuid`)
   - No FK constraints for `track_id` or `organization_id`
   - Makes `organization_id` nullable

2. **`011_idempotency_staging.sql`**
   - Uses `text` for `user_id` reference

3. **`013_audit_events_staging.sql`**
   - Uses `text` for `user_id` and `performed_by` references
   - Makes `organization_id` nullable (no FK)

---

## 🚀 Next Steps: Deploy API to Render

### **1. Configure Environment Variables**
In your Render web service, add these environment variables:

```bash
# Database (use External Database URL from Render PostgreSQL dashboard)
DATABASE_URL=postgresql://cerply_app:ZTv6yzkW3EaO7Hf3n4y12VrdRGtikO8T@dpg-d324843uibrs739hldp0-a.frankfurt-postgres.render.com:5432/cerply

# Environment
NODE_ENV=staging
PORT=8080

# Epic 7 Feature Flags
FF_GAMIFICATION_V1=true
FF_CERTIFICATES_V1=true
FF_MANAGER_NOTIFICATIONS_V1=true

# Optional - Audit Persistence
PERSIST_AUDIT_EVENTS=true
RETAIN_AUDIT_DAYS=180

# Admin Token (for staging testing - bypass works in non-production)
ADMIN_TOKEN=staging-secure-token-12345
```

### **2. Deploy to Render**
```bash
# Option A: Via Render Dashboard
# - Go to your web service
# - Click "Manual Deploy" → "Deploy latest commit"

# Option B: Via Git Push
git push origin main  # If connected to auto-deploy
```

### **3. Verify Deployment**
```bash
# Check health
curl https://[your-staging-url].onrender.com/api/health

# Check flags
curl https://[your-staging-url].onrender.com/api/flags

# Check Epic 7 KPIs
curl https://[your-staging-url].onrender.com/api/ops/kpis | jq '.epic7'
```

### **4. Run Smoke Tests**
Once deployed, test the Epic 7 endpoints:

```bash
# Set staging URL
export STAGING_URL="https://[your-app].onrender.com"

# Test learner levels
curl "$STAGING_URL/api/learners/[test-user-id]/levels"

# Test badges
curl "$STAGING_URL/api/learners/[test-user-id]/badges"

# Test certificates
curl "$STAGING_URL/api/learners/[test-user-id]/certificates"

# Test manager notifications
curl "$STAGING_URL/api/manager/notifications"
```

---

## 📝 Important Notes

### **Schema Compatibility**
- ✅ **Local Development:** Uses full schema with `uuid` types and all tables
- ✅ **Render Staging:** Uses simplified schema with `text` IDs
- ⚠️ **Production:** Will need decision on schema approach

### **Migration Files**
- **Local/Production:** Use `010_gamification.sql`, `011_idempotency.sql`, etc.
- **Staging (Render):** Use `*_staging.sql` versions

### **Future Considerations**
When setting up production:
1. **Option A:** Migrate staging to use `uuid` types (requires ALTER TABLE)
2. **Option B:** Keep staging as-is, use different schema for production
3. **Option C:** Standardize all environments to use same schema

**Recommendation:** For production, use the full `uuid`-based schema with all tables (organizations, tracks, etc.)

---

## ✅ Verification Checklist

### **Database Migrations** ✅
- [x] `learner_levels` table created
- [x] `certificates` table created (with revocation columns)
- [x] `badges` table created with 7 seed badges
- [x] `learner_badges` table created
- [x] `manager_notifications` table created
- [x] `idempotency_keys` table created
- [x] `audit_events` table created
- [x] All indexes created

### **Connection Verified** ✅
- [x] Can connect to Render database
- [x] Correct DATABASE_URL format confirmed
- [x] PostgreSQL 17 version verified

### **Next Actions** ⏳
- [ ] Configure Render web service environment variables
- [ ] Deploy API to Render staging
- [ ] Run smoke tests on staging
- [ ] Execute UAT (8 scenarios from `docs/uat/EPIC7_UAT_PLAN.md`)
- [ ] Monitor KPIs and audit events

---

## 🔗 Related Documents

- **Deployment Guide:** `EPIC7_FINAL_WRAP_UP.md`
- **Production Sanity Checks:** `EPIC7_PRODUCTION_SANITY_CHECKS.md`
- **Delivery Document:** `EPIC7_DONE_DONE_DELIVERY.md`
- **UAT Plan:** `docs/uat/EPIC7_UAT_PLAN.md`

---

## 📞 Troubleshooting

### **Connection Issues**
If you get `ENOTFOUND` errors:
- ✅ Use **External Database URL** (not Internal)
- ✅ Include full domain: `.frankfurt-postgres.render.com`
- ✅ Include port: `:5432`

### **Schema Errors**
If you get foreign key errors:
- ✅ Use `*_staging.sql` migrations (not regular migrations)
- ✅ Check `users.id` is `text` type in staging

### **Render Web Service Issues**
- ✅ Ensure `DATABASE_URL` is set in environment variables
- ✅ Verify feature flags are set (`FF_GAMIFICATION_V1=true`, etc.)
- ✅ Check build logs for errors
- ✅ Use `NODE_ENV=staging` (not `production` for staging)

---

**Status:** ✅ **Epic 7 staging database setup is complete. Ready for API deployment to Render.**

**Next:** Configure Render web service environment variables and deploy! 🚀

