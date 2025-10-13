#!/bin/bash

# Epic 8: Start API with feature flags enabled
cd "$(dirname "$0")/api"

export FF_CONVERSATIONAL_UI_V1=true
export FF_FREE_TEXT_ANSWERS_V1=true
export DATABASE_URL="postgresql://cerply_app:ZTv6yzkW3EaO7Hf3n4y12VrdRGtikO8T@dpg-d324843uibrs739hldp0-a.frankfurt-postgres.render.com/cerply"

# Admin token for dev/testing (bypasses auth)
export ADMIN_TOKEN="dev-admin-token-12345"

# Set your OpenAI API key here
export OPENAI_API_KEY="${OPENAI_API_KEY:-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}"

echo "🚀 Starting Cerply API with Epic 8 features enabled..."
echo "   FF_CONVERSATIONAL_UI_V1=true"
echo "   FF_FREE_TEXT_ANSWERS_V1=true"
echo "   DATABASE_URL=staging (Render)"
echo ""

npm run dev

