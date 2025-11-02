#!/bin/bash

# Get the most recent module ID
MODULE_ID=$(psql postgresql://cerply:cerply@localhost:5432/cerply -t -c "SELECT id FROM modules ORDER BY updated_at DESC LIMIT 1" | xargs)

echo "Testing chat endpoint with module: $MODULE_ID"

curl -X POST http://localhost:8080/api/v2/build/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-token" \
  -d "{
    \"moduleId\": \"$MODULE_ID\",
    \"message\": \"yes\",
    \"userId\": \"dev-user-123\",
    \"organizationId\": \"dev-org-123\"
  }" 2>&1 | head -50

