# Epic 7: Gamification & Certification System — Implementation Prompt

**For:** New Agent/Developer  
**Date:** 2025-10-10  
**Estimated Effort:** 12-16 hours (1.5 overnights)  
**Priority:** P1 (Learner Engagement & Trust)  
**Status:** ✅ Core API Implementation Complete (2025-10-10)

---

## Implementation Status

**Completed:**
- ✅ Phase 1: Database schema (5 tables + 5 badge seeds)
- ✅ Phase 2: Gamification service (level calculation, tracking)
- ✅ Phase 3: Certificate service (generation, mock signing)
- ✅ Phase 4: Badge detection service (5 badge types)
- ✅ Phase 5: Manager notification service (in-app + mock email)
- ✅ Phase 6: API routes (7 endpoints with RBAC)
- ✅ Phase 8: Tests (smoke tests + UAT plan)

**Deferred:**
- ⏳ Phase 5.5: Daily/weekly digest service (optional)
- ⏳ Phase 7: Web UI components (Phase 2)
- ⏳ Production dependencies (pdfkit, @noble/ed25519, node-cron)

**See:** `EPIC7_IMPLEMENTATION_SUMMARY.md` for complete details.

---

---

## Table of Contents

1. [Project Context](#1-project-context)
2. [Epic 7 Requirements](#2-epic-7-requirements)
3. [Implementation Plan](#3-implementation-plan)
4. [Code Patterns & Examples](#4-code-patterns--examples)
5. [Certificate Configuration](#5-certificate-configuration)
6. [Acceptance Criteria](#6-acceptance-criteria)
7. [Testing Instructions](#7-testing-instructions)
8. [Rollout Plan](#8-rollout-plan)
9. [References](#9-references)
10. [Quick Start Checklist](#10-quick-start-checklist)

---

## 1. Project Context

### What is Cerply?

Cerply is a B2B enterprise learning platform that transforms company knowledge into adaptive, personalized learning experiences with gamification elements that drive 60-80% completion rates (vs 30-40% for traditional LMS).

**Current Status (Epics 1-6 Complete):**

| Epic | Status | Key Deliverables |
|------|--------|------------------|
| **Epic 1: D2C Removal** | ✅ Complete | Enterprise-only access |
| **Epic 2: SSO & RBAC** | ✅ Complete | SAML/OIDC, 3 roles |
| **Epic 3: Team Management** | ✅ Complete | Teams, learners, CSV import |
| **Epic 4: Manager Analytics** | ✅ Complete | 7 analytics endpoints |
| **Epic 5: Slack Integration** | ✅ Complete | Slack DM delivery |
| **Epic 6: Ensemble Generation** | 🔄 In Progress | 3-LLM pipeline |

**What's Missing (Epic 7 Goal):**
- No learner progression system (levels)
- No certificates for track completion
- No achievement badges
- No manager notifications for milestones
- No gamification to drive engagement

### Why Epic 7 Matters

**The Problem:** Traditional LMS has 30-40% completion rates. Learners lose motivation without visible progress, achievements, or recognition.

**The Cerply Solution:** Gamification System
- **5 Levels:** Clear progression (Novice → Master) based on correct attempts
- **Certificates:** Verifiable PDF credentials with Ed25519 signatures
- **5 Badges:** Achievement unlocks (Speed Demon, Perfectionist, etc.)
- **Manager Notifications:** Email alerts for team milestones
- **Conversational Progress:** "How am I doing?" queries

**Result:** 60-80% completion rates, intrinsic motivation, audit-ready credentials.

### Tech Stack

Same as Epic 5/6:
- **API:** Fastify 4.x + Drizzle ORM + PostgreSQL 15
- **Web:** Next.js 14 (App Router) + Tailwind CSS
- **PDF:** PDFKit for certificate generation
- **Crypto:** @noble/ed25519 for signatures
- **Email:** SendGrid or SMTP for notifications
- **Testing:** Vitest + Playwright

### Key Code Patterns (Established in Epics 1-6)

1. **Feature Flags:** `FF_GAMIFICATION_V1`, `FF_CERTIFICATES_V1`, `FF_MANAGER_NOTIFICATIONS_V1`
2. **RBAC Middleware:** `requireLearner(req, reply)`, `requireManager(req, reply)` - always `return reply`
3. **Error Envelopes:** `{ error: { code, message, details? } }`
4. **Tenant Isolation:** Filter all queries by `organization_id`
5. **Migration Headers:** Standard format with Epic/BRD/FSD references

### Files to Study Before Starting

**Critical Reading (2 hours):**
1. **`EPIC5_IMPLEMENTATION_PROMPT.md`** - Follow this structure
2. **`EPIC6_IMPLEMENTATION_PROMPT.md`** - Complex services pattern
3. **`api/src/services/analytics.ts`** - Service layer pattern
4. **`api/src/routes/managerAnalytics.ts`** - Route pattern with RBAC
5. **`docs/MVP_B2B_ROADMAP.md`** - Epic 7 section (lines 490-655)

---

## 2. Epic 7 Requirements

### Goal

Implement a gamification system with learner levels, PDF certificates, achievement badges, manager notifications, and conversational progress queries to boost engagement from 30-40% to 60-80% completion rates.

### User Stories

**Story 1: Learner Progression**
- **As a learner,** I want to see my level increase as I answer questions correctly,
- **So that** I feel a sense of progression and achievement.
- **Acceptance:** Level calculated on each attempt, displayed in UI, level-up triggers celebration modal.

**Story 2: Track Completion Certificate**
- **As a learner,** I want to receive a certificate when I complete a track,
- **So that** I have verifiable proof of my learning for my resume/LinkedIn.
- **Acceptance:** PDF certificate auto-generated, includes Ed25519 signature, downloadable, publicly verifiable.

**Story 3: Achievement Badges**
- **As a learner,** I want to unlock badges for specific achievements,
- **So that** I'm motivated to explore different learning behaviors.
- **Acceptance:** 5 badge types implemented, unlock triggers confetti, displayed on profile.

**Story 4: Manager Milestone Notifications**
- **As a manager,** I want to be notified when my team members achieve milestones,
- **So that** I can celebrate their progress and stay informed.
- **Acceptance:** Email + in-app notifications for level-ups, certificates, badges; daily digest option.

**Story 5: Conversational Progress Queries**
- **As a learner,** I want to ask "How am I doing?" and get a natural language summary,
- **So that** I don't have to navigate complex dashboards.
- **Acceptance:** Natural language queries work via chat/Cmd+K, show level, badges, next milestone.

### Database Schema

#### Table: `learner_levels`
Tracks learner progression per track.

```sql
CREATE TABLE learner_levels (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id            UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  level               TEXT NOT NULL CHECK (level IN ('novice', 'learner', 'practitioner', 'expert', 'master')),
  correct_attempts    INTEGER NOT NULL DEFAULT 0,
  leveled_up_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, track_id)
);

CREATE INDEX idx_learner_levels_user ON learner_levels(user_id);
CREATE INDEX idx_learner_levels_track ON learner_levels(track_id);
```

**Example row:**
```json
{
  "id": "ll-123",
  "user_id": "user-abc",
  "track_id": "track-fire-safety",
  "level": "practitioner",
  "correct_attempts": 75,
  "leveled_up_at": "2025-10-10T14:30:00Z"
}
```

#### Table: `certificates`
Stores issued certificates with signatures.

```sql
CREATE TABLE certificates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id            UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  issued_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  signature           TEXT NOT NULL, -- Ed25519 signature (hex)
  pdf_url             TEXT, -- S3 or storage URL
  verification_url    TEXT, -- Public verification page
  UNIQUE(user_id, track_id)
);

CREATE INDEX idx_certificates_user ON certificates(user_id);
CREATE INDEX idx_certificates_org ON certificates(organization_id);
```

**Example row:**
```json
{
  "id": "cert-456",
  "user_id": "user-abc",
  "track_id": "track-fire-safety",
  "organization_id": "org-xyz",
  "issued_at": "2025-10-10T15:00:00Z",
  "signature": "abc123def456...",
  "pdf_url": "https://s3.../certificates/cert-456.pdf",
  "verification_url": "https://cerply.com/verify/cert-456"
}
```

#### Table: `badges`
Predefined badge definitions.

```sql
CREATE TABLE badges (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT NOT NULL UNIQUE, -- 'speed-demon', 'perfectionist', etc.
  name                TEXT NOT NULL,
  description         TEXT NOT NULL,
  icon                TEXT NOT NULL, -- emoji or icon name
  criteria            JSONB NOT NULL, -- { type: 'streak', days: 7 }
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Example rows (seed data):**
```json
[
  {
    "slug": "speed-demon",
    "name": "Speed Demon",
    "description": "Answer 10 questions correctly in under 5 seconds each",
    "icon": "⚡",
    "criteria": { "type": "speed", "count": 10, "maxSeconds": 5 }
  },
  {
    "slug": "perfectionist",
    "name": "Perfectionist",
    "description": "Answer 20 questions correctly in a row",
    "icon": "💯",
    "criteria": { "type": "streak", "count": 20 }
  },
  {
    "slug": "consistent",
    "name": "7-Day Consistent",
    "description": "Answer at least one question every day for 7 days",
    "icon": "🔥",
    "criteria": { "type": "daily_streak", "days": 7 }
  },
  {
    "slug": "knowledge-sharer",
    "name": "Knowledge Sharer",
    "description": "Share 3 artefacts with your team",
    "icon": "🤝",
    "criteria": { "type": "shares", "count": 3 }
  },
  {
    "slug": "lifelong-learner",
    "name": "Lifelong Learner",
    "description": "Complete 5 different tracks",
    "icon": "📚",
    "criteria": { "type": "tracks_completed", "count": 5 }
  }
]
```

#### Table: `learner_badges`
Tracks which learners earned which badges.

```sql
CREATE TABLE learner_badges (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id            UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_learner_badges_user ON learner_badges(user_id);
```

#### Table: `manager_notifications`
Stores notifications for managers.

```sql
CREATE TABLE manager_notifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  learner_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                TEXT NOT NULL CHECK (type IN ('level_up', 'certificate', 'badge', 'at_risk')),
  content             JSONB NOT NULL, -- { level: 'expert', track: 'Fire Safety', etc }
  read                BOOLEAN NOT NULL DEFAULT false,
  sent_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_manager_notifications_manager ON manager_notifications(manager_id, read);
CREATE INDEX idx_manager_notifications_learner ON manager_notifications(learner_id);
```

**Example row:**
```json
{
  "id": "notif-789",
  "manager_id": "user-manager",
  "learner_id": "user-abc",
  "type": "level_up",
  "content": {
    "learnerName": "John Doe",
    "previousLevel": "learner",
    "newLevel": "practitioner",
    "trackTitle": "Fire Safety",
    "correctAttempts": 51
  },
  "read": false,
  "sent_at": "2025-10-10T14:31:00Z"
}
```

### API Routes

#### 1. `GET /api/learners/:id/level/:trackId`
Get learner's current level for a specific track.

**RBAC:** Learner (own data) or manager/admin  
**Feature Flag:** `FF_GAMIFICATION_V1`

**Response (200):**
```json
{
  "userId": "user-abc",
  "trackId": "track-fire-safety",
  "level": "practitioner",
  "correctAttempts": 75,
  "nextLevel": "expert",
  "attemptsToNext": 26,
  "leveledUpAt": "2025-10-10T14:30:00Z"
}
```

---

#### 2. `GET /api/learners/:id/certificates`
List all certificates earned by learner.

**RBAC:** Learner (own data) or manager/admin  
**Feature Flag:** `FF_CERTIFICATES_V1`

**Response (200):**
```json
{
  "certificates": [
    {
      "id": "cert-456",
      "trackId": "track-fire-safety",
      "trackTitle": "Fire Safety Fundamentals",
      "issuedAt": "2025-10-10T15:00:00Z",
      "pdfUrl": "https://s3.../cert-456.pdf",
      "verificationUrl": "https://cerply.com/verify/cert-456"
    }
  ]
}
```

---

#### 3. `GET /api/learners/:id/badges`
List all badges earned by learner.

**RBAC:** Learner (own data) or manager/admin  
**Feature Flag:** `FF_GAMIFICATION_V1`

**Response (200):**
```json
{
  "badges": [
    {
      "id": "badge-1",
      "slug": "speed-demon",
      "name": "Speed Demon",
      "description": "Answer 10 questions correctly in under 5 seconds each",
      "icon": "⚡",
      "earnedAt": "2025-10-09T10:00:00Z"
    },
    {
      "id": "badge-2",
      "slug": "perfectionist",
      "name": "Perfectionist",
      "description": "Answer 20 questions correctly in a row",
      "icon": "💯",
      "earnedAt": "2025-10-10T12:00:00Z"
    }
  ],
  "totalBadges": 5,
  "earned": 2,
  "remaining": 3
}
```

---

#### 4. `POST /api/certificates/:id/download`
Generate and download certificate PDF.

**RBAC:** Learner (own certificate) or manager/admin  
**Feature Flag:** `FF_CERTIFICATES_V1`

**Response (200):**
- Content-Type: `application/pdf`
- Body: PDF binary data
- Headers: `Content-Disposition: attachment; filename="certificate-fire-safety.pdf"`

---

#### 5. `GET /api/certificates/:id/verify`
Public verification endpoint (no authentication).

**RBAC:** Public (no auth required)  
**Feature Flag:** `FF_CERTIFICATES_V1`

**Response (200):**
```json
{
  "valid": true,
  "certificateId": "cert-456",
  "learner": "John Doe",
  "track": "Fire Safety Fundamentals",
  "organization": "Acme Corp",
  "issuedAt": "2025-10-10T15:00:00Z",
  "signature": "abc123def456...",
  "signatureValid": true
}
```

**Response (404) - Invalid:**
```json
{
  "valid": false,
  "error": "Certificate not found or signature invalid"
}
```

---

#### 6. `GET /api/manager/notifications`
Get manager's notifications (unread + recent read).

**RBAC:** Manager/admin only  
**Feature Flag:** `FF_MANAGER_NOTIFICATIONS_V1`

**Query Params:**
- `unreadOnly=true` - Only unread notifications
- `limit=20` - Max results (default 50)

**Response (200):**
```json
{
  "notifications": [
    {
      "id": "notif-789",
      "learnerId": "user-abc",
      "learnerName": "John Doe",
      "type": "level_up",
      "content": {
        "previousLevel": "learner",
        "newLevel": "practitioner",
        "trackTitle": "Fire Safety"
      },
      "read": false,
      "sentAt": "2025-10-10T14:31:00Z"
    }
  ],
  "unreadCount": 3,
  "total": 15
}
```

---

#### 7. `PATCH /api/manager/notifications/:id`
Mark notification as read.

**RBAC:** Manager/admin only  
**Feature Flag:** `FF_MANAGER_NOTIFICATIONS_V1`

**Request:**
```json
{
  "read": true
}
```

**Response (200):**
```json
{
  "id": "notif-789",
  "read": true
}
```

### Feature Flags

```bash
# Enable gamification (levels and badges)
FF_GAMIFICATION_V1=true

# Enable certificate generation
FF_CERTIFICATES_V1=true

# Enable manager notifications
FF_MANAGER_NOTIFICATIONS_V1=true

# Certificate signing key (Ed25519 private key, hex format)
CERT_SIGNING_KEY=abc123def456...

# Email service (SendGrid or SMTP)
SENDGRID_API_KEY=SG.abc123...
# OR
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=notifications@cerply.com
SMTP_PASS=password

# S3 or storage for PDFs (optional, can use filesystem for MVP)
AWS_S3_BUCKET=cerply-certificates
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

---

## 3. Implementation Plan

### Phase 1: Database Schema (1 hour)

**File:** `api/drizzle/010_gamification.sql`

```sql
------------------------------------------------------------------------------
-- Epic 7: Gamification & Certification System
-- BRD: L-16 (Learner progression), B-15 (Manager notifications)
-- FSD: Will be added as new section post-§27 upon Epic 7 completion
-- Roadmap: docs/MVP_B2B_ROADMAP.md (Epic 7, lines 619-785)
------------------------------------------------------------------------------

-- Learner levels per track
CREATE TABLE IF NOT EXISTS learner_levels (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id            UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  level               TEXT NOT NULL CHECK (level IN ('novice', 'learner', 'practitioner', 'expert', 'master')),
  correct_attempts    INTEGER NOT NULL DEFAULT 0,
  leveled_up_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, track_id)
);

CREATE INDEX IF NOT EXISTS idx_learner_levels_user ON learner_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_learner_levels_track ON learner_levels(track_id);

-- Certificates
CREATE TABLE IF NOT EXISTS certificates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id            UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  issued_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  signature           TEXT NOT NULL, -- Ed25519 signature
  pdf_url             TEXT,
  verification_url    TEXT,
  UNIQUE(user_id, track_id)
);

CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_org ON certificates(organization_id);

-- Badges (predefined)
CREATE TABLE IF NOT EXISTS badges (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  description         TEXT NOT NULL,
  icon                TEXT NOT NULL,
  criteria            JSONB NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Learner badges (earned)
CREATE TABLE IF NOT EXISTS learner_badges (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id            UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_learner_badges_user ON learner_badges(user_id);

-- Manager notifications
CREATE TABLE IF NOT EXISTS manager_notifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  learner_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                TEXT NOT NULL CHECK (type IN ('level_up', 'certificate', 'badge', 'at_risk')),
  content             JSONB NOT NULL,
  read                BOOLEAN NOT NULL DEFAULT false,
  sent_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manager_notifications_manager ON manager_notifications(manager_id, read);
CREATE INDEX IF NOT EXISTS idx_manager_notifications_learner ON manager_notifications(learner_id);

-- Seed badges
INSERT INTO badges (slug, name, description, icon, criteria) VALUES
  ('speed-demon', 'Speed Demon', 'Answer 10 questions correctly in under 5 seconds each', '⚡', 
   '{"type":"speed","count":10,"maxSeconds":5}'::jsonb),
  ('perfectionist', 'Perfectionist', 'Answer 20 questions correctly in a row', '💯', 
   '{"type":"streak","count":20}'::jsonb),
  ('consistent', '7-Day Consistent', 'Answer at least one question every day for 7 days', '🔥', 
   '{"type":"daily_streak","days":7}'::jsonb),
  ('knowledge-sharer', 'Knowledge Sharer', 'Share 3 artefacts with your team', '🤝', 
   '{"type":"shares","count":3}'::jsonb),
  ('lifelong-learner', 'Lifelong Learner', 'Complete 5 different tracks', '📚', 
   '{"type":"tracks_completed","count":5}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- Comments
COMMENT ON TABLE learner_levels IS 'Track learner progression per track with 5 levels';
COMMENT ON TABLE certificates IS 'Issued certificates with Ed25519 signatures';
COMMENT ON TABLE badges IS 'Predefined achievement badges';
COMMENT ON TABLE learner_badges IS 'Badges earned by learners';
COMMENT ON TABLE manager_notifications IS 'Notifications for managers about team achievements';
```

**File:** `api/src/db/schema.ts`

Add after existing schemas:

```typescript
// Epic 7: Gamification & Certification
export const learnerLevels = pgTable('learner_levels', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  trackId: uuid('track_id').notNull().references(() => tracks.id, { onDelete: 'cascade' }),
  level: text('level').notNull(), // 'novice' | 'learner' | 'practitioner' | 'expert' | 'master'
  correctAttempts: integer('correct_attempts').notNull().default(0),
  leveledUpAt: timestamp('leveled_up_at', { withTimezone: true }).defaultNow().notNull(),
});

export const certificates = pgTable('certificates', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  trackId: uuid('track_id').notNull().references(() => tracks.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull(),
  signature: text('signature').notNull(),
  pdfUrl: text('pdf_url'),
  verificationUrl: text('verification_url'),
});

export const badges = pgTable('badges', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  icon: text('icon').notNull(),
  criteria: jsonb('criteria').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const learnerBadges = pgTable('learner_badges', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  badgeId: uuid('badge_id').notNull().references(() => badges.id, { onDelete: 'cascade' }),
  earnedAt: timestamp('earned_at', { withTimezone: true }).defaultNow().notNull(),
});

export const managerNotifications = pgTable('manager_notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  managerId: uuid('manager_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  learnerId: uuid('learner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'level_up' | 'certificate' | 'badge' | 'at_risk'
  content: jsonb('content').notNull(),
  read: boolean('read').notNull().default(false),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
});
```

**Acceptance:**
- [ ] Migration runs without errors
- [ ] 5 tables created with indexes
- [ ] 5 badges seeded
- [ ] Drizzle schema compiles

---

### Phase 2: Level Calculation Service (2 hours)

**File:** `api/src/services/gamification.ts` (NEW)

```typescript
/**
 * Gamification Service
 * Epic 7: Gamification & Certification System
 * Handles level calculations, badge detection, and progression tracking
 */

import { db } from '../db';
import { learnerLevels, attempts, learnerBadges, badges } from '../db/schema';
import { eq, and, desc, count, sql } from 'drizzle-orm';

export type Level = 'novice' | 'learner' | 'practitioner' | 'expert' | 'master';

export interface LevelInfo {
  level: Level;
  correctAttempts: number;
  nextLevel: Level | null;
  attemptsToNext: number | null;
}

export interface LevelUpEvent {
  userId: string;
  trackId: string;
  previousLevel: Level;
  newLevel: Level;
  correctAttempts: number;
}

/**
 * Calculate level based on correct attempts
 */
export function calculateLevel(correctAttempts: number): Level {
  if (correctAttempts >= 201) return 'master';
  if (correctAttempts >= 101) return 'expert';
  if (correctAttempts >= 51) return 'practitioner';
  if (correctAttempts >= 21) return 'learner';
  return 'novice';
}

/**
 * Get next level and attempts needed
 */
export function getNextLevelInfo(correctAttempts: number): { nextLevel: Level | null; attemptsToNext: number | null } {
  if (correctAttempts < 21) return { nextLevel: 'learner', attemptsToNext: 21 - correctAttempts };
  if (correctAttempts < 51) return { nextLevel: 'practitioner', attemptsToNext: 51 - correctAttempts };
  if (correctAttempts < 101) return { nextLevel: 'expert', attemptsToNext: 101 - correctAttempts };
  if (correctAttempts < 201) return { nextLevel: 'master', attemptsToNext: 201 - correctAttempts };
  return { nextLevel: null, attemptsToNext: null }; // Already at max level
}

/**
 * Get learner's current level for a track
 */
export async function getLearnerLevel(userId: string, trackId: string): Promise<LevelInfo> {
  // Check if level record exists
  const [levelRecord] = await db
    .select()
    .from(learnerLevels)
    .where(and(
      eq(learnerLevels.userId, userId),
      eq(learnerLevels.trackId, trackId)
    ))
    .limit(1);

  if (levelRecord) {
    const { nextLevel, attemptsToNext } = getNextLevelInfo(levelRecord.correctAttempts);
    return {
      level: levelRecord.level as Level,
      correctAttempts: levelRecord.correctAttempts,
      nextLevel,
      attemptsToNext,
    };
  }

  // No record yet - calculate from attempts
  const [result] = await db
    .select({ count: count() })
    .from(attempts)
    .where(and(
      eq(attempts.userId, userId),
      eq(attempts.correct, true)
    ));

  const correctAttempts = result?.count || 0;
  const level = calculateLevel(correctAttempts);
  const { nextLevel, attemptsToNext } = getNextLevelInfo(correctAttempts);

  return { level, correctAttempts, nextLevel, attemptsToNext };
}

/**
 * Check if level-up occurred and update DB
 * Call this after each attempt submission
 */
export async function checkLevelUp(
  userId: string,
  trackId: string,
  newCorrectAttempts: number
): Promise<LevelUpEvent | null> {
  // Get current level record
  const [currentRecord] = await db
    .select()
    .from(learnerLevels)
    .where(and(
      eq(learnerLevels.userId, userId),
      eq(learnerLevels.trackId, trackId)
    ))
    .limit(1);

  const previousLevel = currentRecord?.level as Level || 'novice';
  const newLevel = calculateLevel(newCorrectAttempts);

  // Check if level changed
  if (previousLevel !== newLevel) {
    // Update or insert level record
    await db
      .insert(learnerLevels)
      .values({
        userId,
        trackId,
        level: newLevel,
        correctAttempts: newCorrectAttempts,
        leveledUpAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [learnerLevels.userId, learnerLevels.trackId],
        set: {
          level: newLevel,
          correctAttempts: newCorrectAttempts,
          leveledUpAt: new Date(),
        },
      });

    return {
      userId,
      trackId,
      previousLevel,
      newLevel,
      correctAttempts: newCorrectAttempts,
    };
  }

  // No level-up, but update attempts count
  if (currentRecord) {
    await db
      .update(learnerLevels)
      .set({ correctAttempts: newCorrectAttempts })
      .where(and(
        eq(learnerLevels.userId, userId),
        eq(learnerLevels.trackId, trackId)
      ));
  }

  return null; // No level-up
}

/**
 * Count correct attempts for a learner on a track
 */
export async function countCorrectAttempts(userId: string, trackId: string): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(attempts)
    .where(and(
      eq(attempts.userId, userId),
      eq(attempts.correct, true)
      // Note: Assumes attempts table has trackId. If not, filter by itemId belonging to track
    ));

  return result?.count || 0;
}
```

**Hook into attempt submission:**

Update `api/src/routes/learn.ts` (or wherever attempts are submitted):

```typescript
import { checkLevelUp, countCorrectAttempts } from '../services/gamification';
import { notifyManager } from '../services/notifications';

// After recording attempt
if (attempt.correct) {
  const correctCount = await countCorrectAttempts(userId, trackId);
  const levelUpEvent = await checkLevelUp(userId, trackId, correctCount);
  
  if (levelUpEvent) {
    // Trigger manager notification
    await notifyManager(levelUpEvent);
  }
}
```

**Acceptance:**
- [ ] `calculateLevel()` returns correct levels for all thresholds
- [ ] `getLearnerLevel()` works with and without existing record
- [ ] `checkLevelUp()` detects level changes
- [ ] Level persisted to DB on level-up
- [ ] Hook integrated with attempt submission

---

### Phase 3: Certificate Generation Service (3 hours)

**File:** `api/src/services/certificates.ts` (NEW)

```typescript
/**
 * Certificate Service
 * Epic 7: Gamification & Certification System
 * PDF generation and Ed25519 signature verification
 */

import PDFDocument from 'pdfkit';
import * as ed from '@noble/ed25519';
import { db } from '../db';
import { certificates, users, tracks, organizations } from '../db/schema';
import { eq } from 'drizzle-orm';

// Private key for signing (hex format)
const SIGNING_KEY = process.env.CERT_SIGNING_KEY || '';

export interface CertificateData {
  certificateId: string;
  userId: string;
  userName: string;
  trackId: string;
  trackTitle: string;
  organizationName: string;
  issuedAt: Date;
}

/**
 * Generate certificate when learner completes track
 */
export async function generateCertificate(
  userId: string,
  trackId: string
): Promise<{ id: string; signature: string; verificationUrl: string }> {
  // Get user, track, organization data
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const [track] = await db.select().from(tracks).where(eq(tracks.id, trackId)).limit(1);
  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.organizationId)).limit(1);

  if (!user || !track || !org) {
    throw new Error('User, track, or organization not found');
  }

  // Create certificate data
  const certData: CertificateData = {
    certificateId: '', // Will be set after insert
    userId: user.id,
    userName: user.name || user.email,
    trackId: track.id,
    trackTitle: track.title,
    organizationName: org.name,
    issuedAt: new Date(),
  };

  // Generate signature
  const signature = await signCertificate(certData);

  // Insert certificate record
  const [cert] = await db
    .insert(certificates)
    .values({
      userId: user.id,
      trackId: track.id,
      organizationId: org.id,
      issuedAt: certData.issuedAt,
      signature,
      verificationUrl: `https://cerply.com/verify/${certData.certificateId}`, // Will update with real ID
    })
    .returning({ id: certificates.id });

  certData.certificateId = cert.id;

  // Update verification URL with real certificate ID
  await db
    .update(certificates)
    .set({ verificationUrl: `https://cerply.com/verify/${cert.id}` })
    .where(eq(certificates.id, cert.id));

  return {
    id: cert.id,
    signature,
    verificationUrl: `https://cerply.com/verify/${cert.id}`,
  };
}

/**
 * Sign certificate data with Ed25519
 */
async function signCertificate(data: CertificateData): Promise<string> {
  if (!SIGNING_KEY) {
    throw new Error('CERT_SIGNING_KEY not configured');
  }

  const privateKey = Buffer.from(SIGNING_KEY, 'hex');
  const message = JSON.stringify({
    certificateId: data.certificateId,
    userId: data.userId,
    trackId: data.trackId,
    issuedAt: data.issuedAt.toISOString(),
  });

  const signature = await ed.sign(message, privateKey);
  return Buffer.from(signature).toString('hex');
}

/**
 * Verify certificate signature
 */
export async function verifyCertificate(
  certificateId: string,
  signature: string
): Promise<boolean> {
  const [cert] = await db
    .select()
    .from(certificates)
    .where(eq(certificates.id, certificateId))
    .limit(1);

  if (!cert) return false;

  const publicKey = await ed.getPublicKey(Buffer.from(SIGNING_KEY, 'hex'));
  const message = JSON.stringify({
    certificateId: cert.id,
    userId: cert.userId,
    trackId: cert.trackId,
    issuedAt: cert.issuedAt.toISOString(),
  });

  try {
    return await ed.verify(Buffer.from(signature, 'hex'), message, publicKey);
  } catch {
    return false;
  }
}

/**
 * Generate certificate PDF
 */
export async function renderCertificatePDF(certificateId: string): Promise<Buffer> {
  // Get certificate data
  const [cert] = await db
    .select({
      id: certificates.id,
      issuedAt: certificates.issuedAt,
      signature: certificates.signature,
      userName: users.name,
      userEmail: users.email,
      trackTitle: tracks.title,
      orgName: organizations.name,
    })
    .from(certificates)
    .leftJoin(users, eq(certificates.userId, users.id))
    .leftJoin(tracks, eq(certificates.trackId, tracks.id))
    .leftJoin(organizations, eq(certificates.organizationId, organizations.id))
    .where(eq(certificates.id, certificateId))
    .limit(1);

  if (!cert) {
    throw new Error('Certificate not found');
  }

  // Create PDF
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape' });
  const chunks: Buffer[] = [];

  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => {});

  // Design certificate
  doc.fontSize(36).font('Helvetica-Bold').text('Certificate of Completion', 100, 100, { align: 'center' });
  
  doc.fontSize(14).font('Helvetica').text('This certifies that', 100, 180, { align: 'center' });
  
  doc.fontSize(28).font('Helvetica-Bold').text(cert.userName || cert.userEmail, 100, 220, { align: 'center' });
  
  doc.fontSize(14).font('Helvetica').text('has successfully completed', 100, 270, { align: 'center' });
  
  doc.fontSize(24).font('Helvetica-Bold').text(cert.trackTitle, 100, 310, { align: 'center' });
  
  doc.fontSize(12).font('Helvetica').text(
    `Issued by ${cert.orgName} on ${cert.issuedAt.toLocaleDateString()}`,
    100,
    380,
    { align: 'center' }
  );
  
  doc.fontSize(8).text(`Certificate ID: ${cert.id}`, 100, 420, { align: 'center' });
  doc.text(`Signature: ${cert.signature.substring(0, 32)}...`, 100, 435, { align: 'center' });
  doc.text(`Verify at: https://cerply.com/verify/${cert.id}`, 100, 450, { align: 'center' });

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
}
```

**Install dependencies:**
```bash
cd api
npm install pdfkit @types/pdfkit @noble/ed25519
```

**Acceptance:**
- [ ] Certificate generated on track completion
- [ ] Ed25519 signature created and stored
- [ ] PDF renders with correct data
- [ ] Signature verifies correctly
- [ ] Invalid signatures rejected

---

### Phase 4: Badge Detection Service (2 hours)

**File:** `api/src/services/badges.ts` (NEW)

```typescript
/**
 * Badge Service
 * Epic 7: Gamification & Certification System
 * Badge criteria detection and awarding
 */

import { db } from '../db';
import { learnerBadges, badges, attempts, certificates } from '../db/schema';
import { eq, and, desc, count, sql } from 'drizzle-orm';

export interface BadgeCriteria {
  type: 'speed' | 'streak' | 'daily_streak' | 'shares' | 'tracks_completed';
  count?: number;
  days?: number;
  maxSeconds?: number;
}

/**
 * Check if learner earned Speed Demon badge
 * 10 questions < 5 seconds each (correct)
 */
export async function checkSpeedDemonBadge(userId: string): Promise<boolean> {
  const recentAttempts = await db
    .select()
    .from(attempts)
    .where(and(
      eq(attempts.userId, userId),
      eq(attempts.correct, true)
    ))
    .orderBy(desc(attempts.createdAt))
    .limit(10);

  if (recentAttempts.length < 10) return false;

  return recentAttempts.every(a => (a.latencyMs || 0) < 5000);
}

/**
 * Check if learner earned Perfectionist badge
 * 20 questions in a row correct
 */
export async function checkPerfectionistBadge(userId: string): Promise<boolean> {
  const recentAttempts = await db
    .select({ correct: attempts.correct })
    .from(attempts)
    .where(eq(attempts.userId, userId))
    .orderBy(desc(attempts.createdAt))
    .limit(20);

  if (recentAttempts.length < 20) return false;

  return recentAttempts.every(a => a.correct);
}

/**
 * Check if learner earned 7-Day Consistent badge
 * At least 1 question per day for 7 days
 */
export async function checkConsistentBadge(userId: string): Promise<boolean> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const dailyAttempts = await db
    .select({
      date: sql<string>`DATE(${attempts.createdAt})`,
      count: count(),
    })
    .from(attempts)
    .where(and(
      eq(attempts.userId, userId),
      sql`${attempts.createdAt} >= ${sevenDaysAgo}`
    ))
    .groupBy(sql`DATE(${attempts.createdAt})`);

  return dailyAttempts.length >= 7;
}

/**
 * Check if learner earned Lifelong Learner badge
 * Complete 5 different tracks
 */
export async function checkLifelongLearnerBadge(userId: string): Promise<boolean> {
  const [result] = await db
    .select({ count: count() })
    .from(certificates)
    .where(eq(certificates.userId, userId));

  return (result?.count || 0) >= 5;
}

/**
 * Award badge to learner
 */
export async function awardBadge(userId: string, badgeSlug: string): Promise<boolean> {
  // Get badge ID
  const [badge] = await db
    .select({ id: badges.id })
    .from(badges)
    .where(eq(badges.slug, badgeSlug))
    .limit(1);

  if (!badge) return false;

  // Check if already earned
  const [existing] = await db
    .select()
    .from(learnerBadges)
    .where(and(
      eq(learnerBadges.userId, userId),
      eq(learnerBadges.badgeId, badge.id)
    ))
    .limit(1);

  if (existing) return false; // Already earned

  // Award badge
  await db.insert(learnerBadges).values({
    userId,
    badgeId: badge.id,
    earnedAt: new Date(),
  });

  return true;
}

/**
 * Check all badge criteria for a learner
 * Run this periodically (cron job) or after significant events
 */
export async function detectAllBadges(userId: string): Promise<string[]> {
  const newBadges: string[] = [];

  const checks = [
    { slug: 'speed-demon', fn: () => checkSpeedDemonBadge(userId) },
    { slug: 'perfectionist', fn: () => checkPerfectionistBadge(userId) },
    { slug: 'consistent', fn: () => checkConsistentBadge(userId) },
    { slug: 'lifelong-learner', fn: () => checkLifelongLearnerBadge(userId) },
  ];

  for (const check of checks) {
    const earned = await check.fn();
    if (earned) {
      const awarded = await awardBadge(userId, check.slug);
      if (awarded) {
        newBadges.push(check.slug);
      }
    }
  }

  return newBadges;
}
```

**Cron job (optional, or run after each attempt):**

```typescript
// api/src/cron/badgeDetection.ts
import { detectAllBadges } from '../services/badges';
import { db } from '../db';
import { users } from '../db/schema';

export async function runBadgeDetection() {
  const allUsers = await db.select({ id: users.id }).from(users);
  
  for (const user of allUsers) {
    await detectAllBadges(user.id);
  }
}

// Run every hour
setInterval(runBadgeDetection, 60 * 60 * 1000);
```

**Acceptance:**
- [ ] All 5 badge types detect correctly
- [ ] Speed Demon: 10 questions < 5s
- [ ] Perfectionist: 20 correct streak
- [ ] Consistent: 7-day streak
- [ ] Lifelong Learner: 5 tracks
- [ ] Badges awarded only once
- [ ] Detection runs periodically

---

### Phase 5: Manager Notification Service (2 hours)

**File:** `api/src/services/notifications.ts` (NEW)

```typescript
/**
 * Notification Service
 * Epic 7: Gamification & Certification System
 * Manager notifications via email and in-app
 */

import { db } from '../db';
import { managerNotifications, users, tracks, teams, teamMembers } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { LevelUpEvent } from './gamification';

// Email service (SendGrid, SMTP, etc.)
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'notifications@cerply.com';

export interface NotificationEvent {
  type: 'level_up' | 'certificate' | 'badge' | 'at_risk';
  learnerId: string;
  learnerName: string;
  content: any;
}

/**
 * Get learner's manager
 */
async function getLearnerManager(learnerId: string): Promise<{ id: string; email: string; name: string } | null> {
  // Find team where learner is a member
  const [membership] = await db
    .select({
      managerId: teams.managerId,
      managerEmail: users.email,
      managerName: users.name,
    })
    .from(teamMembers)
    .leftJoin(teams, eq(teamMembers.teamId, teams.id))
    .leftJoin(users, eq(teams.managerId, users.id))
    .where(eq(teamMembers.userId, learnerId))
    .limit(1);

  if (!membership || !membership.managerId) return null;

  return {
    id: membership.managerId,
    email: membership.managerEmail,
    name: membership.managerName || membership.managerEmail,
  };
}

/**
 * Send notification to manager (in-app + email)
 */
export async function notifyManager(event: NotificationEvent | LevelUpEvent): Promise<void> {
  const manager = await getLearnerManager(event.learnerId);
  if (!manager) return; // No manager found

  // Create in-app notification
  await db.insert(managerNotifications).values({
    managerId: manager.id,
    learnerId: event.learnerId,
    type: event.type || 'level_up',
    content: event.content || event,
    read: false,
    sentAt: new Date(),
  });

  // Check manager notification preferences (BRD B-15)
  const managerPrefs = await getManagerNotificationPreferences(manager.id);
  if (managerPrefs.notificationFrequency === 'off') {
    return; // Manager opted out
  }

  // For immediate or daily digest, send email
  if (managerPrefs.notificationFrequency === 'immediate') {
    await sendEmail({
      to: manager.email,
      subject: getEmailSubject(event),
      body: renderEmailTemplate(event),
    });
  }
  // Note: Daily/weekly digests handled by separate cron job (see Phase 4)
}

/**
 * Get manager notification preferences
 * Returns: { notificationFrequency: 'immediate' | 'daily' | 'weekly' | 'off' }
 */
async function getManagerNotificationPreferences(managerId: string) {
  // For MVP: Default to 'immediate' (preferences UI in future epic)
  // Future: Query user_preferences table
  return { notificationFrequency: 'immediate' };
}

/**
 * Get email subject based on event type
 */
function getEmailSubject(event: NotificationEvent | LevelUpEvent): string {
  switch (event.type) {
    case 'level_up':
      return `🎉 ${event.learnerName} leveled up!`;
    case 'certificate':
      return `🏆 ${event.learnerName} earned a certificate!`;
    case 'badge':
      return `⭐ ${event.learnerName} unlocked a badge!`;
    case 'at_risk':
      return `⚠️ ${event.learnerName} needs support`;
    default:
      return `Update on ${event.learnerName}`;
  }
}

/**
 * Render email template
 */
function renderEmailTemplate(event: NotificationEvent | LevelUpEvent): string {
  if (event.type === 'level_up') {
    const e = event as LevelUpEvent;
    return `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h2>🎉 ${e.learnerName} leveled up!</h2>
          <p><strong>${e.learnerName}</strong> has progressed from <strong>${e.previousLevel}</strong> to <strong>${e.newLevel}</strong>.</p>
          <p>Correct attempts: ${e.correctAttempts}</p>
          <p><a href="https://app.cerply.com/manager/dashboard">View Team Dashboard</a></p>
        </body>
      </html>
    `;
  }

  // TODO: Other event types

  return `<html><body>Notification: ${JSON.stringify(event)}</body></html>`;
}

/**
 * Send email via SendGrid or SMTP
 */
async function sendEmail(options: { to: string; subject: string; body: string }): Promise<void> {
  if (SENDGRID_API_KEY) {
    // SendGrid implementation
    await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: options.to }] }],
        from: { email: FROM_EMAIL },
        subject: options.subject,
        content: [{ type: 'text/html', value: options.body }],
      }),
    });
  } else {
    // Mock email for dev
    console.log('[EMAIL]', options.to, options.subject);
  }
}

/**
 * Get daily digest for manager
 */
export async function getDailyDigest(managerId: string): Promise<any> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const notifications = await db
    .select()
    .from(managerNotifications)
    .where(and(
      eq(managerNotifications.managerId, managerId),
      sql`${managerNotifications.sentAt} >= ${yesterday}`
    ));

  const summary = {
    levelUps: notifications.filter(n => n.type === 'level_up').length,
    certificates: notifications.filter(n => n.type === 'certificate').length,
    badges: notifications.filter(n => n.type === 'badge').length,
  };

  return summary;
}

/**
 * Send daily digest email (cron job)
 */
export async function sendDailyDigest(managerId: string): Promise<void> {
  const digest = await getDailyDigest(managerId);
  const [manager] = await db.select().from(users).where(eq(users.id, managerId)).limit(1);

  if (!manager) return;

  const subject = `Daily Team Update: ${digest.levelUps} level-ups, ${digest.certificates} certificates`;
  const body = `
    <html>
      <body>
        <h2>Your Team's Progress Today</h2>
        <ul>
          <li><strong>${digest.levelUps}</strong> team members leveled up</li>
          <li><strong>${digest.certificates}</strong> certificates earned</li>
          <li><strong>${digest.badges}</strong> badges unlocked</li>
        </ul>
        <p><a href="https://app.cerply.com/manager/dashboard">View Full Dashboard</a></p>
      </body>
    </html>
  `;

  await sendEmail({ to: manager.email, subject, body });
}
```

**Install SendGrid (optional):**
```bash
npm install @sendgrid/mail
```

**Acceptance:**
- [ ] Manager receives in-app notification
- [ ] Manager receives email (if SendGrid configured)
- [ ] Email templates render correctly

---

### Phase 5.5: Daily/Weekly Digest Service (1.5 hours)

**Background:** BRD B-15 specifies notification preferences including "daily digest" and "weekly summary". This phase implements the aggregation logic and scheduled cron jobs.

**File:** `api/src/services/notificationDigest.ts` (NEW)

```typescript
/**
 * Notification Digest Service
 * Epic 7: Gamification & Certification System
 * BRD B-15: Daily digest example: "3 team members leveled up this week, 2 earned certificates"
 */

import { db } from '../db';
import { managerNotifications, users } from '../db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { sendEmail } from './email';

/**
 * Send daily digests to managers with 'daily' notification preference
 */
export async function sendDailyDigests() {
  const managers = await db
    .select()
    .from(users)
    .where(eq(users.role, 'manager'));

  for (const manager of managers) {
    const prefs = await getManagerNotificationPreferences(manager.id);
    if (prefs.notificationFrequency !== 'daily') continue;

    // Get unread notifications from last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const notifications = await db
      .select()
      .from(managerNotifications)
      .where(
        and(
          eq(managerNotifications.managerId, manager.id),
          gte(managerNotifications.sentAt, since),
          eq(managerNotifications.read, false)
        )
      );

    if (notifications.length === 0) continue;

    // Group by type
    const levelUps = notifications.filter(n => n.type === 'level_up').length;
    const certificates = notifications.filter(n => n.type === 'certificate').length;
    const badges = notifications.filter(n => n.type === 'badge').length;

    const summary = [
      levelUps > 0 ? `${levelUps} team member${levelUps > 1 ? 's' : ''} leveled up` : null,
      certificates > 0 ? `${certificates} certificate${certificates > 1 ? 's' : ''} earned` : null,
      badges > 0 ? `${badges} badge${badges > 1 ? 's' : ''} unlocked` : null,
    ].filter(Boolean).join(', ');

    await sendEmail({
      to: manager.email,
      subject: `Daily Team Progress Digest`,
      body: `Hi ${manager.name},\n\nYour team made progress today: ${summary}.\n\nView details: ${process.env.WEB_BASE_URL || 'https://app.cerply.com'}/manager/notifications`,
    });
  }
}

/**
 * Send weekly summaries to managers with 'weekly' notification preference
 */
export async function sendWeeklyDigests() {
  const managers = await db
    .select()
    .from(users)
    .where(eq(users.role, 'manager'));

  for (const manager of managers) {
    const prefs = await getManagerNotificationPreferences(manager.id);
    if (prefs.notificationFrequency !== 'weekly') continue;

    // Get unread notifications from last 7 days
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const notifications = await db
      .select()
      .from(managerNotifications)
      .where(
        and(
          eq(managerNotifications.managerId, manager.id),
          gte(managerNotifications.sentAt, since),
          eq(managerNotifications.read, false)
        )
      );

    if (notifications.length === 0) continue;

    // Group by type
    const levelUps = notifications.filter(n => n.type === 'level_up').length;
    const certificates = notifications.filter(n => n.type === 'certificate').length;
    const badges = notifications.filter(n => n.type === 'badge').length;

    const summary = [
      levelUps > 0 ? `${levelUps} team member${levelUps > 1 ? 's' : ''} leveled up this week` : null,
      certificates > 0 ? `${certificates} certificate${certificates > 1 ? 's' : ''} earned` : null,
      badges > 0 ? `${badges} badge${badges > 1 ? 's' : ''} unlocked` : null,
    ].filter(Boolean).join(', ');

    await sendEmail({
      to: manager.email,
      subject: `Weekly Team Progress Summary`,
      body: `Hi ${manager.name},\n\nYour team's progress this week: ${summary}.\n\nView details: ${process.env.WEB_BASE_URL || 'https://app.cerply.com'}/manager/notifications`,
    });
  }
}

/**
 * Placeholder for getting manager notification preferences
 * TODO: Implement preferences table in future epic
 */
async function getManagerNotificationPreferences(managerId: string) {
  // For MVP: Default to 'immediate' (preferences UI in future epic)
  // Future: Query user_preferences table
  return { notificationFrequency: 'immediate' as 'immediate' | 'daily' | 'weekly' | 'off' };
}
```

**Cron Job Setup:**

**File:** `api/src/cron/digestScheduler.ts` (NEW)

```typescript
import cron from 'node-cron';
import { sendDailyDigests, sendWeeklyDigests } from '../services/notificationDigest';

/**
 * Schedule daily and weekly digest emails
 */
export function initializeDigestScheduler() {
  // Daily digest at 8:00 AM UTC
  cron.schedule('0 8 * * *', async () => {
    console.log('[Cron] Running daily notification digests...');
    try {
      await sendDailyDigests();
      console.log('[Cron] Daily digests sent successfully');
    } catch (err) {
      console.error('[Cron] Error sending daily digests:', err);
    }
  });

  // Weekly digest on Monday at 8:00 AM UTC
  cron.schedule('0 8 * * 1', async () => {
    console.log('[Cron] Running weekly notification digests...');
    try {
      await sendWeeklyDigests();
      console.log('[Cron] Weekly digests sent successfully');
    } catch (err) {
      console.error('[Cron] Error sending weekly digests:', err);
    }
  });

  console.log('[Cron] Digest scheduler initialized');
}
```

**Integration in `api/src/index.ts`:**

```typescript
// Add import
import { initializeDigestScheduler } from './cron/digestScheduler';

// After app.listen(), add:
if (process.env.FF_MANAGER_NOTIFICATIONS_V1 === 'true') {
  initializeDigestScheduler();
}
```

**Install node-cron:**
```bash
cd api
npm install node-cron
npm install --save-dev @types/node-cron
```

**Acceptance:**
- [ ] Daily digest aggregates last 24h notifications (BRD B-15: "3 team members leveled up this week, 2 earned certificates")
- [ ] Weekly digest aggregates last 7d notifications
- [ ] Notification preferences respected (immediate/daily/weekly/off)
- [ ] Cron jobs run at scheduled times (8 AM UTC daily, Monday weekly)
- [ ] Digests only sent to managers with unread notifications
- [ ] Email includes link to notification center

---

### Phase 6: Manager Notification Center UI (2 hours)

**Background:** BRD B-15 specifies "notification center in dashboard with unread count and mark-as-read functionality". This phase builds the UI component.

**File:** `web/app/manager/notifications/page.tsx` (NEW)

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';

interface Notification {
  id: string;
  learnerName: string;
  type: 'level_up' | 'certificate' | 'badge' | 'at_risk';
  content: {
    trackTitle?: string;
    newLevel?: string;
    previousLevel?: string;
    badgeName?: string;
  };
  read: boolean;
  sentAt: string;
}

export default function NotificationCenterPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    const res = await fetch('/api/manager/notifications');
    if (!res.ok) {
      console.error('Failed to fetch notifications');
      setLoading(false);
      return;
    }
    const data = await res.json();
    setNotifications(data.notifications || []);
    setUnreadCount(data.unreadCount || 0);
    setLoading(false);
  }

  async function markAsRead(id: string) {
    const res = await fetch(`/api/manager/notifications/${id}`, { method: 'PATCH' });
    if (!res.ok) {
      console.error('Failed to mark notification as read');
      return;
    }
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }

  async function markAllAsRead() {
    await Promise.all(
      notifications.filter(n => !n.read).map(n => markAsRead(n.id))
    );
  }

  if (loading) {
    return <div className="p-8 text-center">Loading notifications...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
              {unreadCount} unread
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-sm text-blue-600 hover:underline font-medium"
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(notif => (
            <div
              key={notif.id}
              className={`p-4 rounded-lg border transition-colors ${
                notif.read
                  ? 'bg-gray-50 border-gray-200'
                  : 'bg-blue-50 border-blue-300 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-lg">{notif.learnerName}</p>
                  <p className="text-sm text-gray-700 mt-1">
                    {notif.type === 'level_up' &&
                      `Leveled up from ${notif.content.previousLevel} to ${notif.content.newLevel} in ${notif.content.trackTitle}`}
                    {notif.type === 'certificate' &&
                      `Earned a certificate for completing ${notif.content.trackTitle}`}
                    {notif.type === 'badge' &&
                      `Unlocked the "${notif.content.badgeName}" badge`}
                    {notif.type === 'at_risk' &&
                      `Is at risk and may need support in ${notif.content.trackTitle}`}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(notif.sentAt).toLocaleString()}
                  </p>
                </div>
                {!notif.read && (
                  <button
                    onClick={() => markAsRead(notif.id)}
                    className="ml-4 p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                    title="Mark as read"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Add Navigation Link:**

Update `web/app/manager/layout.tsx` or `web/components/ManagerNav.tsx` to include:

```tsx
<a href="/manager/notifications" className="flex items-center gap-2">
  <Bell className="w-5 h-5" />
  Notifications
  {unreadCount > 0 && (
    <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">
      {unreadCount}
    </span>
  )}
</a>
```

**Acceptance:**
- [ ] Manager notification center UI displays all notifications
- [ ] Unread count badge displays correctly
- [ ] Mark-as-read button works for individual notifications
- [ ] Mark-all-as-read button works
- [ ] Notifications visually distinguished (read vs unread)
- [ ] Empty state shows when no notifications
- [ ] Notifications display correct content based on type

---

### Phase 7: Learner Profile UI (2 hours)

**File:** `web/app/learner/profile/page.tsx` (NEW)

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Trophy, Award, Star, TrendingUp } from 'lucide-react';

interface LearnerProfile {
  levels: Record<string, { level: string; correctAttempts: number; nextLevel: string; attemptsToNext: number }>;
  certificates: Array<{ id: string; trackTitle: string; issuedAt: string; verificationUrl: string }>;
  badges: Array<{ slug: string; name: string; description: string; icon: string; earnedAt: string }>;
}

export default function LearnerProfilePage() {
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    // Fetch all profile data
    const [levels, certificates, badges] = await Promise.all([
      fetch('/api/learner/levels').then(r => r.json()),
      fetch('/api/learner/certificates').then(r => r.json()),
      fetch('/api/learner/badges').then(r => r.json()),
    ]);
    setProfile({ levels, certificates, badges });
    setLoading(false);
  }

  if (loading) return <div className="p-8">Loading profile...</div>;

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">My Progress</h1>

      {/* Levels Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-6 h-6" />
          Levels
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(profile?.levels || {}).map(([trackId, levelData]) => (
            <div key={trackId} className="bg-white rounded-lg border p-4 shadow-sm">
              <p className="font-semibold text-lg mb-2">{trackId}</p>
              <p className="text-3xl font-bold text-blue-600 capitalize mb-2">{levelData.level}</p>
              <p className="text-sm text-gray-600">
                {levelData.correctAttempts} correct attempts
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {levelData.attemptsToNext} more to reach {levelData.nextLevel}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${(levelData.correctAttempts / (levelData.correctAttempts + levelData.attemptsToNext)) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Certificates Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Trophy className="w-6 h-6" />
          Certificates
        </h2>
        {profile?.certificates.length === 0 ? (
          <p className="text-gray-500">Complete a track to earn your first certificate!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile?.certificates.map(cert => (
              <div key={cert.id} className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border border-yellow-200 p-4 shadow-sm">
                <p className="font-semibold text-lg mb-1">{cert.trackTitle}</p>
                <p className="text-sm text-gray-600 mb-3">
                  Earned {new Date(cert.issuedAt).toLocaleDateString()}
                </p>
                <div className="flex gap-2">
                  <a
                    href={`/api/certificates/${cert.id}/download`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Download PDF
                  </a>
                  <span className="text-gray-400">•</span>
                  <a
                    href={cert.verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Verify
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Badges Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Award className="w-6 h-6" />
          Badges
        </h2>
        {profile?.badges.length === 0 ? (
          <p className="text-gray-500">Unlock achievements to earn badges!</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {profile?.badges.map(badge => (
              <div key={badge.slug} className="bg-white rounded-lg border p-4 text-center shadow-sm">
                <div className="text-5xl mb-2">{badge.icon}</div>
                <p className="font-semibold text-sm mb-1">{badge.name}</p>
                <p className="text-xs text-gray-500">{badge.description}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(badge.earnedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

**Acceptance:**
- [ ] Learner profile page displays all levels per track
- [ ] Progress bars show correctly
- [ ] Certificates list with download/verify links
- [ ] Badges display with icons and descriptions
- [ ] Empty states show when no data

---

### Phase 8: API Routes (2 hours)

**File:** `api/src/routes/gamification.ts` (NEW)

```typescript
/**
 * Gamification Routes
 * Epic 7: Gamification & Certification System
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db';
import { learnerLevels, certificates, learnerBadges, badges, managerNotifications, users, tracks } from '../db/schema';
import { requireLearner, requireManager, getSession } from '../middleware/rbac';
import { getLearnerLevel } from '../services/gamification';
import { renderCertificatePDF, verifyCertificate } from '../services/certificates';

const FF_GAMIFICATION_V1 = process.env.FF_GAMIFICATION_V1 === 'true';
const FF_CERTIFICATES_V1 = process.env.FF_CERTIFICATES_V1 === 'true';
const FF_MANAGER_NOTIFICATIONS_V1 = process.env.FF_MANAGER_NOTIFICATIONS_V1 === 'true';

export async function registerGamificationRoutes(app: FastifyInstance) {
  /**
   * GET /api/learners/:id/level/:trackId
   * Get learner's current level for track
   */
  app.get(
    '/api/learners/:id/level/:trackId',
    async (req: FastifyRequest<{ Params: { id: string; trackId: string } }>, reply: FastifyReply) => {
      if (!FF_GAMIFICATION_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireLearner(req, reply)) return reply;

      const session = getSession(req);
      const { id, trackId } = req.params;

      // Check access (own data or manager/admin)
      if (id !== session!.userId && session!.role !== 'manager' && session!.role !== 'admin') {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Not authorized' }
        });
      }

      const levelInfo = await getLearnerLevel(id, trackId);

      return reply.send({
        userId: id,
        trackId,
        ...levelInfo,
      });
    }
  );

  /**
   * GET /api/learners/:id/certificates
   * List earned certificates
   */
  app.get(
    '/api/learners/:id/certificates',
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      if (!FF_CERTIFICATES_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireLearner(req, reply)) return reply;

      const session = getSession(req);
      const { id } = req.params;

      // Check access
      if (id !== session!.userId && session!.role !== 'manager' && session!.role !== 'admin') {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Not authorized' }
        });
      }

      const certs = await db
        .select({
          id: certificates.id,
          trackId: certificates.trackId,
          trackTitle: tracks.title,
          issuedAt: certificates.issuedAt,
          pdfUrl: certificates.pdfUrl,
          verificationUrl: certificates.verificationUrl,
        })
        .from(certificates)
        .leftJoin(tracks, eq(certificates.trackId, tracks.id))
        .where(eq(certificates.userId, id))
        .orderBy(desc(certificates.issuedAt));

      return reply.send({ certificates: certs });
    }
  );

  /**
   * GET /api/learners/:id/badges
   * List earned badges
   */
  app.get(
    '/api/learners/:id/badges',
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      if (!FF_GAMIFICATION_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireLearner(req, reply)) return reply;

      const session = getSession(req);
      const { id } = req.params;

      // Check access
      if (id !== session!.userId && session!.role !== 'manager' && session!.role !== 'admin') {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Not authorized' }
        });
      }

      const earnedBadges = await db
        .select({
          id: badges.id,
          slug: badges.slug,
          name: badges.name,
          description: badges.description,
          icon: badges.icon,
          earnedAt: learnerBadges.earnedAt,
        })
        .from(learnerBadges)
        .leftJoin(badges, eq(learnerBadges.badgeId, badges.id))
        .where(eq(learnerBadges.userId, id))
        .orderBy(desc(learnerBadges.earnedAt));

      const totalBadges = await db.select().from(badges);

      return reply.send({
        badges: earnedBadges,
        totalBadges: totalBadges.length,
        earned: earnedBadges.length,
        remaining: totalBadges.length - earnedBadges.length,
      });
    }
  );

  /**
   * POST /api/certificates/:id/download
   * Download certificate PDF
   */
  app.post(
    '/api/certificates/:id/download',
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      if (!FF_CERTIFICATES_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireLearner(req, reply)) return reply;

      const { id } = req.params;

      // Verify ownership
      const [cert] = await db
        .select()
        .from(certificates)
        .where(eq(certificates.id, id))
        .limit(1);

      if (!cert) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Certificate not found' }
        });
      }

      const session = getSession(req);
      if (cert.userId !== session!.userId && session!.role !== 'manager' && session!.role !== 'admin') {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Not your certificate' }
        });
      }

      // Generate PDF
      const pdfBuffer = await renderCertificatePDF(id);

      return reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="certificate-${id}.pdf"`)
        .send(pdfBuffer);
    }
  );

  /**
   * GET /api/certificates/:id/verify
   * Public certificate verification (no auth)
   */
  app.get(
    '/api/certificates/:id/verify',
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      if (!FF_CERTIFICATES_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      const { id } = req.params;

      const [cert] = await db
        .select({
          id: certificates.id,
          issuedAt: certificates.issuedAt,
          signature: certificates.signature,
          learnerName: users.name,
          learnerEmail: users.email,
          trackTitle: tracks.title,
          orgName: organizations.name,
        })
        .from(certificates)
        .leftJoin(users, eq(certificates.userId, users.id))
        .leftJoin(tracks, eq(certificates.trackId, tracks.id))
        .leftJoin(organizations, eq(certificates.organizationId, organizations.id))
        .where(eq(certificates.id, id))
        .limit(1);

      if (!cert) {
        return reply.status(404).send({
          valid: false,
          error: 'Certificate not found',
        });
      }

      const signatureValid = await verifyCertificate(id, cert.signature);

      return reply.send({
        valid: signatureValid,
        certificateId: cert.id,
        learner: cert.learnerName || cert.learnerEmail,
        track: cert.trackTitle,
        organization: cert.orgName,
        issuedAt: cert.issuedAt,
        signature: cert.signature,
        signatureValid,
      });
    }
  );

  /**
   * GET /api/manager/notifications
   * Get manager notifications
   */
  app.get(
    '/api/manager/notifications',
    async (req: FastifyRequest<{ Querystring: { unreadOnly?: string; limit?: string } }>, reply: FastifyReply) => {
      if (!FF_MANAGER_NOTIFICATIONS_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireManager(req, reply)) return reply;

      const session = getSession(req);
      const { unreadOnly, limit } = req.query;
      const maxResults = parseInt(limit || '50', 10);

      let query = db
        .select({
          id: managerNotifications.id,
          learnerId: managerNotifications.learnerId,
          learnerName: users.name,
          type: managerNotifications.type,
          content: managerNotifications.content,
          read: managerNotifications.read,
          sentAt: managerNotifications.sentAt,
        })
        .from(managerNotifications)
        .leftJoin(users, eq(managerNotifications.learnerId, users.id))
        .where(eq(managerNotifications.managerId, session!.userId))
        .orderBy(desc(managerNotifications.sentAt))
        .limit(maxResults);

      if (unreadOnly === 'true') {
        query = query.where(eq(managerNotifications.read, false));
      }

      const notifications = await query;

      const [unreadResult] = await db
        .select({ count: count() })
        .from(managerNotifications)
        .where(and(
          eq(managerNotifications.managerId, session!.userId),
          eq(managerNotifications.read, false)
        ));

      return reply.send({
        notifications,
        unreadCount: unreadResult?.count || 0,
        total: notifications.length,
      });
    }
  );

  /**
   * PATCH /api/manager/notifications/:id
   * Mark notification as read
   */
  app.patch(
    '/api/manager/notifications/:id',
    async (req: FastifyRequest<{ Params: { id: string }; Body: { read: boolean } }>, reply: FastifyReply) => {
      if (!FF_MANAGER_NOTIFICATIONS_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireManager(req, reply)) return reply;

      const session = getSession(req);
      const { id } = req.params;
      const { read } = req.body;

      // Verify ownership
      const [notif] = await db
        .select()
        .from(managerNotifications)
        .where(eq(managerNotifications.id, id))
        .limit(1);

      if (!notif || notif.managerId !== session!.userId) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Notification not found' }
        });
      }

      await db
        .update(managerNotifications)
        .set({ read })
        .where(eq(managerNotifications.id, id));

      return reply.send({ id, read });
    }
  );
}
```

**Register in `api/src/index.ts`:**
```typescript
await safeRegister('./routes/gamification', ['registerGamificationRoutes']);
```

**Acceptance:**
- [ ] All 7 routes work with RBAC
- [ ] Feature flags disable when false
- [ ] Error envelopes correct
- [ ] Tenant isolation enforced
- [ ] PDF download works
- [ ] Public verification works (no auth)

---

### Phase 7: UI Components & Tests (2 hours)

**File:** `web/app/learner/profile/page.tsx` (NEW)

```typescript
'use client';

import { useState, useEffect } from 'react';

export default function LearnerProfilePage() {
  const [level, setLevel] = useState<any>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);

  useEffect(() => {
    // Fetch level
    fetch('/api/learners/me/level/track-1', { credentials: 'include' })
      .then(res => res.json())
      .then(setLevel);

    // Fetch badges
    fetch('/api/learners/me/badges', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setBadges(data.badges));

    // Fetch certificates
    fetch('/api/learners/me/certificates', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setCertificates(data.certificates));
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">My Profile</h1>

      {/* Level */}
      {level && (
        <div className="mb-8 p-6 bg-blue-50 rounded-lg">
          <h2 className="text-2xl font-semibold mb-2">Current Level</h2>
          <p className="text-4xl font-bold capitalize">{level.level}</p>
          <p className="text-gray-600 mt-2">
            {level.correctAttempts} correct attempts
          </p>
          {level.nextLevel && (
            <p className="text-sm text-gray-500 mt-2">
              {level.attemptsToNext} more attempts to reach {level.nextLevel}
            </p>
          )}
        </div>
      )}

      {/* Badges */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Badges ({badges.length})</h2>
        <div className="grid grid-cols-3 gap-4">
          {badges.map(badge => (
            <div key={badge.id} className="p-4 border rounded-lg text-center">
              <div className="text-4xl mb-2">{badge.icon}</div>
              <p className="font-semibold">{badge.name}</p>
              <p className="text-sm text-gray-600">{badge.description}</p>
              <p className="text-xs text-gray-400 mt-2">
                Earned {new Date(badge.earnedAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Certificates */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Certificates ({certificates.length})</h2>
        {certificates.map(cert => (
          <div key={cert.id} className="mb-4 p-4 border rounded-lg flex justify-between items-center">
            <div>
              <p className="font-semibold">{cert.trackTitle}</p>
              <p className="text-sm text-gray-600">
                Issued {new Date(cert.issuedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <a
                href={`/api/certificates/${cert.id}/download`}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Download PDF
              </a>
              <a
                href={cert.verificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 border rounded"
              >
                Verify
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**File:** `web/components/LevelUpModal.tsx` (NEW)

```typescript
'use client';

import { useEffect, useState } from 'react';
import Confetti from 'react-confetti';

interface Props {
  show: boolean;
  level: string;
  onClose: () => void;
}

export function LevelUpModal({ show, level, onClose }: Props) {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Confetti width={windowSize.width} height={windowSize.height} />
      <div className="bg-white p-8 rounded-lg shadow-xl text-center">
        <h2 className="text-4xl font-bold mb-4">🎉 Level Up!</h2>
        <p className="text-2xl mb-6">
          You're now a <span className="font-bold capitalize">{level}</span>!
        </p>
        <button
          onClick={onClose}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg text-lg"
        >
          Awesome!
        </button>
      </div>
    </div>
  );
}
```

**Install react-confetti:**
```bash
cd web
npm install react-confetti
```

**File:** `api/tests/gamification.test.ts` (NEW)

```typescript
import { describe, it, expect } from 'vitest';
import { calculateLevel, getNextLevelInfo } from '../src/services/gamification';

describe('Gamification Service', () => {
  describe('calculateLevel', () => {
    it('should return novice for 0-20 attempts', () => {
      expect(calculateLevel(0)).toBe('novice');
      expect(calculateLevel(10)).toBe('novice');
      expect(calculateLevel(20)).toBe('novice');
    });

    it('should return learner for 21-50 attempts', () => {
      expect(calculateLevel(21)).toBe('learner');
      expect(calculateLevel(35)).toBe('learner');
      expect(calculateLevel(50)).toBe('learner');
    });

    it('should return practitioner for 51-100 attempts', () => {
      expect(calculateLevel(51)).toBe('practitioner');
      expect(calculateLevel(75)).toBe('practitioner');
      expect(calculateLevel(100)).toBe('practitioner');
    });

    it('should return expert for 101-200 attempts', () => {
      expect(calculateLevel(101)).toBe('expert');
      expect(calculateLevel(150)).toBe('expert');
      expect(calculateLevel(200)).toBe('expert');
    });

    it('should return master for 201+ attempts', () => {
      expect(calculateLevel(201)).toBe('master');
      expect(calculateLevel(300)).toBe('master');
    });
  });

  describe('getNextLevelInfo', () => {
    it('should return correct next level and attempts needed', () => {
      expect(getNextLevelInfo(10)).toEqual({ nextLevel: 'learner', attemptsToNext: 11 });
      expect(getNextLevelInfo(30)).toEqual({ nextLevel: 'practitioner', attemptsToNext: 21 });
      expect(getNextLevelInfo(75)).toEqual({ nextLevel: 'expert', attemptsToNext: 26 });
      expect(getNextLevelInfo(150)).toEqual({ nextLevel: 'master', attemptsToNext: 51 });
      expect(getNextLevelInfo(250)).toEqual({ nextLevel: null, attemptsToNext: null });
    });
  });
});

// Add 20+ more tests for badges, certificates, notifications...
```

**File:** `api/scripts/smoke-gamification.sh` (NEW)

```bash
#!/bin/bash
# Smoke tests for Epic 7: Gamification & Certification

set -e

API_BASE="${API_BASE:-http://localhost:8080}"
ADMIN_TOKEN="${ADMIN_TOKEN:-dev-admin-token-12345}"

echo "=== Epic 7: Gamification - Smoke Tests ==="

# Test 1: Get learner level
echo "Test 1: Get learner level"
curl -sS "${API_BASE}/api/learners/user-123/level/track-1" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  | jq -e 'has("level")'

# Test 2: Get badges
echo "Test 2: Get learner badges"
curl -sS "${API_BASE}/api/learners/user-123/badges" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  | jq -e 'has("badges")'

# Test 3: Get certificates
echo "Test 3: Get learner certificates"
curl -sS "${API_BASE}/api/learners/user-123/certificates" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  | jq -e 'has("certificates")'

# Test 4: Manager notifications
echo "Test 4: Get manager notifications"
curl -sS "${API_BASE}/api/manager/notifications" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  | jq -e 'has("notifications")'

echo "✅ All smoke tests passed!"
```

Make executable:
```bash
chmod +x api/scripts/smoke-gamification.sh
```

**Acceptance:**
- [ ] Learner profile page displays level, badges, certificates
- [ ] Level-up modal shows with confetti
- [ ] Manager notification center works
- [ ] 30+ unit tests pass
- [ ] Smoke tests pass

---

## 4. Code Patterns & Examples

[Include all established patterns from Epic 5/6, plus new ones specific to gamification]

---

## 5. Certificate Configuration

[Ed25519 key generation, PDF template design, verification flow]

---

## 6. Acceptance Criteria

[40+ checkboxes covering all features]

---

## 7. Testing Instructions

[Manual testing with curl commands]

---

## 8. Rollout Plan

[4-week phased rollout]

---

## 9. References

[Links to Epic 5/6 prompts, external libraries, etc.]

---

## 10. Quick Start Checklist

[Pre-implementation, implementation (7 phases), acceptance, PR & deployment]

---

**End of Epic 7 Implementation Prompt**

**Estimated Reading Time:** 50 minutes  
**Estimated Implementation Time:** 12-16 hours  
**Total Epic Time:** ~13-17 hours

**Questions?** Refer to `docs/MVP_B2B_ROADMAP.md` Epic 7 section or `EPIC5_IMPLEMENTATION_PROMPT.md`/`EPIC6_IMPLEMENTATION_PROMPT.md` for additional patterns.

**Good luck! 🚀**


