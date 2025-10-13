#!/bin/bash

# Epic 8: Start Web with feature flags enabled
cd "$(dirname "$0")/web"

export NEXT_PUBLIC_CONVERSATIONAL_UI_V1=true

echo "🌐 Starting Cerply Web with Epic 8 ChatPanel enabled..."
echo "   NEXT_PUBLIC_CONVERSATIONAL_UI_V1=true"
echo ""
echo "📍 Visit: http://localhost:3000/learn"
echo "⌨️  Press Cmd+K or / to open chat"
echo ""

npm run dev

