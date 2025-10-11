# Cerply API – Backend Service

## Overview
Node.js/TypeScript API service for Cerply B2B Enterprise learning platform. Provides REST endpoints for authentication, team management, content generation, adaptive learning, and operational monitoring.

## Quick Start

```bash
# Install dependencies
npm install

# Run migrations
npm run migrate

# Seed demo data
npm run seed:demo

# Start development server (port 8080)
npm run dev

# Run tests
npm test

# Run smoke tests
bash scripts/smoke-local.sh
```

## Architecture

**Stack:**
- **Runtime:** Node.js 18+
- **Framework:** Fastify
- **Database:** PostgreSQL (Drizzle ORM)
- **Auth:** Session-based with CSRF protection
- **RBAC:** Role-based access control (admin, manager, learner)

**Key Directories:**
- `src/routes/` - API route handlers
- `src/services/` - Business logic services
- `src/db/` - Database schema and migrations
- `src/middleware/` - RBAC, auth, idempotency
- `tests/` - Unit and integration tests
- `scripts/` - Operational scripts (smoke tests, seed data)

## Feature Flags

Configure via environment variables:

### Epic 2: SSO & RBAC
- `AUTH_REQUIRE_SESSION=true` - Enforce session authentication
- `ADMIN_TOKEN=dev-admin-token-12345` - Admin bypass token (dev only)

### Epic 3: Team Management
- `FF_TEAM_MGMT=true` - Enable team management routes (default: enabled)
- `EVENTS_ENABLED=true` - Enable event logging (default: enabled)
- `EVENTS_LOG_PATH=./events.ndjson` - Event log file path

### Other Features
- `FF_CURATOR_DASHBOARD_V1=true` - Enable curator dashboard
- `FF_ADAPTIVE_ENGINE_V1=true` - Enable adaptive learning engine
- `FF_TRUST_LABELS_V1=true` - Enable trust labels

## API Routes

### Core Routes

**Health & Flags:**
- `GET /api/health` - Health check
- `GET /api/flags` - List active feature flags

**Authentication (Epic 2):**
- `POST /api/auth/session` - Create session
- `GET /api/auth/session` - Get current session
- `DELETE /api/auth/session` - Destroy session

### Team Management (Epic 3)

**Teams:**
- `POST /api/teams` - Create team
- `POST /api/teams/:id/members` - Add members (JSON or CSV)
- `POST /api/teams/:id/subscriptions` - Subscribe team to track
- `GET /api/teams/:id/overview` - Team metrics

**Tracks:**
- `GET /api/tracks` - List canonical + org tracks

**Operations:**
- `GET /api/ops/kpis` - Operational KPIs (O3: teams_total, members_total, active_subscriptions)

### Delivery Endpoints (Epic 5)

**Slack Channel Integration:**
- `POST /api/delivery/send` - Send lesson to user via Slack/WhatsApp/Teams
- `POST /api/delivery/webhook/slack` - Slack webhook handler (button clicks, events)
- `GET /api/delivery/channels` - Get user's configured channels
- `POST /api/delivery/channels` - Configure channel preferences

**Feature Flag:** `FF_CHANNEL_SLACK=true`

### Learning Flow (M3)

**Content Generation:**
- `POST /api/preview` - Generate preview from topic/text/url
- `POST /api/generate` - Generate full learning plan
- `POST /api/score` - Score learner answers

**Adaptive Learning:**
- `GET /api/daily/next` - Get next prioritized items
- `POST /api/certified/schedule` - Schedule items (SM2-lite)
- `POST /api/certified/progress` - Record progress
- `GET /api/certified/progress?sid=` - Resume session

**Certified Content:**
- `POST /api/certified/items/:itemId/publish` - Publish certified item
- `GET /api/certified/artifacts/:artifactId` - Get artifact
- `POST /api/certified/verify` - Verify artifact signature
- `POST /api/certified/plan` - Generate certified plan

## RBAC (Epic 2)

**Roles:**
- `admin` - Full system access, bypass RBAC checks
- `manager` - Manage teams, assign learners, view reports
- `learner` - Access learning content, track progress

**Middleware:**
- `requireAdmin(req, reply)` - Admin-only routes
- `requireManager(req, reply)` - Manager or admin routes
- `getSession(req)` - Extract session from request

**Admin Token Bypass (Dev):**
```bash
# Use X-Admin-Token header to bypass RBAC
curl http://localhost:8080/api/teams \
  -H 'x-admin-token: dev-admin-token-12345'
```

**Production:** Set `ADMIN_TOKEN` to secure random value or disable admin bypass.

## Team Management (Epic 3)

### Create Team

```bash
curl -X POST http://localhost:8080/api/teams \
  -H 'content-type: application/json' \
  -H 'x-admin-token: dev-admin-token-12345' \
  -d '{"name":"Engineering Team"}'
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Engineering Team",
  "org_id": "550e8400-e29b-41d4-a716-446655440001",
  "manager_id": "550e8400-e29b-41d4-a716-446655440002",
  "created_at": "2025-10-07T12:00:00Z"
}
```

### Add Members (JSON)

```bash
curl -X POST http://localhost:8080/api/teams/$TEAM_ID/members \
  -H 'content-type: application/json' \
  -H 'x-admin-token: dev-admin-token-12345' \
  -d '{"emails":["alice@example.com","bob@example.com"]}'
```

### Add Members (CSV)

```bash
curl -X POST http://localhost:8080/api/teams/$TEAM_ID/members \
  -H 'content-type: text/csv' \
  -H 'x-admin-token: dev-admin-token-12345' \
  --data-binary @learners.csv
```

**CSV Format:**
```csv
alice@example.com
bob@example.com
charlie@example.com
```

### Assign Track to Team

```bash
curl -X POST http://localhost:8080/api/teams/$TEAM_ID/subscriptions \
  -H 'content-type: application/json' \
  -H 'x-admin-token: dev-admin-token-12345' \
  -d '{
    "track_id":"00000000-0000-0000-0000-000000000100",
    "cadence":"daily"
  }'
```

**Cadence options:** `daily`, `weekly`, `monthly`

### Get Team Overview

```bash
curl http://localhost:8080/api/teams/$TEAM_ID/overview \
  -H 'x-admin-token: dev-admin-token-12345'
```

**Response:**
```json
{
  "members_count": 25,
  "active_tracks": 3,
  "due_today": 8,
  "at_risk": 2
}
```

### List Tracks

```bash
curl http://localhost:8080/api/tracks \
  -H 'x-admin-token: dev-admin-token-12345'
```

**Response:**
```json
[
  {
    "id": "00000000-0000-0000-0000-000000000100",
    "title": "Architecture Standards – Starter",
    "source": "canon",
    "plan_ref": "canon:arch-std-v1"
  }
]
```

## Event Logging (Epic 3)

**Event Types:**
- `team.created` - Team created
- `member.added` - Member added to team
- `subscription.created` - Team subscribed to track

**Event Format (NDJSON):**
```json
{"type":"team.created","timestamp":"2025-10-07T12:00:00Z","payload":{"team_id":"...","org_id":"...","by":"..."}}
{"type":"member.added","timestamp":"2025-10-07T12:01:00Z","payload":{"team_id":"...","user_id":"...","email":"alice@example.com"}}
{"type":"subscription.created","timestamp":"2025-10-07T12:02:00Z","payload":{"team_id":"...","track_id":"...","cadence":"daily","start_at":"..."}}
```

**Read events:**
```bash
cat events.ndjson | jq
```

## Idempotency

**Header:** `X-Idempotency-Key`

Routes that support idempotency:
- `POST /api/teams` (create team)
- `POST /api/teams/:id/members` (per-email idempotency)

**Example:**
```bash
curl -X POST http://localhost:8080/api/teams \
  -H 'content-type: application/json' \
  -H 'x-admin-token: dev-admin-token-12345' \
  -H 'x-idempotency-key: unique-request-id-12345' \
  -d '{"name":"Engineering Team"}'
```

**Behavior:**
- First request: Creates team, stores response in cache (24hr TTL)
- Subsequent requests with same key: Returns cached response
- Different key: Creates new team

## Gamification & Certification (Epic 7)

### Feature Flags
```bash
FF_GAMIFICATION_V1=true
FF_CERTIFICATES_V1=true
FF_MANAGER_NOTIFICATIONS_V1=true
```

### RBAC
- **Learner:** Access own levels, badges, certificates
- **Manager:** View notifications, mark as read
- **Admin:** Revoke certificates

### Learner Progression

**Get learner level for a track:**
```bash
curl http://localhost:8080/api/learners/$USER_ID/level/$TRACK_ID \
  -H 'x-admin-token: dev-admin-token-12345'
```

**Response:**
```json
{
  "level": "intermediate",
  "correctAttempts": 45,
  "nextLevel": "advanced",
  "attemptsToNextLevel": 15
}
```

**Get all learner levels (paginated):**
```bash
curl http://localhost:8080/api/learners/$USER_ID/levels?limit=50&offset=0 \
  -H 'x-admin-token: dev-admin-token-12345'
```

**Response:**
```json
{
  "total": 5,
  "limit": 50,
  "offset": 0,
  "data": [
    {
      "trackId": "00000000-0000-0000-0000-000000000100",
      "trackTitle": "Architecture Standards",
      "level": "intermediate",
      "correctAttempts": 45
    }
  ]
}
```

### Achievement Badges

**Get learner badges:**
```bash
curl http://localhost:8080/api/learners/$USER_ID/badges \
  -H 'x-admin-token: dev-admin-token-12345'
```

**Response:**
```json
[
  {
    "badgeId": "first-correct",
    "slug": "first-correct",
    "name": "First Steps",
    "description": "Answered your first question correctly",
    "earnedAt": "2025-10-10T12:00:00Z"
  }
]
```

### Certificates

**Get learner certificates:**
```bash
curl http://localhost:8080/api/learners/$USER_ID/certificates \
  -H 'x-admin-token: dev-admin-token-12345'
```

**Response:**
```json
[
  {
    "id": "cert-uuid-123",
    "trackId": "track-uuid-100",
    "trackTitle": "Architecture Standards",
    "issuedAt": "2025-10-10T12:00:00Z",
    "verificationUrl": "https://cerply.com/verify/cert-uuid-123"
  }
]
```

**Download certificate PDF:**
```bash
curl http://localhost:8080/api/certificates/$CERT_ID/download \
  -H 'x-admin-token: dev-admin-token-12345' \
  -o certificate.pdf
```

**Response Headers:**
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="certificate-{id}.pdf"`
- `Cache-Control: private, max-age=3600`

**Verify certificate:**
```bash
curl "http://localhost:8080/api/certificates/$CERT_ID/verify?signature=abc123" \
  -H 'x-admin-token: dev-admin-token-12345'
```

**Response:**
```json
{
  "valid": true,
  "revoked": false,
  "issuedAt": "2025-10-10T12:00:00Z"
}
```

**Revoke certificate (admin-only):**
```bash
curl -X POST http://localhost:8080/api/certificates/$CERT_ID/revoke \
  -H 'content-type: application/json' \
  -H 'x-admin-token: dev-admin-token-12345' \
  -H 'x-idempotency-key: revoke-cert-123' \
  -d '{"reason":"Policy violation"}'
```

**Response:**
```json
{
  "revokedAt": "2025-10-10T15:30:00Z",
  "reason": "Policy violation"
}
```

### Manager Notifications

**Get manager notifications (paginated):**
```bash
curl "http://localhost:8080/api/manager/notifications?unreadOnly=true&limit=50&offset=0" \
  -H 'x-admin-token: dev-admin-token-12345'
```

**Response:**
```json
{
  "total": 12,
  "limit": 50,
  "offset": 0,
  "data": [
    {
      "id": "notif-uuid-123",
      "type": "learner_level_up",
      "content": {
        "learnerName": "Alice",
        "trackTitle": "Architecture Standards",
        "newLevel": "advanced"
      },
      "read": false,
      "sentAt": "2025-10-10T12:00:00Z"
    }
  ]
}
```

**Get unread count:**
```bash
curl http://localhost:8080/api/manager/notifications/unread/count \
  -H 'x-admin-token: dev-admin-token-12345'
```

**Response:**
```json
{
  "unread": 8
}
```

**Mark notification as read (idempotent):**
```bash
curl -X PATCH http://localhost:8080/api/manager/notifications/$NOTIF_ID \
  -H 'content-type: application/json' \
  -H 'x-admin-token: dev-admin-token-12345' \
  -H 'x-idempotency-key: mark-read-notif-123' \
  -d '{"read":true}'
```

**Response:**
```json
{
  "id": "notif-uuid-123",
  "read": true
}
```

### Idempotency (Epic 7)

**Epic 7 Routes with Idempotency Support:**
- `PATCH /api/manager/notifications/:id`
- `POST /api/certificates/:id/revoke`

**Headers:**
- Request: `X-Idempotency-Key: unique-request-id`
- Response: `X-Idempotency-Replay: true` (if replayed)

**Behavior:**
- First request: Processes normally, stores response (24hr TTL)
- Replay (same key, same body): Returns cached response with `X-Idempotency-Replay: true`
- Conflict (same key, different body): Returns `409 CONFLICT`

### Pagination

**Query Parameters:**
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Response Shape:**
```json
{
  "total": 100,
  "limit": 50,
  "offset": 0,
  "data": [...]
}
```

**Paginated Routes:**
- `GET /api/learners/:id/levels`
- `GET /api/manager/notifications`

### Audit Events

**Epic 7 emits audit events for:**
- `badge_awarded` - Badge earned by learner
- `level_changed` - Learner progressed to new level
- `certificate_issued` - Certificate generated
- `certificate_downloaded` - Certificate PDF downloaded
- `certificate_revoked` - Certificate revoked by admin
- `notification_marked_read` - Manager marked notification as read

**View counters:**
```bash
curl http://localhost:8080/api/ops/kpis
```

**Response includes Epic 7 metrics:**
```json
{
  "epic7": {
    "badges_awarded": 150,
    "levels_changed": 45,
    "certificates_issued": 12,
    "certificates_downloaded": 8,
    "certificates_revoked": 1,
    "notifications_marked_read": 32
  }
}
```

### Cleanup Crons

**Daily: Delete expired idempotency keys (>24h):**
```bash
cd api && npx tsx scripts/cleanup-idempotency-keys.ts
```

**Weekly: Delete old audit events (>180 days):**
```bash
cd api && RETAIN_AUDIT_DAYS=180 npx tsx scripts/cleanup-audit-events.ts
```

**Note:** Enable persistent audit events with `PERSIST_AUDIT_EVENTS=true` (default: console logs only).

## Database

**Migrations:**
```bash
# Apply all pending migrations
npm run migrate

# Generate new migration (Drizzle)
npm run db:generate

# Push schema changes to DB
npm run db:push
```

**Key Tables (Epic 3):**
- `teams` - Teams within organizations
- `team_members` - Team membership (many-to-many)
- `tracks` - Learning tracks (canonical + org-specific)
- `team_track_subscriptions` - Team subscriptions to tracks

**Seed Data:**
```bash
# Seed demo organizations, users, roles, tracks
npm run seed:demo
```

## Testing

**Unit Tests:**
```bash
# All tests
npm test

# Specific test file
npm test -- team-mgmt.test.ts

# Watch mode
npm test -- --watch
```

**Smoke Tests:**
```bash
# Local smoke test (requires API running)
bash scripts/smoke-local.sh

# Team management smoke test
bash scripts/smoke-team-mgmt.sh

# M3 API surface smoke test
bash scripts/smoke-m3.sh

# SSO & RBAC smoke test
bash scripts/smoke-sso-rbac.sh
```

**Coverage:**
```bash
npm run test:coverage
open coverage/index.html
```

## Operational Monitoring

### KPIs (Epic 3)

```bash
curl http://localhost:8080/api/ops/kpis
```

**Response:**
```json
{
  "o3": {
    "teams_total": 12,
    "members_total": 150,
    "active_subscriptions": 28
  },
  "generated_at": "2025-10-07T12:00:00Z"
}
```

### Health Check

```bash
curl http://localhost:8080/api/health
```

**Expected:** `{"ok": true, ...}`

## Environment Variables

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - API port (default: 8080)

**Optional:**
- `AUTH_REQUIRE_SESSION` - Enforce session auth (default: false)
- `ADMIN_TOKEN` - Admin bypass token (dev: `dev-admin-token-12345`)
- `FF_TEAM_MGMT` - Enable team management (default: true)
- `EVENTS_ENABLED` - Enable event logging (default: true)
- `EVENTS_LOG_PATH` - Event log path (default: `./events.ndjson`)

**Full list:** See `src/env.ts`

## Documentation

**Specifications:**
- **FSD:** `docs/functional-spec.md` (§23 Team Management)
- **BRD:** `docs/brd/cerply-brd.md` (B3 Group Learning)
- **Runbook:** `RUNBOOK_team_mgmt.md` (Epic 3 operations)

**Testing:**
- **UAT Guide:** `docs/uat/EPIC3_UAT.md` (9 manual scenarios)
- **Unit Tests:** `tests/team-mgmt.test.ts` (15+ scenarios)
- **Smoke Tests:** `scripts/smoke-team-mgmt.sh` (8 scenarios)

**Progress:**
- **Epic 3 Summary:** `EPIC3_PROGRESS_SUMMARY.md`

## Troubleshooting

**API won't start:**
```bash
# Check database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check port availability
lsof -ti tcp:8080
```

**Migration failed:**
```bash
# Check migration status
npm run db:check

# Rollback last migration (if applicable)
# See RUNBOOK_team_mgmt.md
```

**RBAC issues:**
```bash
# Verify admin token
echo $ADMIN_TOKEN

# Check user roles
psql $DATABASE_URL -c "SELECT u.email, ur.role FROM users u JOIN user_roles ur ON u.id = ur.user_id;"
```

**Event logging not working:**
```bash
# Check events enabled
echo $EVENTS_ENABLED

# Check file permissions
ls -la events.ndjson

# Tail events log
tail -f events.ndjson | jq
```

**Full troubleshooting guide:** See `RUNBOOK_team_mgmt.md`

## Support

**GitHub Issues:** Tag with `epic:3-team-management`  
**Slack:** `#cerply-b2b-support`  
**On-call:** PagerDuty rotation (P0 issues)

## Changelog

- **2025-10-10:** Epic 7 delivered (Gamification & Certification System)
- **2025-10-07:** Epic 3 delivered (Team Management & Learner Assignment)
- **2025-09-20:** Epic 2 delivered (SSO & RBAC)
- **2025-09-15:** M3 API Surface implemented (preview, generate, score, daily)
- **2025-08-31:** Initial API setup (health, flags, auth)

