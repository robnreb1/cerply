# Epic 3: Team Management & Learner Assignment - UAT Guide

**Epic:** 3 - Team Management & Learner Assignment  
**BRD:** B3 Group Learning  
**FSD:** §23 Team Management & Assignments v1  
**Status:** Ready for UAT  
**Date:** 2025-10-07

---

## Overview

This UAT guide covers the manual acceptance testing for Epic 3: Team Management & Learner Assignment. This epic enables managers to create teams, add learners, subscribe teams to tracks, and view team analytics.

**Key Features:**
- Team creation and management
- Bulk member import (JSON + CSV)
- Track subscriptions with cadence (daily/weekly/monthly)
- Team overview dashboard with metrics
- Event emission (NDJSON append-only log)
- OKR tracking (`/api/ops/kpis`)
- RBAC enforcement (admin, manager, learner)
- Idempotency support

---

## Prerequisites

### Environment Setup

1. **Database:** PostgreSQL running with migrations applied
   ```bash
   cd api
   npm run db:migrate
   ```

2. **API Server:** Running on port 8080
   ```bash
   cd api
   npm run dev
   ```

3. **Environment Variables:**
   ```bash
   # api/.env
   DATABASE_URL=postgresql://postgres:pw@localhost:5432/postgres
   FF_TEAM_MGMT=true
   AUTH_REQUIRE_SESSION=true
   ADMIN_TOKEN=dev-admin-token-12345
   ```

4. **Test Data:** Seed data should include:
   - Default organization: `Cerply Dev Org`
   - Admin user: `admin@cerply-dev.local`
   - Manager user: `manager@cerply-dev.local`
   - Learner user: `learner@cerply-dev.local`
   - Canonical track: `Architecture Standards – Starter`

---

## UAT Test Scenarios

### Test 1: Create Team

**Goal:** Manager creates a new team

**Steps:**
1. Open terminal
2. Set environment variables:
   ```bash
   export API_BASE="http://localhost:8080"
   export ADMIN_TOKEN="dev-admin-token-12345"
   ```

3. Create team:
   ```bash
   curl -sS -X POST "$API_BASE/api/teams" \
     -H "content-type: application/json" \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -d '{"name":"Architecture – London"}' | jq
   ```

**Expected Result:**
```json
{
  "id": "uuid",
  "name": "Architecture – London",
  "org_id": "uuid",
  "manager_id": "uuid",
  "created_at": "2025-10-07T..."
}
```

**Pass Criteria:**
- ✅ Returns HTTP 200
- ✅ Response includes `id`, `name`, `org_id`
- ✅ Team appears in database: `SELECT * FROM teams WHERE name = 'Architecture – London';`

**Screenshot Required:** Yes (terminal output)

---

### Test 2: Add Members via CSV

**Goal:** Manager adds multiple members using CSV upload

**Steps:**
1. Create CSV file:
   ```bash
   cat <<EOF > /tmp/members.csv
   a.archer@example.com
   b.builder@example.com
   c.creator@example.com
   EOF
   ```

2. Get team ID from Test 1:
   ```bash
   TEAM_ID="<paste-id-from-test-1>"
   ```

3. Add members via CSV:
   ```bash
   curl -sS -X POST "$API_BASE/api/teams/$TEAM_ID/members" \
     -H "content-type: text/csv" \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     --data-binary @/tmp/members.csv | jq
   ```

**Expected Result:**
```json
{
  "added": [
    "a.archer@example.com",
    "b.builder@example.com",
    "c.creator@example.com"
  ],
  "skipped": []
}
```

**Pass Criteria:**
- ✅ Returns HTTP 200
- ✅ `added` array contains all 3 emails
- ✅ New users created in database with role `learner`
- ✅ Team memberships created: `SELECT * FROM team_members WHERE team_id = '<team_id>';`

**Screenshot Required:** Yes (terminal output)

---

### Test 3: Subscribe Team to Track (Weekly Cadence)

**Goal:** Manager subscribes team to a track with weekly cadence

**Steps:**
1. List available tracks:
   ```bash
   curl -sS "$API_BASE/api/tracks" \
     -H "Authorization: Bearer $ADMIN_TOKEN" | jq
   ```

2. Select a track ID (e.g., canonical track)
   ```bash
   TRACK_ID="<track-id-from-list>"
   ```

3. Subscribe team:
   ```bash
   curl -sS -X POST "$API_BASE/api/teams/$TEAM_ID/subscriptions" \
     -H "content-type: application/json" \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -d "{\"track_id\":\"$TRACK_ID\",\"cadence\":\"weekly\"}" | jq
   ```

**Expected Result:**
```json
{
  "subscription_id": "uuid",
  "next_due_at": "2025-10-14T..."
}
```

**Pass Criteria:**
- ✅ Returns HTTP 200
- ✅ Response includes `subscription_id` and `next_due_at`
- ✅ `next_due_at` is 7 days in the future (weekly cadence)
- ✅ Subscription recorded in database: `SELECT * FROM team_track_subscriptions WHERE team_id = '<team_id>';`
- ✅ Event emitted: Check `events.ndjson` for `subscription.created` event

**Screenshot Required:** Yes (terminal output + events.ndjson)

---

### Test 4: View Team Overview

**Goal:** Manager views team overview with metrics

**Steps:**
1. Get team overview:
   ```bash
   curl -sS "$API_BASE/api/teams/$TEAM_ID/overview" \
     -H "Authorization: Bearer $ADMIN_TOKEN" | jq
   ```

**Expected Result:**
```json
{
  "members_count": 3,
  "active_tracks": 1,
  "due_today": 0,
  "at_risk": 0
}
```

**Pass Criteria:**
- ✅ Returns HTTP 200
- ✅ `members_count` equals 3 (from Test 2)
- ✅ `active_tracks` equals 1 (from Test 3)
- ✅ Response includes `due_today` and `at_risk` fields
- ✅ Response includes `x-overview-latency-ms` header

**Screenshot Required:** Yes (terminal output with headers)

---

### Test 5: RBAC Enforcement

**Goal:** Verify that non-managers cannot access team management routes

**Steps:**
1. Attempt to create team without auth:
   ```bash
   curl -sS -w "\n%{http_code}" -X POST "$API_BASE/api/teams" \
     -H "content-type: application/json" \
     -d '{"name":"Unauthorized Team"}'
   ```

2. Attempt to view overview without auth:
   ```bash
   curl -sS -w "\n%{http_code}" "$API_BASE/api/teams/$TEAM_ID/overview"
   ```

**Expected Result:**
- Both requests return HTTP 401 (Unauthorized)

**Pass Criteria:**
- ✅ Unauthenticated requests return 401
- ✅ Response includes error code `UNAUTHORIZED`

**Screenshot Required:** Yes (terminal output)

---

### Test 6: Idempotency Check

**Goal:** Verify that duplicate requests with same idempotency key return same result

**Steps:**
1. Generate idempotency key:
   ```bash
   IDEMPOTENCY_KEY="test-$(date +%s)"
   ```

2. Create team with idempotency key (first time):
   ```bash
   curl -sS -X POST "$API_BASE/api/teams" \
     -H "content-type: application/json" \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "X-Idempotency-Key: $IDEMPOTENCY_KEY" \
     -d '{"name":"Idempotency Test Team"}' | jq -r '.id'
   ```

3. Create same team with same key (second time):
   ```bash
   curl -sS -X POST "$API_BASE/api/teams" \
     -H "content-type: application/json" \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "X-Idempotency-Key: $IDEMPOTENCY_KEY" \
     -d '{"name":"Idempotency Test Team"}' | jq -r '.id'
   ```

**Expected Result:**
- Both requests return the same team ID

**Pass Criteria:**
- ✅ Both responses return HTTP 200
- ✅ Team IDs are identical
- ✅ Only one team created in database

**Screenshot Required:** Yes (terminal output showing both IDs)

---

### Test 7: OKR Tracking (KPIs)

**Goal:** Verify that `/api/ops/kpis` returns accurate team management metrics

**Steps:**
1. Get KPIs:
   ```bash
   curl -sS "$API_BASE/api/ops/kpis" | jq
   ```

**Expected Result:**
```json
{
  "o3": {
    "teams_total": 2,
    "members_total": 3,
    "active_subscriptions": 1
  },
  "generated_at": "2025-10-07T..."
}
```

**Pass Criteria:**
- ✅ Returns HTTP 200
- ✅ `o3` object includes `teams_total`, `members_total`, `active_subscriptions`
- ✅ Values match actual counts from database
- ✅ Response includes `generated_at` timestamp

**Screenshot Required:** Yes (terminal output)

---

### Test 8: Event Emission

**Goal:** Verify that team management events are logged to NDJSON

**Steps:**
1. Check events log:
   ```bash
   cat events.ndjson | jq 'select(.type | startswith("team")) | .type'
   ```

2. Verify event types:
   - `team.created`
   - `member.added`
   - `subscription.created`

**Expected Result:**
```
"team.created"
"member.added"
"member.added"
"member.added"
"subscription.created"
```

**Pass Criteria:**
- ✅ Events log file exists (`events.ndjson`)
- ✅ All three event types present
- ✅ Each event includes `timestamp` and `payload`
- ✅ Events are valid NDJSON (one JSON object per line)

**Screenshot Required:** Yes (events.ndjson contents)

---

## Regression Tests

### Test 9: Existing M3 API Not Impacted

**Goal:** Verify that team management does not break existing `/api/daily/next` endpoint

**Steps:**
1. Get daily queue for learner:
   ```bash
   curl -sS "$API_BASE/api/daily/next" \
     -H "Authorization: Bearer $ADMIN_TOKEN" | jq
   ```

**Expected Result:**
- Returns HTTP 200
- Response structure unchanged

**Pass Criteria:**
- ✅ Endpoint still accessible
- ✅ No errors in API logs
- ✅ Response format matches FSD M3 spec

---

## UAT Acceptance Checklist

- [ ] **Test 1:** Create team - PASS
- [ ] **Test 2:** Add members via CSV - PASS
- [ ] **Test 3:** Subscribe to track - PASS
- [ ] **Test 4:** View team overview - PASS
- [ ] **Test 5:** RBAC enforcement - PASS
- [ ] **Test 6:** Idempotency - PASS
- [ ] **Test 7:** KPI tracking - PASS
- [ ] **Test 8:** Event emission - PASS
- [ ] **Test 9:** Regression check - PASS

---

## Known Limitations

1. **Team Overview Metrics (MVP):**
   - `due_today` and `at_risk` currently return stub values (0)
   - Full implementation requires integration with M3 daily selector (Epic 4)

2. **UI Not Included:**
   - This epic focuses on API functionality
   - Manager UI will be added in a future epic or iteration

3. **Event Storage:**
   - Events stored in local `events.ndjson` file
   - Production should use durable event store (e.g., EventBridge, Kinesis)

---

## Troubleshooting

### Issue: "Database connection error"
**Solution:**
```bash
# Check PostgreSQL is running
psql -h localhost -U postgres -d postgres

# Apply migrations
cd api
npm run db:migrate
```

### Issue: "ADMIN_TOKEN invalid"
**Solution:**
```bash
# Verify ADMIN_TOKEN in api/.env
echo $ADMIN_TOKEN

# Restart API server
cd api
npm run dev
```

### Issue: "Track not found"
**Solution:**
```bash
# Run migration to seed canonical track
cd api
npm run db:migrate

# Verify track exists
psql -h localhost -U postgres -d postgres -c "SELECT * FROM tracks WHERE organization_id IS NULL;"
```

---

## Sign-Off

**UAT Performed By:** _____________________  
**Date:** _____________________  
**Status:** [ ] PASS [ ] FAIL  
**Notes:** _____________________

---

**Epic 3: Team Management & Learner Assignment**  
**UAT Guide v1.0**  
**Last Updated:** 2025-10-07

