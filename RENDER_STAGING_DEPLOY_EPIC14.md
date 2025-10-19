# 🚀 Epic 14 Staging Deployment Guide

## ✅ **Pre-Deployment Status**

- ✅ **PR #951** merged to main
- ✅ **main → staging** branch pushed
- ✅ **Docker image built:** `ghcr.io/robnreb1/cerply-api:staging-latest`
- ✅ **Image pushed to GitHub Container Registry** (1m1s build time)

---

## 🐳 **Step 2: Deploy Docker Image to Render Staging**

### **Manual Deployment Steps:**

1. **Open Render Dashboard:**
   ```
   https://dashboard.render.com
   ```

2. **Find Service:**
   - Navigate to: **cerply-api-staging-latest**
   - Region: Frankfurt (dpg-d324843uibrs739hldp0)

3. **Trigger Manual Deploy:**
   - Click **"Manual Deploy"** button
   - Select: **"Deploy latest commit"**
   - Render will pull `ghcr.io/robnreb1/cerply-api:staging-latest`

4. **Wait for Deployment:**
   - Takes ~2-3 minutes
   - Watch logs for:
     ```
     ==> Starting service with 'npm start'
     ==> Server listening on port 8080
     ```

---

## 🔍 **Step 3: Verify Deployment Health**

### **Check API Health:**

```bash
curl https://cerply-api-staging-latest.onrender.com/api/health
```

**Expected Response:**
```json
{
  "ok": true,
  "env": "staging",
  "planner": {
    "provider": "openai",
    "primary": "gpt-5",
    "fallback": "gpt-4o",
    "enabled": false
  }
}
```

### **Check Epic 14 Routes:**

```bash
# List modules (requires auth)
curl https://cerply-api-staging-latest.onrender.com/api/curator/modules \
  -H "Authorization: Bearer YOUR_STAGING_TOKEN"
```

---

## 📊 **Step 4: Database Verification**

Epic 14 tables should already exist from migration #025:

```bash
# Connect to staging database
psql "postgresql://cerply_user:PASSWORD@dpg-d324843uibrs739hldp0-a.frankfurt-postgres.render.com/cerply_db"

# Verify tables
\dt manager_modules
\dt module_assignments
\dt module_proprietary_content
\dt module_content_edits
```

---

## 🌐 **Step 5: Test Web UI**

1. **Open Staging Web:**
   ```
   https://cerply-web-staging.vercel.app/curator/modules
   ```

2. **Login with Manager Account:**
   - Requires Clerk authentication
   - Use staging credentials

3. **Test Module Creation:**
   - Click "Create Module"
   - Select a topic
   - Fill in module details
   - Assign to team

---

## ⚠️ **Common Issues**

### **Issue 1: "No topics available"**
- **Cause:** Fresh database with no topics
- **Fix:** Create test topics first:
  ```sql
  INSERT INTO topics (id, name, description) 
  VALUES (gen_random_uuid(), 'Test Topic', 'For Epic 14 testing');
  ```

### **Issue 2: "Authentication required"**
- **Cause:** No valid session
- **Fix:** Login via Web UI first, then API calls will work

### **Issue 3: Docker image not found**
- **Cause:** Image not public or wrong registry
- **Fix:** Verify at https://github.com/robnreb1/cerply/pkgs/container/cerply-api

---

## 🎯 **Success Criteria**

- ✅ API health check returns `"ok": true`
- ✅ `/api/curator/modules` returns 200 or auth error (not 404)
- ✅ Web UI shows module creation form
- ✅ Can create test module
- ✅ Can assign module to team
- ✅ Can view module analytics

---

## 📝 **Environment Variables**

Ensure Render staging has:

```bash
# Epic 13 (Agent Orchestrator)
AGENT_LLM_MODEL=gpt-4o
AGENT_MAX_ITERATIONS=5

# Epic 14 (Manager Modules) - No new vars required
# Uses existing DATABASE_URL and authentication

# Database
DATABASE_URL=postgresql://...frankfurt-postgres.render.com...
```

---

## 🚀 **Ready to Deploy!**

All prerequisites met. Click **"Manual Deploy"** in Render dashboard now.

