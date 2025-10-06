# Render Environment Variables Setup

**Issue:** `/certified/study` showing "Retention preview disabled"  
**Cause:** Environment variables not yet synced from `render.yaml`  
**Solution:** Manually add environment variables in Render dashboard

---

## 🔧 Quick Fix (< 2 minutes)

### Step 1: Open Render Dashboard

1. Go to https://dashboard.render.com/
2. Find service: **cerply-api-staging-latest**
3. Click on the service name

### Step 2: Add Environment Variables

1. Click **"Environment"** in the left sidebar
2. Click **"Add Environment Variable"** button
3. Add the following **two** variables:

**Variable 1:**
```
Key: CERTIFIED_ENABLED
Value: true
```

**Variable 2:**
```
Key: RETENTION_ENABLED
Value: true
```

### Step 3: Deploy

1. After adding both variables, click **"Save Changes"**
2. Render will automatically trigger a redeploy (~3-5 minutes)
3. Wait for deployment to complete

---

## ✅ Verification

After deployment completes, test the endpoint:

```bash
curl -X POST https://cerply-api-staging-latest.onrender.com/api/certified/schedule \
  -H "Content-Type: application/json" \
  -d '{"session_id":"test-123","items":[]}'
```

**Expected response:**
```json
{
  "session_id": "test-123",
  "scheduled": [],
  "next_review": null
}
```

**Previous error (should be gone):**
```json
{
  "error": {
    "code": "CERTIFIED_DISABLED",
    "message": "Retention preview disabled"
  }
}
```

---

## 🌐 Test the Web Page

Once the API is working, refresh:
https://cerply-web.vercel.app/certified/study

**Expected:**
- ✅ No error message
- ✅ "Start Study Session" button works
- ✅ Cards flip and grade correctly
- ✅ Session resumes after page refresh

---

## 📋 Why This Happened

**Root Cause:**
- The retention endpoints check for `CERTIFIED_ENABLED` and `RETENTION_ENABLED`
- These flags were missing from the initial Render configuration
- PR #201 added them to `render.yaml`, but Render requires manual sync

**Long-term Fix:**
- Environment variables now documented in `render.yaml`
- Future deployments will include these flags
- Manual setup only needed once per environment

---

## 🔗 References

- **PR #201:** https://github.com/robnreb1/cerply/pull/201
- **Issue #198 (UAT):** https://github.com/robnreb1/cerply/issues/198
- **API Code:** `api/src/routes/certifiedRetention.ts` (lines 6-9)
- **Render Docs:** https://render.com/docs/environment-variables

---

## 🚨 Troubleshooting

**If error persists after 5 minutes:**

1. Check Render deployment logs:
   - Go to service → "Logs" tab
   - Look for "CERTIFIED_ENABLED" in logs
   - Should see: `CERTIFIED_ENABLED=true`

2. Verify environment variables are saved:
   - Go to service → "Environment" tab
   - Both variables should appear in the list
   - Values should show as `true` (not "true" with quotes)

3. Manual redeploy:
   - Go to service → "Manual Deploy" → "Deploy latest commit"
   - Wait for completion (~3-5 minutes)

**Still not working?**
- Contact @robnreb1 in GitHub issue #198
- Or check Slack: #eng-incidents

---

**Created:** 2025-10-06  
**PR:** #201  
**Status:** Waiting for Render dashboard update

