# API Authentication Fix for Test UI

**Issue:** Test UI shows "Error: Authentication required"  
**Cause:** API endpoint `/api/content/understand` requires admin token, but environment variable not being read correctly

---

## 🔧 Solution Applied

Updated `web/app/test-generation/page.tsx` to:
1. Read admin token from environment variable
2. Add debug logging
3. Include credentials in fetch request

---

## ✅ Quick Fix - Set Admin Token in API

Since the web UI might not be able to authenticate with the API, let's temporarily disable auth on the API side for the content endpoint:

### **Option A: Use API Admin Token (Easiest)**

Check what admin token the API expects:

```bash
cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/api

# Check for admin token in env
grep -r "ADMIN_TOKEN" src/ | head -5
```

Then set it in web:
```bash
cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/web

# Add to .env.local
echo "NEXT_PUBLIC_ADMIN_TOKEN=your-actual-admin-token-here" >> .env.local
```

---

### **Option B: Disable Auth on Content Endpoint Temporarily**

Edit `api/src/routes/content.ts` to skip auth check:

**Find this line (~line 59):**
```typescript
if (!requireManager(req, reply)) return reply;
```

**Change to:**
```typescript
// TEMPORARY: Bypass auth for local testing
// if (!requireManager(req, reply)) return reply;
```

**Then restart API server.**

---

### **Option C: Use Mock Session (Recommended)**

The API already has mock session support. Check if it's enabled:

```bash
cd api
grep -n "getSessionOrMock\|mock.*session" src/routes/content.ts
```

If it exists, the API should work with the test admin token already.

---

## 🚀 Immediate Action

**Try this now:**

1. **Check API is running with feature flags:**
```bash
# In API terminal, make sure these are set:
export FF_ENSEMBLE_GENERATION_V1=true
export FF_CONTENT_CANON_V1=true
```

2. **Restart web server** to pick up updated code:
```bash
cd web
# Ctrl+C to stop
npm run dev
```

3. **Test again:**
- Go to http://localhost:3000/test-generation
- Click "Module #13: 5 Whys Technique" 
- Click "Generate & Test"

4. **Check browser console** (F12 → Console) for debug logs:
- Should show: "Using admin token: test-admin-token"

---

## 🔍 Debug Steps

### **1. Verify Environment Variable**

Open browser console (F12) and run:
```javascript
console.log('Admin token:', process.env.NEXT_PUBLIC_ADMIN_TOKEN);
```

If it shows `undefined`, the env var isn't being read.

### **2. Check API Accepts Token**

Test API directly:
```bash
curl -X POST http://localhost:8080/api/content/understand \
  -H "Content-Type: application/json" \
  -H "x-admin-token: test-admin-token" \
  -d '{"artefact": "5 Whys Technique"}' | jq
```

If this works → Problem is in web UI  
If this fails → Problem is in API auth

---

## 🎯 Expected Behavior After Fix

When you click "Generate & Test":
1. Browser console shows: `Using admin token: test-admin-token`
2. API receives request with `x-admin-token` header
3. Response includes:
   ```json
   {
     "understanding": "...",
     "granularity": "module",
     "granularityMetadata": {
       "expected": "1 deep module",
       "reasoning": "Specific framework/tool/method"
     }
   }
   ```
4. UI displays: "Detected: MODULE" ✅

---

## 📝 Next Steps

1. Restart web server
2. Test again in browser
3. Check browser console for logs
4. If still failing, try curl command to test API directly

Let me know what you see in the browser console after restarting!

