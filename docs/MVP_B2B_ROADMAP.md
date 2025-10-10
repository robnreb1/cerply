# Cerply B2B Enterprise MVP - Epic Roadmap

**Strategic Context:** Pivot from D2C to B2B enterprise focus. Target: Regulated industries, knowledge-intense teams, SMEs. GTM: Consulting-led (workshops → design sprint → SaaS).

**Source Documents:**
- [Pitch Deck](./brd/pitch_deck.md) - Strategic positioning and product vision
- [Functional Spec](./functional-spec.md) - Current implementation status
- [Use Cases](./spec/use-cases.md) - Current MVP capabilities

---

## 🎯 MVP Success Criteria

**Business Goals:**
- ✅ Manager can create track from artefacts and assign to team
- ✅ Learners receive adaptive lessons via enterprise channels (Teams/Slack/WhatsApp)
- ✅ Manager sees team comprehension, retention, and at-risk learners
- ✅ Expert panel can certify modules with audit trail
- ✅ SSO-enabled for enterprise customers
- ✅ Demo-ready for design sprint workshops

**Technical Goals:**
- ✅ Remove all D2C/consumer UI flows
- ✅ Enterprise SSO (SAML/OIDC) with RBAC
- ✅ Team/group management with learner assignment
- ✅ Channel integrations for learner delivery
- ✅ Manager dashboard with business analytics
- ✅ Enhanced certification workflow
- ✅ Comprehensive E2E tests for all workflows

---

## 📋 Epic Breakdown (Priority Order)

### EPIC 1: D2C Removal & Enterprise Foundation
**Priority:** P0 (Blocker for all other work)
**Effort:** 1 overnight (8-10 hours)
**Goal:** Remove consumer flows, establish enterprise-only access patterns

**Scope:**
1. **Remove D2C UI**:
   - Remove/hide main chat interface at `/` (redirect to `/login`)
   - Remove any consumer self-serve signup flows
   - Remove individual payment/billing screens (if any)
   - Update copy from "you" to "your team/organization"

2. **Update Landing Marketing Site**:
   - Update `web-marketing` copy to focus on B2B value props
   - Add "Request Demo" CTA instead of "Join Waitlist"
   - Add enterprise customer logos section (placeholder)
   - Update hero to focus on manager/team outcomes

3. **App Access Control**:
   - All app routes require auth (expand middleware)
   - `/login` redirects to SSO (placeholder for now)
   - Add `/unauthorized` page for non-enterprise users

**Deliverables:**
- [ ] D2C routes removed/hidden
- [ ] Marketing site updated with B2B copy
- [ ] App requires auth for all routes
- [ ] E2E test: Anonymous user cannot access app
- [ ] PR merged with [spec] tag

**Acceptance:**
```bash
# Test: Anonymous redirect
curl -I https://app-stg.cerply.com/ | grep "Location: /login"

# Test: Marketing is B2B focused
curl https://www-stg.cerply.com/ | grep "your team"

# Test: No consumer self-serve
curl https://app-stg.cerply.com/signup → 404
```

---

### EPIC 2: Enterprise SSO & RBAC
**Priority:** P0 (Foundation for all B2B features)
**Effort:** 1 overnight (8-10 hours)
**Goal:** Replace DEV login with enterprise SSO, add role-based access

**Scope:**
1. **SSO Integration**:
   - Add SAML 2.0 provider (start with mock/dev mode)
   - Add OIDC/OAuth2 provider (Google Workspace as reference)
   - Session management with enterprise domains
   - SSO config UI for admins (domain, metadata URL, certificate)

2. **RBAC System**:
   - Define roles: `admin`, `manager`, `learner`
   - Add `roles` table: `user_id`, `organization_id`, `role`, `granted_at`
   - Middleware to check role permissions per route
   - Admin can assign roles to users

3. **Organization Model**:
   - Add `organizations` table: `id`, `name`, `domain`, `sso_config`, `created_at`
   - Add `users` table: `id`, `email`, `organization_id`, `created_at`
   - Users belong to one organization
   - SSO login creates user if not exists

**Deliverables:**
- [ ] SSO login works (mock mode for dev)
- [ ] RBAC enforced on all routes
- [ ] Admin can manage organization users
- [ ] E2E test: SSO login → assigned role → correct access
- [ ] PR merged with [spec] tag

**Acceptance:**
```bash
# Test: SSO login
curl -X POST https://api-stg.cerply.com/api/auth/sso/login \
  -H 'content-type: application/json' \
  -d '{"provider":"google","domain":"acme.com"}' → redirect URL

# Test: RBAC enforcement
curl -H "Cookie: cerply.sid=learner-session" \
  https://api-stg.cerply.com/api/admin/users → 403 FORBIDDEN

curl -H "Cookie: cerply.sid=admin-session" \
  https://api-stg.cerply.com/api/admin/users → 200 OK
```

---

### EPIC 3: Team Management & Learner Assignment
**Priority:** P0 (Core B2B workflow)
**Effort:** 1 overnight (8-10 hours)
**Goal:** Managers can create teams, assign learners, manage subscriptions

**Scope:**
1. **Team Model**:
   - Add `teams` table: `id`, `organization_id`, `name`, `manager_id`, `created_at`
   - Add `team_members` table: `team_id`, `user_id`, `joined_at`
   - Managers can create/edit teams
   - Managers can add/remove team members

2. **Track Subscriptions**:
   - Add `track_subscriptions` table: `id`, `track_id`, `team_id`, `frequency`, `priority`, `assigned_at`
   - Manager assigns track to team
   - Set frequency (daily, weekly, on-demand)
   - Set priority (high, medium, low)

3. **Manager UI**:
   - `/manager/teams` - List teams, create new team
   - `/manager/teams/[id]` - Team detail, manage members
   - `/manager/tracks/[id]/assign` - Assign track to teams
   - Bulk operations (assign track to multiple teams)

**Deliverables:**
- [ ] Managers can create teams
- [ ] Managers can assign learners to teams
- [ ] Managers can subscribe teams to tracks
- [ ] E2E test: Create team → add learners → assign track
- [ ] PR merged with [spec] tag

**Acceptance:**
```bash
# Test: Create team
curl -X POST https://api-stg.cerply.com/api/manager/teams \
  -H "Cookie: cerply.sid=manager-session" \
  -H 'content-type: application/json' \
  -d '{"name":"Engineering Team","members":["user1","user2"]}' → 201

# Test: Assign track
curl -X POST https://api-stg.cerply.com/api/manager/tracks/track-1/subscribe \
  -H "Cookie: cerply.sid=manager-session" \
  -d '{"teamId":"team-1","frequency":"daily"}' → 200
```

---

### EPIC 4: Manager Dashboard - Analytics & Insights
**Priority:** P0 (Core B2B value prop)
**Effort:** 1 overnight (8-10 hours)
**Goal:** Managers see team comprehension, retention, at-risk learners

**Scope:**
1. **Analytics Data Model**:
   - Track per-user, per-track metrics: attempts, correct rate, avg latency, last attempt
   - Track per-team aggregates: avg comprehension, retention curve, at-risk count
   - Track per-topic: weak spots, needs reinforcement

2. **Dashboard API**:
   - `GET /api/manager/teams/[id]/analytics` - Team overview
   - `GET /api/manager/teams/[id]/learners` - Learner list with status
   - `GET /api/manager/teams/[id]/tracks/[trackId]` - Track-specific performance
   - `GET /api/manager/teams/[id]/at-risk` - Learners needing intervention

3. **Manager Dashboard UI**:
   - `/manager/dashboard` - Overview of all teams
   - `/manager/teams/[id]/dashboard` - Team-specific view
   - Visualizations: comprehension curve, retention heatmap, at-risk alerts
   - Filters: date range, track, learner

**Deliverables:**
- [ ] Manager sees team comprehension metrics
- [ ] Manager sees retention curves over time
- [ ] Manager sees at-risk learners
- [ ] E2E test: Generate activity → view in dashboard
- [ ] PR merged with [spec] tag

**Acceptance:**
```bash
# Test: Team analytics
curl -H "Cookie: cerply.sid=manager-session" \
  https://api-stg.cerply.com/api/manager/teams/team-1/analytics

# Expected: {
#   "teamId": "team-1",
#   "avgComprehension": 0.85,
#   "activelearners": 12,
#   "atRiskCount": 3,
#   "retentionCurve": [...]
# }
```

---

### EPIC 5: Slack Channel Integration (Learner Delivery MVP)
**Priority:** P1 (Key differentiator)
**Effort:** 6-8 hours (1 overnight)
**Goal:** Learners receive and respond to lessons via Slack

**Rationale:**
- **Slack chosen for MVP** over WhatsApp/Teams due to:
  - Simplest OAuth flow (30-min setup vs 1-3 days)
  - Free developer tier (no Twilio costs)
  - Native webhooks (no external polling)
  - Rich interactive Block Kit UI
  - Instant testing (no phone number verification)
- WhatsApp/Teams planned for Phase 2/3

**Scope:**
1. **Channel Framework**:
   - Add `channels` table: `organization_id`, `type`, `config`, `enabled`
   - Add `user_channels` table: `user_id`, `channel_type`, `channel_id`, `preferences`
   - Support types: `slack` (MVP), `whatsapp`, `teams`, `email` (future)

2. **Slack Adapter** (MVP):
   - **Setup**: Slack App with OAuth 2.0, scopes: `chat:write`, `users:read`, `im:write`, `im:history`
   - **Send**: Lesson as DM with Block Kit interactive buttons
   - **Receive**: Button clicks via interactivity webhook + text messages via event subscription
   - **Format**: Question + answer buttons OR free-text input
   - **Feedback**: Immediate response with correctness + explanation

3. **Delivery API**:
   - `POST /api/delivery/send` - Send lesson to user via preferred channel
     - Body: `{ userId, channel: 'slack', lessonId, questionId? }`
     - Returns: `{ messageId, deliveredAt, channel }`
   - `POST /api/delivery/webhook/slack` - Slack webhook handler (events + interactivity)
     - Validates Slack signature
     - Parses button clicks or text responses
     - Calls `POST /api/learn/submit` with answer
   - `GET /api/delivery/channels` - List user's configured channels
   - `POST /api/delivery/channels` - Configure channel preferences (quiet hours, paused)

4. **Learner Preferences**:
   - Set preferred channel (Slack, web, email fallback)
   - Set quiet hours (e.g., "22:00-07:00")
   - Pause/resume notifications

**Database Schema:**
```sql
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('slack', 'whatsapp', 'teams', 'email')),
  config JSONB NOT NULL, -- { slack_team_id, slack_bot_token, ... }
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

**Deliverables:**
- [ ] Database migration: `008_channels.sql`
- [ ] Slack OAuth flow and workspace configuration
- [ ] `POST /api/delivery/send` endpoint (Slack only)
- [ ] `POST /api/delivery/webhook/slack` endpoint (signature verification)
- [ ] Block Kit message formatting (questions + buttons)
- [ ] Response parsing (button clicks + text)
- [ ] Link responses to `POST /api/learn/submit`
- [ ] Learner preferences API
- [ ] E2E test: Send lesson via Slack → click button → score recorded
- [ ] Smoke test: `scripts/smoke-delivery.sh`
- [ ] PR merged with [spec] tag

**Acceptance:**
```bash
# Test: Send lesson via Slack
curl -X POST http://localhost:8080/api/delivery/send \
  -H "x-admin-token: dev-admin-token-12345" \
  -H "content-type: application/json" \
  -d '{
    "userId": "user-123",
    "channel": "slack",
    "lessonId": "lesson-fire-safety-1"
  }'
# → 200 { "messageId": "1234567890.123456", "deliveredAt": "...", "channel": "slack" }

# Test: Simulate Slack button click
curl -X POST http://localhost:8080/api/delivery/webhook/slack \
  -H "content-type: application/json" \
  -d '{
    "type": "block_actions",
    "user": { "id": "U123" },
    "actions": [{ "value": "option_a", "action_id": "answer" }],
    "response_url": "https://hooks.slack.com/..."
  }'
# → 200 { "text": "✅ Correct! Raising the alarm is the first priority." }

# Test: Verify attempt recorded
curl http://localhost:8080/api/manager/users/user-123/progress \
  -H "x-admin-token: dev-admin-token-12345"
# → includes recent attempt with correct=true, channel="slack"

# Test: Get learner channels
curl http://localhost:8080/api/delivery/channels \
  -H "Cookie: cerply.sid=learner-session"
# → 200 { "channels": [{ "type": "slack", "channelId": "U123", "preferences": {...}, "verified": true }] }
```

**Future (Post-MVP):**
- [ ] WhatsApp integration (via Twilio, Phase 2)
- [ ] Teams integration (via Bot Framework, Phase 3)
- [ ] Email fallback for all channels
- [ ] Scheduled delivery (daily/weekly cadence)
- [ ] Multi-channel preference (primary + fallback)

---

### EPIC 6: Ensemble Content Generation (Quality Pipeline)
**Priority:** P0 (Core product quality)
**Effort:** 2 overnights (16-20 hours)
**Goal:** Implement 3-LLM pipeline with cross-checking and best-of-breed content selection

**Context:** Currently content generation is stubbed with mock data. This epic implements the "quality-first" pipeline described in docs/platform/quality-first-pipeline.md with actual LLM orchestration.

**Scope:**
1. **LLM Playback & Confirmation Loop**:
   - Manager submits artefact (paste, upload, URL)
   - LLM 1 reads and plays back understanding: "I understand this is about [X], covering [Y] and [Z]"
   - Manager confirms or refines: "Actually, focus more on [Z]"
   - Iterative refinement until manager approves (max 3 rounds)

2. **Multi-LLM Ensemble Generation**:
   - **LLM 1 (Generator A)**: Creates modules + questions from approved understanding
     - Model: GPT-4o or Claude Sonnet 3.5
     - Prompt: Generate pedagogically sound micro-lessons
   - **LLM 2 (Generator B)**: Independent generation from same artefact
     - Model: Different model than LLM 1 for diversity
     - Prompt: Similar but emphasizes different teaching styles
   - **LLM 3 (Fact-Checker & Judge)**: Cross-checks both outputs
     - Model: GPT-4 or Claude Opus (highest reasoning)
     - Prompt: Verify factual accuracy, remove fluff, select best elements from A & B

3. **Best-of-Breed Resolution**:
   - LLM 3 produces final content by:
     - Fact-checking both A and B against source artefact
     - Removing redundancy and fluff
     - Selecting clearest explanations from either A or B
     - Ensuring pedagogical progression
   - Output tagged with provenance: `{ sources: ['llm-1', 'llm-2'], checker: 'llm-3', confidence: 0.95 }`

4. **Manager Refinement UI**:
   - Show generated modules with edit capability
   - Highlight which LLM contributed each section (for transparency)
   - "Regenerate this module" button triggers new ensemble run
   - "Accept" locks content and proceeds to publishing

5. **Content Categorization** (Generic vs Proprietary):
   - Add `content_type` field: `generic`, `proprietary`, `mixed`
   - **Generic**: Industry-standard knowledge (e.g., fire safety, GDPR basics)
     - Can be reused across organizations
     - Stored in shared canon for cost savings
   - **Proprietary**: Company-specific (e.g., "Acme Corp's escalation policy")
     - Private to organization
     - Never shared or reused
   - Manager tags content during refinement
   - Generic content indexed for future reuse (quality-first pipeline)

**Database Schema:**
```sql
-- Content provenance tracking
CREATE TABLE content_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artefact_id UUID NOT NULL REFERENCES artefacts(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  llm_1_output JSONB NOT NULL, -- { model, modules[], timestamp }
  llm_2_output JSONB NOT NULL,
  llm_3_output JSONB NOT NULL, -- final merged output
  manager_refinements JSONB[], -- [ { timestamp, changes, rationale } ]
  content_type TEXT CHECK (content_type IN ('generic', 'proprietary', 'mixed')),
  final_content JSONB NOT NULL,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Refinement iterations
CREATE TABLE content_refinements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID NOT NULL REFERENCES content_generations(id),
  iteration INTEGER NOT NULL,
  user_feedback TEXT NOT NULL,
  llm_response TEXT NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_generations_org ON content_generations(organization_id);
CREATE INDEX idx_content_generations_type ON content_generations(content_type);
CREATE INDEX idx_content_refinements_generation ON content_refinements(generation_id);
```

**API Routes:**
```
POST   /api/content/understand       LLM playback of artefact understanding
POST   /api/content/refine            Manager refines understanding
POST   /api/content/generate          Trigger 3-LLM ensemble generation
GET    /api/content/generations/:id   Get generation status/results
PATCH  /api/content/generations/:id   Manager edits/approves content
POST   /api/content/regenerate/:id    Regenerate specific module
```

**Deliverables:**
- [ ] LLM orchestration service (`api/src/services/llm-orchestrator.ts`)
- [ ] 3-LLM pipeline implementation with retry logic
- [ ] Confirmation loop UI (`/curator/understand`)
- [ ] Content refinement UI (`/curator/refine`)
- [ ] Manager approval UI with provenance display
- [ ] Content type tagging (generic/proprietary)
- [ ] Generic content canon storage for reuse
- [ ] E2E test: Upload → understand → refine → generate → approve
- [ ] Cost tracking per generation (log to `gen_ledger`)
- [ ] PR merged with [spec] tag

**Feature Flags:**
- `FF_ENSEMBLE_GENERATION_V1=true`: Enable 3-LLM pipeline
- `FF_CONTENT_CANON_V1=true`: Enable generic content reuse
- `LLM_GENERATOR_1`: Model for first generator (default: gpt-4o)
- `LLM_GENERATOR_2`: Model for second generator (default: claude-sonnet-3.5)
- `LLM_FACT_CHECKER`: Model for fact-checking (default: gpt-4)

**Acceptance:**
```bash
# Test: Submit artefact and get understanding
curl -X POST http://localhost:8080/api/content/understand \
  -H "x-admin-token: TOKEN" \
  -H "content-type: application/json" \
  -d '{"artefact":"Fire safety procedures: Call 999, evacuate..."}' \
  | jq '.understanding'
# → "I understand this covers emergency fire procedures, focusing on..."

# Test: Trigger ensemble generation
curl -X POST http://localhost:8080/api/content/generate \
  -H "x-admin-token: TOKEN" \
  -d '{"generationId":"gen-123"}' \
  | jq '.status'
# → "processing" (runs async)

# Test: Check generation results
curl http://localhost:8080/api/content/generations/gen-123 \
  -H "x-admin-token: TOKEN" | jq '.provenance'
# → { "sources": ["gpt-4o", "claude-sonnet"], "checker": "gpt-4", "confidence": 0.95 }

# Verify: Generic content stored in canon
curl http://localhost:8080/api/canon/search?q=fire+safety | jq '.items[0].contentType'
# → "generic"
```

**Status:** ✅ **DELIVERED** 2025-10-10

**Implementation Summary:**
- 3-LLM ensemble working: GPT-4o + Claude 4.5 + o3
- Understanding playback and iterative refinement (max 3 iterations)
- Full provenance tracking (which LLM contributed each section)
- Content type tagging (generic/proprietary)
- Cost per generation: $0.15-0.25 (verified)
- Epic 6 complete and production-ready

---

### EPIC 6.5: Research-Driven Content Generation
**Priority:** P0 (Critical for catalog scaling)
**Effort:** 1 overnight (8-10 hours)
**Goal:** Enable content generation from topic requests without requiring source documents

**Context:** Epic 6 requires managers to upload source materials (documents, policies, transcripts). Many learning topics don't have existing documents, requiring manual research and authoring. Epic 6.5 enables "Teach me X" requests that trigger automated research and content generation.

**Scope:**
1. **Input Type Auto-Detection**:
   - System detects if input is a topic request ("Teach me async/await") vs source document
   - Topic indicators: "teach me", "explain", "what is", "how to", or text <200 chars
   - Routes automatically to research mode or source transformation mode

2. **Research Mode Prompts**:
   - **Understanding Model (GPT-4o)**: Extracts topic, domain, key concepts, learning objectives, prerequisites, difficulty level
   - **Generator A (Claude 4.5)**: Technical/academic focus with citations (textbooks, papers, courses)
   - **Generator B (GPT-4o)**: Practical/application focus with citations (online courses, tutorials, guides)
   - **Fact-Checker (o3)**: Validates factual accuracy, citation credibility, checks for ethical issues

3. **Citation Tracking**:
   - Generators include citations in module content: `[Source: Stewart Calculus, Chapter 3]`
   - Citations extracted and stored in `citations` table
   - Validation status tracked: verified, questionable, unverified
   - Provenance shows which generator contributed each module

4. **Comprehensive Output**:
   - 4-6 validated learning modules per topic
   - 3-4 credible sources per module
   - Full provenance tracking
   - Confidence scores per module (0.88-0.96)

**Database Schema:**
```sql
-- Citations for research mode
CREATE TABLE citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID NOT NULL REFERENCES content_generations(id),
  citation_text TEXT NOT NULL,
  title TEXT,
  author TEXT,
  source_type TEXT, -- 'textbook', 'paper', 'course', 'video'
  validation_status TEXT, -- 'verified', 'questionable', 'unverified'
  confidence_score NUMERIC(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add input_type to content_generations
ALTER TABLE content_generations ADD COLUMN input_type TEXT DEFAULT 'source'; -- 'source' | 'topic'
ALTER TABLE content_generations ADD COLUMN ethical_flags JSONB DEFAULT '[]';
```

**API Routes:**
```
POST   /api/content/understand       Returns inputType: 'topic' or 'source'
POST   /api/content/generate          Handles both source and topic modes
GET    /api/content/generations/:id   Returns citations array for research mode
```

**Deliverables:**
- ✅ Input type detection logic (`detectInputType()`)
- ✅ Research-specific prompts (5 specialized prompts)
- ✅ Citations table and tracking
- ✅ Dynamic prompt routing based on mode
- ✅ Enhanced provenance handling (multiple formats)
- ✅ Comprehensive testing and verification
- ✅ Documentation in functional spec (§27)

**Feature Flags:**
- `FF_ENSEMBLE_GENERATION_V1=true`: Enables both Epic 6 and 6.5
- `LLM_UNDERSTANDING=gpt-4o`: Model for topic analysis
- `LLM_GENERATOR_1=claude-sonnet-4-5`: Generator A (technical)
- `LLM_GENERATOR_2=gpt-4o`: Generator B (practical)
- `LLM_FACT_CHECKER=o3`: Fact-checker (deep reasoning)

**Acceptance:**
```bash
# Test: Topic request auto-detected
curl -X POST http://localhost:8080/api/content/understand \
  -H "x-admin-token: TOKEN" \
  -d '{"artefact":"Teach me complex numbers"}' \
  | jq '.inputType'
# → "topic"

# Test: Generate from topic
curl -X POST http://localhost:8080/api/content/generate \
  -H "x-admin-token: TOKEN" \
  -d '{"generationId":"gen-xyz"}' \
  | jq '.status'
# → "generating"

# Test: Citations tracked
curl http://localhost:8080/api/content/generations/gen-xyz \
  -H "x-admin-token: TOKEN" | jq '.citations | length'
# → 15 (3-4 citations per module × 5 modules)

# Verify: Cost tracking
curl http://localhost:8080/api/content/generations/gen-xyz \
  -H "x-admin-token: TOKEN" | jq '.totalCost'
# → 0.204 (within $0.15-0.25 range)
```

**Status:** ✅ **DELIVERED** 2025-10-10

**Verified Metrics:**
- Cost per topic: $0.186-0.226 (avg $0.205)
- Generation time: 2.1-2.7 minutes average (o3 fact-checker: 2-15 min variable)
- Modules per topic: 5 (range: 4-6)
- Sources per module: 3-4
- Token usage: 12,852-15,013 tokens
- Quality: Production-ready, comprehensive coverage

**Business Impact:**
- **Catalog Scaling:** $100 → 500 topics without source documents
- **Manager Productivity:** No document sourcing required
- **Quality Assurance:** 3-LLM validation ensures accuracy
- **Future Optimization:** Epic 6.7 will add comprehensive generation ("zoom out, zoom in") for 70-80% cost reduction

---

### EPIC 7: Gamification & Certification System
**Priority:** P1 (Learner engagement & trust)
**Effort:** 1.5 overnights (12-16 hours)
**Goal:** Implement levels, certificates, badges, and manager notifications for achievements

**Context:** Currently no learner progression system or achievement tracking. This epic adds gamification elements and formal certification to drive engagement and provide audit-ready credentials.

**Scope:**
1. **Learner Levels** (Cerply-modelled):
   - **Novice** (0-20 correct attempts)
   - **Learner** (21-50 correct attempts)
   - **Practitioner** (51-100 correct attempts)
   - **Expert** (101-200 correct attempts)
   - **Master** (201+ correct attempts)
   - Levels calculated per track (not global)
   - Level up triggers celebration UI + notification

2. **Certificates**:
   - Auto-generated PDF certificate when learner completes track
   - Includes: Learner name, Track title, Completion date, Organization logo
   - Signed with Ed25519 signature for verification
   - Downloadable from learner profile
   - Manager notified when learner earns certificate

3. **Badges** (Achievement System):
   - **Speed Demon**: 10 questions answered in < 5 seconds each (correct)
   - **Perfectionist**: 20 questions in a row correct
   - **Consistent**: 7-day streak
   - **Knowledge Sharer**: Share 3 artefacts with team
   - **Lifelong Learner**: Complete 5 tracks
   - Badges displayed on learner profile
   - Badge unlock triggers confetti animation

4. **Manager Notifications**:
   - Email notification when team member:
     - Levels up (Practitioner → Expert)
     - Earns certificate (track completion)
     - Unlocks badge
   - Daily digest: "3 team members leveled up this week"
   - Notification preferences (immediate, daily, weekly, off)

5. **Progress Review** (Conversational):
   - Shortcut key: `Cmd+K` → "Show my progress"
   - Natural language query: "How am I doing?" → Shows level, next milestone, badges
   - "When will I complete this track?" → Estimates based on current pace
   - "What's my weakest topic?" → Shows comprehension by module

**Database Schema:**
```sql
-- Learner levels per track
CREATE TABLE learner_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  track_id UUID NOT NULL REFERENCES tracks(id),
  level TEXT NOT NULL CHECK (level IN ('novice', 'learner', 'practitioner', 'expert', 'master')),
  correct_attempts INTEGER NOT NULL DEFAULT 0,
  leveled_up_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, track_id)
);

-- Certificates
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  track_id UUID NOT NULL REFERENCES tracks(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  signature TEXT NOT NULL, -- Ed25519 signature
  pdf_url TEXT, -- S3/storage URL
  verification_url TEXT, -- Public verification page
  UNIQUE(user_id, track_id)
);

-- Badges
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE, -- 'speed-demon', 'perfectionist', etc.
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- emoji or icon name
  criteria JSONB NOT NULL -- { type: 'streak', days: 7 }
);

CREATE TABLE learner_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  badge_id UUID NOT NULL REFERENCES badges(id),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Manager notifications
CREATE TABLE manager_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES users(id),
  learner_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('level_up', 'certificate', 'badge', 'at_risk')),
  content JSONB NOT NULL, -- { level: 'expert', track: '...', etc }
  read BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_learner_levels_user ON learner_levels(user_id);
CREATE INDEX idx_certificates_user ON certificates(user_id);
CREATE INDEX idx_learner_badges_user ON learner_badges(user_id);
CREATE INDEX idx_manager_notifications_manager ON manager_notifications(manager_id, read);
```

**API Routes:**
```
GET    /api/learners/:id/level/:trackId     Get current level for track
GET    /api/learners/:id/certificates        List earned certificates
GET    /api/learners/:id/badges              List earned badges
GET    /api/certificates/:id/verify          Public verification endpoint
POST   /api/certificates/:id/download        Generate & download PDF
GET    /api/manager/notifications            Get unread notifications
PATCH  /api/manager/notifications/:id        Mark as read
```

**UI Components:**
- `/learner/profile` - Show levels, certificates, badges
- `/learner/progress` - Conversational progress review (Cmd+K)
- `/manager/notifications` - Notification center
- Certificate PDF template with organization branding
- Level-up celebration modal with confetti
- Badge unlock toast notification

**Deliverables:**
- [ ] Level calculation service (triggered on attempt submit)
- [ ] Certificate generation service (PDF + signature)
- [ ] Badge unlock detection (cron job, checks criteria every hour)
- [ ] Manager notification service (email + in-app)
- [ ] Conversational progress API (natural language → structured data)
- [ ] UI for learner profile with achievements
- [ ] UI for manager notification center
- [ ] E2E test: Complete track → earn certificate → manager notified
- [ ] PR merged with [spec] tag

**Feature Flags:**
- `FF_GAMIFICATION_V1=true`: Enable levels and badges
- `FF_CERTIFICATES_V1=true`: Enable certificate generation
- `FF_MANAGER_NOTIFICATIONS_V1=true`: Enable manager notifications

**Acceptance:**
```bash
# Test: Get learner level
curl http://localhost:8080/api/learners/user-123/level/track-fire-safety \
  -H "x-admin-token: TOKEN" | jq
# → { "level": "practitioner", "correctAttempts": 75, "nextLevel": "expert", "attemptsToNext": 26 }

# Test: Download certificate
curl -X POST http://localhost:8080/api/certificates/cert-123/download \
  -H "Cookie: cerply.sid=learner-session" \
  --output certificate.pdf
# → PDF downloaded

# Test: Verify certificate
curl http://localhost:8080/api/certificates/cert-123/verify | jq
# → { "valid": true, "learner": "John Doe", "track": "Fire Safety", "issued": "2025-10-10" }

# Test: Manager notifications
curl http://localhost:8080/api/manager/notifications \
  -H "Cookie: cerply.sid=manager-session" | jq '.unread'
# → 3 (3 unread notifications)
```

---

### EPIC 8: Conversational Learning Interface
**Priority:** P1 (UX differentiator)
**Effort:** 1.5 overnights (12-16 hours)
**Goal:** Natural language chat for learning queries, progress review, and help

**Context:** Currently learners interact through structured UI (buttons, forms). This epic adds a conversational layer where learners can ask questions naturally and get helpful responses.

**Scope:**
1. **Natural Language Queries**:
   - "How am I doing?" → Shows progress summary
   - "What's my next question?" → Fetches next item from adaptive queue
   - "I don't understand this answer" → Provides deeper explanation
   - "Show me fire safety questions" → Filters to specific topic
   - "When will I finish this track?" → Estimates completion date
   - "Why did I get this wrong?" → Explains misconception

2. **Chat Interface**:
   - Persistent chat panel (collapsible sidebar or modal)
   - Keyboard shortcut: `Cmd+K` or `/` to open
   - Remembers context within session
   - Shows typing indicator during LLM response
   - Markdown formatting for code/lists
   - Copy code snippets button

3. **Intent Router** (Lightweight NLP):
   - Classify query intent:
     - `progress` - "how am I doing", "show my stats"
     - `next` - "what's next", "give me a question"
     - `explanation` - "I don't understand", "explain this"
     - `filter` - "show fire safety", "skip this topic"
     - `help` - "how does this work", "what can I ask"
   - Route to appropriate handler (no full LLM for simple queries)
   - Use LLM only for complex explanations

4. **Explanation Engine**:
   - When learner says "I don't understand":
     - Fetches the question + correct answer
     - Uses LLM to generate simpler explanation (ELI12 style)
     - Offers alternative examples
     - Provides related resources
   - Tracks "confused on" topics for adaptive difficulty adjustment

5. **Avoid Multiple Choice** (Where Possible):
   - Free-text input encouraged: "Type your answer..."
   - NLP to parse answer (fuzzy matching + LLM validation)
   - Accept partial credit: "Close, but X is more accurate because..."
   - Fall back to MCQ for yes/no or categorical questions

**Database Schema:**
```sql
-- Chat history
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  intent TEXT, -- 'progress', 'next', 'explanation', etc.
  metadata JSONB, -- { questionId, trackId, etc }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Confusion tracking
CREATE TABLE confusion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  question_id UUID NOT NULL,
  query TEXT NOT NULL, -- What they asked
  explanation_provided TEXT NOT NULL, -- What we answered
  helpful BOOLEAN, -- Did they say it helped?
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_confusion_log_user ON confusion_log(user_id);
```

**API Routes:**
```
POST   /api/chat/message              Send message, get response
GET    /api/chat/sessions             List recent sessions
GET    /api/chat/sessions/:id         Get session history
POST   /api/chat/explanation          Request deeper explanation for question
POST   /api/chat/feedback             Mark explanation as helpful/not helpful
```

**UI Components:**
- Chat panel (sidebar or modal)
- Markdown renderer for responses
- Typing indicator
- Quick action buttons ("Show Progress", "Next Question", "Help")
- Voice input (optional, nice-to-have)

**Deliverables:**
- [ ] Intent router service (`api/src/services/intent-router.ts`)
- [ ] Chat API routes with session management
- [ ] Explanation engine (LLM-powered, cached)
- [ ] Chat UI component (`web/components/ChatPanel.tsx`)
- [ ] Keyboard shortcuts (Cmd+K, /)
- [ ] Free-text answer validation (NLP + LLM)
- [ ] Confusion tracking for adaptive difficulty
- [ ] E2E test: Ask question → get response → mark helpful
- [ ] PR merged with [spec] tag

**Feature Flags:**
- `FF_CONVERSATIONAL_UI_V1=true`: Enable chat interface
- `FF_FREE_TEXT_ANSWERS_V1=true`: Enable free-text input (vs MCQ only)
- `CHAT_LLM_MODEL`: Model for chat responses (default: gpt-4o-mini)

**Acceptance:**
```bash
# Test: Send chat message
curl -X POST http://localhost:8080/api/chat/message \
  -H "Cookie: cerply.sid=learner-session" \
  -H "content-type: application/json" \
  -d '{"message":"How am I doing?"}' | jq
# → { "response": "You're doing great! You've completed 15/20 questions...", "intent": "progress" }

# Test: Request explanation
curl -X POST http://localhost:8080/api/chat/explanation \
  -H "Cookie: cerply.sid=learner-session" \
  -d '{"questionId":"q123","query":"I don't understand why A is correct"}' | jq
# → { "explanation": "Great question! Option A is correct because...", "alternatives": [...] }

# Test: Submit free-text answer
curl -X POST http://localhost:8080/api/learn/submit \
  -H "Cookie: cerply.sid=learner-session" \
  -d '{"questionId":"q123","answerText":"You should raise the alarm first"}' | jq
# → { "correct": true, "feedback": "Exactly right! Raising the alarm alerts others..." }
```

---

### EPIC 9: True Adaptive Difficulty Engine
**Priority:** P1 (Core learning science)
**Effort:** 1.5 overnights (12-16 hours)
**Goal:** Dynamic difficulty adjustment based on real-time learner performance

**Context:** Currently spaced repetition exists, but difficulty is static. This epic adds intelligent difficulty adjustment based on performance patterns, latency, and confusion signals.

**Scope:**
1. **Performance Signals**:
   - **Correctness**: Right/wrong answers
   - **Latency**: Response time (fast = confident, slow = struggling)
   - **Confusion**: "I don't understand" queries
   - **Attempts**: Multiple tries on same question
   - **Spaced recall**: Remembers after 7/14/30 days?

2. **Difficulty Levels**:
   - **L1 - Recall**: Simple fact recall ("What is X?")
   - **L2 - Application**: Apply knowledge ("How would you handle X?")
   - **L3 - Analysis**: Compare/contrast ("Why is A better than B?")
   - **L4 - Synthesis**: Create solutions ("Design a process for X")
   - Each question tagged with difficulty level in DB

3. **Adaptive Algorithm**:
   - Start at L2 (application) for new learners
   - If 3 correct in a row with low latency → increase difficulty
   - If 2 wrong or high latency (>30s) → decrease difficulty
   - If "I don't understand" → decrease + provide scaffolding
   - Never drop below L1 (avoid discouragement)
   - Track optimal difficulty per learner per topic

4. **Style Adaptation**:
   - Detect preferred learning style from behavior:
     - **Visual**: Clicks "Show diagram" frequently
     - **Verbal**: Reads full explanations
     - **Kinesthetic**: Prefers interactive examples
   - Adjust question format accordingly:
     - Visual → include diagrams/charts
     - Verbal → text-heavy explanations
     - Kinesthetic → scenario-based questions

5. **Topic Weakness Detection**:
   - Track comprehension per sub-topic (not just track-wide)
   - Identify weak topics: comprehension < 70% after 5 attempts
   - Automatically inject more questions on weak topics
   - "You're struggling with X, let's practice that more"

**Database Schema:**
```sql
-- Question difficulty tagging
ALTER TABLE items ADD COLUMN difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 4);
ALTER TABLE items ADD COLUMN question_style TEXT CHECK (question_style IN ('visual', 'verbal', 'kinesthetic', 'mixed'));

-- Learner performance profiles
CREATE TABLE learner_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) UNIQUE,
  preferred_difficulty INTEGER DEFAULT 2, -- Start at L2
  preferred_style TEXT, -- 'visual', 'verbal', 'kinesthetic'
  avg_latency_ms INTEGER,
  consistency_score NUMERIC(3,2), -- 0.00 to 1.00
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Topic-level comprehension
CREATE TABLE topic_comprehension (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  track_id UUID NOT NULL REFERENCES tracks(id),
  topic TEXT NOT NULL, -- 'fire-safety.evacuation', 'fire-safety.extinguishers'
  attempts INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  avg_latency_ms INTEGER,
  comprehension NUMERIC(3,2), -- 0.00 to 1.00
  needs_reinforcement BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, track_id, topic)
);

CREATE INDEX idx_learner_profiles_user ON learner_profiles(user_id);
CREATE INDEX idx_topic_comprehension_user_track ON topic_comprehension(user_id, track_id);
CREATE INDEX idx_topic_comprehension_weak ON topic_comprehension(needs_reinforcement) WHERE needs_reinforcement = true;
```

**API Routes:**
```
GET    /api/adaptive/profile/:userId         Get learner's adaptive profile
GET    /api/adaptive/next/:userId/:trackId   Get next question (difficulty-adjusted)
POST   /api/adaptive/feedback                Update profile based on attempt
GET    /api/adaptive/weak-topics/:userId/:trackId  Get topics needing reinforcement
```

**Adaptive Service Functions:**
```typescript
// api/src/services/adaptive.ts

export async function getNextQuestion(
  userId: string,
  trackId: string
): Promise<Question> {
  // 1. Get learner profile
  // 2. Identify weak topics
  // 3. Fetch question at appropriate difficulty level
  // 4. Prefer weak topics if comprehension < 70%
  // 5. Apply spaced repetition on top of difficulty
}

export async function updateProfile(
  userId: string,
  attempt: Attempt
): Promise<void> {
  // 1. Update topic comprehension
  // 2. Detect if struggling (2 wrong in a row)
  // 3. Adjust preferred difficulty
  // 4. Flag weak topics for reinforcement
}

export async function detectLearningStyle(
  userId: string
): Promise<'visual' | 'verbal' | 'kinesthetic'> {
  // Analyze click patterns, time on explanations, etc.
}
```

**Deliverables:**
- [ ] Adaptive engine service (`api/src/services/adaptive.ts`)
- [ ] Difficulty tagging for all existing questions (migration script)
- [ ] Profile update on every attempt submission
- [ ] Weak topic detection (cron job, runs hourly)
- [ ] Learning style detection (cron job, runs daily)
- [ ] API routes for adaptive selection
- [ ] Update `/api/learn/next` to use adaptive engine
- [ ] E2E test: 3 correct → harder question, 2 wrong → easier question
- [ ] PR merged with [spec] tag

**Feature Flags:**
- `FF_ADAPTIVE_DIFFICULTY_V1=true`: Enable adaptive difficulty
- `FF_LEARNING_STYLE_V1=true`: Enable learning style detection
- `ADAPTIVE_MIN_DIFFICULTY=1`: Minimum difficulty level (1-4)
- `ADAPTIVE_MAX_DIFFICULTY=4`: Maximum difficulty level (1-4)

**Acceptance:**
```bash
# Test: Get adaptive profile
curl http://localhost:8080/api/adaptive/profile/user-123 \
  -H "x-admin-token: TOKEN" | jq
# → { "preferredDifficulty": 2, "preferredStyle": "visual", "avgLatency": 15000, "consistencyScore": 0.85 }

# Test: Get next adaptive question
curl http://localhost:8080/api/adaptive/next/user-123/track-fire-safety \
  -H "x-admin-token: TOKEN" | jq '.difficultyLevel'
# → 3 (increased from 2 after 3 correct answers)

# Test: Identify weak topics
curl http://localhost:8080/api/adaptive/weak-topics/user-123/track-fire-safety \
  -H "x-admin-token: TOKEN" | jq
# → [ { "topic": "fire-safety.extinguishers", "comprehension": 0.55, "needsReinforcement": true } ]

# Verify: Learner gets more questions on weak topic
curl http://localhost:8080/api/learn/next?userId=user-123 | jq '.topic'
# → "fire-safety.extinguishers" (weak topic prioritized)
```

---

### EPIC 10: Enhanced Certification Workflow
**Priority:** P1 (Trust & compliance)
**Effort:** 1 overnight (8-10 hours)
**Goal:** Expert panels certify modules with audit trail

**Scope:**
1. **Certification Model**:
   - Extend `certified_artifacts` with: `reviewer_id`, `reviewed_at`, `signature`, `status`
   - Add `certification_requests` table: `track_id`, `requester_id`, `panel_ids[]`, `status`, `created_at`
   - Add `certification_reviews` table: `request_id`, `reviewer_id`, `status`, `comments`, `reviewed_at`

2. **Certification Workflow**:
   - Manager requests certification for track
   - System notifies panel members (email)
   - Panel member reviews content
   - Panel member approves/rejects with comments
   - System records Ed25519 signature on approval
   - Track marked as "Cerply Certified" when quorum reached

3. **Audit Trail**:
   - Immutable log of all review actions
   - Reviewer identity and timestamp
   - Signature verification API
   - Export audit log as PDF

4. **UI**:
   - `/manager/tracks/[id]/certify` - Request certification
   - `/expert/reviews` - Pending reviews for expert
   - `/expert/reviews/[id]` - Review content, approve/reject
   - Badge: "Cerply Certified by [Expert Name]"

**Deliverables:**
- [ ] Manager can request certification
- [ ] Expert can review and approve/reject
- [ ] Audit trail recorded for all actions
- [ ] Signature verification works
- [ ] E2E test: Request → review → approve → track certified
- [ ] PR merged with [spec] tag

**Acceptance:**
```bash
# Test: Request certification
curl -X POST https://api-stg.cerply.com/api/certified/requests \
  -H "Cookie: cerply.sid=manager-session" \
  -d '{"trackId":"track-1","panelIds":["expert-1","expert-2"]}' → 201

# Test: Expert review
curl -X POST https://api-stg.cerply.com/api/certified/reviews/req-1 \
  -H "Cookie: cerply.sid=expert-session" \
  -d '{"status":"approved","comments":"Looks good"}' → 200

# Test: Verify signature
curl -X POST https://api-stg.cerply.com/api/certified/verify \
  -d '{"artifactId":"artifact-1"}' → {"valid":true,"reviewer":"expert-1"}
```

---

### EPIC 11: Self-Serve Ingestion (Employee Value)
**Priority:** P2 (Nice-to-have for MVP)
**Effort:** 1 overnight (8-10 hours)
**Goal:** Employees upload own artefacts that benefit the team

**Scope:**
1. **Personal Artefacts**:
   - Learner can upload meeting notes, transcripts, project docs
   - System generates learning track from artefact
   - Learner can keep private or share with team
   - Manager can promote to org-wide if valuable

2. **Sharing Model**:
   - Add `artefact_sharing` table: `artefact_id`, `shared_with`, `scope`
   - Scopes: `private`, `team`, `organization`
   - Manager sees shared artefacts in discovery feed

3. **UI**:
   - `/learner/artefacts/upload` - Upload artefact
   - `/learner/artefacts` - My artefacts
   - `/learner/artefacts/[id]/share` - Share with team
   - `/manager/artefacts/shared` - Shared artefacts from team

**Deliverables:**
- [ ] Learner can upload personal artefact
- [ ] Learner can generate track from artefact
- [ ] Learner can share with team
- [ ] Manager can promote to org-wide
- [ ] E2E test: Upload → generate → share → manager sees
- [ ] PR merged with [spec] tag

**Acceptance:**
```bash
# Test: Upload artefact
curl -X POST https://api-stg.cerply.com/api/learner/artefacts \
  -H "Cookie: cerply.sid=learner-session" \
  -F "file=@meeting-notes.txt" → 201

# Test: Share with team
curl -X POST https://api-stg.cerply.com/api/learner/artefacts/art-1/share \
  -d '{"scope":"team"}' → 200
```

---

### EPIC 12: Enterprise Analytics & Reporting
**Priority:** P2 (Value driver)
**Effort:** 1 overnight (8-10 hours)
**Goal:** Business outcomes tracking and compliance reporting

**Scope:**
1. **Analytics Metrics**:
   - Organization-level: total tracks, active learners, completion rate
   - Compliance metrics: certification coverage, audit readiness
   - Engagement metrics: daily active learners, streak counts
   - Business outcomes: time-to-proficiency, knowledge decay prevention

2. **Reporting API**:
   - `GET /api/analytics/organization/[id]/overview` - Org dashboard
   - `GET /api/analytics/organization/[id]/compliance` - Compliance report
   - `GET /api/analytics/organization/[id]/export` - CSV export
   - `GET /api/analytics/tracks/[id]/impact` - Track impact report

3. **Compliance Reports**:
   - "Certification Coverage" - % of critical content certified
   - "Learner Completion" - % of assigned learners current
   - "At-Risk Topics" - Topics with low comprehension
   - PDF export for auditors

4. **Admin UI**:
   - `/admin/analytics` - Organization overview
   - `/admin/analytics/compliance` - Compliance dashboard
   - `/admin/analytics/export` - Export reports

**Deliverables:**
- [ ] Admin sees org-level analytics
- [ ] Admin can export compliance reports
- [ ] Admin sees business outcomes
- [ ] E2E test: Generate activity → view in org analytics
- [ ] PR merged with [spec] tag

**Acceptance:**
```bash
# Test: Org analytics
curl -H "Cookie: cerply.sid=admin-session" \
  https://api-stg.cerply.com/api/analytics/organization/org-1/overview

# Expected: {
#   "activeLearners": 150,
#   "totalTracks": 25,
#   "avgComprehension": 0.87,
#   "certificationCoverage": 0.60
# }

# Test: Export compliance report
curl -H "Cookie: cerply.sid=admin-session" \
  https://api-stg.cerply.com/api/analytics/organization/org-1/export?format=csv \
  → CSV file download
```

---

## 🗓️ Proposed Timeline & Priority

### Phase 1: Foundation (Week 1) - ✅ COMPLETE
**Status:** All foundation epics complete
- ✅ EPIC 1: D2C Removal & Enterprise Foundation (Night 1)
- ✅ EPIC 2: Enterprise SSO & RBAC (Night 2)
- ✅ EPIC 3: Team Management & Learner Assignment (Night 3)

### Phase 2: Core B2B Value (Weeks 2-3) - ✅ COMPLETE
**Status:** Core B2B features complete
- ✅ EPIC 4: Manager Dashboard & Analytics (Night 4)
- ⭕ EPIC 5: Slack Channel Integration (Night 5) - NEXT

### Phase 3: Content Generation Quality (Weeks 4-5)
**Priority:** P0 (Core product quality)
- ⭕ EPIC 6: Ensemble Content Generation (Nights 6-7, 16-20 hours)
  - LLM playback & confirmation loop
  - 3-LLM pipeline (Generator A, Generator B, Fact-Checker)
  - Manager refinement UI
  - Generic vs proprietary content separation

### Phase 4: Learner Engagement (Weeks 6-8)
**Priority:** P1 (Key differentiators)
- ⭕ EPIC 7: Gamification & Certification System (Nights 8-9, 12-16 hours)
  - Levels (Novice → Master)
  - Certificates with Ed25519 signatures
  - Badges (Speed Demon, Perfectionist, Consistent, etc.)
  - Manager notifications
- ⭕ EPIC 8: Conversational Learning Interface (Nights 10-11, 12-16 hours)
  - Natural language chat queries
  - Intent router & explanation engine
  - Free-text answer validation
  - Cmd+K quick actions
- ⭕ EPIC 9: True Adaptive Difficulty Engine (Nights 12-13, 12-16 hours)
  - Dynamic difficulty adjustment (L1-L4)
  - Learning style detection (visual/verbal/kinesthetic)
  - Topic weakness identification
  - Performance signal tracking

### Phase 5: Expert Certification & Admin Tools (Weeks 9-11)
**Priority:** P1 (Trust & compliance)
- ⭕ EPIC 10: Enhanced Certification Workflow (Night 14, 8-10 hours)
  - Expert panel review workflow
  - Ed25519 signature generation
  - Audit trail with immutable logs
  - Certification request UI
- ⭕ EPIC 11: Self-Serve Ingestion (Night 15, 8-10 hours) - Optional
  - Learner upload own artefacts
  - Share with team (private/team/org scopes)
  - Manager promotion to org-wide
- ⭕ EPIC 12: Enterprise Analytics & Reporting (Night 16, 8-10 hours) - Optional
  - Org-level compliance reports
  - Business outcomes tracking
  - CSV/PDF export for auditors

### Total Effort Summary
- **Phase 1 (Foundation):** ✅ 24-30 hours (3 overnights) - COMPLETE
- **Phase 2 (Core B2B):** ✅ 6-8 hours + current work - MOSTLY COMPLETE
- **Phase 3 (Content Quality):** 16-20 hours (2 overnights)
- **Phase 4 (Engagement):** 36-48 hours (4.5 overnights)
- **Phase 5 (Certification & Admin):** 24-30 hours (3 overnights)
- **TOTAL:** ~106-136 hours (13-17 overnights)

---

## 🧪 Testing Strategy

Each epic must include:
1. **Unit tests** for new API endpoints
2. **Integration tests** for workflows
3. **E2E tests** for user journeys
4. **Smoke tests** for critical paths
5. **PR acceptance**: All tests pass, linting clean, spec updated

**E2E Test Scenarios (Required):**
- [ ] **Phase 1-2:** Manager login → create team → assign learners → assign track
- [ ] **Phase 2:** Learner receives lesson via Slack → responds → score recorded
- [ ] **Phase 2:** Manager views dashboard → sees team comprehension → identifies at-risk learner
- [ ] **Phase 3:** Manager uploads artefact → LLM plays back understanding → confirms → 3-LLM ensemble generates → approves
- [ ] **Phase 4:** Learner completes track → levels up → earns certificate → manager notified
- [ ] **Phase 4:** Learner asks "How am I doing?" in chat → receives progress summary
- [ ] **Phase 4:** Learner gets 3 correct answers → receives harder question (adaptive difficulty)
- [ ] **Phase 5:** Expert reviews track → approves → track certified with signature
- [ ] **Phase 5:** Admin exports compliance report → CSV/PDF generated

---

## 📝 Documentation Updates

Each epic must update:
- [ ] `docs/functional-spec.md` - Add route definitions, tick status
- [ ] `docs/spec/api-routes.json` - Add new endpoints
- [ ] `docs/spec/use-cases.md` - Add use case with acceptance criteria
- [ ] `README.md` - Update quickstart for B2B flows
- [ ] PR description with curl examples

---

## 🎯 Definition of Done (Per Epic)

- [ ] All code changes merged to main
- [ ] All tests passing (unit, integration, E2E)
- [ ] Staging deployment verified
- [ ] Docs updated with [spec] tag in commit
- [ ] Smoke tests pass on staging
- [ ] PR reviewed and approved
- [ ] No blocking linter errors
- [ ] UAT sign-off from product owner

---

## 🔄 Continuous Improvement

After each epic:
1. **Retrospective**: What went well? What could improve?
2. **Metrics**: Test coverage, build time, deployment time
3. **Debt**: Identify tech debt for future sprints
4. **Iteration**: Adjust priorities based on learnings

---

## 📞 Stakeholder Communication

**Weekly Check-ins:**
- **Monday**: Epic kickoff, clarify acceptance criteria
- **Wednesday**: Mid-sprint check, unblock issues
- **Friday**: Demo completed work, plan next sprint

**Escalation:**
- Blocking issues: Slack @product-owner immediately
- Scope changes: Async Slack discussion → sync call if needed
- UAT failures: Fix or roll back, document learnings

---

## ✅ MVP Launch Readiness Checklist

Before declaring MVP "launch-ready":
- [ ] All Phase 1 & 2 epics complete
- [ ] Demo walkthrough recorded
- [ ] Customer onboarding docs written
- [ ] Support runbook created
- [ ] Monitoring & alerts configured
- [ ] Security review complete
- [ ] Performance benchmarks meet targets
- [ ] Compliance requirements met (SOC 2 roadmap)

---

**Next Steps:**
1. ✅ Review & approve this roadmap
2. ✅ Confirm priorities (adjust if needed)
3. ✅ Start EPIC 1: D2C Removal & Enterprise Foundation

**Questions or adjustments needed? Let me know!** 🚀

