# Web Deployment Troubleshooting Runbook

**Version:** 1.0  
**Last Updated:** 2025-10-05  
**Maintainers:** DevOps, Platform Team

## Purpose

This runbook documents common deployment issues, debugging procedures, and configuration validation for the Cerply web application deployed on Vercel.

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Common Issues & Solutions](#common-issues--solutions)
3. [Debugging Procedures](#debugging-procedures)
4. [Configuration Validation](#configuration-validation)
5. [Rollback Procedures](#rollback-procedures)

---

## Pre-Deployment Checklist

### 1. Environment Variables Audit

**Location:** Vercel Dashboard → Project Settings → Environment Variables

Run this check before every deployment:

```bash
# List all environment variables in Vercel
gh api repos/:owner/:repo/deployments --jq '.[0].environment'

# Or manually check in Vercel dashboard
```

#### Required Variables (Production)
- ✅ `NEXT_PUBLIC_API_BASE` → `https://api.cerply.com`
- ✅ `NODE_VERSION` → `20`
- ✅ `NEXT_TELEMETRY_DISABLED` → `1`

#### Forbidden Variables (Remove if present)
- ❌ `API_BASE` - Causes fallback confusion in apiBase()
- ❌ `NEXT_PUBLIC_API_URL` - Duplicate of NEXT_PUBLIC_API_BASE
- ❌ Any hardcoded service URLs from old configurations

#### Why This Matters
- **Single Source of Truth:** Only `NEXT_PUBLIC_API_BASE` should define the API endpoint
- **No Fallbacks:** Multiple variables cause routing confusion (hitting wrong Render services)
- **Environment-Specific:** Production/Staging/Preview each need their own correct value

### 2. Configuration Files Audit

#### `web/vercel.json`
```json
{
  "version": 2,
  "rewrites": [],  // ✅ MUST be empty - use Next.js routing
  "functions": {   // ✅ MUST be present for App Router
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

**Common Mistakes:**
- ❌ Hardcoded rewrites (e.g., `{"source": "/api/:path*", "destination": "https://api-stg.cerply.com/..."}`)
- ❌ Missing `functions` config (causes 404s or 10-second timeouts)
- ❌ Conflicting `rewrites` that override Next.js routing

#### `web/next.config.cjs`
```javascript
async rewrites() {
  const API_ORIGIN = getApiBase();
  return [
    // ❌ DO NOT rewrite /api/* here - handled by app/api/[...path]/route.ts
    // ✅ Only non-/api/* backend routes
    { source: '/curator/:path*', destination: `${API_ORIGIN}/curator/:path*` },
    { source: '/ping', destination: `${API_ORIGIN}/ping` },
  ];
}
```

**Why:** Next.js rewrites run at **build-time**, so environment variables are frozen. Runtime routes (`app/api/`) can read runtime environment variables.

#### `web/lib/apiBase.ts`
```typescript
export function apiBase(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_API_BASE ??
    // ❌ DO NOT add fallbacks like process.env.API_BASE
    'https://api.cerply.com'; // Production default
  return fromEnv.replace(/\/+$/, '');
}
```

**Common Mistake:** Adding fallbacks to `API_BASE` or `NEXT_PUBLIC_API_URL` defeats single source of truth.

### 3. File Structure Verification

**Vercel Root Directory:** `web/` (check Project Settings → Root Directory)

API routes MUST be in:
```
web/
  app/
    api/
      [...path]/
        route.ts          ✅ Catch-all proxy
      health/
        route.ts          ✅ Explicit route
      prompts/
        route.ts          ✅ Explicit route
```

**Common Mistake:** Putting routes in repository root `app/api/` instead of `web/app/api/`

### 4. Route Configuration Validation

Each API route file MUST have:

```typescript
import { NextRequest, NextResponse } from 'next/server';

// ✅ REQUIRED: Force dynamic rendering (no static optimization)
export const dynamic = 'force-dynamic';

// ✅ REQUIRED: Use Node.js runtime (not Edge)
export const runtime = 'nodejs';

// ✅ REQUIRED: Disable revalidation caching
export const revalidate = 0;

export async function GET(req: NextRequest) {
  // Read runtime env var (not build-time)
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.cerply.com';
  // ...
}
```

**Why This Matters:**
- Without `dynamic = 'force-dynamic'`, Next.js tries to statically optimize and reads env vars at build-time
- Without `runtime = 'nodejs'`, you can't use Node.js APIs like `fetch` with full headers
- Without `revalidate = 0`, responses may be cached incorrectly

---

## Common Issues & Solutions

### Issue 1: 404 on `/api/*` Routes in Production

#### Symptoms
- Local development works fine
- Vercel build logs show route built: `├ ƒ /api/[...path]`
- Production returns 404
- No `x-proxied-by` header in response

#### Root Causes & Solutions

**A. Route in wrong directory**
```bash
# Check if route exists in correct location
ls -la web/app/api/[...path]/route.ts

# If in root app/, move it:
git mv app/api/[...path] web/app/api/[...path]
```

**B. vercel.json has conflicting rewrites**
```bash
# Check vercel.json
cat web/vercel.json | jq '.rewrites'

# Should be: []
# If not, remove hardcoded rewrites
```

**C. Missing functions config**
```bash
# Check functions config
cat web/vercel.json | jq '.functions'

# Must include:
# "app/api/**/*.ts": { "maxDuration": 30 }
```

**D. Vercel cache stale**
```bash
# Purge Vercel caches
# 1. Go to Vercel Dashboard → Deployment → More → "Invalidate CDN Cache"
# 2. Go to Storage → Data Cache → "Purge All"
# 3. Trigger fresh deployment
```

#### Verification
```bash
curl -i https://www.cerply.com/api/health
# Should see:
# HTTP/2 200
# x-proxied-by: next-explicit-route  ✅
# x-proxy-target: https://api.cerply.com/api/health  ✅
```

### Issue 2: Proxy Hitting Wrong Backend Service

#### Symptoms
- Proxy returns 404 or unexpected data
- `rndr-id` header shows different service than expected
- Direct backend call works, proxied call fails

#### Root Causes & Solutions

**A. Multiple environment variables pointing to different services**
```bash
# Check all API-related env vars in Vercel
# Look for:
# - NEXT_PUBLIC_API_BASE
# - API_BASE (should NOT exist)
# - NEXT_PUBLIC_API_URL (should NOT exist)

# Delete duplicates, keep only NEXT_PUBLIC_API_BASE
```

**B. Code has fallback to wrong variable**
```typescript
// ❌ BAD (before fix)
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ??
  process.env.API_BASE ??  // Points to wrong service!
  'default';

// ✅ GOOD (after fix)
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ??
  'https://api.cerply.com';
```

#### Verification
```bash
# Check which backend is being hit
curl -i https://www.cerply.com/api/health | grep -E '(rndr-id|x-proxy-target)'

# Compare to direct backend call
curl -i https://api.cerply.com/api/health | grep rndr-id

# rndr-id should match!
```

### Issue 3: Build-Time vs Runtime Environment Variables

#### Symptoms
- Environment variable changes in Vercel don't take effect
- Need to redeploy to pick up new values
- Different values in build logs vs runtime

#### Root Causes & Solutions

**A. Using Next.js rewrites (build-time) instead of routes (runtime)**
```javascript
// ❌ BAD: Build-time rewrite
// next.config.cjs
async rewrites() {
  return [
    { 
      source: '/api/:path*',
      // Frozen at build-time! Won't pick up runtime changes.
      destination: `${process.env.NEXT_PUBLIC_API_BASE}/api/:path*`
    }
  ];
}

// ✅ GOOD: Runtime route
// app/api/[...path]/route.ts
export const dynamic = 'force-dynamic';
export async function GET(req) {
  // Read at runtime! Picks up changes without rebuild.
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE;
  // ...
}
```

**B. Missing `dynamic = 'force-dynamic'` export**
```typescript
// ❌ BAD: Will be statically optimized
export async function GET(req) {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE;
}

// ✅ GOOD: Forces dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(req) {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE;
}
```

#### Verification
```bash
# Add debug endpoint
# app/api/test-proxy/route.ts
export const dynamic = 'force-dynamic';
export async function GET() {
  return Response.json({
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE,
    timestamp: new Date().toISOString()
  });
}

# Test it
curl https://www.cerply.com/api/test-proxy
# Should show current env var value
```

### Issue 4: Vercel Deploying from Wrong Branch

#### Symptoms
- Merging PR doesn't update production
- Production shows old code
- Build logs reference wrong commit

#### Root Causes & Solutions

**A. Check Vercel domain configuration**
```bash
# Vercel Dashboard → Settings → Domains
# Check which branch each domain points to:
# - www.cerply.com → Production environment → main branch ✅
# - stg.cerply.com → Preview environment → staging branch ✅
```

**B. Trigger manual redeployment**
```bash
# Option 1: Empty commit to force deploy
git commit --allow-empty -m "chore: trigger redeploy"
git push origin main

# Option 2: Vercel Dashboard → Deployments → [latest] → Redeploy
```

**C. Check Git Deployments setting**
```bash
# Vercel Dashboard → Settings → Git
# Production Branch: main ✅
# Deploy Hooks: (none unless needed)
```

#### Verification
```bash
# Check deployed commit hash
curl -I https://www.cerply.com/ | grep x-vercel-id

# Compare to GitHub
git rev-parse origin/main
```

---

## Debugging Procedures

### Debug Endpoint

Create a debug endpoint for troubleshooting:

```typescript
// web/app/api/debug/route.ts
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return Response.json({
    env: {
      NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    },
    vercel: {
      region: process.env.VERCEL_REGION,
      deployment_id: process.env.VERCEL_DEPLOYMENT_ID,
    },
    timestamp: new Date().toISOString(),
  }, {
    headers: {
      'cache-control': 'no-store',
    },
  });
}
```

### Proxy Trace Headers

Add trace headers to proxy routes:

```typescript
export async function GET(req: NextRequest) {
  const target = `${API_BASE}/api/${path}`;
  
  console.log('[PROXY]', {
    path,
    target,
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE,
  });
  
  const response = await fetch(target);
  
  const headers = new Headers(response.headers);
  headers.set('x-proxy-target', target);
  headers.set('x-proxy-timestamp', new Date().toISOString());
  
  return new Response(response.body, { status: response.status, headers });
}
```

### Vercel Function Logs

View real-time logs:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# View logs for production
vercel logs --prod --follow

# View logs for specific deployment
vercel logs [deployment-url]
```

### Build Output Analysis

Check build output for route detection:

```bash
# In build logs, look for:
# Route (app)                                Size     First Load JS
# ├ ƒ /api/[...path]                         0 B                0 B
# ├ ƒ /api/health                            0 B                0 B
# ├ ƒ /api/prompts                           0 B                0 B
#
# ƒ = Dynamic route (serverless function) ✅
# ○ = Static route ❌ (wrong for API routes)
```

---

## Configuration Validation

### Automated Validation Script

Create `web/scripts/validate-config.sh`:

```bash
#!/bin/bash
set -e

echo "==> Validating Cerply Web Deployment Configuration"

# 1. Check vercel.json
echo "==> Checking vercel.json..."
REWRITES=$(jq -r '.rewrites | length' web/vercel.json)
if [ "$REWRITES" -ne 0 ]; then
  echo "❌ FAIL: vercel.json has non-empty rewrites (should be [])"
  exit 1
fi

FUNCTIONS=$(jq -r '.functions["app/api/**/*.ts"]' web/vercel.json)
if [ "$FUNCTIONS" == "null" ]; then
  echo "❌ FAIL: vercel.json missing functions config for app/api/**/*.ts"
  exit 1
fi
echo "✅ PASS: vercel.json configuration valid"

# 2. Check file structure
echo "==> Checking file structure..."
if [ ! -f "web/app/api/health/route.ts" ]; then
  echo "❌ FAIL: web/app/api/health/route.ts not found"
  exit 1
fi
if [ ! -f "web/app/api/prompts/route.ts" ]; then
  echo "❌ FAIL: web/app/api/prompts/route.ts not found"
  exit 1
fi
echo "✅ PASS: API routes in correct location"

# 3. Check for forbidden env var fallbacks
echo "==> Checking apiBase.ts..."
if grep -q "process.env.API_BASE" web/lib/apiBase.ts; then
  echo "❌ FAIL: apiBase.ts contains forbidden fallback to API_BASE"
  exit 1
fi
echo "✅ PASS: No forbidden fallbacks in apiBase.ts"

# 4. Check route exports
echo "==> Checking route exports..."
for route in web/app/api/*/route.ts; do
  if ! grep -q "export const dynamic" "$route"; then
    echo "❌ FAIL: $route missing 'export const dynamic'"
    exit 1
  fi
  if ! grep -q "export const runtime" "$route"; then
    echo "❌ FAIL: $route missing 'export const runtime'"
    exit 1
  fi
done
echo "✅ PASS: All routes have required exports"

echo ""
echo "✅ All validation checks passed!"
```

Run before every deployment:

```bash
chmod +x web/scripts/validate-config.sh
./web/scripts/validate-config.sh
```

### Pre-Commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Validate web config if changed
if git diff --cached --name-only | grep -q "^web/"; then
  echo "Web files changed, running config validation..."
  ./web/scripts/validate-config.sh || exit 1
fi
```

---

## Rollback Procedures

### Immediate Rollback (Production Down)

```bash
# Option 1: Vercel Dashboard
# 1. Go to Deployments
# 2. Find last known good deployment
# 3. Click "..." → "Promote to Production"

# Option 2: CLI
vercel rollback [deployment-url] --prod
```

### Revert Code Changes

```bash
# Identify bad commit
git log --oneline -10

# Create revert PR
git revert <bad-commit-sha>
git push origin main

# Or revert to specific good commit
git reset --hard <good-commit-sha>
git push --force origin main  # ⚠️ Only if emergency
```

### Environment Variable Rollback

```bash
# Document current values first
vercel env ls > env-backup-$(date +%Y%m%d).txt

# Remove bad variable
vercel env rm VARIABLE_NAME production

# Add correct value
vercel env add NEXT_PUBLIC_API_BASE production
# Enter: https://api.cerply.com

# Trigger redeploy
vercel --prod
```

---

## Post-Incident Review

After any deployment issue, update this runbook:

1. **Document the issue** in the "Common Issues" section
2. **Add validation checks** to prevent recurrence
3. **Update checklists** with new steps
4. **Share learnings** with the team

### Template for New Issues

```markdown
### Issue X: [Short Description]

#### Symptoms
- [What users/operators saw]

#### Root Causes & Solutions
- [Why it happened]
- [How to fix it]

#### Verification
```bash
# [Command to verify fix]
```

#### Prevention
- [Checklist item to add]
- [Validation script to create]
```

---

## Quick Reference

### Emergency Contacts
- **Platform Team:** [Slack #platform]
- **DevOps On-Call:** [PagerDuty rotation]

### Key URLs
- **Vercel Dashboard:** https://vercel.com/[org]/cerply-web
- **Render Dashboard:** https://dashboard.render.com/
- **Status Page:** https://status.cerply.com (if exists)

### Critical Commands

```bash
# Check production status
curl -i https://www.cerply.com/api/health

# View live logs
vercel logs --prod --follow

# Emergency rollback
vercel rollback [deployment-url] --prod

# Force fresh deployment
git commit --allow-empty -m "chore: trigger redeploy" && git push
```

---

**Runbook Version:** 1.0  
**Last Updated:** 2025-10-05  
**Next Review:** 2025-11-05

