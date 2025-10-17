#!/bin/bash
# Run PhD-Level Ensemble Pilot Overnight
# Generates 3 comprehensive topics with full error handling and logging

set -e

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_DIR="./phd-pilot-logs"
LOG_FILE="${LOG_DIR}/pilot_${TIMESTAMP}.log"
RESULTS_FILE="${LOG_DIR}/pilot_${TIMESTAMP}_results.json"

# Create log directory
mkdir -p "$LOG_DIR"

echo "======================================"
echo "PhD Ensemble Pilot - Overnight Run"
echo "======================================"
echo "Started: $(date)"
echo "Log file: $LOG_FILE"
echo "Results file: $RESULTS_FILE"
echo ""

# Initialize results file
echo "{" > "$RESULTS_FILE"
echo "  \"startTime\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"," >> "$RESULTS_FILE"
echo "  \"topics\": [" >> "$RESULTS_FILE"

TOPICS=(
  '{"title":"Python Programming Language","subject":"Programming","category":"python_coding"}'
  '{"title":"Enterprise Architecture","subject":"Software Engineering","category":"enterprise_architecture"}'
  '{"title":"Starting a Tech Business in the UK","subject":"Entrepreneurship","category":"tech_startup_uk"}'
)

TOPIC_NAMES=(
  "Python Programming"
  "Enterprise Architecture"
  "Tech Startup UK"
)

TOTAL_TOPICS=${#TOPICS[@]}
COMPLETED=0
FAILED=0

for i in "${!TOPICS[@]}"; do
  TOPIC_NUM=$((i + 1))
  TOPIC_DATA="${TOPICS[$i]}"
  TOPIC_NAME="${TOPIC_NAMES[$i]}"
  
  echo ""
  echo "======================================"
  echo "Topic $TOPIC_NUM/$TOTAL_TOPICS: $TOPIC_NAME"
  echo "======================================"
  echo "Starting: $(date)"
  echo ""
  
  # Log to file
  echo "[$TOPIC_NUM/$TOTAL_TOPICS] Starting: $TOPIC_NAME" >> "$LOG_FILE"
  
  START_TIME=$(date +%s)
  
  # Make API call
  RESPONSE=$(curl -X POST http://localhost:8080/api/content/phd-topic \
    -H "Content-Type: application/json" \
    -H "X-Admin-Token: test-admin-token" \
    -d "$TOPIC_DATA" \
    -w "\n%{http_code}" \
    -s 2>&1 | tee -a "$LOG_FILE")
  
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  
  # Extract HTTP status code (last line)
  HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
  RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')
  
  echo ""
  echo "Completed in: ${DURATION}s"
  echo "HTTP Status: $HTTP_CODE"
  
  # Check if successful
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo "✅ SUCCESS: $TOPIC_NAME"
    COMPLETED=$((COMPLETED + 1))
    
    # Parse response for cost and stats
    TOPIC_ID=$(echo "$RESPONSE_BODY" | jq -r '.topicId // "unknown"')
    COST=$(echo "$RESPONSE_BODY" | jq -r '.totalCost // 0')
    WORD_COUNT=$(echo "$RESPONSE_BODY" | jq -r '.wordCount // 0')
    CITATIONS=$(echo "$RESPONSE_BODY" | jq -r '.citationCount // 0')
    
    echo "  Topic ID: $TOPIC_ID"
    echo "  Cost: \$$COST"
    echo "  Words: $WORD_COUNT"
    echo "  Citations: $CITATIONS"
    
    # Add to results
    if [ $i -gt 0 ]; then
      echo "    ," >> "$RESULTS_FILE"
    fi
    echo "    {" >> "$RESULTS_FILE"
    echo "      \"name\": \"$TOPIC_NAME\"," >> "$RESULTS_FILE"
    echo "      \"status\": \"success\"," >> "$RESULTS_FILE"
    echo "      \"topicId\": \"$TOPIC_ID\"," >> "$RESULTS_FILE"
    echo "      \"durationSeconds\": $DURATION," >> "$RESULTS_FILE"
    echo "      \"cost\": $COST," >> "$RESULTS_FILE"
    echo "      \"wordCount\": $WORD_COUNT," >> "$RESULTS_FILE"
    echo "      \"citationCount\": $CITATIONS" >> "$RESULTS_FILE"
    echo "    }" >> "$RESULTS_FILE"
    
  else
    echo "❌ FAILED: $TOPIC_NAME"
    FAILED=$((FAILED + 1))
    
    # Log error
    echo "Error response: $RESPONSE_BODY" | tee -a "$LOG_FILE"
    
    # Add to results
    if [ $i -gt 0 ]; then
      echo "    ," >> "$RESULTS_FILE"
    fi
    echo "    {" >> "$RESULTS_FILE"
    echo "      \"name\": \"$TOPIC_NAME\"," >> "$RESULTS_FILE"
    echo "      \"status\": \"failed\"," >> "$RESULTS_FILE"
    echo "      \"error\": \"HTTP $HTTP_CODE\"," >> "$RESULTS_FILE"
    echo "      \"durationSeconds\": $DURATION" >> "$RESULTS_FILE"
    echo "    }" >> "$RESULTS_FILE"
  fi
  
  echo "[$TOPIC_NUM/$TOTAL_TOPICS] Completed: $TOPIC_NAME (${DURATION}s)" >> "$LOG_FILE"
  
  # Don't sleep after last topic
  if [ $i -lt $((TOTAL_TOPICS - 1)) ]; then
    echo ""
    echo "Waiting 30 seconds before next topic..."
    sleep 30
  fi
done

# Finalize results file
echo "  ]," >> "$RESULTS_FILE"
echo "  \"endTime\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"," >> "$RESULTS_FILE"
echo "  \"summary\": {" >> "$RESULTS_FILE"
echo "    \"total\": $TOTAL_TOPICS," >> "$RESULTS_FILE"
echo "    \"completed\": $COMPLETED," >> "$RESULTS_FILE"
echo "    \"failed\": $FAILED" >> "$RESULTS_FILE"
echo "  }" >> "$RESULTS_FILE"
echo "}" >> "$RESULTS_FILE"

echo ""
echo "======================================"
echo "Pilot Run Complete"
echo "======================================"
echo "Ended: $(date)"
echo "Total: $TOTAL_TOPICS topics"
echo "Completed: $COMPLETED"
echo "Failed: $FAILED"
echo ""
echo "Results saved to: $RESULTS_FILE"
echo "Full log: $LOG_FILE"
echo ""

# Show summary
cat "$RESULTS_FILE" | jq

exit 0

