# ✅ Authentication Disabled for Testing

**Status:** Web app configured to allow `/test-generation` without login

---

## 🔧 What Was Changed

Created `web/.env.local` with:
- Added `/test-generation` to `APP_ALLOWLIST_ROUTES`
- Configured API base URL
- Set admin token for API calls

---

## 🚀 How to Access Test UI

### **Step 1: Restart Web Server**

If web server is already running:
```bash
# In the terminal running web server, press Ctrl+C to stop
# Then restart:
cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/web
npm run dev
```

If not running yet:
```bash
cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/web
npm run dev
```

**Wait for:** `✓ Ready on http://localhost:3000`

---

### **Step 2: Open Test UI**

Open browser: **http://localhost:3000/test-generation**

**You should see:**
- Granularity Detection Test Interface (no login required!)
- 15 test cases ready to use
- Custom input field

---

### **Step 3: Test the Feature**

1. Click any test case (e.g., "Subject #1: Leadership")
2. Click "Generate & Test"
3. Verify granularity detection is correct

---

## 🚨 Troubleshooting

### **Still seeing login page?**

**Solution 1: Hard refresh**
- Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- Clears browser cache

**Solution 2: Verify .env.local**
```bash
cat web/.env.local
# Should show APP_ALLOWLIST_ROUTES with /test-generation
```

**Solution 3: Check server is restarted**
```bash
# Kill any old Next.js processes
pkill -f "next dev"

# Start fresh
cd web && npm run dev
```

---

## 📝 For API Testing

If you also need the API server running:

**Terminal 1 - API:**
```bash
cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/api

# Set environment variables
export DATABASE_URL="postgresql://cerply_app:ZTv6yzkW3EaO7Hf3n4y12VrdRGtikO8T@dpg-d324843uibrs739hldp0-a.frankfurt-postgres.render.com/cerply"
export FF_ENSEMBLE_GENERATION_V1=true
export FF_CONTENT_CANON_V1=true

# Start server
npm run dev
```

**Terminal 2 - Web:**
```bash
cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/web
npm run dev
```

---

## ✅ Success Criteria

Once web server restarts, you should be able to:
- ✅ Access http://localhost:3000/test-generation without login
- ✅ See the test interface with 15 test cases
- ✅ Click "Generate & Test" and see results
- ✅ Validate granularity detection

---

## 🎯 Quick Test

Once server is restarted:
1. Go to: http://localhost:3000/test-generation
2. Click "Subject #1: Leadership"
3. Click "Generate & Test"
4. Verify: Detected = SUBJECT ✅

If this works → You're ready to test all 15 cases! 🎉

---

**Next:** Restart web server and access `/test-generation`

