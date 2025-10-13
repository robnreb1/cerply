#!/bin/bash
# Helper script to find database and get a question ID

echo "🔍 Looking for your database..."
echo ""

# Try common database names
DATABASES=("cerply_dev" "cerply" "postgres" "cerply_staging" "cerply_production")

for DB in "${DATABASES[@]}"; do
  echo "Trying database: $DB"
  RESULT=$(psql -d "$DB" -t -c "SELECT id, stem FROM items LIMIT 1;" 2>/dev/null | head -1)
  
  if [ ! -z "$RESULT" ]; then
    QUESTION_ID=$(echo "$RESULT" | awk '{print $1}')
    STEM=$(echo "$RESULT" | cut -d'|' -f2)
    
    echo "✅ Found database: $DB"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Question ID: $QUESTION_ID"
    echo "Question: $STEM"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Use this curl command to test:"
    echo ""
    echo "curl -X POST http://localhost:8080/api/chat/explanation \\"
    echo "  -H \"Content-Type: application/json\" \\"
    echo "  -H \"x-admin-token: test-admin-token-12345\" \\"
    echo "  -d '{"
    echo "    \"questionId\": \"$QUESTION_ID\","
    echo "    \"query\": \"Why is this the correct answer?\""
    echo "  }'"
    echo ""
    
    # Save to file for easy copy
    echo "$QUESTION_ID" > /tmp/question_id.txt
    echo "💾 Question ID saved to /tmp/question_id.txt"
    exit 0
  fi
done

echo "❌ Could not find any database with questions"
echo ""
echo "Options:"
echo ""
echo "1️⃣ Check if PostgreSQL is running:"
echo "   pg_isready"
echo ""
echo "2️⃣ List all databases:"
echo "   psql -l"
echo ""
echo "3️⃣ Create and seed the database:"
echo "   cd api"
echo "   npm run migrate"
echo "   npm run seed:demo"
echo ""
echo "4️⃣ Or test with a mock question ID (will fail but shows the flow):"
echo "   curl -X POST http://localhost:8080/api/chat/explanation \\"
echo "   -H \"Content-Type: application/json\" \\"
echo "   -H \"x-admin-token: test-admin-token-12345\" \\"
echo "   -d '{\"questionId\":\"00000000-0000-0000-0000-000000000001\",\"query\":\"test\"}'"
echo ""
