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

### EPIC 5: Channel Integrations (Learner Delivery)
**Priority:** P1 (Key differentiator)
**Effort:** 1 overnight (8-10 hours)
**Goal:** Learners receive lessons via Teams, Slack, WhatsApp

**Scope:**
1. **Channel Framework**:
   - Add `channels` table: `organization_id`, `type`, `config`, `enabled`
   - Add `user_channels` table: `user_id`, `channel_type`, `channel_id`, `preferences`
   - Support types: `teams`, `slack`, `whatsapp`, `email` (fallback)

2. **Integration Adapters**:
   - **WhatsApp** (via Twilio/WhatsApp Business API):
     - Send lesson as message
     - Receive response as message
     - Parse natural language response
   - **Slack** (via Slack App):
     - Send lesson as DM with interactive buttons
     - Receive button click or text response
   - **Teams** (via Bot Framework):
     - Send lesson as adaptive card
     - Receive adaptive card submit or chat message

3. **Delivery Engine**:
   - `POST /api/delivery/send` - Send lesson to user via preferred channel
   - `POST /api/delivery/webhook/[channel]` - Receive responses from channels
   - Fallback to email if channel fails
   - Rate limiting per channel (respect API limits)

4. **Learner Preferences**:
   - Learner can set preferred channel
   - Learner can set quiet hours
   - Learner can pause/resume

**Deliverables:**
- [ ] WhatsApp integration (send/receive)
- [ ] Slack integration (send/receive)
- [ ] Teams integration (send/receive)
- [ ] Learner can set channel preferences
- [ ] E2E test: Send lesson via WhatsApp → receive response → record score
- [ ] PR merged with [spec] tag

**Acceptance:**
```bash
# Test: Send via WhatsApp
curl -X POST https://api-stg.cerply.com/api/delivery/send \
  -H "Cookie: cerply.sid=admin-session" \
  -d '{"userId":"user-1","channel":"whatsapp","lessonId":"lesson-1"}' → 200

# Test: Webhook receives response
curl -X POST https://api-stg.cerply.com/api/delivery/webhook/whatsapp \
  -d '{"from":"+1234567890","body":"Option A"}' → 200

# Verify: User score recorded
curl https://api-stg.cerply.com/api/manager/users/user-1/progress → shows attempt
```

---

### EPIC 6: Enhanced Certification Workflow
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

### EPIC 7: Self-Serve Ingestion (Employee Value)
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

### EPIC 8: Enterprise Analytics & Reporting
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

### Phase 1: Foundation (Week 1)
**Must-Have for Demo:**
- ✅ EPIC 1: D2C Removal & Enterprise Foundation (Night 1)
- ✅ EPIC 2: Enterprise SSO & RBAC (Night 2)
- ✅ EPIC 3: Team Management & Learner Assignment (Night 3)

### Phase 2: Core B2B Value (Week 2)
**Must-Have for Pilot:**
- ✅ EPIC 4: Manager Dashboard (Night 4)
- ✅ EPIC 5: Channel Integrations (Night 5)
- ✅ EPIC 6: Enhanced Certification (Night 6)

### Phase 3: Polish & Scale (Week 3)
**Nice-to-Have for Launch:**
- ⭕ EPIC 7: Self-Serve Ingestion (Night 7) - Optional
- ⭕ EPIC 8: Enterprise Analytics (Night 8) - Optional

---

## 🧪 Testing Strategy

Each epic must include:
1. **Unit tests** for new API endpoints
2. **Integration tests** for workflows
3. **E2E tests** for user journeys
4. **Smoke tests** for critical paths
5. **PR acceptance**: All tests pass, linting clean, spec updated

**E2E Test Scenarios (Required):**
- [ ] Manager login → create team → assign learners → assign track
- [ ] Learner receives lesson via WhatsApp → responds → score recorded
- [ ] Manager views dashboard → sees team comprehension → identifies at-risk learner
- [ ] Expert reviews track → approves → track certified
- [ ] Admin exports compliance report → PDF generated

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

