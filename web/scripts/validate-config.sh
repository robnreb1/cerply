#!/bin/bash
# Cerply Web Deployment Configuration Validator
# Prevents common deployment issues by validating configuration before push

set -e

echo "==> Validating Cerply Web Deployment Configuration"
echo ""

ERRORS=0

# 1. Check vercel.json
echo "📋 Checking vercel.json..."
if [ ! -f "web/vercel.json" ]; then
  echo "   ❌ FAIL: web/vercel.json not found"
  ERRORS=$((ERRORS + 1))
else
  REWRITES=$(jq -r '.rewrites | length' web/vercel.json 2>/dev/null || echo "error")
  if [ "$REWRITES" == "error" ]; then
    echo "   ❌ FAIL: Invalid JSON in vercel.json"
    ERRORS=$((ERRORS + 1))
  elif [ "$REWRITES" -ne 0 ]; then
    echo "   ❌ FAIL: vercel.json has non-empty rewrites (should be [])"
    echo "      Current rewrites override Next.js routing and cause 404s"
    ERRORS=$((ERRORS + 1))
  else
    echo "   ✅ PASS: rewrites array is empty (using Next.js routing)"
  fi

  FUNCTIONS=$(jq -r '.functions["app/api/**/*.ts"]' web/vercel.json 2>/dev/null || echo "null")
  if [ "$FUNCTIONS" == "null" ]; then
    echo "   ❌ FAIL: vercel.json missing functions config for app/api/**/*.ts"
    echo "      App Router routes need explicit functions config"
    ERRORS=$((ERRORS + 1))
  else
    echo "   ✅ PASS: functions config present"
  fi
fi
echo ""

# 2. Check file structure
echo "📁 Checking API routes file structure..."
ROUTE_ERRORS=0

if [ ! -f "web/app/api/health/route.ts" ]; then
  echo "   ❌ FAIL: web/app/api/health/route.ts not found"
  ROUTE_ERRORS=$((ROUTE_ERRORS + 1))
else
  echo "   ✅ PASS: /api/health route exists"
fi

if [ ! -f "web/app/api/prompts/route.ts" ]; then
  echo "   ❌ FAIL: web/app/api/prompts/route.ts not found"
  ROUTE_ERRORS=$((ROUTE_ERRORS + 1))
else
  echo "   ✅ PASS: /api/prompts route exists"
fi

# Check for routes in wrong location (root app/ instead of web/app/)
if [ -d "app/api" ] && [ "$(ls -A app/api 2>/dev/null)" ]; then
  echo "   ⚠️  WARNING: Found routes in root app/api/ (should be in web/app/api/)"
  echo "      Vercel builds from web/ directory, routes in root won't be deployed"
  ROUTE_ERRORS=$((ROUTE_ERRORS + 1))
fi

if [ $ROUTE_ERRORS -eq 0 ]; then
  echo "   ✅ All critical routes in correct location"
fi
ERRORS=$((ERRORS + ROUTE_ERRORS))
echo ""

# 3. Check for forbidden env var fallbacks
echo "🔧 Checking apiBase.ts configuration..."
if [ ! -f "web/lib/apiBase.ts" ]; then
  echo "   ⚠️  WARNING: web/lib/apiBase.ts not found"
else
  if grep -q "process.env.API_BASE" web/lib/apiBase.ts; then
    echo "   ❌ FAIL: apiBase.ts contains forbidden fallback to API_BASE"
    echo "      Only NEXT_PUBLIC_API_BASE should be used (single source of truth)"
    ERRORS=$((ERRORS + 1))
  elif grep -q "NEXT_PUBLIC_API_URL" web/lib/apiBase.ts; then
    echo "   ❌ FAIL: apiBase.ts contains forbidden reference to NEXT_PUBLIC_API_URL"
    echo "      Only NEXT_PUBLIC_API_BASE should be used (single source of truth)"
    ERRORS=$((ERRORS + 1))
  else
    echo "   ✅ PASS: No forbidden fallbacks in apiBase.ts"
  fi
fi
echo ""

# 4. Check route exports (dynamic, runtime)
echo "🚀 Checking route exports..."
EXPORT_ERRORS=0

for route in web/app/api/*/route.ts web/app/api/\[*\]/route.ts; do
  if [ -f "$route" ]; then
    ROUTE_NAME=$(basename $(dirname "$route"))
    
    if ! grep -q "export const dynamic" "$route"; then
      echo "   ❌ FAIL: $ROUTE_NAME missing 'export const dynamic'"
      echo "      Routes need dynamic = 'force-dynamic' for runtime env vars"
      EXPORT_ERRORS=$((EXPORT_ERRORS + 1))
    fi
    
    if ! grep -q "export const runtime" "$route"; then
      echo "   ❌ FAIL: $ROUTE_NAME missing 'export const runtime'"
      echo "      Routes need runtime = 'nodejs' for full Node.js APIs"
      EXPORT_ERRORS=$((EXPORT_ERRORS + 1))
    fi
  fi
done

if [ $EXPORT_ERRORS -eq 0 ]; then
  echo "   ✅ PASS: All routes have required exports"
fi
ERRORS=$((ERRORS + EXPORT_ERRORS))
echo ""

# 5. Check next.config.cjs for hardcoded API URLs
echo "⚙️  Checking next.config.cjs..."
if [ -f "web/next.config.cjs" ]; then
  if grep -q "api-stg.cerply.com\|api.cerply.com" web/next.config.cjs; then
    # Check if it's in a comment or actual code
    if grep -v "^\s*//" web/next.config.cjs | grep -q "api-stg.cerply.com\|api.cerply.com"; then
      echo "   ⚠️  WARNING: next.config.cjs contains hardcoded API URLs"
      echo "      Use getApiBase() function instead for environment-specific URLs"
      # Don't fail, just warn
    else
      echo "   ✅ PASS: No hardcoded API URLs in active code"
    fi
  else
    echo "   ✅ PASS: No hardcoded API URLs"
  fi
else
  echo "   ⚠️  WARNING: web/next.config.cjs not found"
fi
echo ""

# 6. Check for common mistakes in vercel.json
echo "🔍 Checking for common vercel.json mistakes..."
if [ -f "web/vercel.json" ]; then
  if grep -q "api-stg.cerply.com\|cerply-api-stg.onrender.com" web/vercel.json; then
    echo "   ❌ FAIL: vercel.json contains hardcoded staging URLs"
    echo "      Remove hardcoded rewrites, use Next.js routing instead"
    ERRORS=$((ERRORS + 1))
  else
    echo "   ✅ PASS: No hardcoded backend URLs in vercel.json"
  fi
fi
echo ""

# Summary
echo "================================================================================"
if [ $ERRORS -eq 0 ]; then
  echo "✅ All validation checks passed!"
  echo ""
  echo "Configuration is ready for deployment."
  exit 0
else
  echo "❌ Validation failed with $ERRORS error(s)"
  echo ""
  echo "Please fix the issues above before deploying."
  echo "See docs/runbooks/web-deployment-troubleshooting.md for guidance."
  exit 1
fi

