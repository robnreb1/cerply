# 🔐 Staging Login Guide for Epic 14

## ✅ **Quick Login (Option A: Mock SSO)** ⭐ *Recommended*

**Step 1: Get Mock Login URL**

Use this URL to create a manager session:
```
https://api-stg.cerply.com/api/auth/sso/mock/callback?state=test&mock=true&email=manager@cerply.local&redirect=https://stg.cerply.com
```

**Step 2: Visit that URL**
- It will create a manager session
- Automatically redirect you back to the web app
- You'll be logged in as `manager@cerply.local` with manager role

**That's it!** You should now have access to `/curator/modules`

---

## 📋 **Manual Testing (Option B: Direct API)**

If the above doesn't work, test Epic 14 API endpoints directly:

```bash
# 1. Create a mock session
curl -X GET "https://api-stg.cerply.com/api/auth/sso/mock/callback?state=test&mock=true&email=manager@cerply.local" \
  -v 2>&1 | grep "Set-Cookie"

# This will give you a cookie like: cerply.sid=abc123...

# 2. Test Epic 14 endpoints with that cookie
curl https://api-stg.cerply.com/api/curator/modules \
  -H "Cookie: cerply.sid=YOUR_SESSION_ID_HERE"
```

---

## ⚠️ **Why This Happens**

Your app has 2 auth systems:

1. **Simple Auth** (`/api/auth/login`)
   - Used by login page
   - Only stores email, no role
   - Good for basic access

2. **SSO Auth** (`/api/auth/sso/*`)
   - Used by Epic 14
   - Stores email + role + organizationId
   - Required for RBAC (manager features)

Epic 14 requires SSO auth because it needs the `manager` role.

---

## 🔧 **Permanent Fix**

To make this work properly in production:

### **Option 1: Update Login Page to Use SSO**

Change `web/app/login/page.tsx` to call SSO endpoints instead of simple auth:

```typescript
// Instead of:
await fetch(`${apiBase()}/api/auth/login`, ...)

// Use:
await fetch(`${apiBase()}/api/auth/sso/mock/callback?...`, ...)
```

### **Option 2: Sync Simple Auth with User Roles**

Update `api/src/routes/auth.ts` to look up user role from database and create a proper session.

### **Option 3: Admin Token Bypass (Already Works!)**

You can bypass auth using admin token:

```bash
curl https://api-stg.cerply.com/api/curator/modules \
  -H "x-admin-token: YOUR_ADMIN_TOKEN"
```

Check your Render environment variables for `ADMIN_TOKEN`.

---

## 🎯 **Recommended Testing Flow**

1. **Use Mock SSO URL** (fastest, works now)
2. **Or use Admin Token** (already configured)
3. **Fix login page** to use SSO (future work)

---

## 📝 **Test with Mock SSO**

```bash
# Full test flow
MOCK_SSO_URL="https://api-stg.cerply.com/api/auth/sso/mock/callback"
MANAGER_EMAIL="manager@cerply.local"
REDIRECT="https://stg.cerply.com"

# Visit this URL in your browser:
echo "${MOCK_SSO_URL}?state=test&mock=true&email=${MANAGER_EMAIL}&redirect=${REDIRECT}"
```

**Copy that URL and paste it into your browser!** 🚀

