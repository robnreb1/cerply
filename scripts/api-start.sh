#!/usr/bin/env bash
set -euo pipefail
PORT="${PORT:-3001}"
cd "$(dirname "$0")/../api"
export PORT="$PORT"
nohup npm run start > /tmp/cerply-api.log 2>&1 & echo $! > /tmp/cerply-api.pid
echo "API started on :$PORT (pid $(cat /tmp/cerply-api.pid))"
