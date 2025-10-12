#!/bin/bash
# Verify Epic 7 in Production

PROD_URL="https://api.cerply.com"

echo "🧪 Verifying Epic 7 in Production"
echo "=================================="
echo ""

echo "1️⃣ Health Check:"
curl -s $PROD_URL/api/health | jq .
echo ""

echo "2️⃣ Version Headers (should include x-image-revision, x-image-created):"
curl -sI $PROD_URL/api/version | grep "x-image"
echo ""

echo "3️⃣ Feature Flags (should show Epic 7 flags):"
curl -s $PROD_URL/api/flags | jq .
echo ""

echo "4️⃣ Epic 7 Routes (should return UNAUTHORIZED, not 404):"
curl -s $PROD_URL/api/learners/00000000-0000-0000-0000-000000000001/levels | jq .
echo ""

echo "5️⃣ KPIs (should include Epic 7 counters):"
curl -s $PROD_URL/api/ops/kpis | jq . | head -30
echo ""

echo "=================================="
echo "✅ Verification Complete"
echo "=================================="

