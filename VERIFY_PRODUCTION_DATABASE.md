# Verify Production Database Status

## ✅ What We Know:
- Production API is running at `https://api.cerply.com`
- Health check returns `ok: true`
- Epic 7 routes are deployed (return `UNAUTHORIZED`, not `404`)

## ❓ What We Need to Verify:

### **1. Does a Production Database Exist?**

**Check in Render Dashboard:**
1. Go to https://dashboard.render.com
2. Look at your **PostgreSQL databases**
3. Do you see a database for **production** (separate from staging)?

**Expected:**
- ✅ **Staging Database:** `cerply` (Frankfurt) - connected to `cerply-api-staging-latest`
- ❓ **Production Database:** `cerply-production` (Frankfurt) - should connect to production API

---

### **2. Is the Production API Connected to a Database?**

**Check Production API Service:**
1. Go to your production API service in Render
2. Click **"Environment"** tab
3. Look for **`DATABASE_URL`** variable

**Questions:**
- Is `DATABASE_URL` set?
- Does it point to a production database, or is it using the staging database?
- Does it have a valid PostgreSQL URL format?

---

### **3. Have Epic 7 Migrations Been Applied?**

If `DATABASE_URL` is set, we can test if the tables exist:

**Option A: Use Render Database Shell**
1. Go to your production database in Render
2. Click **"Shell"** tab
3. Run: `\dt`
4. Look for Epic 7 tables: `learner_levels`, `certificates`, `badges`, etc.

**Option B: Query from Local Machine**
```bash
# Get the DATABASE_URL from your production API service
# Then run:
psql "<production-database-url>" -c "\dt" | grep -E "(learner_levels|certificates|badges|idempotency|audit)"
```

---

## 🔍 **Likely Scenarios:**

### **Scenario 1: Production Uses Staging Database** ⚠️
- Production API's `DATABASE_URL` points to the staging database
- Epic 7 tables exist (from our staging setup)
- **Action Needed:** Create a dedicated production database

### **Scenario 2: Production Has No Database** ❌
- No `DATABASE_URL` set on production API service
- API might be using a default/fallback connection
- **Action Needed:** Create production database and configure `DATABASE_URL`

### **Scenario 3: Production Database Exists but No Tables** 📦
- Production database exists
- `DATABASE_URL` is configured correctly
- But Epic 7 migrations haven't been applied
- **Action Needed:** Run `npx drizzle-kit push` against production

### **Scenario 4: Everything is Set Up** ✅
- Production database exists
- Migrations applied
- Just needs Epic 7 feature flags enabled
- **Action Needed:** Verify feature flags are set

---

## 🎯 **Next Steps:**

### **Please Check:**
1. List your PostgreSQL databases in Render - how many do you have?
2. What is the `DATABASE_URL` on your production API service?
3. If the database exists, can you run `\dt` in the Shell to list tables?

**Once you provide this info, I'll guide you through the exact steps needed!**

---

## 📝 **Quick Commands:**

```bash
# If you want to check locally (requires production DATABASE_URL)
export PROD_DB_URL="<get-from-render>"

# List tables
psql "$PROD_DB_URL" -c "\dt"

# Check for Epic 7 tables specifically
psql "$PROD_DB_URL" -c "\dt" | grep -E "(learner_levels|certificates|badges|idempotency|audit)"
```

---

**Summary:** Your production API is deployed, but we need to confirm the database setup before declaring Epic 7 "production ready"! 🚀

