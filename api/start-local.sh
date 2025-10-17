#!/bin/bash
# Start API server for local development
# Usage: Edit this file to add your OPENAI_API_KEY, then run: bash start-local.sh

# IMPORTANT: Replace YOUR_KEY_HERE with your actual API keys
export OPENAI_API_KEY=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

# REQUIRED FOR EPIC 6.6: Anthropic (Claude) API key
# Get one at: https://console.anthropic.com/settings/keys
export ANTHROPIC_API_KEY=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

# REQUIRED FOR GEMINI: Google API key
# Get one at: https://ai.google.dev/
export GOOGLE_API_KEY=AIzaSyCqoiSxceQieH5ZgJirNi2dUkteLdlkJVk

# Feature Flags
export FF_ENSEMBLE_GENERATION_V1=true
export FF_CONTENT_CANON_V1=true
export FF_BATCH_GENERATION_V1=true      # Epic 6.6: Content Library Seeding
export FF_AGENT_ORCHESTRATOR_V1=true    # Epic 13: Agent Orchestrator

# HYBRID ENSEMBLE CONFIGURATION
# Balance of cutting-edge (GPT-5) and proven-stable models
export LLM_GENERATOR_1="claude-sonnet-4-5"   # Best synthesis (Anthropic)
export LLM_GENERATOR_2="gpt-5"               # Best reasoning (OpenAI)
export LLM_FACT_CHECKER="gpt-4o"             # Proven reliable (OpenAI)
export LLM_CITATION_VALIDATOR="gpt-4o"       # Proven reliable (OpenAI)

# PHD-LEVEL ENSEMBLE CONFIGURATION (Pilot: Python, Enterprise Arch, Tech Startups UK)
# Single-lead model with dual validation for accessible, comprehensive content
export LLM_PHD_LEAD="gpt-5"              # Lead researcher (comprehensive generation)
export LLM_PHD_LEAD_FALLBACK="o3"        # Backup if GPT-5 fails
export LLM_PHD_CRITIQUE="claude-opus-4"  # Academic critique (quality review)
export LLM_PHD_VERIFY="gpt-4o"           # Factual verification (citation checking)

# Admin Token
export ADMIN_TOKEN=test-admin-token
export DATABASE_URL="postgresql://cerply_app:ZTv6yzkW3EaO7Hf3n4y12VrdRGtikO8T@dpg-d324843uibrs739hldp0-a.frankfurt-postgres.render.com/cerply?sslmode=require"

echo "🚀 Starting API server..."
echo "   OPENAI_API_KEY: ${OPENAI_API_KEY:0:10}..."
echo "   ADMIN_TOKEN: $ADMIN_TOKEN"
echo ""

npm run dev

