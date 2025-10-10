# Epic 5: Slack Channel Integration - Implementation Plan

**Date:** 2025-10-10  
**Status:** Ready for Implementation  
**Priority:** P1 (Key B2B Differentiator)  
**Estimated Effort:** 6-8 hours

---

## Executive Summary

Epic 5 adds Slack as the first channel integration for delivering lessons to learners outside the web app. Learners will receive questions as Slack Direct Messages with interactive buttons, respond within Slack, and receive immediate feedback. This enables "learning where work happens" and is a key differentiator for B2B customers.

**Why Slack First?**
- Fastest integration path (30 mins OAuth setup vs 1-3 days for WhatsApp)
- Free developer tier (no Twilio costs)
- Native webhooks (no external polling required)
- Rich Block Kit UI for interactive buttons
- B2B alignment (75% of knowledge workers use Slack daily)

**Post-MVP:** WhatsApp (Phase 2), Microsoft Teams (Phase 3)

---

## Documentation Updates Completed ✅

### 1. MVP Roadmap (`docs/MVP_B2B_ROADMAP.md`)
- ✅ Updated Epic 5 title from "Channel Integrations" to "Slack Channel Integration (Learner Delivery MVP)"
- ✅ Added detailed rationale for Slack-first approach
- ✅ Specified complete database schema for `channels` and `user_channels` tables
- ✅ Detailed Slack adapter implementation (OAuth, Block Kit, webhooks)
- ✅ Defined 4 API routes: `POST /api/delivery/send`, `POST /api/delivery/webhook/slack`, `GET /api/delivery/channels`, `POST /api/delivery/channels`
- ✅ Added comprehensive acceptance tests with curl examples
- ✅ Documented future phases (WhatsApp Phase 2, Teams Phase 3)

### 2. Functional Spec (`docs/functional-spec.md`)
- ✅ Added new section "25) Slack Channel Integration v1 — 🔜 PLANNED"
- ✅ Documented all API routes with request/response schemas
- ✅ Included Slack Block Kit message example
- ✅ Specified feature flags: `FF_CHANNEL_SLACK`, `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET`
- ✅ Provided complete acceptance evidence with curl commands
- ✅ Listed all deliverables (migration, service, routes, adapter, tests, smoke tests)
- ✅ Renumbered "Backlog" from section 25 to section 26

### 3. Use Cases (`docs/spec/use-cases.md`)
- ✅ Added: "Channel delivery: Slack integration for lesson delivery and response collection — Planned (Epic 5) 🔜"

### 4. Feature Flags (`docs/spec/flags.md`)
- ✅ Added "Channel Integrations (Epic 5)" section
- ✅ Documented `FF_CHANNEL_SLACK`, `FF_CHANNEL_WHATSAPP`, `FF_CHANNEL_TEAMS`, `FF_CHANNEL_EMAIL`
- ✅ Documented Slack configuration variables: `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET`

### 5. BRD Changes Proposed (`docs/brd/PROPOSED_BRD_CHANGES_SLACK.md`)
- ✅ Created comprehensive proposal document for BRD updates
- ✅ Proposed changes to AU-1, B-7, L-17 (new)
- ✅ Added technical architecture section
- ✅ Included business justification and risk mitigation
- ✅ **STATUS: Awaiting approval before implementing**

---

## Technical Implementation Plan

### Phase 1: Database Schema (1 hour)

**File:** `api/drizzle/008_channels.sql`

```sql
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('slack', 'whatsapp', 'teams', 'email')),
  config JSONB NOT NULL, -- { slack_team_id, slack_bot_token, slack_signing_secret }
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, type)
);

CREATE TABLE user_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('slack', 'whatsapp', 'teams', 'email')),
  channel_id TEXT NOT NULL, -- Slack user ID (U123456), phone number, etc.
  preferences JSONB, -- { quiet_hours: "22:00-07:00", paused: false }
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, channel_type)
);

CREATE INDEX idx_user_channels_user ON user_channels(user_id);
CREATE INDEX idx_channels_org_type ON channels(organization_id, type);
```

**Tasks:**
- [ ] Create migration file
- [ ] Update `api/src/db/schema.ts` with Drizzle schemas
- [ ] Run migration locally and verify

---

### Phase 2: Slack Adapter Service (2 hours)

**File:** `api/src/adapters/slack.ts`

**Responsibilities:**
- OAuth 2.0 flow for workspace installation
- Block Kit message formatting (questions → buttons)
- Signature verification for webhooks (`x-slack-signature`, `x-slack-request-timestamp`)
- API calls to Slack Web API (`chat.postMessage`, `users.info`)
- Error handling and retry logic

**Key Functions:**
```typescript
export async function sendSlackMessage(
  userId: string,
  lessonId: string,
  questionId: string
): Promise<{ messageId: string; deliveredAt: Date }>

export function formatQuestionAsBlockKit(
  question: string,
  options: string[],
  questionId: string
): SlackBlockKit

export function verifySlackSignature(
  body: string,
  timestamp: string,
  signature: string,
  secret: string
): boolean

export function parseSlackButtonClick(
  payload: SlackInteractivityPayload
): { userId: string; questionId: string; answerValue: string }
```

---

### Phase 3: Delivery API Routes (2 hours)

**File:** `api/src/routes/delivery.ts`

**Routes:**
1. `POST /api/delivery/send` - Send lesson to user via channel
2. `POST /api/delivery/webhook/slack` - Receive Slack events/interactivity
3. `GET /api/delivery/channels` - List user's configured channels
4. `POST /api/delivery/channels` - Configure channel preferences

**RBAC:**
- `/api/delivery/send`: Admin or manager only
- `/api/delivery/channels`: Learner (own channels) or admin
- `/api/delivery/webhook/slack`: Public (validated via Slack signature)

**Error Handling:**
- 400 INVALID_REQUEST
- 404 USER_NOT_FOUND
- 404 CHANNEL_NOT_CONFIGURED
- 503 DELIVERY_FAILED

---

### Phase 4: Delivery Service (1 hour)

**File:** `api/src/services/delivery.ts`

**Responsibilities:**
- Channel abstraction layer (supports multiple channel types)
- Fetch user's preferred channel from `user_channels` table
- Call appropriate adapter (Slack, WhatsApp, Teams, Email)
- Record delivery attempt in `delivery_log` table (future)
- Handle quiet hours and paused preferences

**Key Functions:**
```typescript
export async function deliverLesson(
  userId: string,
  lessonId: string,
  questionId?: string
): Promise<DeliveryResult>

export async function getUserPreferredChannel(
  userId: string
): Promise<UserChannel | null>

export async function recordDeliveryAttempt(
  userId: string,
  channel: string,
  lessonId: string,
  success: boolean,
  error?: string
): Promise<void>
```

---

### Phase 5: Integration with Learn Flow (30 mins)

**File:** `api/src/routes/learn.ts`

**Changes:**
- When learner submits answer via Slack, ensure it's recorded in `attempts` table
- Add `channel` field to `attempts` table (migration update)
- Link Slack webhook responses to existing `POST /api/learn/submit` logic

**SQL Migration Update:**
```sql
ALTER TABLE attempts ADD COLUMN channel TEXT DEFAULT 'web';
CREATE INDEX idx_attempts_channel ON attempts(channel);
```

---

### Phase 6: Tests (1.5 hours)

**File:** `api/tests/delivery.test.ts`

**Test Suites:**
1. **Slack Adapter Tests** (15 tests)
   - OAuth flow
   - Block Kit formatting
   - Signature verification (valid, invalid, expired)
   - Message sending (success, failure)
   - Button click parsing

2. **Delivery Routes Tests** (12 tests)
   - `POST /api/delivery/send` (success, user not found, no channel configured)
   - `POST /api/delivery/webhook/slack` (button click, text message, invalid signature)
   - `GET /api/delivery/channels` (RBAC, empty list, multiple channels)
   - `POST /api/delivery/channels` (create, update, invalid preferences)

3. **Delivery Service Tests** (8 tests)
   - Channel selection logic
   - Quiet hours enforcement
   - Paused channel handling
   - Fallback to email

**File:** `api/scripts/smoke-delivery.sh`

**Smoke Tests:**
```bash
#!/bin/bash
# 1. Send lesson via Slack (stub/mock mode)
# 2. Simulate Slack button click
# 3. Verify attempt recorded
# 4. Get user channels
# 5. Configure channel preferences
```

---

### Phase 7: Documentation (30 mins)

**Files to Update:**
- [ ] `api/README.md` - Add delivery endpoints to API reference
- [ ] `docs/spec/api-routes.json` - Add 4 new routes
- [ ] `README.md` - Add Slack setup instructions
- [ ] `docs/runbooks/slack-troubleshooting.md` - New troubleshooting guide

---

## Slack App Setup (Pre-Implementation)

### 1. Create Slack App
1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name: "Cerply Learning"
4. Workspace: Select your dev workspace

### 2. Configure OAuth & Permissions
1. Navigate to "OAuth & Permissions"
2. Add Bot Token Scopes:
   - `chat:write` - Send messages
   - `users:read` - Get user info
   - `im:write` - Open DMs
   - `im:history` - Read DM history
3. Install app to workspace
4. Copy "Bot User OAuth Token" → `SLACK_BOT_TOKEN`

### 3. Enable Interactivity
1. Navigate to "Interactivity & Shortcuts"
2. Turn on Interactivity
3. Request URL: `https://api.cerply.com/api/delivery/webhook/slack`
4. Save Changes

### 4. Subscribe to Events
1. Navigate to "Event Subscriptions"
2. Turn on Events
3. Request URL: `https://api.cerply.com/api/delivery/webhook/slack`
4. Subscribe to bot events:
   - `message.im` - Direct messages
5. Save Changes

### 5. Get Credentials
1. Navigate to "Basic Information"
2. Copy "Client ID" → `SLACK_CLIENT_ID`
3. Copy "Client Secret" → `SLACK_CLIENT_SECRET`
4. Copy "Signing Secret" → `SLACK_SIGNING_SECRET`

---

## Environment Variables

Add to `api/.env`:

```bash
# Slack Channel Integration
FF_CHANNEL_SLACK=true
SLACK_CLIENT_ID=1234567890123.1234567890123
SLACK_CLIENT_SECRET=abc123def456ghi789jkl012mno345pq
SLACK_SIGNING_SECRET=abc123def456ghi789jkl012mno345pq
```

---

## Acceptance Criteria

### Must Pass Before PR Merge:

- [ ] All unit tests pass (`npm test -- delivery`)
- [ ] Smoke tests pass (`bash api/scripts/smoke-delivery.sh`)
- [ ] Can send lesson to Slack DM
- [ ] Can click button in Slack and see "Correct!" response
- [ ] Attempt is recorded in database with `channel='slack'`
- [ ] Signature verification rejects invalid webhooks (401)
- [ ] Quiet hours are respected (no messages sent during quiet hours)
- [ ] Paused channels return error
- [ ] RBAC enforced (learner can't send to other learners)
- [ ] Linter passes with no errors
- [ ] Documentation updated (functional spec, API routes, flags)

---

## Demo Script

```bash
# 1. Start API with Slack flag enabled
cd api
FF_CHANNEL_SLACK=true \
SLACK_CLIENT_ID=... \
SLACK_CLIENT_SECRET=... \
SLACK_SIGNING_SECRET=... \
npm run dev

# 2. Configure user's Slack channel
curl -X POST http://localhost:8080/api/delivery/channels \
  -H "Cookie: cerply.sid=learner-session" \
  -H "content-type: application/json" \
  -d '{
    "channelType": "slack",
    "preferences": { "quietHours": "22:00-07:00", "paused": false }
  }'

# 3. Send lesson to Slack
curl -X POST http://localhost:8080/api/delivery/send \
  -H "x-admin-token: dev-admin-token-12345" \
  -H "content-type: application/json" \
  -d '{
    "userId": "user-123",
    "channel": "slack",
    "lessonId": "lesson-fire-safety-1"
  }'
# → User receives DM in Slack with question and buttons

# 4. User clicks button in Slack
# → Slack sends webhook to /api/delivery/webhook/slack
# → System responds with "✅ Correct!" in Slack
# → Attempt recorded in database

# 5. Verify attempt
curl http://localhost:8080/api/manager/users/user-123/progress \
  -H "x-admin-token: dev-admin-token-12345" | jq '.attempts[-1]'
# → { "questionId": "q123", "correct": true, "channel": "slack", ... }
```

---

## Rollout Plan

### Development (Week 1)
- [ ] Complete implementation (6-8 hours)
- [ ] Local testing with dev Slack workspace
- [ ] Unit tests + smoke tests pass
- [ ] PR review and merge

### Staging (Week 2)
- [ ] Deploy to staging with `FF_CHANNEL_SLACK=true`
- [ ] Configure staging Slack app
- [ ] UAT with 2-3 internal users
- [ ] Fix any bugs

### Production (Week 3)
- [ ] Deploy to production with `FF_CHANNEL_SLACK=false` (disabled by default)
- [ ] Enable for pilot customers only (manual flag flip)
- [ ] Monitor Slack API rate limits and errors
- [ ] Collect feedback and iterate

### Phase 2 (Post-MVP)
- [ ] WhatsApp integration (8-10 hours)
- [ ] Teams integration (8-10 hours)
- [ ] Email fallback (4 hours)
- [ ] Multi-channel preferences (4 hours)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Slack API rate limits (1 msg/sec/user) | High | Implement queue with rate limiting |
| User uninstalls Slack app | Medium | Fallback to email, notify manager |
| Webhook signature verification issues | High | Comprehensive tests, logging |
| Quiet hours edge cases (timezones) | Medium | Store timezone in user preferences |
| Large message content (Block Kit limits) | Low | Truncate long questions, link to web |

---

## Success Metrics

**Track in First 30 Days:**
- Slack messages sent: Target 1,000+
- Response rate via Slack: Target >60%
- Avg response time: Target <2 mins
- Error rate: Target <2%
- User satisfaction (survey): Target 4.5/5

---

## Next Steps

1. **Approve BRD changes** (`docs/brd/PROPOSED_BRD_CHANGES_SLACK.md`)
2. **Switch to agent mode** and implement Epic 5
3. **Follow this plan** as the implementation guide
4. **Complete acceptance criteria** before PR merge
5. **Demo to stakeholders** using the demo script above

---

**Questions?** See `docs/brd/PROPOSED_BRD_CHANGES_SLACK.md` for business justification and architectural details.


