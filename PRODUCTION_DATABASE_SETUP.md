# Production Database Setup Guide

**Status:** ⏳ **REQUIRED BEFORE PRODUCTION DEPLOYMENT**

---

## 🗄️ **Step 1: Create Production PostgreSQL Database in Render**

### **In Render Dashboard:**

1. **Go to Render Dashboard:** https://dashboard.render.com

2. **Click "New +"** (top right) → **"PostgreSQL"**

3. **Configure Database:**
   ```
   Name: cerply-production
   Database: cerply
   User: cerply_app
   Region: Frankfurt (EU Central) [or your preferred region]
   PostgreSQL Version: 16
   Plan: Starter ($7/month) or Free
   ```

4. **Click "Create Database"**

5. **Wait ~2-3 minutes** for database to provision

---

## 🔑 **Step 2: Get Production Database URL**

After creation, in the database page:

1. **Scroll down to "Connections"**

2. **Copy the "External Database URL"** - it looks like:
   ```
   postgresql://cerply_app:<password>@<hostname>.frankfurt-postgres.render.com:5432/cerply
   ```

3. **Save this URL securely** - you'll need it for:
   - Applying migrations
   - Configuring the production API service

**⚠️ Important:** This is the **production** database - keep the URL secure!

---

## 🔧 **Step 3: Apply Epic 7 Migrations**

Now run the migrations from your **local machine**:

### **Open Terminal:**

```bash
cd api

# Set the production database URL (replace with your actual URL)
export DATABASE_URL="postgresql://cerply_app:<password>@<hostname>.frankfurt-postgres.render.com:5432/cerply"

# Apply ALL migrations (including Epic 7) using drizzle-kit
npx drizzle-kit push
```

**You should see:**
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

**Note:** If you see "No changes detected", migrations are already applied!

---

## 📋 **Step 4: Verify Migrations Applied**

Connect to the database and verify Epic 7 tables exist:

```bash
# Using psql (if installed)
psql "$DATABASE_URL" -c "\dt"

# You should see these Epic 7 tables:
# - learner_levels
# - certificates
# - badges
# - learner_badges
# - manager_notifications
# - idempotency_keys
# - audit_events
```

**Or verify via Render Dashboard:**
1. Go to your database in Render
2. Click **"Shell"** tab
3. Run: `\dt` to list tables
4. Confirm Epic 7 tables exist

---

## 🔗 **Step 5: Configure Production API Service**

Now connect your production API to the database:

### **Option A: Create New Production Service**

If you don't have a production API service yet:

1. **In Render Dashboard:** Click "New +" → **"Web Service"**

2. **Configure:**
   ```
   Name: cerply-api-production
   Environment: Docker
   Branch: main
   Region: Frankfurt (same as database)
   
   Image URL: ghcr.io/robnreb1/cerply-api:prod
   
   Health Check Path: /api/health
   ```

3. **Set Environment Variables:**
   ```bash
   # Database
   DATABASE_URL=<your-production-database-url>
   
   # Environment
   NODE_ENV=production
   
   # Epic 7 Feature Flags
   FF_GAMIFICATION_V1=true
   FF_CERTIFICATES_V1=true
   FF_MANAGER_NOTIFICATIONS_V1=true
   
   # Other required vars
   OPENAI_API_KEY=<your-key>
   ```

4. **Click "Create Web Service"**

### **Option B: Update Existing Production Service**

If you already have a production API service:

1. Go to your production service in Render

2. Click **"Environment"** tab

3. **Add/Update these variables:**
   ```bash
   DATABASE_URL=<your-production-database-url>
   FF_GAMIFICATION_V1=true
   FF_CERTIFICATES_V1=true
   FF_MANAGER_NOTIFICATIONS_V1=true
   ```

4. **Click "Save Changes"**

5. Service will automatically redeploy

---

## ✅ **Step 6: Verify Production Setup**

After the API service deploys:

### **Test Database Connection:**
```bash
PROD_URL="https://api.cerply.com"  # or your production URL

# Health check should show ok: true
curl -s $PROD_URL/api/health | jq

# Epic 7 routes should return UNAUTHORIZED (not 404)
curl -s $PROD_URL/api/learners/00000000-0000-0000-0000-000000000001/levels | jq
```

**Expected Results:**
- ✅ Health check returns `{ "ok": true }`
- ✅ Epic 7 routes return `UNAUTHORIZED` (proves routes exist)
- ❌ If you see database connection errors, check DATABASE_URL

---

## 🔐 **Security Checklist**

Before going live:

### **Database Security:**
- ✅ Database is in same region as API (lower latency)
- ✅ Connection uses SSL (Render default)
- ✅ Database password is strong (Render auto-generates)
- ✅ Only API service can access database

### **API Security:**
- ✅ `NODE_ENV=production` (disables dev-only features)
- ✅ No `ADMIN_TOKEN` set (or if set, use strong value)
- ✅ All feature flags explicitly set
- ✅ CORS configured for production domain

---

## 📊 **Migration Summary**

Epic 7 requires these database tables:

| Table | Purpose | Records |
|-------|---------|---------|
| `learner_levels` | Track learner progression | ~Users × Tracks |
| `certificates` | Store issued certificates | ~Completions |
| `badges` | Define achievement types | ~17 (seeded) |
| `learner_badges` | Track earned badges | ~Users × Badges |
| `manager_notifications` | Manager alerts | ~Events |
| `idempotency_keys` | Prevent duplicate operations | ~24h TTL |
| `audit_events` | Compliance logging | ~180d retention |

---

## 🚨 **Troubleshooting**

### **Issue: "Why not npm run migrate?"**
**Solution:** Epic 7 migrations are in the `drizzle/` folder, not `migrations/`. 
- `npm run migrate` only runs files in `migrations/`
- `npx drizzle-kit push` applies the schema from `drizzle/`
- Use `drizzle-kit push` for Epic 7 migrations

### **Issue: Migration fails with "connection refused"**
**Solution:** Check DATABASE_URL format and network access

### **Issue: Migration fails with "column already exists"**
**Solution:** Migrations already applied - you're good! Verify with `\dt`

### **Issue: "No changes detected" when running push**
**Solution:** Perfect! Migrations are already applied. Continue to Step 4.

### **Issue: API can't connect to database**
**Solution:** 
1. Verify DATABASE_URL in Render environment variables
2. Check database is in same region
3. Ensure database is running (not paused)

### **Issue: Tables missing after migration**
**Solution:** Re-run migration command:
```bash
cd api
DATABASE_URL="<prod-url>" npx drizzle-kit push
```

---

## 📝 **Quick Reference**

### **Staging Database (Already Set Up):**
```
Service: cerply (Frankfurt)
Used by: cerply-api-staging-latest
Status: ✅ Working with Epic 7
```

### **Production Database (To Create):**
```
Service: cerply-production (Frankfurt)
Used by: cerply-api-production
Status: ⏳ Needs to be created
```

---

## ✨ **After Setup Complete**

Once database is set up and migrations applied:

1. ✅ **Production database ready** with Epic 7 tables
2. ✅ **API service connected** to database
3. ✅ **Environment variables set** for Epic 7
4. ✅ **Ready to promote** staging image to production

**Then you can run:** "Promote API image to prod" workflow 🚀

---

## 📚 **Related Files**

- [EPIC7_DEPLOYMENT_STATUS.md](./EPIC7_DEPLOYMENT_STATUS.md) - Overall deployment status
- [RENDER_DEPLOYMENT_ARCHITECTURE.md](./RENDER_DEPLOYMENT_ARCHITECTURE.md) - Architecture overview

---

**Next Step:** Create the production database in Render, then apply migrations! 🗄️

