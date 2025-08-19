#!/usr/bin/env bash
set -euo pipefail
PID_FILE=/tmp/cerply-api.pid
if [ -f "$PID_FILE" ]; then
  kill -TERM "$(cat "$PID_FILE")" 2>/dev/null || true
  rm -f "$PID_FILE"
  echo "API stopped."
else
  echo "No pid file found."
fi
