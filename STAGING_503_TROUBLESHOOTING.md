# 🔍 Staging 503 Error - Troubleshooting Guide

## 🚨 **Current Status**

All API endpoints returning 503 Service Unavailable:
```
❌ /api/health: 503
❌ /api/topics: 503  
❌ /api/chat: 503
❌ /api/curator/modules: 503
```

**Diagnosis:** Service is likely crashing on startup or restarting continuously.

---

## 📋 **Step 1: Check Render Logs**

1. **Go to Render Dashboard:**
   ```
   https://dashboard.render.com
   ```

2. **Select Service:**
   - cerply-api-staging-latest (Frankfurt)

3. **View Logs:**
   - Click "Logs" tab
   - Look for errors in the last 5-10 minutes

### **Common Error Patterns:**

**A) Database Connection Error:**
```
Error: connect ETIMEDOUT
Error: no pg_hba.conf entry for host
Error: password authentication failed
```

**B) Missing Environment Variable:**
```
Error: OPENAI_API_KEY environment variable is required
Error: DATABASE_URL is required
```

**C) Migration Error:**
```
Error: relation "manager_modules" does not exist
Error: column "user_id" of relation "agent_conversations" does not exist
```

**D) Docker Build Error:**
```
Error: Cannot find module
npm ERR! Missing script: "start"
```

---

## 🔧 **Step 2: Likely Causes & Fixes**

### **Most Likely: Database Migration Not Run**

Epic 14 requires migration #025. Check if it was applied:

```sql
-- Connect to staging database
psql "postgresql://cerply_user:PASSWORD@dpg-d324843uibrs739hldp0-a.frankfurt-postgres.render.com/cerply_db"

-- Check if Epic 14 tables exist
\dt manager_modules
\dt module_assignments

-- If they don't exist, run migration:
-- (You need to do this manually as Render doesn't auto-migrate)
```

### **Fix: Run Migrations Against Staging**

```bash
# From your local machine
cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/api

# Set staging DATABASE_URL
export DATABASE_URL="postgresql://cerply_user:PASSWORD@dpg-d324843uibrs739hldp0-a.frankfurt-postgres.render.com/cerply_db"

# Run migrations
npm run migrate
```

---

### **Second Likely: Environment Variables Missing**

Check Render dashboard for these required env vars:

```bash
# Required for Epic 13 (Agent Orchestrator)
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
AGENT_LLM_MODEL=gpt-4o
AGENT_MAX_ITERATIONS=5

# Required for database
DATABASE_URL=postgresql://...

# Required for auth (if using Clerk)
CLERK_SECRET_KEY=...
```

**Fix:** Add missing variables in Render dashboard → Environment tab

---

### **Third Likely: Docker Image Build Issue**

The `staging-latest` Docker image may have build errors.

**Check GitHub Actions:**
```bash
gh run list --branch staging --workflow "Build Docker Image for Staging" --limit 1
```

**Fix:** If build failed, check logs:
```bash
gh run view <run-id> --log
```

---

## 🚀 **Step 3: Quick Fixes to Try**

### **Option A: Redeploy with Clear Cache**

In Render dashboard:
1. Go to Settings
2. Click "Clear Build Cache"
3. Click "Manual Deploy" → "Deploy latest commit"

### **Option B: Check Database Connection**

Test from local:
```bash
psql "postgresql://cerply_user:PASSWORD@dpg-d324843uibrs739hldp0-a.frankfurt-postgres.render.com/cerply_db" -c "SELECT version();"
```

### **Option C: Rollback Docker Image**

If Epic 14 deployment broke something:
```bash
# In Render dashboard
# Manual Deploy → Select previous commit (before Epic 14)
```

---

## 📊 **Step 4: Diagnostic Queries**

If you can connect to the database, run these:

```sql
-- Check if Epic 14 tables exist
SELECT tablename FROM pg_tables 
WHERE tablename IN ('manager_modules', 'module_assignments', 'module_proprietary_content', 'module_content_edits');

-- Check if Epic 13 tables exist  
SELECT tablename FROM pg_tables
WHERE tablename IN ('agent_conversations', 'agent_tool_calls');

-- Check migration history (if you have a migrations table)
SELECT * FROM migrations ORDER BY created_at DESC LIMIT 10;
```

---

## ✅ **Expected Healthy State**

Once fixed, you should see:

```bash
$ curl https://cerply-api-staging-latest.onrender.com/api/health
{
  "ok": true,
  "env": "staging",
  "planner": { ... }
}

$ curl https://cerply-api-staging-latest.onrender.com/api/curator/modules
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
# ☝️ 401 UNAUTHORIZED (not 503!) means route exists and is working
```

---

## 🆘 **What to Check First**

1. **Render Logs** (most important!)
2. **Database migration status**
3. **Environment variables**
4. **Docker build logs**

**Let me know what you see in the Render logs and I'll help debug further!**

