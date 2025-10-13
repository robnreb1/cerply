#!/bin/bash
# Start API for Epic 8 Phase 2 testing
# This sets all required environment variables

echo "🚀 Starting API with Phase 2 configuration..."
echo ""

cd api

# Check if OPENAI_API_KEY is set
if [ -z "$OPENAI_API_KEY" ]; then
  echo "⚠️  WARNING: OPENAI_API_KEY not set"
  echo "   Set it with: export OPENAI_API_KEY=sk-your-key-here"
  echo ""
fi

# Start with all required flags
FF_CONVERSATIONAL_UI_V1=true \
ADMIN_TOKEN=test-admin-token-12345 \
OPENAI_API_KEY="${OPENAI_API_KEY}" \
npm run dev
