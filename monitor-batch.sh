#!/bin/bash
# Monitor batch progress (macOS-compatible alternative to watch)

BATCH_ID="batch_1760642589468_er7s3we"

echo "🔍 Monitoring batch: $BATCH_ID"
echo "Press Ctrl+C to stop"
echo ""

while true; do
  clear
  echo "==================================="
  echo "📊 Batch Progress Monitor"
  echo "==================================="
  echo ""
  curl -s http://localhost:8080/api/content/batch/$BATCH_ID/progress \
    -H "X-Admin-Token: test-admin-token" | jq
  echo ""
  echo "-----------------------------------"
  echo "⏰ Updated: $(date '+%H:%M:%S')"
  echo "🔄 Refreshing in 30 seconds..."
  echo "-----------------------------------"
  sleep 30
done

