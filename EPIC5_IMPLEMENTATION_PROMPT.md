# Epic 5: Slack Channel Integration — Implementation Prompt

**For:** New Agent/Developer  
**Date:** 2025-10-10  
**Estimated Effort:** 6-8 hours  
**Priority:** P1 (Key B2B Differentiator)

---

## Table of Contents

1. [Project Context](#1-project-context)
2. [Epic 5 Requirements](#2-epic-5-requirements)
3. [Implementation Plan](#3-implementation-plan)
4. [Code Patterns & Examples](#4-code-patterns--examples)
5. [Slack App Setup](#5-slack-app-setup)
6. [Acceptance Criteria](#6-acceptance-criteria)
7. [Testing Instructions](#7-testing-instructions)
8. [Rollout Plan](#8-rollout-plan)
9. [References](#9-references)
10. [Quick Start Checklist](#10-quick-start-checklist)

---

## 1. Project Context

### What is Cerply?

Cerply is a B2B enterprise learning platform that turns company information (policies, regulations, meeting transcripts) into adaptive, personalized learning experiences. Think of it as "institutional memory as a service" — ensuring that critical knowledge is learned, retained, and refreshed indefinitely.

**Key Value Props:**
- **3-LLM Content Generation:** Generator A + Generator B + Fact-Checker for quality
- **Manager Dashboard:** Team comprehension, retention curves, at-risk learners
- **Adaptive Learning:** 4 difficulty levels adjust based on performance
- **Gamification:** Levels (Novice→Master), badges, certificates
- **Conversational UX:** Chat interface, Cmd+K, free-text answers
- **Channel Delivery:** Learn where work happens (Slack MVP, WhatsApp/Teams Phase 2)

### Current Status (Epics 1-4 Complete)

| Epic | Status | Key Deliverables |
|------|--------|------------------|
| **Epic 1: D2C Removal** | ✅ Complete | Enterprise-only access, SSO redirects |
| **Epic 2: SSO & RBAC** | ✅ Complete | SAML/OIDC, roles (admin/manager/learner) |
| **Epic 3: Team Management** | ✅ Complete | Create teams, assign learners, CSV import |
| **Epic 4: Manager Analytics** | ✅ Complete | 7 analytics endpoints, 4 DB tables, caching |

**What's Working Now:**
- Managers can create teams and assign learners to tracks
- Learners receive adaptive lessons via web app
- Managers see team analytics (comprehension, retention, at-risk)
- Enterprise SSO with role-based access control
- PostgreSQL database with Drizzle ORM
- Fastify API with feature flags

**What's Missing (Epic 5 Goal):**
- Learners can only access lessons via web app
- No Slack, WhatsApp, or Teams integration
- Learning is not integrated into daily workflow

### Tech Stack

**API (Backend):**
- **Runtime:** Node.js 20
- **Framework:** Fastify 4.x
- **ORM:** Drizzle ORM (type-safe PostgreSQL)
- **Database:** PostgreSQL 15
- **Auth:** Session cookies (`cerply.sid`), SSO (SAML/OIDC)
- **Testing:** Vitest + Supertest

**Web (Frontend):**
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Auth:** Session-based via API proxy

**Infrastructure:**
- **Deployment:** Render (staging), Vercel (web)
- **Database:** Render PostgreSQL
- **CI/CD:** GitHub Actions

### Code Patterns You Must Follow

#### 1. Feature Flags
Every new feature is gated by environment variable flags:

```typescript
const FF_CHANNEL_SLACK = process.env.FF_CHANNEL_SLACK === 'true';

if (!FF_CHANNEL_SLACK) {
  return reply.status(404).send({
    error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
  });
}
```

#### 2. RBAC Middleware
All routes check roles before execution:

```typescript
import { requireManager, requireAdmin, requireLearner, getSession } from '../middleware/rbac';

app.get('/api/manager/teams', async (req, reply) => {
  if (!requireManager(req, reply)) return reply; // Must return reply!
  // ... implementation
});
```

**Critical:** Always `return reply` after RBAC check to avoid double-sends.

#### 3. Error Envelopes
All errors use consistent structure:

```typescript
return reply.status(400).send({
  error: {
    code: 'INVALID_REQUEST', // UPPER_SNAKE_CASE
    message: 'User-friendly message',
    details: { field: 'userId', reason: 'Required' } // optional
  }
});
```

#### 4. Tenant Isolation
Every query must filter by `organization_id`:

```typescript
const [team] = await db
  .select()
  .from(teams)
  .where(eq(teams.id, teamId))
  .where(eq(teams.organizationId, session.organizationId)) // Tenant isolation!
  .limit(1);
```

#### 5. Database Migrations
All migrations follow standard header format:

```sql
------------------------------------------------------------------------------
-- Epic 5: Slack Channel Integration
-- BRD: B-7, AU-1, L-17 | FSD: §25 Slack Channel Integration v1
------------------------------------------------------------------------------
```

### Key Files to Study

**Before starting, read these files to understand patterns:**

1. **`api/src/routes/managerAnalytics.ts`** - Route structure, RBAC, feature flags
2. **`api/src/services/analytics.ts`** - Service layer pattern, DB queries
3. **`api/drizzle/007_manager_analytics.sql`** - Migration format, indexes
4. **`api/tests/manager-analytics.test.ts`** - Testing patterns, mocks
5. **`docs/functional-spec.md`** - Section 25 (Slack integration spec)
6. **`docs/MVP_B2B_ROADMAP.md`** - Epic 5 details

### Project Structure

```
cerply-cursor-starter-v2-refresh/
├── api/
│   ├── drizzle/              # Database migrations (*.sql)
│   ├── src/
│   │   ├── adapters/         # External service integrations (NEW: slack.ts)
│   │   ├── db/
│   │   │   └── schema.ts     # Drizzle ORM schemas (UPDATE)
│   │   ├── middleware/
│   │   │   └── rbac.ts       # Auth middleware
│   │   ├── routes/           # API endpoints (NEW: delivery.ts)
│   │   └── services/         # Business logic (NEW: delivery.ts)
│   ├── scripts/              # Smoke tests (NEW: smoke-delivery.sh)
│   └── tests/                # Unit tests (NEW: delivery.test.ts)
├── docs/
│   ├── brd/
│   │   └── cerply-brd.md     # Business requirements
│   ├── functional-spec.md    # Technical spec (UPDATE section 25)
│   ├── MVP_B2B_ROADMAP.md    # Epic roadmap
│   └── runbooks/             # Ops guides (NEW: slack-troubleshooting.md)
└── web/                      # Next.js frontend (no changes for Epic 5)
```

---

## 2. Epic 5 Requirements

### Goal

Enable learners to receive and respond to lessons via Slack Direct Messages with interactive buttons. This eliminates app-switching and embeds learning into the daily workflow where knowledge workers already spend their time.

### Why Slack First?

**Slack Chosen Over WhatsApp/Teams:**

| Criteria | Slack | WhatsApp | Teams |
|----------|-------|----------|-------|
| **Setup Time** | 30 mins | 1-3 days | 1-2 days |
| **Cost** | Free (dev tier) | $0.005/msg (Twilio) | Free (bot framework) |
| **Webhooks** | Native | Polling required | Native |
| **UI** | Block Kit (rich) | Text + buttons | Adaptive Cards |
| **B2B Alignment** | 75% knowledge workers | 10% enterprise | 60% enterprise |
| **Integration Complexity** | Low | Medium | Medium |

**Decision:** Slack MVP → WhatsApp Phase 2 → Teams Phase 3

### User Story

**As a learner,**  
I want to receive lesson questions in Slack DMs with clickable buttons,  
So that I can answer without leaving my primary work tool.

**Acceptance:**
- Receive question as Slack DM (not channel message)
- See question text + multiple choice buttons (A, B, C, D)
- Click button → See immediate feedback ("✅ Correct!" or "❌ Incorrect: ...")
- Attempt recorded in database with `channel='slack'`
- Respects quiet hours (e.g., no messages 22:00-07:00)
- Respects paused preference (learner can pause/resume)

### Key Features

#### 1. Slack Workspace Integration (OAuth 2.0)
- Organization admin installs Cerply Slack app to workspace
- App requests bot scopes: `chat:write`, `users:read`, `im:write`, `im:history`
- Bot token stored in `channels` table per organization
- Learners connect their Slack user ID to Cerply account

#### 2. Lesson Delivery (Block Kit Format)
- Manager or system triggers `POST /api/delivery/send`
- System looks up learner's Slack channel preference
- Formats question as Block Kit JSON:
  - Section block: Question text
  - Actions block: 4 buttons (A, B, C, D)
- Sends via Slack Web API `chat.postMessage`
- Records delivery in `delivery_log` (future)

#### 3. Response Collection (Webhook Handler)
- Learner clicks button in Slack
- Slack sends POST request to `/api/delivery/webhook/slack`
- System verifies signature (`x-slack-signature`)
- Parses button click payload (user ID, question ID, answer value)
- Calls existing `POST /api/learn/submit` logic
- Responds to Slack with feedback message

#### 4. Real-Time Feedback
- If correct: "✅ Correct! [Explanation text]"
- If incorrect: "❌ Incorrect. [Correct answer + Explanation]"
- Feedback sent via `response_url` (ephemeral message to user only)

#### 5. Learner Preferences
- Learners configure via `POST /api/delivery/channels`:
  - `channelType`: 'slack' | 'whatsapp' | 'teams' | 'email'
  - `preferences.quietHours`: "22:00-07:00" (no messages during this window)
  - `preferences.paused`: true/false (pause all notifications)
- Preferences stored in `user_channels` table per user

#### 6. Security (Signature Verification)
- Every Slack webhook request includes `x-slack-signature` header
- Algorithm: `sha256(version:timestamp:body, signing_secret)`
- System validates signature and timestamp (reject if > 5 mins old)
- Prevents replay attacks and unauthorized webhooks

#### 7. Fallback (Email)
- If Slack delivery fails (user uninstalled app, token expired):
  - Log error
  - Send email notification as fallback (future)
  - Notify manager of delivery failure

### Database Schema

#### Table: `channels`
Organization-level channel configurations.

```sql
CREATE TABLE channels (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type                TEXT NOT NULL CHECK (type IN ('slack', 'whatsapp', 'teams', 'email')),
  config              JSONB NOT NULL, -- { slack_team_id, slack_bot_token, slack_signing_secret }
  enabled             BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, type)
);

CREATE INDEX idx_channels_org_type ON channels(organization_id, type);
```

**Example row:**
```json
{
  "id": "ch-123",
  "organization_id": "org-456",
  "type": "slack",
  "config": {
    "slack_team_id": "T123456",
    "slack_bot_token": "xoxb-1234567890123-1234567890123-abcdefghijklmnopqrstuvwx",
    "slack_signing_secret": "abc123def456ghi789jkl012mno345pq"
  },
  "enabled": true,
  "created_at": "2025-10-10T10:00:00Z"
}
```

#### Table: `user_channels`
User-level channel preferences.

```sql
CREATE TABLE user_channels (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_type        TEXT NOT NULL CHECK (channel_type IN ('slack', 'whatsapp', 'teams', 'email')),
  channel_id          TEXT NOT NULL, -- Slack user ID (U123456), phone number, etc.
  preferences         JSONB, -- { quiet_hours: "22:00-07:00", paused: false }
  verified            BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, channel_type)
);

CREATE INDEX idx_user_channels_user ON user_channels(user_id);
```

**Example row:**
```json
{
  "id": "uc-789",
  "user_id": "user-abc",
  "channel_type": "slack",
  "channel_id": "U123456",
  "preferences": {
    "quiet_hours": "22:00-07:00",
    "timezone": "America/New_York",
    "paused": false
  },
  "verified": true,
  "created_at": "2025-10-10T10:05:00Z"
}
```

#### Update: `attempts` table
Add channel tracking to existing attempts table.

```sql
ALTER TABLE attempts ADD COLUMN channel TEXT DEFAULT 'web';
CREATE INDEX idx_attempts_channel ON attempts(channel);
```

### API Routes

#### 1. `POST /api/delivery/send`
Send a lesson/question to user via their preferred channel.

**RBAC:** Admin or manager only  
**Feature Flag:** `FF_CHANNEL_SLACK`

**Request:**
```json
{
  "userId": "uuid",
  "channel": "slack",
  "lessonId": "lesson-fire-safety-1",
  "questionId": "q123" // optional, if null sends next due question
}
```

**Response (200):**
```json
{
  "messageId": "1234567890.123456",
  "deliveredAt": "2025-10-10T14:30:00Z",
  "channel": "slack"
}
```

**Errors:**
- `400 INVALID_REQUEST`: Missing userId or lessonId
- `404 USER_NOT_FOUND`: User does not exist
- `404 CHANNEL_NOT_CONFIGURED`: User has no Slack channel configured
- `503 DELIVERY_FAILED`: Slack API returned error

---

#### 2. `POST /api/delivery/webhook/slack`
Receive events and interactivity from Slack (button clicks, messages).

**RBAC:** Public (signature verified)  
**Feature Flag:** `FF_CHANNEL_SLACK`

**Request (Button Click):**
```json
{
  "type": "block_actions",
  "user": { "id": "U123456", "username": "john.doe" },
  "actions": [
    {
      "type": "button",
      "action_id": "answer",
      "block_id": "q123",
      "value": "option_a",
      "text": { "type": "plain_text", "text": "A. Raise the alarm" }
    }
  ],
  "response_url": "https://hooks.slack.com/actions/T123/B456/xyz789",
  "message": { "ts": "1234567890.123456" }
}
```

**Response (200 to Slack):**
```json
{
  "text": "✅ Correct! Raising the alarm alerts others and ensures a coordinated response."
}
```

**Signature Verification:**
- Header: `x-slack-signature: v0=abc123...`
- Header: `x-slack-request-timestamp: 1234567890`
- Algorithm: `sha256('v0:' + timestamp + ':' + raw_body, signing_secret)`
- Reject if signature invalid (401)
- Reject if timestamp > 5 minutes old (401)

---

#### 3. `GET /api/delivery/channels`
Get learner's configured channels and preferences.

**RBAC:** Learner (own channels) or admin  
**Feature Flag:** `FF_CHANNEL_SLACK`

**Response (200):**
```json
{
  "channels": [
    {
      "type": "slack",
      "channelId": "U123456",
      "preferences": {
        "quietHours": "22:00-07:00",
        "timezone": "America/New_York",
        "paused": false
      },
      "verified": true,
      "createdAt": "2025-10-10T10:05:00Z"
    }
  ]
}
```

---

#### 4. `POST /api/delivery/channels`
Configure or update channel preferences.

**RBAC:** Learner (own channels) or admin  
**Feature Flag:** `FF_CHANNEL_SLACK`

**Request:**
```json
{
  "channelType": "slack",
  "channelId": "U123456", // optional, auto-discovered if omitted
  "preferences": {
    "quietHours": "22:00-07:00",
    "timezone": "America/New_York",
    "paused": false
  }
}
```

**Response (200):**
```json
{
  "channel": {
    "type": "slack",
    "channelId": "U123456",
    "preferences": { "quietHours": "22:00-07:00", "paused": false },
    "verified": true
  }
}
```

**Errors:**
- `400 INVALID_REQUEST`: Invalid quiet hours format
- `404 ORGANIZATION_CHANNEL_NOT_CONFIGURED`: Org hasn't installed Slack app

### Feature Flags & Environment Variables

**Feature Flags:**
- `FF_CHANNEL_SLACK=true` - Enables Slack channel integration

**Slack Configuration (per org, stored in DB):**
- `SLACK_CLIENT_ID` - OAuth client ID (from Slack app config)
- `SLACK_CLIENT_SECRET` - OAuth client secret
- `SLACK_SIGNING_SECRET` - Webhook signature verification key

**Example `.env` for development:**
```bash
# Slack Channel Integration
FF_CHANNEL_SLACK=true
SLACK_CLIENT_ID=1234567890123.1234567890123
SLACK_CLIENT_SECRET=abc123def456ghi789jkl012mno345pq
SLACK_SIGNING_SECRET=abc123def456ghi789jkl012mno345pq
```

---

## 3. Implementation Plan

### Phase 1: Database Schema (1 hour)

**Objective:** Create database tables and update Drizzle schemas.

#### Step 1.1: Create Migration File
**File:** `api/drizzle/008_channels.sql`

```sql
------------------------------------------------------------------------------
-- Epic 5: Slack Channel Integration
-- BRD: B-7, AU-1, L-17 | FSD: §25 Slack Channel Integration v1
------------------------------------------------------------------------------

-- Organization-level channel configurations
CREATE TABLE IF NOT EXISTS channels (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type                TEXT NOT NULL CHECK (type IN ('slack', 'whatsapp', 'teams', 'email')),
  config              JSONB NOT NULL, -- { slack_team_id, slack_bot_token, slack_signing_secret }
  enabled             BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, type)
);

CREATE INDEX IF NOT EXISTS idx_channels_org_type ON channels(organization_id, type);

-- User-level channel preferences
CREATE TABLE IF NOT EXISTS user_channels (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_type        TEXT NOT NULL CHECK (channel_type IN ('slack', 'whatsapp', 'teams', 'email')),
  channel_id          TEXT NOT NULL, -- Slack user ID (U123456), phone number, etc.
  preferences         JSONB, -- { quiet_hours: "22:00-07:00", paused: false }
  verified            BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, channel_type)
);

CREATE INDEX IF NOT EXISTS idx_user_channels_user ON user_channels(user_id);

-- Add channel tracking to attempts
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'web';
CREATE INDEX IF NOT EXISTS idx_attempts_channel ON attempts(channel);

-- Comment for audit
COMMENT ON TABLE channels IS 'Organization-level channel integrations (Slack, WhatsApp, Teams)';
COMMENT ON TABLE user_channels IS 'User-level channel preferences and quiet hours';
COMMENT ON COLUMN attempts.channel IS 'Delivery channel: web, slack, whatsapp, teams, email';
```

#### Step 1.2: Update Drizzle Schema
**File:** `api/src/db/schema.ts`

Add after existing table definitions:

```typescript
// Epic 5: Slack Channel Integration
export const channels = pgTable('channels', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'slack' | 'whatsapp' | 'teams' | 'email'
  config: jsonb('config').notNull(), // { slack_team_id, slack_bot_token, slack_signing_secret }
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userChannels = pgTable('user_channels', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  channelType: text('channel_type').notNull(), // 'slack' | 'whatsapp' | 'teams' | 'email'
  channelId: text('channel_id').notNull(), // Slack user ID, phone number, etc.
  preferences: jsonb('preferences'), // { quiet_hours, timezone, paused }
  verified: boolean('verified').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

Update `attempts` table schema:

```typescript
export const attempts = pgTable('attempts', {
  // ... existing fields ...
  channel: text('channel').default('web'), // NEW: Delivery channel
});
```

#### Step 1.3: Run Migration
```bash
cd api
npm run migrate
# Verify tables created
psql $DATABASE_URL -c "\dt channels user_channels"
```

**Acceptance:**
- [ ] Migration file created with correct header format
- [ ] `channels` table exists with proper indexes
- [ ] `user_channels` table exists with proper indexes
- [ ] `attempts.channel` column added with default 'web'
- [ ] Drizzle schema updated and compiles without errors

---

### Phase 2: Slack Adapter (2 hours)

**Objective:** Implement Slack-specific integration logic.

**File:** `api/src/adapters/slack.ts` (NEW)

```typescript
/**
 * Slack Adapter
 * Epic 5: Slack Channel Integration
 * Handles OAuth, Block Kit formatting, signature verification, and Slack Web API calls
 */

import crypto from 'crypto';

// Slack Web API base URL
const SLACK_API_BASE = 'https://slack.com/api';

/**
 * Send a lesson question to Slack DM
 * @param slackUserId - Slack user ID (e.g., "U123456")
 * @param botToken - Slack bot token (from channels.config)
 * @param question - Question object { text, options, questionId }
 * @returns { messageId, deliveredAt }
 */
export async function sendSlackMessage(
  slackUserId: string,
  botToken: string,
  question: { text: string; options: string[]; questionId: string; explanation?: string }
): Promise<{ messageId: string; deliveredAt: Date }> {
  // Format question as Block Kit
  const blocks = formatQuestionAsBlockKit(question.text, question.options, question.questionId);

  // Send to Slack
  const response = await fetch(`${SLACK_API_BASE}/chat.postMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${botToken}`,
    },
    body: JSON.stringify({
      channel: slackUserId, // DM to user
      blocks,
      text: question.text, // Fallback for notifications
    }),
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }

  return {
    messageId: data.ts, // Slack message timestamp
    deliveredAt: new Date(),
  };
}

/**
 * Format question as Slack Block Kit JSON
 * @param question - Question text
 * @param options - Array of answer options (e.g., ["A. Raise alarm", "B. Ignore"])
 * @param questionId - Question ID for tracking
 * @returns Block Kit JSON array
 */
export function formatQuestionAsBlockKit(
  question: string,
  options: string[],
  questionId: string
): any[] {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Question:*\n${question}`,
      },
    },
    {
      type: 'actions',
      block_id: questionId,
      elements: options.map((option, idx) => ({
        type: 'button',
        text: {
          type: 'plain_text',
          text: option.substring(0, 75), // Slack limit: 75 chars
        },
        action_id: 'answer',
        value: `option_${String.fromCharCode(97 + idx)}`, // option_a, option_b, etc.
        style: idx === 0 ? undefined : undefined, // No styling for now
      })),
    },
  ];
}

/**
 * Verify Slack webhook signature
 * Prevents replay attacks and unauthorized requests
 * @param body - Raw request body (string)
 * @param timestamp - x-slack-request-timestamp header
 * @param signature - x-slack-signature header
 * @param signingSecret - Slack signing secret from channels.config
 * @returns true if valid, false otherwise
 */
export function verifySlackSignature(
  body: string,
  timestamp: string,
  signature: string,
  signingSecret: string
): boolean {
  // Reject old requests (> 5 minutes)
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp, 10)) > 60 * 5) {
    return false;
  }

  // Compute expected signature
  const sigBasestring = `v0:${timestamp}:${body}`;
  const expectedSignature = 'v0=' + crypto
    .createHmac('sha256', signingSecret)
    .update(sigBasestring)
    .digest('hex');

  // Constant-time comparison
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature)
  );
}

/**
 * Parse Slack button click payload
 * @param payload - Slack interactivity payload
 * @returns { slackUserId, questionId, answerValue, responseUrl }
 */
export function parseSlackButtonClick(payload: any): {
  slackUserId: string;
  questionId: string;
  answerValue: string;
  responseUrl: string;
} {
  return {
    slackUserId: payload.user.id,
    questionId: payload.actions[0].block_id,
    answerValue: payload.actions[0].value, // e.g., "option_a"
    responseUrl: payload.response_url,
  };
}

/**
 * Send feedback to Slack (via response_url)
 * @param responseUrl - Slack response_url from button click
 * @param correct - Whether answer was correct
 * @param explanation - Explanation text
 */
export async function sendSlackFeedback(
  responseUrl: string,
  correct: boolean,
  explanation: string
): Promise<void> {
  const emoji = correct ? '✅' : '❌';
  const prefix = correct ? 'Correct!' : 'Incorrect.';

  await fetch(responseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `${emoji} ${prefix} ${explanation}`,
      replace_original: false, // Don't replace question, append feedback
    }),
  });
}

/**
 * Get Slack user info
 * @param slackUserId - Slack user ID
 * @param botToken - Slack bot token
 * @returns { id, email, real_name }
 */
export async function getSlackUserInfo(
  slackUserId: string,
  botToken: string
): Promise<{ id: string; email: string; realName: string }> {
  const response = await fetch(`${SLACK_API_BASE}/users.info?user=${slackUserId}`, {
    headers: { 'Authorization': `Bearer ${botToken}` },
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }

  return {
    id: data.user.id,
    email: data.user.profile.email,
    realName: data.user.real_name,
  };
}
```

**Acceptance:**
- [ ] `slack.ts` file created in `api/src/adapters/`
- [ ] All 6 exported functions implemented
- [ ] Signature verification follows Slack docs exactly
- [ ] Block Kit formatting matches Slack examples
- [ ] Error handling for Slack API failures

---

### Phase 3: Delivery Service (1 hour)

**Objective:** Channel-agnostic service layer for lesson delivery.

**File:** `api/src/services/delivery.ts` (NEW)

```typescript
/**
 * Delivery Service
 * Epic 5: Slack Channel Integration
 * Channel-agnostic lesson delivery with quiet hours and preferences
 */

import { db } from '../db';
import { userChannels, channels, users, attempts } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import {
  sendSlackMessage,
  sendSlackFeedback,
  getSlackUserInfo,
} from '../adapters/slack';

export interface DeliveryResult {
  messageId: string;
  deliveredAt: Date;
  channel: string;
}

export interface UserChannel {
  type: string;
  channelId: string;
  preferences: {
    quietHours?: string; // "22:00-07:00"
    timezone?: string;
    paused?: boolean;
  };
  verified: boolean;
}

/**
 * Deliver a lesson to user via their preferred channel
 * @param userId - Cerply user ID
 * @param lessonId - Lesson ID
 * @param questionId - Optional question ID (if null, fetches next due)
 * @returns DeliveryResult
 */
export async function deliverLesson(
  userId: string,
  lessonId: string,
  questionId?: string
): Promise<DeliveryResult> {
  // Get user's preferred channel
  const userChannel = await getUserPreferredChannel(userId);

  if (!userChannel) {
    throw new Error('USER_CHANNEL_NOT_CONFIGURED');
  }

  // Check if paused
  if (userChannel.preferences.paused) {
    throw new Error('CHANNEL_PAUSED');
  }

  // Check quiet hours
  if (isWithinQuietHours(userChannel.preferences.quietHours, userChannel.preferences.timezone)) {
    throw new Error('WITHIN_QUIET_HOURS');
  }

  // Get organization channel config
  const [user] = await db
    .select({ organizationId: users.organizationId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  const [orgChannel] = await db
    .select()
    .from(channels)
    .where(
      and(
        eq(channels.organizationId, user.organizationId),
        eq(channels.type, userChannel.type)
      )
    )
    .limit(1);

  if (!orgChannel) {
    throw new Error('ORGANIZATION_CHANNEL_NOT_CONFIGURED');
  }

  // Fetch question (mock for now)
  const question = {
    text: 'What is the first step in a fire emergency?',
    options: ['A. Raise the alarm', 'B. Fight the fire', 'C. Collect belongings', 'D. Ignore it'],
    questionId: questionId || 'q-mock-123',
    explanation: 'Raising the alarm alerts others and ensures coordinated response.',
  };

  // Deliver via appropriate channel
  if (userChannel.type === 'slack') {
    const config = orgChannel.config as any;
    const result = await sendSlackMessage(
      userChannel.channelId,
      config.slack_bot_token,
      question
    );
    return { ...result, channel: 'slack' };
  }

  throw new Error('CHANNEL_NOT_SUPPORTED');
}

/**
 * Get user's preferred channel
 * @param userId - Cerply user ID
 * @returns UserChannel or null
 */
export async function getUserPreferredChannel(userId: string): Promise<UserChannel | null> {
  const [userChannel] = await db
    .select()
    .from(userChannels)
    .where(and(eq(userChannels.userId, userId), eq(userChannels.verified, true)))
    .orderBy(userChannels.createdAt) // First verified channel
    .limit(1);

  if (!userChannel) {
    return null;
  }

  return {
    type: userChannel.channelType,
    channelId: userChannel.channelId,
    preferences: (userChannel.preferences as any) || {},
    verified: userChannel.verified,
  };
}

/**
 * Check if current time is within quiet hours
 * @param quietHours - Format: "22:00-07:00"
 * @param timezone - IANA timezone (e.g., "America/New_York")
 * @returns true if within quiet hours
 */
export function isWithinQuietHours(
  quietHours?: string,
  timezone: string = 'UTC'
): boolean {
  if (!quietHours) return false;

  const [start, end] = quietHours.split('-');
  const now = new Date().toLocaleTimeString('en-US', {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });

  // Simple comparison (doesn't handle cross-midnight properly, TODO)
  return now >= start || now < end;
}

/**
 * Record attempt from Slack button click
 * @param userId - Cerply user ID
 * @param questionId - Question ID
 * @param answerValue - Answer value (e.g., "option_a")
 * @param correct - Whether answer was correct
 * @returns Attempt ID
 */
export async function recordSlackAttempt(
  userId: string,
  questionId: string,
  answerValue: string,
  correct: boolean
): Promise<string> {
  const [attempt] = await db
    .insert(attempts)
    .values({
      userId,
      itemId: questionId, // Simplified for MVP
      correct,
      latencyMs: 0, // Unknown for async Slack responses
      channel: 'slack',
      createdAt: new Date(),
    })
    .returning({ id: attempts.id });

  return attempt.id;
}
```

**Acceptance:**
- [ ] `delivery.ts` file created in `api/src/services/`
- [ ] All 5 exported functions implemented
- [ ] Quiet hours logic works (basic version acceptable)
- [ ] Channel selection prioritizes verified channels
- [ ] Error messages match expected codes

---

### Phase 4: API Routes (2 hours)

**Objective:** Create 4 delivery endpoints with RBAC and feature flags.

**File:** `api/src/routes/delivery.ts` (NEW)

```typescript
/**
 * Delivery Routes
 * Epic 5: Slack Channel Integration
 * BRD: B-7, AU-1, L-17 | FSD: §25 Slack Channel Integration v1
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { userChannels, channels, users } from '../db/schema';
import { requireManager, requireAdmin, requireLearner, getSession } from '../middleware/rbac';
import {
  deliverLesson,
  getUserPreferredChannel,
  recordSlackAttempt,
} from '../services/delivery';
import {
  verifySlackSignature,
  parseSlackButtonClick,
  sendSlackFeedback,
} from '../adapters/slack';

// Feature flags
const FF_CHANNEL_SLACK = process.env.FF_CHANNEL_SLACK === 'true';

export async function registerDeliveryRoutes(app: FastifyInstance) {
  /**
   * POST /api/delivery/send
   * Send a lesson to user via their preferred channel
   * RBAC: admin or manager only
   * Feature Flag: FF_CHANNEL_SLACK
   */
  app.post(
    '/api/delivery/send',
    async (
      req: FastifyRequest<{
        Body: { userId: string; channel: string; lessonId: string; questionId?: string };
      }>,
      reply: FastifyReply
    ) => {
      // Check feature flag
      if (!FF_CHANNEL_SLACK) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' },
        });
      }

      // Check RBAC
      if (!requireManager(req, reply)) return reply;

      const { userId, channel, lessonId, questionId } = req.body;

      // Validate input
      if (!userId || !lessonId) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required fields',
            details: { required: ['userId', 'lessonId'] },
          },
        });
      }

      try {
        const result = await deliverLesson(userId, lessonId, questionId);
        return reply.send(result);
      } catch (error: any) {
        if (error.message === 'USER_CHANNEL_NOT_CONFIGURED') {
          return reply.status(404).send({
            error: {
              code: 'CHANNEL_NOT_CONFIGURED',
              message: 'User has not configured delivery channel',
            },
          });
        }
        if (error.message === 'CHANNEL_PAUSED') {
          return reply.status(400).send({
            error: { code: 'CHANNEL_PAUSED', message: 'User has paused notifications' },
          });
        }
        if (error.message === 'WITHIN_QUIET_HOURS') {
          return reply.status(400).send({
            error: { code: 'WITHIN_QUIET_HOURS', message: 'Within user quiet hours' },
          });
        }
        return reply.status(503).send({
          error: { code: 'DELIVERY_FAILED', message: error.message },
        });
      }
    }
  );

  /**
   * POST /api/delivery/webhook/slack
   * Receive Slack events and interactivity (button clicks)
   * RBAC: Public (signature verified)
   * Feature Flag: FF_CHANNEL_SLACK
   */
  app.post(
    '/api/delivery/webhook/slack',
    async (req: FastifyRequest, reply: FastifyReply) => {
      // Check feature flag
      if (!FF_CHANNEL_SLACK) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' },
        });
      }

      // Get headers
      const signature = req.headers['x-slack-signature'] as string;
      const timestamp = req.headers['x-slack-request-timestamp'] as string;
      const rawBody = JSON.stringify(req.body);

      // Get signing secret from first organization (MVP simplification)
      const [orgChannel] = await db
        .select()
        .from(channels)
        .where(eq(channels.type, 'slack'))
        .limit(1);

      if (!orgChannel) {
        return reply.status(404).send({
          error: { code: 'CHANNEL_NOT_CONFIGURED', message: 'Slack not configured' },
        });
      }

      const config = orgChannel.config as any;
      const signingSecret = config.slack_signing_secret;

      // Verify signature
      if (!verifySlackSignature(rawBody, timestamp, signature, signingSecret)) {
        return reply.status(401).send({
          error: { code: 'INVALID_SIGNATURE', message: 'Webhook signature invalid' },
        });
      }

      // Parse payload
      const payload = req.body as any;

      // Handle URL verification (Slack setup)
      if (payload.type === 'url_verification') {
        return reply.send({ challenge: payload.challenge });
      }

      // Handle button click
      if (payload.type === 'block_actions') {
        const { slackUserId, questionId, answerValue, responseUrl } = parseSlackButtonClick(payload);

        // Find user by Slack ID
        const [userChannel] = await db
          .select({ userId: userChannels.userId })
          .from(userChannels)
          .where(
            and(
              eq(userChannels.channelType, 'slack'),
              eq(userChannels.channelId, slackUserId)
            )
          )
          .limit(1);

        if (!userChannel) {
          return reply.send({ text: '❌ User not found. Please link your Cerply account.' });
        }

        // Mock: Check if answer correct (in real implementation, fetch from DB)
        const correct = answerValue === 'option_a'; // A is always correct for MVP
        const explanation = correct
          ? 'Raising the alarm alerts others and ensures coordinated response.'
          : 'The correct answer is A. Raising the alarm should always be the first step.';

        // Record attempt
        await recordSlackAttempt(userChannel.userId, questionId, answerValue, correct);

        // Send feedback to Slack
        await sendSlackFeedback(responseUrl, correct, explanation);

        return reply.send({ ok: true });
      }

      return reply.send({ ok: true });
    }
  );

  /**
   * GET /api/delivery/channels
   * Get learner's configured channels
   * RBAC: learner (own channels) or admin
   * Feature Flag: FF_CHANNEL_SLACK
   */
  app.get('/api/delivery/channels', async (req: FastifyRequest, reply: FastifyReply) => {
    // Check feature flag
    if (!FF_CHANNEL_SLACK) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Feature not enabled' },
      });
    }

    // Check RBAC
    if (!requireLearner(req, reply)) return reply;

    const session = getSession(req);
    if (!session) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
    }

    const channels = await db
      .select()
      .from(userChannels)
      .where(eq(userChannels.userId, session.userId));

    return reply.send({ channels });
  });

  /**
   * POST /api/delivery/channels
   * Configure or update channel preferences
   * RBAC: learner (own channels) or admin
   * Feature Flag: FF_CHANNEL_SLACK
   */
  app.post(
    '/api/delivery/channels',
    async (
      req: FastifyRequest<{
        Body: {
          channelType: string;
          channelId?: string;
          preferences?: { quietHours?: string; timezone?: string; paused?: boolean };
        };
      }>,
      reply: FastifyReply
    ) => {
      // Check feature flag
      if (!FF_CHANNEL_SLACK) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' },
        });
      }

      // Check RBAC
      if (!requireLearner(req, reply)) return reply;

      const session = getSession(req);
      if (!session) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      const { channelType, channelId, preferences } = req.body;

      // Validate channelType
      if (!['slack', 'whatsapp', 'teams', 'email'].includes(channelType)) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid channel type',
            details: { allowed: ['slack', 'whatsapp', 'teams', 'email'] },
          },
        });
      }

      // Upsert user channel
      const [channel] = await db
        .insert(userChannels)
        .values({
          userId: session.userId,
          channelType,
          channelId: channelId || 'unknown', // Auto-discover in future
          preferences: preferences || {},
          verified: !!channelId, // Only verified if channelId provided
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [userChannels.userId, userChannels.channelType],
          set: {
            preferences: preferences || {},
            channelId: channelId || 'unknown',
          },
        })
        .returning();

      return reply.send({ channel });
    }
  );
}
```

**Register in `api/src/index.ts`:**

```typescript
// Add after existing route registrations
await safeRegister('./routes/delivery', ['registerDeliveryRoutes']);
```

**Acceptance:**
- [ ] `delivery.ts` file created in `api/src/routes/`
- [ ] All 4 routes implemented with correct RBAC
- [ ] Feature flag checked at start of each route
- [ ] Error envelopes follow standard format
- [ ] Signature verification works for Slack webhooks
- [ ] Routes registered in `index.ts`

---

### Phase 5: Integration with Learn Flow (30 mins)

**Objective:** Link Slack responses to existing attempt submission logic.

**File:** `api/src/routes/learn.ts` (UPDATE)

No changes needed for MVP — the `recordSlackAttempt` function in `delivery.ts` already creates attempts with `channel='slack'`.

**Future Enhancement:** Wire Slack webhook handler to call existing `POST /api/learn/submit` endpoint instead of duplicating logic.

**Acceptance:**
- [ ] Attempts created via Slack have `channel='slack'`
- [ ] Existing analytics queries include Slack attempts

---

### Phase 6: Tests (1.5 hours)

**Objective:** Comprehensive test coverage for adapter, service, and routes.

**File:** `api/tests/delivery.test.ts` (NEW)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sendSlackMessage,
  formatQuestionAsBlockKit,
  verifySlackSignature,
  parseSlackButtonClick,
} from '../src/adapters/slack';
import {
  deliverLesson,
  getUserPreferredChannel,
  isWithinQuietHours,
} from '../src/services/delivery';

describe('Slack Adapter', () => {
  describe('formatQuestionAsBlockKit', () => {
    it('should format question as Block Kit JSON', () => {
      const blocks = formatQuestionAsBlockKit(
        'What is 2+2?',
        ['A. 3', 'B. 4', 'C. 5'],
        'q123'
      );

      expect(blocks).toHaveLength(2);
      expect(blocks[0].type).toBe('section');
      expect(blocks[0].text.text).toContain('What is 2+2?');
      expect(blocks[1].type).toBe('actions');
      expect(blocks[1].block_id).toBe('q123');
      expect(blocks[1].elements).toHaveLength(3);
    });
  });

  describe('verifySlackSignature', () => {
    it('should verify valid signature', () => {
      const body = '{"type":"url_verification"}';
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signingSecret = 'test-secret';

      const crypto = require('crypto');
      const sigBasestring = `v0:${timestamp}:${body}`;
      const signature =
        'v0=' +
        crypto
          .createHmac('sha256', signingSecret)
          .update(sigBasestring)
          .digest('hex');

      const isValid = verifySlackSignature(body, timestamp, signature, signingSecret);
      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const body = '{"type":"url_verification"}';
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = 'v0=invalid';
      const signingSecret = 'test-secret';

      const isValid = verifySlackSignature(body, timestamp, signature, signingSecret);
      expect(isValid).toBe(false);
    });

    it('should reject old timestamp (> 5 minutes)', () => {
      const body = '{"type":"url_verification"}';
      const timestamp = (Math.floor(Date.now() / 1000) - 600).toString(); // 10 mins ago
      const signature = 'v0=abc123';
      const signingSecret = 'test-secret';

      const isValid = verifySlackSignature(body, timestamp, signature, signingSecret);
      expect(isValid).toBe(false);
    });
  });

  describe('parseSlackButtonClick', () => {
    it('should parse button click payload', () => {
      const payload = {
        type: 'block_actions',
        user: { id: 'U123456' },
        actions: [{ block_id: 'q123', value: 'option_a' }],
        response_url: 'https://hooks.slack.com/...',
      };

      const result = parseSlackButtonClick(payload);
      expect(result.slackUserId).toBe('U123456');
      expect(result.questionId).toBe('q123');
      expect(result.answerValue).toBe('option_a');
      expect(result.responseUrl).toBe('https://hooks.slack.com/...');
    });
  });
});

describe('Delivery Service', () => {
  describe('isWithinQuietHours', () => {
    it('should return false if no quiet hours set', () => {
      const result = isWithinQuietHours(undefined, 'UTC');
      expect(result).toBe(false);
    });

    it('should detect quiet hours (basic check)', () => {
      // Note: This is a simple test. Real implementation needs timezone handling.
      const quietHours = '22:00-07:00';
      const result = isWithinQuietHours(quietHours, 'UTC');
      expect(typeof result).toBe('boolean');
    });
  });
});

// Add 30+ more tests for routes, RBAC, error handling, etc.
```

**File:** `api/scripts/smoke-delivery.sh` (NEW)

```bash
#!/bin/bash
# Smoke tests for Epic 5: Slack Channel Integration

set -e

API_BASE="${API_BASE:-http://localhost:8080}"
ADMIN_TOKEN="${ADMIN_TOKEN:-dev-admin-token-12345}"

echo "=== Epic 5: Slack Channel Integration - Smoke Tests ==="

# Test 1: Configure user channel
echo "Test 1: Configure user channel"
curl -sS -X POST "${API_BASE}/api/delivery/channels" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  -H "content-type: application/json" \
  -d '{"channelType":"slack","channelId":"U123456","preferences":{"quietHours":"22:00-07:00","paused":false}}' \
  | jq -e '.channel.type == "slack"'

# Test 2: Get user channels
echo "Test 2: Get user channels"
curl -sS "${API_BASE}/api/delivery/channels" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  | jq -e '.channels | length > 0'

# Test 3: Send lesson (will fail without real Slack token, but route should respond)
echo "Test 3: Send lesson (expect error without real Slack)"
curl -sS -X POST "${API_BASE}/api/delivery/send" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  -H "content-type: application/json" \
  -d '{"userId":"user-123","channel":"slack","lessonId":"lesson-1"}' \
  | jq -e 'has("error") or has("messageId")'

# Test 4: Webhook signature verification (mock)
echo "Test 4: Webhook URL verification"
curl -sS -X POST "${API_BASE}/api/delivery/webhook/slack" \
  -H "content-type: application/json" \
  -d '{"type":"url_verification","challenge":"test123"}' \
  | jq -e '.challenge == "test123"'

echo "✅ All smoke tests passed!"
```

Make executable:
```bash
chmod +x api/scripts/smoke-delivery.sh
```

**Acceptance:**
- [ ] 35+ unit tests written covering all functions
- [ ] Smoke test script created and executable
- [ ] Tests pass locally (`npm test -- delivery`)
- [ ] Smoke tests pass (`FF_CHANNEL_SLACK=true bash api/scripts/smoke-delivery.sh`)

---

### Phase 7: Documentation (30 mins)

**Objective:** Update all documentation to reflect Epic 5 completion.

#### Update 1: `api/README.md`
Add to API routes section:

```markdown
### Delivery Endpoints (Epic 5)

- `POST /api/delivery/send` - Send lesson to user via Slack/WhatsApp/Teams
- `POST /api/delivery/webhook/slack` - Slack webhook handler (button clicks, events)
- `GET /api/delivery/channels` - Get user's configured channels
- `POST /api/delivery/channels` - Configure channel preferences

**Feature Flag:** `FF_CHANNEL_SLACK=true`
```

#### Update 2: `docs/spec/api-routes.json`
Add 4 new routes to JSON file.

#### Update 3: `README.md`
Add Slack setup section:

```markdown
## Slack Integration Setup

1. Create Slack app at https://api.slack.com/apps
2. Add bot scopes: `chat:write`, `users:read`, `im:write`, `im:history`
3. Enable Interactivity: `https://api.cerply.com/api/delivery/webhook/slack`
4. Copy credentials to `.env`:
   ```
   FF_CHANNEL_SLACK=true
   SLACK_CLIENT_ID=your-client-id
   SLACK_CLIENT_SECRET=your-secret
   SLACK_SIGNING_SECRET=your-signing-secret
   ```
5. Insert channel config into database
6. Test with `bash api/scripts/smoke-delivery.sh`
```

#### Update 4: `docs/runbooks/slack-troubleshooting.md` (NEW)

```markdown
# Slack Integration Troubleshooting

## Common Issues

### "CHANNEL_NOT_CONFIGURED" error
- **Cause:** User hasn't configured Slack channel
- **Fix:** User must call `POST /api/delivery/channels` to set up

### "INVALID_SIGNATURE" error
- **Cause:** Slack signing secret mismatch or expired request
- **Fix:** Verify `SLACK_SIGNING_SECRET` matches Slack app config

### "DELIVERY_FAILED" error
- **Cause:** Slack bot token expired or user blocked bot
- **Fix:** Reinstall Slack app to workspace, ask user to unblock bot

### "WITHIN_QUIET_HOURS" error
- **Cause:** User has quiet hours set (e.g., 22:00-07:00)
- **Fix:** Wait until outside quiet hours or user updates preferences

## Debugging

### Check Slack API Logs
1. Go to https://api.slack.com/apps → Your App → Event Subscriptions
2. View Request Logs for webhook delivery failures

### Verify Signature Locally
```bash
echo -n "v0:1234567890:{\"type\":\"url_verification\"}" | openssl dgst -sha256 -hmac "your-signing-secret"
```

### Test Slack API Manually
```bash
curl -X POST https://slack.com/api/chat.postMessage \
  -H "Authorization: Bearer xoxb-your-bot-token" \
  -H "content-type: application/json" \
  -d '{"channel":"U123456","text":"Test message"}'
```
```

#### Update 5: `docs/functional-spec.md`
Change section 25 status from "🔜 PLANNED" to "✅ IMPLEMENTED" and add changelog:

```markdown
**Changelog:**
- **2025-10-XX:** Epic 5 delivered — Slack Channel Integration with 4 API routes, Slack adapter, delivery service, 35 unit tests, smoke tests, and runbook
```

**Acceptance:**
- [ ] `api/README.md` updated with delivery endpoints
- [ ] `docs/spec/api-routes.json` updated with 4 routes
- [ ] `README.md` includes Slack setup instructions
- [ ] `docs/runbooks/slack-troubleshooting.md` created
- [ ] `docs/functional-spec.md` status updated to "✅ IMPLEMENTED"

---

## 4. Code Patterns & Examples

### Migration Header Format

Every migration must start with this header:

```sql
------------------------------------------------------------------------------
-- Epic X: Epic Name
-- BRD: requirement-codes | FSD: §XX Section Name
------------------------------------------------------------------------------
```

Example:
```sql
------------------------------------------------------------------------------
-- Epic 5: Slack Channel Integration
-- BRD: B-7, AU-1, L-17 | FSD: §25 Slack Channel Integration v1
------------------------------------------------------------------------------

CREATE TABLE channels ( ... );
```

### Feature Flag Pattern

Check at the start of every route:

```typescript
const FF_CHANNEL_SLACK = process.env.FF_CHANNEL_SLACK === 'true';

app.post('/api/delivery/send', async (req, reply) => {
  if (!FF_CHANNEL_SLACK) {
    return reply.status(404).send({
      error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
    });
  }
  // ... rest of implementation
});
```

### RBAC Pattern

Always return `reply` after middleware check:

```typescript
import { requireManager, requireAdmin, getSession } from '../middleware/rbac';

app.get('/api/manager/teams', async (req, reply) => {
  if (!requireManager(req, reply)) return reply; // MUST return reply!
  
  const session = getSession(req);
  // ... use session.userId, session.organizationId, session.role
});
```

### Error Envelope Pattern

Consistent error structure across all routes:

```typescript
return reply.status(400).send({
  error: {
    code: 'INVALID_REQUEST', // UPPER_SNAKE_CASE
    message: 'User-friendly error message',
    details: { field: 'userId', reason: 'Required' } // optional
  }
});
```

Common error codes:
- `INVALID_REQUEST` (400)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `DELIVERY_FAILED` (503)
- `CHANNEL_NOT_CONFIGURED` (404)
- `CHANNEL_PAUSED` (400)
- `WITHIN_QUIET_HOURS` (400)

### Tenant Isolation Pattern

Every database query must filter by `organization_id`:

```typescript
const [team] = await db
  .select()
  .from(teams)
  .where(
    and(
      eq(teams.id, teamId),
      eq(teams.organizationId, session.organizationId) // Tenant isolation!
    )
  )
  .limit(1);
```

### Drizzle Schema Pattern

```typescript
export const tableName = pgTable('table_name', {
  id: uuid('id').defaultRandom().primaryKey(),
  foreignId: uuid('foreign_id').notNull().references(() => otherTable.id, {
    onDelete: 'cascade'
  }),
  textField: text('text_field').notNull(),
  jsonField: jsonb('json_field'),
  boolField: boolean('bool_field').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

### Test Pattern

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Feature Name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('functionName', () => {
    it('should handle success case', () => {
      const result = functionName('input');
      expect(result).toBe('expected');
    });

    it('should throw on error case', () => {
      expect(() => functionName('invalid')).toThrow('ERROR_CODE');
    });
  });
});
```

---

## 5. Slack App Setup

### Step 1: Create Slack App

1. Go to https://api.slack.com/apps
2. Click **"Create New App"**
3. Select **"From scratch"**
4. App Name: `Cerply Learning`
5. Workspace: Select your dev workspace
6. Click **"Create App"**

### Step 2: Configure Bot Token Scopes

1. In left sidebar, click **"OAuth & Permissions"**
2. Scroll to **"Scopes"** → **"Bot Token Scopes"**
3. Click **"Add an OAuth Scope"** and add:
   - `chat:write` - Send messages as bot
   - `users:read` - Get user info (email, name)
   - `im:write` - Open DMs with users
   - `im:history` - Read DM history
4. Scroll to top, click **"Install to Workspace"**
5. Click **"Allow"**
6. Copy **"Bot User OAuth Token"** (starts with `xoxb-`)
   - Save as `SLACK_BOT_TOKEN` in database

### Step 3: Enable Interactivity

1. In left sidebar, click **"Interactivity & Shortcuts"**
2. Toggle **"Interactivity"** to **ON**
3. Request URL: `https://api.cerply.com/api/delivery/webhook/slack`
   - For local dev: Use ngrok tunnel (e.g., `https://abc123.ngrok.io/api/delivery/webhook/slack`)
4. Click **"Save Changes"**

### Step 4: Subscribe to Events

1. In left sidebar, click **"Event Subscriptions"**
2. Toggle **"Enable Events"** to **ON**
3. Request URL: `https://api.cerply.com/api/delivery/webhook/slack`
   - Same URL as interactivity
4. Under **"Subscribe to bot events"**, click **"Add Bot User Event"**:
   - `message.im` - Direct messages sent to bot
5. Click **"Save Changes"**
6. Slack will prompt to **reinstall app** → Click **"Reinstall App"**

### Step 5: Get Credentials

1. In left sidebar, click **"Basic Information"**
2. Scroll to **"App Credentials"**
3. Copy:
   - **Client ID** → Save as `SLACK_CLIENT_ID`
   - **Client Secret** → Save as `SLACK_CLIENT_SECRET`
   - **Signing Secret** → Save as `SLACK_SIGNING_SECRET`

### Step 6: Insert into Database

```sql
INSERT INTO channels (organization_id, type, config, enabled)
VALUES (
  'your-org-id',
  'slack',
  '{
    "slack_team_id": "T123456",
    "slack_bot_token": "xoxb-1234567890123-1234567890123-abcdefg...",
    "slack_signing_secret": "abc123def456..."
  }'::jsonb,
  true
);
```

### Step 7: Test Connection

```bash
# Test Slack API connectivity
curl -X POST https://slack.com/api/auth.test \
  -H "Authorization: Bearer xoxb-your-bot-token"

# Should return: {"ok": true, "user_id": "U123...", "team_id": "T123..."}
```

---

## 6. Acceptance Criteria

Before marking Epic 5 complete, verify all of the following:

### Database
- [ ] Migration `008_channels.sql` runs without errors
- [ ] `channels` table exists with correct schema
- [ ] `user_channels` table exists with correct schema
- [ ] `attempts.channel` column added with default 'web'
- [ ] Indexes created on all foreign keys

### Code
- [ ] `api/src/adapters/slack.ts` created with 6 exported functions
- [ ] `api/src/services/delivery.ts` created with 5 exported functions
- [ ] `api/src/routes/delivery.ts` created with 4 routes
- [ ] Routes registered in `api/src/index.ts`
- [ ] Drizzle schema updated in `api/src/db/schema.ts`

### Tests
- [ ] 35+ unit tests pass (`npm test -- delivery`)
- [ ] Smoke tests pass (`bash api/scripts/smoke-delivery.sh`)
- [ ] Linter passes with no errors (`npm run lint`)
- [ ] Type checking passes (`npm run typecheck`)

### Functionality
- [ ] Can send lesson to Slack DM (with mock question)
- [ ] Can click button in Slack and see "Correct!" response
- [ ] Attempt is recorded in database with `channel='slack'`
- [ ] Signature verification rejects invalid webhooks (401)
- [ ] Quiet hours are respected (no messages sent during quiet hours)
- [ ] Paused channels return error
- [ ] RBAC enforced (learner can't send to other learners)
- [ ] Feature flag disables routes when `FF_CHANNEL_SLACK=false`

### Documentation
- [ ] `api/README.md` updated with delivery endpoints
- [ ] `docs/spec/api-routes.json` includes 4 new routes
- [ ] `README.md` includes Slack setup instructions
- [ ] `docs/runbooks/slack-troubleshooting.md` created
- [ ] `docs/functional-spec.md` section 25 status updated to "✅ IMPLEMENTED"

### Security
- [ ] Webhook signature verification implemented correctly
- [ ] Timestamp validation (reject requests > 5 mins old)
- [ ] Tenant isolation enforced in all queries
- [ ] No Slack tokens logged or exposed in errors

### Performance
- [ ] Slack API calls have timeouts (5 seconds)
- [ ] Webhook handler responds within 3 seconds
- [ ] No N+1 queries in delivery service

---

## 7. Testing Instructions

### Manual Testing Script

```bash
# 1. Start API with Slack flag enabled
cd api
FF_CHANNEL_SLACK=true \
SLACK_CLIENT_ID=1234567890123.1234567890123 \
SLACK_CLIENT_SECRET=abc123... \
SLACK_SIGNING_SECRET=abc123... \
npm run dev

# 2. Insert Slack channel config (do once)
psql $DATABASE_URL -c "
INSERT INTO channels (organization_id, type, config, enabled)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'slack',
  '{\"slack_team_id\":\"T123456\",\"slack_bot_token\":\"xoxb-your-token\",\"slack_signing_secret\":\"your-secret\"}'::jsonb,
  true
);
"

# 3. Configure user's Slack channel
curl -X POST http://localhost:8080/api/delivery/channels \
  -H "x-admin-token: dev-admin-token-12345" \
  -H "content-type: application/json" \
  -d '{
    "channelType": "slack",
    "channelId": "U123456",
    "preferences": {
      "quietHours": "22:00-07:00",
      "timezone": "America/New_York",
      "paused": false
    }
  }'

# Expected response:
# {"channel":{"type":"slack","channelId":"U123456",...}}

# 4. Send lesson to Slack
curl -X POST http://localhost:8080/api/delivery/send \
  -H "x-admin-token: dev-admin-token-12345" \
  -H "content-type: application/json" \
  -d '{
    "userId": "00000000-0000-0000-0000-000000000002",
    "channel": "slack",
    "lessonId": "lesson-fire-safety-1"
  }'

# Expected response:
# {"messageId":"1234567890.123456","deliveredAt":"2025-10-10T14:30:00Z","channel":"slack"}

# 5. Check Slack DM
# → User should receive message with question and 4 buttons

# 6. Click button A in Slack
# → Should see "✅ Correct! Raising the alarm..."

# 7. Verify attempt in database
psql $DATABASE_URL -c "
SELECT user_id, item_id, correct, channel, created_at 
FROM attempts 
WHERE channel = 'slack' 
ORDER BY created_at DESC 
LIMIT 1;
"

# Expected: 1 row with channel='slack'
```

### Expected Slack Message Format

When lesson is sent, user receives this in Slack:

```
Cerply Learning APP  2:30 PM

**Question:**
What is the first step in a fire emergency?

[A. Raise the alarm] [B. Fight the fire] [C. Collect belongings] [D. Ignore it]
```

After clicking "A. Raise the alarm":

```
Cerply Learning APP  2:30 PM

✅ Correct! Raising the alarm alerts others and ensures a coordinated response.
```

### Verifying Signature Verification

```bash
# Test invalid signature (should return 401)
curl -X POST http://localhost:8080/api/delivery/webhook/slack \
  -H "x-slack-signature: v0=invalid" \
  -H "x-slack-request-timestamp: 1234567890" \
  -H "content-type: application/json" \
  -d '{"type":"url_verification","challenge":"test"}'

# Expected: {"error":{"code":"INVALID_SIGNATURE","message":"..."}}
```

---

## 8. Rollout Plan

### Week 1: Development (Local)
- [ ] Complete all 7 implementation phases
- [ ] Run unit tests and smoke tests locally
- [ ] Manual testing with dev Slack workspace
- [ ] Create PR with `[spec] Epic 5: Slack Channel Integration` title
- [ ] PR review by 1+ team members
- [ ] Merge to `main` branch

### Week 2: Staging
- [ ] Deploy to staging with `FF_CHANNEL_SLACK=true`
- [ ] Configure staging Slack app (separate from prod)
- [ ] UAT with 2-3 internal users:
  - User 1: Test happy path (receive message, click correct answer)
  - User 2: Test quiet hours enforcement
  - User 3: Test paused channel
- [ ] Monitor logs for errors
- [ ] Fix any bugs discovered in UAT
- [ ] Deploy fixes to staging and re-test

### Week 3: Production (Pilot)
- [ ] Deploy to production with `FF_CHANNEL_SLACK=false` (disabled by default)
- [ ] Configure production Slack app
- [ ] Enable for 1-2 pilot customers only:
  ```sql
  -- Enable per organization
  INSERT INTO channels (organization_id, type, config, enabled)
  VALUES ('pilot-org-1', 'slack', '...', true);
  ```
- [ ] Monitor Slack API rate limits (1 msg/sec/user)
- [ ] Monitor error rates in logs
- [ ] Collect feedback from pilot users
- [ ] Iterate based on feedback

### Week 4: General Availability
- [ ] Enable `FF_CHANNEL_SLACK=true` globally
- [ ] Update marketing site with Slack integration messaging
- [ ] Notify all customers via email
- [ ] Monitor adoption rate (% of users who configure Slack)
- [ ] Track success metrics (see below)

### Feature Flag Strategy

```bash
# Development: Enabled for all testing
FF_CHANNEL_SLACK=true

# Staging: Enabled for UAT
FF_CHANNEL_SLACK=true

# Production Week 1: Disabled by default, enabled per org
FF_CHANNEL_SLACK=false
# (Enable in channels table per org)

# Production Week 4: Enabled globally
FF_CHANNEL_SLACK=true
```

---

## 9. References

### Existing Code to Study

Before starting implementation, read these files to understand established patterns:

1. **`api/src/routes/managerAnalytics.ts`** (488 lines)
   - Route structure with RBAC
   - Feature flag checks
   - Error envelopes
   - Query parameter validation
   - Team ownership verification

2. **`api/src/services/analytics.ts`** (250+ lines)
   - Service layer pattern
   - Database queries with Drizzle ORM
   - Caching logic
   - Business logic separation from routes

3. **`api/drizzle/007_manager_analytics.sql`** (126 lines)
   - Migration header format
   - Table creation with comments
   - Index creation strategy
   - Foreign key relationships

4. **`api/tests/manager-analytics.test.ts`** (200+ lines)
   - Test structure with describe/it blocks
   - Mocking database queries
   - Testing RBAC enforcement
   - Testing error cases

5. **`api/src/middleware/rbac.ts`**
   - RBAC middleware implementation
   - Session management
   - Admin token fallback for dev

### Documentation

1. **`docs/functional-spec.md`** - Section 25
   - Complete Epic 5 specification
   - API route contracts
   - Slack Block Kit examples
   - Feature flags and environment variables

2. **`docs/MVP_B2B_ROADMAP.md`** - Epic 5
   - Business justification for Slack-first
   - Database schema rationale
   - Acceptance tests
   - Future phases (WhatsApp, Teams)

3. **`EPIC5_SLACK_INTEGRATION_PLAN.md`**
   - Original implementation plan
   - 7-phase breakdown
   - Slack app setup instructions
   - Success metrics

4. **`docs/brd/cerply-brd.md`**
   - BRD requirements: B-7, AU-1, L-17
   - Business context for channel delivery
   - User stories

### External Documentation

1. **Slack API Docs:** https://api.slack.com/docs
   - Block Kit Builder: https://app.slack.com/block-kit-builder
   - Signing Secrets: https://api.slack.com/authentication/verifying-requests-from-slack
   - OAuth Guide: https://api.slack.com/authentication/oauth-v2

2. **Drizzle ORM Docs:** https://orm.drizzle.team/docs/overview
   - PostgreSQL column types
   - Foreign key relationships
   - Query builder API

3. **Fastify Docs:** https://fastify.dev/docs/latest/
   - Route registration
   - Request/reply lifecycle
   - Hooks and middleware

---

## 10. Quick Start Checklist

Use this checklist to ensure nothing is missed:

### Pre-Implementation
- [ ] Read project context (section 1)
- [ ] Review Epic 5 requirements (section 2)
- [ ] Study existing code patterns:
  - [ ] `api/src/routes/managerAnalytics.ts`
  - [ ] `api/src/services/analytics.ts`
  - [ ] `api/drizzle/007_manager_analytics.sql`
  - [ ] `api/tests/manager-analytics.test.ts`
- [ ] Set up Slack app and get credentials (section 5)
- [ ] Understand RBAC middleware (`api/src/middleware/rbac.ts`)

### Implementation (6-8 hours)
- [ ] **Phase 1:** Database schema (1 hour)
  - [ ] Create `api/drizzle/008_channels.sql`
  - [ ] Update `api/src/db/schema.ts`
  - [ ] Run migration and verify tables
- [ ] **Phase 2:** Slack adapter (2 hours)
  - [ ] Create `api/src/adapters/slack.ts`
  - [ ] Implement 6 functions (send, format, verify, parse, feedback, getUserInfo)
  - [ ] Test signature verification locally
- [ ] **Phase 3:** Delivery service (1 hour)
  - [ ] Create `api/src/services/delivery.ts`
  - [ ] Implement 5 functions (deliver, getChannel, quietHours, recordAttempt)
  - [ ] Test quiet hours logic
- [ ] **Phase 4:** API routes (2 hours)
  - [ ] Create `api/src/routes/delivery.ts`
  - [ ] Implement 4 routes (send, webhook, get channels, post channels)
  - [ ] Register in `api/src/index.ts`
  - [ ] Test RBAC enforcement
- [ ] **Phase 5:** Learn flow integration (30 mins)
  - [ ] Verify `attempts.channel` column exists
  - [ ] No code changes needed (recordSlackAttempt handles it)
- [ ] **Phase 6:** Tests (1.5 hours)
  - [ ] Create `api/tests/delivery.test.ts` with 35+ tests
  - [ ] Create `api/scripts/smoke-delivery.sh`
  - [ ] Run tests locally and fix failures
- [ ] **Phase 7:** Documentation (30 mins)
  - [ ] Update `api/README.md`
  - [ ] Update `docs/spec/api-routes.json`
  - [ ] Update `README.md` with Slack setup
  - [ ] Create `docs/runbooks/slack-troubleshooting.md`
  - [ ] Update `docs/functional-spec.md` status to "✅ IMPLEMENTED"

### Acceptance (1 hour)
- [ ] Run all acceptance criteria checks (section 6)
- [ ] Manual testing with dev Slack workspace (section 7)
- [ ] Verify signature verification works
- [ ] Verify quiet hours enforcement
- [ ] Verify RBAC on all routes
- [ ] Linter passes (`npm run lint`)
- [ ] Type checker passes (`npm run typecheck`)

### PR & Review
- [ ] Create PR with `[spec] Epic 5: Slack Channel Integration` title
- [ ] Include demo screenshots/video
- [ ] Link to Epic 5 specs in PR description
- [ ] Request review from 1+ team members
- [ ] Address feedback
- [ ] Merge to `main`

### Deployment
- [ ] Deploy to staging (section 8, Week 2)
- [ ] UAT with 2-3 internal users
- [ ] Fix bugs and redeploy
- [ ] Deploy to production (section 8, Week 3)
- [ ] Enable for pilot customers only
- [ ] Monitor metrics (section 8, Week 4)
- [ ] Enable globally after pilot success

---

## Success Metrics

Track these metrics in the first 30 days after GA:

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Slack messages sent** | 1,000+ | Query `attempts` table: `SELECT COUNT(*) FROM attempts WHERE channel='slack'` |
| **Response rate via Slack** | >60% | `(slack_responses / slack_messages_sent) * 100` |
| **Avg response time** | <2 mins | `AVG(latency_ms) FROM attempts WHERE channel='slack'` |
| **Error rate** | <2% | Monitor logs for `DELIVERY_FAILED` errors |
| **User satisfaction** | 4.5/5 | Survey pilot users after 2 weeks |
| **Adoption rate** | >40% | `(users_with_slack_configured / total_users) * 100` |

---

## Troubleshooting

### Common Errors

**Error:** `CHANNEL_NOT_CONFIGURED`
- **Cause:** User hasn't called `POST /api/delivery/channels`
- **Fix:** Have user configure Slack channel via API or UI

**Error:** `INVALID_SIGNATURE`
- **Cause:** Signing secret mismatch or expired timestamp
- **Fix:** Verify `SLACK_SIGNING_SECRET` matches Slack app config, check logs for timestamp

**Error:** `DELIVERY_FAILED`
- **Cause:** Slack bot token expired, user blocked bot, or rate limit hit
- **Fix:** Reinstall app, ask user to unblock, implement rate limiting queue

**Error:** `WITHIN_QUIET_HOURS`
- **Cause:** Current time is within user's quiet hours window
- **Fix:** Wait until outside window, or user updates preferences

---

## Next Steps After Epic 5

### Phase 2: WhatsApp Integration (Epic 6)
- Twilio Business API setup
- Phone number verification
- WhatsApp message templates
- SMS fallback

### Phase 3: Microsoft Teams Integration (Epic 7)
- Teams Bot Framework
- Adaptive Cards (Teams equivalent of Block Kit)
- Teams webhook handlers
- Channel vs DM delivery

### Phase 4: Multi-Channel Orchestration (Epic 8)
- Smart channel selection (try Slack → fallback to email)
- Scheduled delivery (daily/weekly cadence)
- A/B testing delivery times
- Channel preference learning (which channel gets best response rate?)

---

**End of Implementation Prompt**

---

**Estimated Reading Time:** 45 minutes  
**Estimated Implementation Time:** 6-8 hours  
**Total Epic Time:** ~7-9 hours including reading + implementation

**Questions?** Refer to `docs/functional-spec.md` section 25 or `EPIC5_SLACK_INTEGRATION_PLAN.md` for additional details.

**Good luck! 🚀**

