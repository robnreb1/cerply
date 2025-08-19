#!/usr/bin/env bash
set -euo pipefail
PORT="${PORT:-3001}"
curl -sf "http://localhost:$PORT/api/health" >/dev/null
echo "api/health OK on :$PORT"
