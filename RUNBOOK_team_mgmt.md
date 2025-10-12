# Team Management Runbook – Epic 3

## Overview
This runbook covers operational procedures for the Team Management & Learner Assignment feature (Epic 3). It includes database migrations, CSV import guidelines, troubleshooting, and rollback procedures.

**Related Documentation:**
- **FSD:** `docs/functional-spec.md` §23 Team Management & Assignments v1
- **BRD:** `docs/brd/cerply-brd.md` (B3 Group Learning)
- **UAT Guide:** `docs/uat/EPIC3_UAT.md`
- **Tests:** `api/tests/team-mgmt.test.ts`
- **Smoke Test:** `api/scripts/smoke-team-mgmt.sh`

---

## Database Migrations

### Apply Migration

**Migration file:** `api/drizzle/006_team_track_subscriptions.sql`

**Tables created:**
- `tracks`: Learning tracks (canonical + org-specific)
- `team_track_subscriptions`: Team subscriptions to tracks with cadence

**Seed data:**
- 1 canonical track: "Architecture Standards – Starter" (`canon:arch-std-v1`)

**Apply migration:**

```bash
# Using Drizzle
cd api
npm run db:push

# Or manually with psql
psql $DATABASE_URL -f drizzle/006_team_track_subscriptions.sql
```

**Verify migration:**

```bash
psql $DATABASE_URL -c "\d tracks"
psql $DATABASE_URL -c "\d team_track_subscriptions"
psql $DATABASE_URL -c "SELECT * FROM tracks WHERE organization_id IS NULL;"
```

**Expected output:**
- `tracks` table with columns: id, organization_id, title, plan_ref, certified_artifact_id, created_at, updated_at
- `team_track_subscriptions` table with columns: id, team_id, track_id, cadence, start_at, active, created_at
- 1 row in tracks with title "Architecture Standards – Starter"

### Rollback Migration

**Warning:** This will delete all teams, tracks, and subscriptions. Use with caution!

```bash
# Drop tables (cascades to dependencies)
psql $DATABASE_URL -c "DROP TABLE IF EXISTS team_track_subscriptions CASCADE;"
psql $DATABASE_URL -c "DROP TABLE IF EXISTS tracks CASCADE;"
```

**Verify rollback:**

```bash
psql $DATABASE_URL -c "\dt" | grep -E "(tracks|team_track_subscriptions)"
# Should return no results
```

---

## CSV Import Guidelines

### CSV Format

**Content-Type:** `text/csv`  
**Format:** One email per line  
**Encoding:** UTF-8  
**Line endings:** Unix (`\n`) or Windows (`\r\n`)

**Example:**
```csv
alice@example.com
bob@example.com
charlie@example.com
```

**Rules:**
- Empty lines are ignored
- Lines without `@` are ignored
- Leading/trailing whitespace is trimmed
- Duplicate emails within the same request are processed once
- Emails already in the team are skipped (idempotent)

### CSV Import Examples

**Single team (small batch):**

```bash
curl -X POST http://localhost:8080/api/teams/$TEAM_ID/members \
  -H 'content-type: text/csv' \
  -H 'x-admin-token: dev-admin-token-12345' \
  --data-binary @learners.csv
```

**From stdin:**

```bash
cat learners.csv | curl -X POST http://localhost:8080/api/teams/$TEAM_ID/members \
  -H 'content-type: text/csv' \
  -H 'x-admin-token: dev-admin-token-12345' \
  --data-binary @-
```

**Inline:**

```bash
curl -X POST http://localhost:8080/api/teams/$TEAM_ID/members \
  -H 'content-type: text/csv' \
  -H 'x-admin-token: dev-admin-token-12345' \
  --data-binary $'alice@example.com\nbob@example.com\ncharlie@example.com'
```

### CSV Import Response

**Success (200):**
```json
{
  "added": ["alice@example.com", "bob@example.com"],
  "skipped": ["charlie@example.com"],
  "errors": [
    {
      "email": "invalid@",
      "reason": "Invalid email format"
    }
  ]
}
```

**Response fields:**
- `added`: Emails successfully added to the team
- `skipped`: Emails already in the team (idempotent behavior)
- `errors`: Emails that failed with reasons (omitted if no errors)

### Large CSV Files

**Best practices:**
1. **Batch size:** Recommend 50-100 emails per request for optimal performance
2. **Parallel requests:** Use multiple concurrent requests for large datasets (e.g., 5-10 concurrent)
3. **Rate limiting:** Respect server capacity; add delays between batches if needed
4. **Idempotency:** Safe to retry failed batches (uses `X-Idempotency-Key` header)

**Example script (bash):**

```bash
#!/bin/bash
# Split large CSV into batches of 50 and import

TEAM_ID="your-team-id-here"
BASE_URL="http://localhost:8080"
ADMIN_TOKEN="dev-admin-token-12345"
CSV_FILE="all_learners.csv"
BATCH_SIZE=50

# Split CSV into batches
split -l $BATCH_SIZE "$CSV_FILE" batch_

# Import each batch
for batch in batch_*; do
  echo "Importing $batch..."
  curl -sS -X POST "$BASE_URL/api/teams/$TEAM_ID/members" \
    -H 'content-type: text/csv' \
    -H "x-admin-token: $ADMIN_TOKEN" \
    --data-binary @"$batch" | jq
  
  # Optional: delay between batches
  sleep 1
done

# Cleanup
rm -f batch_*
```

---

## Troubleshooting

### Issue: 400 INVALID_CONTENT_TYPE

**Symptom:**
```json
{
  "error": {
    "code": "INVALID_CONTENT_TYPE",
    "message": "Content-Type must be application/json or text/csv"
  }
}
```

**Cause:** Missing or incorrect `Content-Type` header.

**Solution:**
- For JSON: `-H 'content-type: application/json'`
- For CSV: `-H 'content-type: text/csv'`

---

### Issue: 403 FORBIDDEN

**Symptom:**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You can only manage your own teams"
  }
}
```

**Cause:** Non-admin user trying to manage a team they don't own.

**Solution:**
- Use admin token: `-H 'x-admin-token: dev-admin-token-12345'`
- Or authenticate as the team manager

---

### Issue: 409 ALREADY_SUBSCRIBED

**Symptom:**
```json
{
  "error": {
    "code": "ALREADY_SUBSCRIBED",
    "message": "Team is already subscribed to this track"
  }
}
```

**Cause:** Team already has an active subscription to the track.

**Solution:**
1. Check existing subscriptions:
   ```sql
   SELECT * FROM team_track_subscriptions 
   WHERE team_id = 'your-team-id' AND active = true;
   ```

2. Deactivate old subscription:
   ```sql
   UPDATE team_track_subscriptions 
   SET active = false 
   WHERE team_id = 'your-team-id' AND track_id = 'your-track-id';
   ```

3. Retry subscription request

---

### Issue: CSV import creates duplicate users

**Symptom:** Multiple users with same email exist in database.

**Cause:** Race condition in concurrent CSV imports OR database constraint missing.

**Solution:**

1. **Verify unique constraint:**
   ```sql
   SELECT * FROM pg_indexes WHERE tablename = 'users' AND indexname LIKE '%email%';
   ```

2. **Add unique constraint if missing:**
   ```sql
   CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email);
   ```

3. **Clean up duplicates:**
   ```sql
   -- Find duplicates
   SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;
   
   -- Keep oldest, delete rest (BACKUP FIRST!)
   DELETE FROM users a USING users b 
   WHERE a.id > b.id AND a.email = b.email;
   ```

---

### Issue: Events not being logged

**Symptom:** `events.ndjson` file is empty or not created.

**Cause:** 
- Events disabled via environment variable
- Permissions issue (can't write to file)
- Path misconfigured

**Solution:**

1. **Check if events are enabled:**
   ```bash
   echo $EVENTS_ENABLED  # Should be unset or "true"
   ```

2. **Check events log path:**
   ```bash
   echo $EVENTS_LOG_PATH  # Default: ./events.ndjson
   ```

3. **Check file permissions:**
   ```bash
   ls -la events.ndjson
   # Should be writable by API process user
   ```

4. **Enable events:**
   ```bash
   export EVENTS_ENABLED=true
   ```

5. **Test event logging:**
   ```bash
   # Create a team and check for event
   curl -X POST http://localhost:8080/api/teams \
     -H 'content-type: application/json' \
     -H 'x-admin-token: dev-admin-token-12345' \
     -d '{"name":"Test Team"}'
   
   # Check events log
   tail -n 1 events.ndjson | jq
   # Should show: {"type":"team.created","timestamp":"...","payload":{...}}
   ```

---

## Operational Checks

### Smoke Test

**Run complete smoke test:**
```bash
cd api
bash scripts/smoke-team-mgmt.sh
```

**Expected output:** 8 scenarios pass (teams create, members JSON/CSV, subscriptions, overview, tracks, KPIs, RBAC)

---

### Health Checks

**1. API Health:**
```bash
curl -sS http://localhost:8080/api/health | jq
# Expected: {"ok": true, ...}
```

**2. Database connectivity:**
```bash
psql $DATABASE_URL -c "SELECT 1;"
# Expected: 1 row returned
```

**3. Team Management routes:**
```bash
# List tracks (requires auth)
curl -sS http://localhost:8080/api/tracks \
  -H 'x-admin-token: dev-admin-token-12345' | jq
# Expected: Array with at least 1 canonical track
```

**4. KPIs endpoint:**
```bash
curl -sS http://localhost:8080/api/ops/kpis | jq
# Expected: {"o3":{"teams_total":N,"members_total":M,"active_subscriptions":P},"generated_at":"..."}
```

---

### Monitoring Queries

**1. Team count by organization:**
```sql
SELECT o.name, COUNT(t.id) as team_count
FROM organizations o
LEFT JOIN teams t ON t.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY team_count DESC;
```

**2. Top teams by member count:**
```sql
SELECT t.name, o.name as org, COUNT(tm.user_id) as members
FROM teams t
JOIN organizations o ON t.organization_id = o.id
LEFT JOIN team_members tm ON tm.team_id = t.id
GROUP BY t.id, t.name, o.name
ORDER BY members DESC
LIMIT 10;
```

**3. Active subscriptions by cadence:**
```sql
SELECT cadence, COUNT(*) as count
FROM team_track_subscriptions
WHERE active = true
GROUP BY cadence;
```

**4. Teams with no members:**
```sql
SELECT t.id, t.name, o.name as org
FROM teams t
JOIN organizations o ON t.organization_id = o.id
LEFT JOIN team_members tm ON tm.team_id = t.id
WHERE tm.team_id IS NULL;
```

**5. Recent events (last 24 hours):**
```bash
# Using jq to filter events
cat events.ndjson | jq -c '. | select(.timestamp > (now - 86400 | strftime("%Y-%m-%dT%H:%M:%SZ")))'
```

---

## Feature Flags

**Team Management flags:**

```bash
# Enable team management routes (default: enabled)
export FF_TEAM_MGMT=true

# Require session authentication (Epic 2)
export AUTH_REQUIRE_SESSION=true

# Enable event logging (default: enabled)
export EVENTS_ENABLED=true

# Set custom events log path
export EVENTS_LOG_PATH=/var/log/cerply/events.ndjson
```

**Check active flags:**
```bash
curl -sS http://localhost:8080/api/flags | jq
```

---

## Rollback Procedures

### Full Rollback (Remove Epic 3)

**Warning:** This will delete all teams, tracks, subscriptions, and event logs.

**Steps:**

1. **Backup data:**
   ```bash
   pg_dump -t teams -t team_members -t tracks -t team_track_subscriptions \
     $DATABASE_URL > epic3_backup_$(date +%Y%m%d_%H%M%S).sql
   
   cp events.ndjson events.ndjson.backup
   ```

2. **Stop API:**
   ```bash
   # Docker
   docker compose stop api
   
   # Or process
   pkill -f "node.*api"
   ```

3. **Drop tables:**
   ```bash
   psql $DATABASE_URL << EOF
   DROP TABLE IF EXISTS team_track_subscriptions CASCADE;
   DROP TABLE IF EXISTS tracks CASCADE;
   EOF
   ```

4. **Remove events log:**
   ```bash
   rm -f events.ndjson
   ```

5. **Revert code (if needed):**
   ```bash
   git revert <epic-3-commit-sha>
   ```

6. **Restart API:**
   ```bash
   docker compose up -d api
   ```

### Partial Rollback (Keep data, disable routes)

**Steps:**

1. **Disable team management routes:**
   ```bash
   export FF_TEAM_MGMT=false
   ```

2. **Restart API:**
   ```bash
   docker compose restart api
   ```

3. **Verify routes are disabled:**
   ```bash
   curl -sS http://localhost:8080/api/teams \
     -H 'x-admin-token: dev-admin-token-12345'
   # Expected: 404 NOT_FOUND (if gated by flag)
   ```

---

## Performance Tuning

### Database Indexes

**Verify indexes exist:**
```sql
SELECT * FROM pg_indexes WHERE tablename IN ('tracks', 'team_track_subscriptions');
```

**Expected indexes:**
- `idx_tracks_org` on tracks(organization_id)
- `idx_tracks_plan_ref` on tracks(plan_ref)
- `idx_team_track_sub_team` on team_track_subscriptions(team_id)
- `idx_team_track_sub_track` on team_track_subscriptions(track_id)
- `idx_team_track_sub_active` on team_track_subscriptions(active) WHERE active = true

### Query Optimization

**Slow query: Team overview**

If `GET /api/teams/:id/overview` is slow (>500ms), check query plans:

```sql
EXPLAIN ANALYZE
SELECT COUNT(*) FROM team_members WHERE team_id = 'your-team-id';

EXPLAIN ANALYZE
SELECT COUNT(*) FROM team_track_subscriptions 
WHERE team_id = 'your-team-id' AND active = true;
```

**Optimization:**
- Ensure indexes exist (see above)
- Consider materialized view for large teams (>1000 members)
- Cache overview results (5-minute TTL)

---

## Support Contacts

**Technical Issues:**
- GitHub Issues: Tag with `epic:3-team-management`
- Slack: `#cerply-b2b-support`

**Documentation:**
- FSD: `docs/functional-spec.md` §23
- UAT: `docs/uat/EPIC3_UAT.md`
- BRD: `docs/brd/cerply-brd.md` (B3)

**Emergency Escalation:**
- On-call: PagerDuty rotation
- P0 Issues: Immediate rollback (see Rollback Procedures)

---

## Changelog

- **2025-10-07:** Initial runbook for Epic 3 (Team Management & Learner Assignment)

