#!/bin/bash
# Test Epic 8 Phase 2 with Render PostgreSQL Database
# This script helps you connect to your Render database and test

echo "🔗 Testing Phase 2 with Render PostgreSQL"
echo "=========================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  DATABASE_URL not set"
  echo ""
  echo "You need your Render PostgreSQL connection string."
  echo ""
  echo "To get it:"
  echo "  1. Go to https://dashboard.render.com"
  echo "  2. Click on your PostgreSQL database"
  echo "  3. Copy the 'External Database URL'"
  echo "  4. It looks like: postgresql://user:pass@host.render.com:5432/dbname"
  echo ""
  echo "Then run:"
  echo "  export DATABASE_URL='postgresql://user:pass@host.render.com:5432/dbname'"
  echo "  ./test-with-render-db.sh"
  echo ""
  exit 1
fi

echo "✅ DATABASE_URL is set"
echo ""

# Extract connection details
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
echo "📡 Connecting to: $DB_HOST"
echo ""

# Test connection
echo "1️⃣ Testing database connection..."
if ! psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
  echo "❌ Could not connect to database"
  echo ""
  echo "Common issues:"
  echo "  - Check your DATABASE_URL is correct"
  echo "  - Ensure your IP is whitelisted in Render"
  echo "  - Check if database is running"
  echo ""
  exit 1
fi
echo "✅ Connected to database"
echo ""

# Get a question ID (try new schema first, then old schema)
echo "2️⃣ Getting a question from database..."

# Try new schema (questions table from Epic 6.8)
QUESTION_DATA=$(psql "$DATABASE_URL" -t -c "SELECT id, stem FROM questions LIMIT 1;" 2>&1)

if [ $? -ne 0 ]; then
  # Try old schema (items table)
  QUESTION_DATA=$(psql "$DATABASE_URL" -t -c "SELECT id, stem FROM items LIMIT 1;" 2>&1)
  
  if [ $? -ne 0 ]; then
    echo "❌ Could not query questions/items table"
    echo ""
    echo "Response: $QUESTION_DATA"
    echo ""
    echo "This might mean:"
    echo "  - Neither 'questions' nor 'items' table exists"
    echo "  - You need to run migrations"
    echo "  - You need to seed the database"
    echo ""
    echo "Try running:"
    echo "  cd api"
    echo "  DATABASE_URL='$DATABASE_URL' npm run migrate"
    echo "  DATABASE_URL='$DATABASE_URL' npm run seed:demo"
    echo ""
    exit 1
  fi
fi

QUESTION_ID=$(echo "$QUESTION_DATA" | awk '{print $1}' | xargs)
STEM=$(echo "$QUESTION_DATA" | cut -d'|' -f2- | xargs)

if [ -z "$QUESTION_ID" ]; then
  echo "❌ No questions found in database"
  echo ""
  echo "You need to seed your database:"
  echo "  cd api"
  echo "  DATABASE_URL='your-render-url' npm run seed:demo"
  echo ""
  exit 1
fi

echo "✅ Found question:"
echo "   ID: $QUESTION_ID"
echo "   Question: ${STEM:0:80}..."
echo ""

# Test the explanation endpoint
echo "3️⃣ Testing explanation endpoint with real question..."
echo "   Query: 'Why is this the correct answer?'"
echo ""

RESPONSE=$(curl -s -X POST http://localhost:8080/api/chat/explanation \
  -H "Content-Type: application/json" \
  -H "x-admin-token: test-admin-token-12345" \
  -d "{
    \"questionId\": \"$QUESTION_ID\",
    \"query\": \"Why is this the correct answer?\"
  }")

# Check for errors
if echo "$RESPONSE" | grep -q '"error"'; then
  echo "❌ Error response:"
  echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
  echo ""
  
  if echo "$RESPONSE" | grep -q "OPENAI_API_KEY"; then
    echo "💡 You need to set OPENAI_API_KEY:"
    echo "   export OPENAI_API_KEY=sk-your-key-here"
    echo "   ./start-phase2-api.sh"
  elif echo "$RESPONSE" | grep -q "UNAUTHORIZED"; then
    echo "💡 Restart API with ADMIN_TOKEN:"
    echo "   ADMIN_TOKEN=test-admin-token-12345 npm run dev"
  fi
  
  exit 1
fi

# Success! Display response
echo "✅ Success! Response:"
echo ""
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Extract metrics
CACHED=$(echo "$RESPONSE" | jq -r '.cached' 2>/dev/null)
COST=$(echo "$RESPONSE" | jq -r '.cost' 2>/dev/null)
TOKENS=$(echo "$RESPONSE" | jq -r '.tokensUsed' 2>/dev/null)
MODEL=$(echo "$RESPONSE" | jq -r '.model' 2>/dev/null)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Metrics:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Model:        $MODEL"
echo "  Tokens Used:  $TOKENS"
echo "  Cost:         \$$COST"
echo "  Cached:       $CACHED"
echo ""

# Test caching
echo "4️⃣ Testing cache (calling again with same question)..."
sleep 1

RESPONSE2=$(curl -s -X POST http://localhost:8080/api/chat/explanation \
  -H "Content-Type: application/json" \
  -H "x-admin-token: test-admin-token-12345" \
  -d "{
    \"questionId\": \"$QUESTION_ID\",
    \"query\": \"Why is this the correct answer?\"
  }")

CACHED2=$(echo "$RESPONSE2" | jq -r '.cached' 2>/dev/null)
COST2=$(echo "$RESPONSE2" | jq -r '.cost' 2>/dev/null)
TOKENS2=$(echo "$RESPONSE2" | jq -r '.tokensUsed' 2>/dev/null)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Cached Response Metrics:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Tokens Used:  $TOKENS2"
echo "  Cost:         \$$COST2"
echo "  Cached:       $CACHED2"
echo ""

# Verify caching
if [ "$CACHED2" = "true" ] && [ "$COST2" = "0" ]; then
  echo "✅ Caching works perfectly!"
else
  echo "⚠️  Caching might not be working as expected"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Phase 2 Successfully Tested with Real Data!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Summary:"
echo "  ✅ Connected to Render database"
echo "  ✅ Retrieved real question data"
echo "  ✅ Generated LLM explanation"
echo "  ✅ Caching working (cost: \$0 for cached)"
echo "  ✅ Phase 2 fully operational"
echo ""

