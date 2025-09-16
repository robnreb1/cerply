#!/usr/bin/env bash
set -euo pipefail
echo "==> CI observability smoke"
export DATABASE_URL="${DATABASE_URL:-postgres://cerply:cerply@localhost:5432/cerply}"
export ENABLE_DEV_ROUTES=1
export OBS_SAMPLE_PCT=100
BASE="http://localhost:8080"

# boot PG (CI) and API
echo "Starting Postgres (Docker) ..."
docker rm -f cerply-ci-pg >/dev/null 2>&1 || true
docker run --rm -d --name cerply-ci-pg -e POSTGRES_USER=cerply -e POSTGRES_PASSWORD=cerply -e POSTGRES_DB=cerply -p 0:5432 postgres:15 >/dev/null
# Discover mapped host port
PG_PORT=$(docker port cerply-ci-pg 5432/tcp | sed 's/.*://')
if [ -z "${PG_PORT:-}" ]; then echo "Failed to detect Postgres host port"; exit 1; fi
export DATABASE_URL="postgres://cerply:cerply@localhost:${PG_PORT}/cerply"
# Wait for Postgres readiness
for i in $(seq 1 30); do
  docker exec cerply-ci-pg pg_isready -U cerply -d cerply >/dev/null 2>&1 && break
  sleep 1
done
echo "Starting API ..."
ENABLE_DEV_ROUTES=1 OBS_SAMPLE_PCT=100 DATABASE_URL="$DATABASE_URL" npm -w api run dev >/tmp/api.log 2>&1 & echo $! > /tmp/api.pid

# wait for health
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/health" || true)
  [ "$code" = "200" ] && break
  sleep 1
done
[ "$code" = "200" ] || (echo "API not healthy"; tail -n 100 /tmp/api.log; exit 1)

# migrate + seed + acceptance
curl -s -X POST "$BASE/api/dev/migrate" >/dev/null
curl -s -X POST "$BASE/api/dev/seed"    >/dev/null
curl -s -X POST "$BASE/api/dev/backfill/reviews" >/dev/null
BASE="$BASE" bash scripts/acceptance-observability.sh

# teardown
kill "$(cat /tmp/api.pid)" || true
docker rm -f cerply-ci-pg || true
echo "OK: CI observability smoke passed"


