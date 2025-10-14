#!/bin/bash
# Quick Start Script for Cerply API
# This starts the API with all required environment variables

echo "🚀 Starting Cerply API with all required config..."

cd api

# Export all required environment variables
export FF_ENSEMBLE_GENERATION_V1=true
export FF_CONTENT_CANON_V1=true
export ADMIN_TOKEN=test-admin-token
export NODE_ENV=development

# Use local database if available, otherwise use in-memory mode (testing only)
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/cerply_dev}"

echo "✅ Feature flags enabled:"
echo "   - FF_ENSEMBLE_GENERATION_V1=true"
echo "   - FF_CONTENT_CANON_V1=true"
echo ""
echo "✅ Admin token: test-admin-token"
echo "✅ Database: $DATABASE_URL"
echo ""
echo "📡 Starting API on port 8080..."
echo ""

npm run dev

