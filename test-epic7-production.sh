#!/bin/bash
# Test Epic 7 in Production

PROD_URL="https://api.cerply.com"

echo "🧪 Testing Epic 7 in Production"
echo "================================"
echo ""

echo "1️⃣ Health Check:"
curl -s $PROD_URL/api/health | jq .
echo ""

echo "2️⃣ Feature Flags (should show Epic 7):"
curl -s $PROD_URL/api/flags | jq .
echo ""

echo "3️⃣ Epic 7 Routes (should return UNAUTHORIZED, not 404):"
curl -s $PROD_URL/api/learners/00000000-0000-0000-0000-000000000001/levels | jq .
echo ""

echo "4️⃣ KPIs (should include Epic 7 counters):"
curl -s $PROD_URL/api/ops/kpis | jq . | grep -E "(badges_awarded|levels_changed|certificates_issued|notifications_marked_read)" || echo "⚠️  Epic 7 counters not found (may be at 0)"
echo ""

echo "================================"
echo "✅ Epic 7 Production Tests Complete"
echo "================================"

