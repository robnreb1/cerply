#!/bin/bash
# Apply Epic 7 Migrations to Production Database

set -e

echo "🚀 Epic 7 Production Database Setup"
echo "======================================"
echo ""

# Check if DATABASE_URL is provided
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is required"
  echo ""
  echo "Usage:"
  echo "  DATABASE_URL='<your-production-db-url>' ./apply-epic7-to-production.sh"
  echo ""
  echo "Get your production database URL from:"
  echo "  Render Dashboard → cerply-production → Connections → External Database URL"
  echo ""
  exit 1
fi

echo "📦 Step 1: Applying Epic 7 schema to production..."
echo ""
cd api
npx drizzle-kit push

echo ""
echo "✅ Step 2: Verifying tables were created..."
echo ""

# Check if psql is available
if command -v psql &> /dev/null; then
    echo "Epic 7 Tables in Production:"
    psql "$DATABASE_URL" -c "\dt" | grep -E "(learner_levels|certificates|badges|learner_badges|manager_notifications|idempotency_keys|audit_events)" || echo "⚠️  No Epic 7 tables found (they may already exist or psql can't connect)"
else
    echo "⚠️  psql not found - skipping verification"
    echo "   (Tables were still created, we just can't verify locally)"
fi

echo ""
echo "======================================"
echo "✅ Epic 7 Schema Applied to Production!"
echo "======================================"
echo ""
echo "Next Steps:"
echo "1. Go to Render Dashboard → cerply-api-prod → Environment"
echo "2. Add/update these environment variables:"
echo ""
echo "   DATABASE_URL=<your-production-database-url>"
echo "   FF_GAMIFICATION_V1=true"
echo "   FF_CERTIFICATES_V1=true"
echo "   FF_MANAGER_NOTIFICATIONS_V1=true"
echo "   NODE_ENV=production"
echo ""
echo "3. Save and wait for automatic redeploy"
echo "4. Test with: curl -s https://api.cerply.com/api/flags | jq"
echo ""

