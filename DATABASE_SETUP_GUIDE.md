# Database Setup Guide

## 🎯 **Why Database Is Required**

As you correctly noted:
- ✅ **Data collection** - Every interaction captured
- ✅ **Learning/adaptation** - System improves over time  
- ✅ **Deep moat** - Proprietary data = competitive advantage
- ✅ **Non-negotiable in production** (acceptable to bypass in local/test mode)

---

## 🚨 **Current Issue**

**Error:**
```
column "granularity" of relation "content_generations" does not exist
```

**Cause:** Database migration `018_add_granularity.sql` hasn't been run yet.

---

## 🔧 **Quick Setup (Render Production DB)**

### Step 1: Get Your Database URL

From your Render dashboard:
1. Go to your PostgreSQL database
2. Copy the **External Database URL**
3. Should look like: `postgresql://user:password@dpg-xxxxx.oregon-postgres.render.com/cerply`

### Step 2: Configure API

```bash
cd api
echo "DATABASE_URL=your-render-database-url-here" > .env
```

### Step 3: Run Migration

```bash
# Push schema changes to database
npm run db:push

# Or run migration directly
psql $DATABASE_URL < drizzle/018_add_granularity.sql
```

### Step 4: Restart API

```bash
# Kill existing API
lsof -ti:8080 | xargs kill -9

# Start with all env vars
cd ..
./QUICK_START_API.sh
```

---

## 🧪 **Alternative: Local PostgreSQL (Development)**

### If You Have PostgreSQL Installed:

```bash
# Start PostgreSQL
brew services start postgresql

# Create database
createdb cerply_dev

# Configure
cd api
echo "DATABASE_URL=postgresql://localhost:5432/cerply_dev" > .env

# Run migrations
npm run db:push

# Start API
cd ..
./QUICK_START_API.sh
```

---

## ✅ **Verify Setup**

### Test Database Connection:

```bash
# Check if migration worked
psql $DATABASE_URL -c "\d content_generations" | grep granularity

# Should show:
# granularity | text | | not null |
```

### Test Content Generation:

```bash
# Try the understand endpoint
curl -X POST http://localhost:8080/api/content/understand \
  -H "Content-Type: application/json" \
  -H "x-admin-token: test-admin-token" \
  -d '{"artefact": "Leadership"}' | jq .granularity

# Should return: "subject"
```

---

## 📝 **Migration Details**

### File: `api/drizzle/018_add_granularity.sql`

```sql
-- Epic 6: Ensemble Content Generation
-- BRD: B-3 | FSD: §26
-- Adds 'granularity' column for intelligent content planning

DO $$ BEGIN
    ALTER TABLE "content_generations" 
    ADD COLUMN "granularity" text;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Set default for existing rows
UPDATE "content_generations" 
SET "granularity" = 'topic' 
WHERE "granularity" IS NULL;

-- Make column NOT NULL
ALTER TABLE "content_generations" 
ALTER COLUMN "granularity" SET NOT NULL;
```

---

## 🎯 **Expected Result**

Once database is connected and migration runs:

### Subject Request:
```
User: "Leadership"
→ Saves: { granularity: "subject", artefact: "Leadership", understanding: "..." }
→ Database records the detection for learning
```

### Topic Request:
```
User: "Effective Delegation"
→ Saves: { granularity: "topic", artefact: "Effective Delegation", ... }
→ Triggers content generation (all modules)
→ Database stores complete topic with all modules
```

### Module Request:
```
User: "SMART Goals"
→ Saves: { granularity: "module", artefact: "SMART Goals", ... }
→ Identifies parent topic "Goal Setting"
→ Generates entire "Goal Setting" topic
→ Database stores complete topic, user gets "SMART Goals" module first
```

---

## 🐛 **Troubleshooting**

### Issue: "FATAL: password authentication failed"

**Fix:**
```bash
# Use the full Render connection string, including password
DATABASE_URL="postgresql://user:password@host/database"
```

### Issue: "relation 'content_generations' does not exist"

**Fix:**
```bash
# Run all migrations from scratch
cd api
npm run db:push
```

### Issue: "Port 8080 already in use"

**Fix:**
```bash
lsof -ti:8080 | xargs kill -9
sleep 1
./QUICK_START_API.sh
```

---

## 🚀 **Ready to Test**

Once database is connected:

1. **Refresh browser** at http://localhost:3000
2. **Type:** "Leadership"
3. **Expect:** 
   - Cerply suggests specific topics
   - Conversation saved to database with `granularity: "subject"`
4. **Pick a topic:** "Delegation skills"
5. **Expect:**
   - Cerply generates complete "Delegation Skills" topic
   - All modules saved to database
   - You start with Module 1

---

**Status:** Migration ready, database connection needed  
**Next:** Connect to Render DB → Run migration → Test conversational flow  
**Goal:** Full data collection for learning and adaptation

