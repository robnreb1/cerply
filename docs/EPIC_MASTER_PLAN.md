# Epic Master Plan - Cerply B2B Enterprise MVP
**Version:** 1.2  
**Status:** LOCKED (Changes require explicit approval)  
**Last Updated:** 2025-10-13  
**Owner:** Cerply Engineering

---

## Purpose

This document is the **single source of truth** for all epic planning, scope, status, and dependencies across the Cerply B2B Enterprise MVP. All implementation prompts MUST reference this document and adhere to the locked scope defined herein.

**Traceability:**
- **BRD:** docs/brd/cerply-brd.md (Business requirements)
- **FSD:** docs/functional-spec.md (Technical specifications)
- **Roadmap:** docs/MVP_B2B_ROADMAP.md (Detailed epic descriptions)
- **ADR:** docs/ARCHITECTURE_DECISIONS.md (Immutable principles)

---

## Epic Status Matrix

| Epic | Priority | Status | BRD Requirements | FSD Section | Implementation Prompt | Estimated Hours |
|------|----------|--------|------------------|-------------|----------------------|----------------|
| **0** | P0 | ✅ Complete | Implicit (all) | §8, §21 | N/A (completed) | 20h |
| **1** | P0 | ✅ Complete | Foundation | §1 | N/A (completed) | 8-10h |
| **2** | P0 | ✅ Complete | AU-1, L-3 | §2 | N/A (completed) | 8-10h |
| **3** | P0 | ✅ Complete | B-1, B-4 | §3 | N/A (completed) | 12-14h |
| **4** | P1 | ✅ Complete | B-2, B-14 | §4 | N/A (completed) | 14-16h |
| **5** | P1 | ✅ Complete | AU-1, L-17, B-7 | §25 | EPIC5_IMPLEMENTATION_PROMPT.md | 12h |
| **6** | P1 | 🚧 In Progress | B-3, E-14 | §26 | EPIC6_IMPLEMENTATION_PROMPT.md | 16h |
| **6.5** | P1 | 🚧 In Progress | B-3.1 | §27 | (Part of Epic 6) | Included |
| **6.6** | P1 | 📋 Planned | B-3 (scaling) | TBD | TBD | 10h |
| **6.7** | P1 | 📋 Planned | L-11, B-3 | TBD | TBD | 8h |
| **6.8** | P1 | 📋 Planned | B-3, B-12 | §32 | EPIC6.8_IMPLEMENTATION_PROMPT.md | 20-24h |
| **7** | P1 | ✅ Complete | L-16, B-15 | §28 | EPIC7_IMPLEMENTATION_PROMPT.md | 18h |
| **8** | P1 | ⚠️ Phase 4 Complete | L-12, L-18 | §29 | EPIC8_IMPLEMENTATION_PROMPT.md | 15h (Phases 1-4: 11.5h done, Phases 7-8: 2h remaining) |
| **9** | P1 | 📋 Planned | L-2 | §30 | EPIC9_IMPLEMENTATION_PROMPT.md | 13h |
| **10** | P1 | 📋 Planned | E-1, E-14 | TBD | TBD | 10h |
| **11** | P2 | 📋 Planned | B-6 | TBD | TBD | 16h |
| **12** | P2 | 📋 Planned | B-5, B-14 | TBD | TBD | 20h |

**Legend:**
- ✅ Complete: Deployed to production
- ⚠️ Phase 1 Complete: Infrastructure complete, additional phases planned
- 🚧 In Progress: Active development
- 📋 Planned: Scope locked, awaiting implementation

---

## Implementation Order (LOCKED)

### Phase 1: Foundation (Complete)
1. ✅ **Epic 1:** D2C Removal & Enterprise Foundation
2. ✅ **Epic 2:** Enterprise SSO & RBAC
3. ✅ **Epic 3:** Team Management & CSV Import
4. ✅ **Epic 4:** Manager Analytics Dashboard

### Phase 2: Channel & Content (Partially Complete)
5. ✅ **Epic 5:** Slack Channel Integration
6. 🚧 **Epic 6:** Ensemble Content Generation (3-LLM pipeline)
7. 🚧 **Epic 6.5:** Research-Driven Content Generation

### Phase 3: Engagement & Retention (Partially Complete)
8. ✅ **Epic 7:** Gamification & Certification System

### Phase 4: Conversational & Adaptive (Planned)
9. 📋 **Epic 8:** Conversational Learning Interface
10. 📋 **Epic 9:** True Adaptive Difficulty Engine

### Phase 5: Content Operations (Planned)
11. 📋 **Epic 6.6:** Content Library Seeding (100 topics)
12. 📋 **Epic 6.7:** Content Lifecycle Management
13. 📋 **Epic 6.8:** Manager Curation Workflow

### Phase 6: Certification & Compliance (Planned)
14. 📋 **Epic 10:** Enhanced Certification Workflow

### Phase 7: Platform Integration (Future)
15. 📋 **Epic 11:** Self-Serve Ingestion
16. 📋 **Epic 12:** Enterprise Analytics & Reporting

---

## Epic Dependency Graph

```
Platform Foundation Layer (NEW)
└─ Epic 0: Platform Foundations v1
    └─ Provides: Canon storage, Quality floor, Cost tracking, M3 API, Adaptive foundation
    └─ Used by: Epic 6 (canon), Epic 8 (interaction), Epic 9 (quality metrics)

Foundation Layer
├─ Epic 1: D2C Removal
└─ Epic 2: SSO & RBAC
    └─ Epic 3: Team Management
        └─ Epic 4: Manager Analytics

Channel & Content Layer
├─ Epic 5: Slack Integration
└─ Epic 6: Ensemble Generation (uses Epic 0 canon)
    ├─ Epic 6.5: Research Mode
    ├─ Epic 6.6: Content Library Seeding (requires 6 + 6.5)
    ├─ Epic 6.7: Content Lifecycle (requires 6 + Epic 0 canon)
    └─ Epic 6.8: Manager Curation Workflow (requires 6 + 8)

Engagement Layer
└─ Epic 7: Gamification
    ├─ Epic 8: Conversational UI (requires 7 for progress queries + Epic 0 for adaptive)
    │   └─ Epic 9: Adaptive Difficulty (requires 8 for confusion + Epic 0 for quality)
    └─ Epic 10: Enhanced Certification (requires 7 for signatures)

Platform Layer
├─ Epic 11: Self-Serve Ingestion (requires 6)
└─ Epic 12: Enterprise Analytics (requires 4 + 7 + 9)
```

**Rule:** Never implement an epic before its prerequisites are complete.

---

## Detailed Epic Specifications

### Epic 0: Platform Foundations v1

**Status:** ✅ Complete  
**Priority:** P0 (Foundation for all epics)  
**Effort:** 20 hours

**BRD Traceability:**
- Implicit: Quality-first, cost-aware, adaptive-by-default principles support ALL BRD requirements

**FSD Traceability:**
- §8: Platform Foundations v1 (Quality-First Pipeline, Cost Orchestration, CI Guardrails)
- §21: M3 API Surface (/api/preview, /api/generate, /api/score, /api/daily/next)

**Scope (LOCKED):**
1. Canon Store (in-memory LRU cache with quality filtering, SHA256 integrity)
2. Quality Floor (heuristic scoring with 0.80 threshold, rigor mode retry)
3. Cost Graph (fresh vs reuse tracking, 70% cost savings target)
4. M3 API Surface (preview, generate, score, daily/next, ops/usage endpoints)
5. Observability headers (x-canon, x-quality, x-cost, x-adapt)
6. Adaptive signals (difficulty, latency, confusion tracking foundation)
7. `{data, meta}` envelope structure (provenance, quality scores, model info)

**Deliverables:**
- [x] Canon service (`api/src/lib/canon.ts`) with LRU cache (1000 entries)
- [x] Quality evaluation (`api/src/lib/quality.ts`) with 4 metrics
- [x] Cost tracking (`api/src/lib/costGraph.ts`) with fresh/reuse ratio
- [x] Adaptive foundation (`api/src/lib/profileAdapt.ts`) with performance signals
- [x] M3 API routes (`api/src/routes/m3.ts`) with 5 endpoints
- [x] Observability headers on all responses
- [x] Platform documentation (5 docs in `docs/platform/`)

**Feature Flags:**
- `CANON_ENABLED=false` (infrastructure toggle)
- `COST_GRAPH_ENABLED=false` (cost tracking toggle)
- `QUALITY_THRESHOLD=0.80` (minimum quality score)

**Dependencies:**
- None (foundation layer)

**Dependents:**
- Epic 6: Uses canon storage for content reuse
- Epic 8: Uses adaptive signals and interaction patterns
- Epic 9: Uses quality metrics and learner state tracking

**Acceptance:**
```bash
# Canon reuse works
curl -X POST http://localhost:8080/api/generate \
  -H 'content-type: application/json' \
  -d '{"modules":[{"title":"test"}]}'
# → { "modules":[...], "metadata":{"source":"canon","canonized":true} }

# Quality floor enforced
# → All content has quality_score ≥ 0.80

# Observability headers present
# → x-canon, x-quality, x-cost, x-adapt in all responses
```

---

### Epic 1: D2C Removal & Enterprise Foundation

**Status:** ✅ Complete  
**Priority:** P0 (Blocker)  
**Effort:** 8-10 hours

**BRD Traceability:**
- Foundation for B2B pivot (all requirements depend on this)

**FSD Traceability:**
- §1: Platform structure

**Scope (LOCKED):**
1. Remove consumer chat interface (`/` → `/login`)
2. Remove self-serve signup flows
3. Update web-marketing to B2B messaging
4. Add `/unauthorized` page
5. Require auth for all app routes

**Deliverables:**
- [ ] D2C routes removed/hidden
- [ ] Marketing site updated
- [ ] Auth middleware enforced

**Acceptance:**
```bash
curl -I https://app.cerply.com/ | grep "Location: /login"
```

---

### Epic 2: Enterprise SSO & RBAC

**Status:** ✅ Complete  
**Priority:** P0 (Foundation)  
**Effort:** 8-10 hours

**BRD Traceability:**
- AU-1: Enterprise access control
- L-3: SSO-required for learner progress

**FSD Traceability:**
- §2: Enterprise SSO & RBAC

**Scope (LOCKED):**
1. SAML 2.0 integration
2. OIDC/OAuth2 (Google Workspace)
3. RBAC system (admin/manager/learner)
4. Organization model
5. Session management

**Deliverables:**
- [ ] SAML/OIDC working
- [ ] 3 roles defined
- [ ] RBAC middleware (`requireLearner`, `requireManager`)

**Acceptance:**
```bash
curl /api/manager/dashboard # → 403 if not manager
```

---

### Epic 3: Team Management & CSV Import

**Status:** ✅ Complete  
**Priority:** P0 (Foundation)  
**Effort:** 12-14 hours

**BRD Traceability:**
- B-1: Create teams and assign topics
- B-4: Schedule training cadences

**FSD Traceability:**
- §3: Team Management

**Scope (LOCKED):**
1. Teams table and relationships
2. Learner assignment to teams
3. CSV import for bulk learner addition
4. Manager UI for team management

**Deliverables:**
- [ ] Teams created
- [ ] Learners assigned
- [ ] CSV import working

**Acceptance:**
```bash
curl -X POST /api/teams/import -d @learners.csv
# → { imported: 50, errors: [] }
```

---

### Epic 4: Manager Analytics Dashboard

**Status:** ✅ Complete  
**Priority:** P1 (Core business value)  
**Effort:** 14-16 hours

**BRD Traceability:**
- B-2: Track team progress and risk metrics
- B-14: Comprehension, retention, and risk rollups

**FSD Traceability:**
- §4: Manager Analytics Dashboard

**Scope (LOCKED):**
1. 7 analytics endpoints (retention curves, at-risk learners, etc.)
2. Manager dashboard UI with charts
3. Background cron jobs for analytics computation
4. Caching for performance

**Deliverables:**
- [ ] 7 analytics routes
- [ ] Manager dashboard UI
- [ ] Cron jobs running

**Acceptance:**
```bash
curl /api/analytics/retention-curve?teamId=X
# → { curve: [...], avgRetentionRate: 0.75 }
```

---

### Epic 5: Slack Channel Integration

**Status:** ✅ Complete  
**Priority:** P1 (Channel delivery)  
**Effort:** 12 hours

**BRD Traceability:**
- AU-1: Multi-channel delivery (Slack for MVP)
- L-17: Channel preferences and quiet hours
- B-7: Slack OAuth 2.0 with interactive Block Kit

**FSD Traceability:**
- §25: Slack Channel Integration

**Implementation Prompt:** `EPIC5_IMPLEMENTATION_PROMPT.md`

**Scope (LOCKED):**
1. Slack OAuth 2.0 flow
2. Interactive Block Kit messages
3. Webhook signature verification
4. User channel preferences
5. Quiet hours support

**Deliverables:**
- [ ] OAuth flow complete
- [ ] Block Kit messages working
- [ ] Preferences stored
- [ ] Quiet hours enforced

**Feature Flags:**
- `FF_CHANNEL_SLACK=true`

**Acceptance:**
```bash
# User connects Slack
POST /api/channels/slack/connect → { success: true }

# Slack message delivered
POST /api/channels/slack/webhook → 200 OK
```

---

### Epic 6: Ensemble Content Generation

**Status:** 🚧 In Progress  
**Priority:** P1 (Content quality)  
**Effort:** 16 hours

**BRD Traceability:**
- B-3: 3-LLM ensemble generation (Generator A, Generator B, Fact-Checker)
- E-14: Provenance tracking for certification

**FSD Traceability:**
- §26: Ensemble Content Generation

**Implementation Prompt:** `EPIC6_IMPLEMENTATION_PROMPT.md`

**Scope (LOCKED):**
1. Understanding phase (manager playback + iterative refinement)
2. 3-LLM pipeline (Generator A, Generator B, Fact-Checker)
3. Provenance tracking (which LLM contributed what)
4. Canon storage for generic content reuse
5. Manager review UI with regeneration

**Deliverables:**
- [ ] Understanding phase working
- [ ] 3-LLM pipeline implemented
- [ ] Provenance tracked
- [ ] Canon storage integrated
- [ ] Manager review UI

**Feature Flags:**
- `FF_ENSEMBLE_GENERATION_V1=true`
- `FF_CONTENT_CANON_V1=true`

**Acceptance:**
```bash
POST /api/content/generate
# → { modules: [...], provenance: { generatorA: [...], generatorB: [...], factChecker: [...] } }
```

---

### Epic 6.5: Research-Driven Content Generation

**Status:** 🚧 In Progress  
**Priority:** P1 (Content scaling)  
**Effort:** Included in Epic 6

**BRD Traceability:**
- B-3.1: Topic-based research mode ("Teach me complex numbers")

**FSD Traceability:**
- §27: Research-Driven Content Generation

**Scope (LOCKED):**
1. Auto-detect topic vs source input
2. Specialized LLM prompts for research
3. Citation tracking from credible sources
4. Ethical flagging (bias detection)
5. Confidence scores per module

**Deliverables:**
- [ ] Topic detection working
- [ ] Research prompts implemented
- [ ] Citations tracked
- [ ] Ethical flags applied

**Feature Flags:**
- (Uses `FF_ENSEMBLE_GENERATION_V1`)

**Acceptance:**
```bash
POST /api/content/generate -d '{"topic":"Explain async/await"}'
# → { modules: [...], citations: [...], confidence: 0.92 }
```

---

### Epic 6.6: Content Library Seeding

**Status:** 📋 Planned  
**Priority:** P1 (Day 1 content)  
**Effort:** 10 hours

**BRD Traceability:**
- B-3: Content scaling for MVP launch

**FSD Traceability:**
- TBD (will be added upon implementation)

**Scope (LOCKED):**
1. CSV topic input system (100 topics: soft skills + financial services)
2. Batch generation queue (Epic 6 + Epic 6.5 orchestration)
3. Progress tracking dashboard
4. Canon storage integration
5. Ongoing automated seeding (not one-time)

**Deliverables:**
- [ ] CSV upload working
- [ ] Batch queue implemented
- [ ] Progress dashboard
- [ ] 100 topics generated
- [ ] Canon storage populated

**Feature Flags:**
- `FF_BATCH_GENERATION_V1=true`

**Dependencies:**
- Requires Epic 6 (ensemble)
- Requires Epic 6.5 (research mode)

**Acceptance:**
```bash
POST /api/content/seed -d @topics.csv
# → { jobId: "...", status: "queued", totalTopics: 100 }
```

---

### Epic 6.7: Content Lifecycle Management

**Status:** 📋 Planned  
**Priority:** P1 (Content freshness)  
**Effort:** 8 hours

**BRD Traceability:**
- L-11: Refresh knowledge indefinitely while topic active

**FSD Traceability:**
- TBD (will be added upon implementation)

**Scope (LOCKED):**
1. "Zoom Out, Zoom In" comprehensive generation
2. Content freshness tracking
3. Revalidation cron jobs
4. Deprecation workflows

**Deliverables:**
- [ ] Zoom Out/Zoom In working
- [ ] Freshness scores tracked
- [ ] Revalidation jobs running

**Feature Flags:**
- `FF_CONTENT_LIFECYCLE_V1=true`

**Dependencies:**
- Requires Epic 6 (canon storage)

**Acceptance:**
```bash
GET /api/content/freshness/:topicId
# → { freshness: 0.85, lastUpdated: "2025-10-01", needsRevalidation: false }
```

---

### Epic 6.8: Manager Curation Workflow

**Status:** 📋 Planned  
**Priority:** P1 (Content curation)  
**Effort:** 20-24 hours

**BRD Traceability:**
- B-3: Businesses customize content for internal policies (manager-centric curation)
- B-12: Managers configure content approval workflows

**FSD Traceability:**
- §32: Manager Curation Workflow (to be added)

**Implementation Prompt:** `EPIC6.8_IMPLEMENTATION_PROMPT.md`

**Scope (LOCKED):**
1. **Content Identification UI**
   - Manager inputs: URL, prompt, or file upload
   - Cerply decides if it's topic-level or module-level
   - URL scraping and structure analysis
   - Upload handling (defaults to proprietary standalone module)

2. **Secondary Content Collection**
   - Manager adds contextual links/docs (company-specific)
   - Stored separately in `topic_secondary_sources` table
   - Metadata stored, used in LLM prompts, content stays private

3. **3-LLM Generation** (integrates with Epic 6)
   - Generate full topic (4-6 modules)
   - Pull canonical content from canon if exists
   - Blend with proprietary secondary sources

4. **Manager Review & Sign-Off**
   - Review all modules with inline editing
   - Approve topic OR individual modules
   - Determine certification readiness

5. **Assignment & Communication**
   - Select team members
   - Set mandatory/recommended + deadline
   - Cerply generates draft communication (LLM-powered)
   - Manager reviews/edits
   - Select delivery channels (App, Email, Slack)
   - Send with one click

**Deliverables:**
- [ ] Content identification UI (URL/upload/prompt)
- [ ] Secondary content collection working
- [ ] Integration with Epic 6 ensemble generation
- [ ] Manager review UI with inline editing
- [ ] Assignment workflow with communication generation
- [ ] Multi-channel delivery (App, Email, Slack)

**Database Tables:**
- `topic_secondary_sources` - Company-specific contextual content
- `topic_communications` - Assignment communications tracking

**Feature Flags:**
- `FF_MANAGER_CURATION_V1=true`

**Dependencies:**
- Requires Epic 6 (ensemble generation)
- Requires Epic 8 (conversational interface for learners)

**Acceptance:**
```bash
# Content identification
POST /api/manager/content/identify -d '{"url":"https://..."}' 
# → { scope: "topic", suggestedSubject: "Computer Science", modules: [...] }

# Secondary sources
POST /api/manager/content/:topicId/sources -d '{"type":"upload", "file":"..."}' 
# → { sourceId: "...", stored: true }

# Generate with context
POST /api/manager/content/:topicId/generate
# → { jobId: "...", status: "generating", modules: 6 }

# Assign with communication
POST /api/manager/content/:topicId/assign -d '{"teamId":"...", "message":"..."}' 
# → { assignmentId: "...", communicationSent: true }
```

---

### Epic 7: Gamification & Certification System

**Status:** ✅ Complete  
**Priority:** P1 (Engagement & retention)  
**Effort:** 18 hours

**BRD Traceability:**
- L-16: 5 levels, PDF certificates, badges, level-up notifications
- B-15: Manager notifications (immediate, daily, weekly digests)

**FSD Traceability:**
- §28: Gamification & Certification System

**Implementation Prompt:** `EPIC7_IMPLEMENTATION_PROMPT.md`

**Scope (LOCKED):**
1. 5 learner levels (Novice → Master)
2. PDF certificate generation with Ed25519 signatures
3. 5 achievement badges
4. Manager email notifications (immediate + digests)
5. Notification center UI
6. Conversational progress queries

**Deliverables:**
- [ ] Levels implemented
- [ ] Certificates generated
- [ ] Badges unlocked
- [ ] Manager notifications sent
- [ ] Notification center UI

**Feature Flags:**
- `FF_GAMIFICATION_V1=true`
- `FF_CERTIFICATES_V1=true`
- `FF_MANAGER_NOTIFICATIONS_V1=true`

**Acceptance:**
```bash
# Level up
POST /api/gamification/level-up → { newLevel: "Practitioner" }

# Certificate generated
GET /api/certificates/:id → PDF download
```

---

### Epic 8: Conversational Learning Interface

**Status:** ⚠️ Phase 4 Complete (2h remaining)  
**Priority:** P1 (UX differentiator)  
**Effort:** 15 hours (11.5h done, 2h remaining)

**BRD Traceability:**
- L-12: Conversational interface with natural language queries
- L-18: Free-text answers with NLP validation

**FSD Traceability:**
- §29: Conversational Learning Interface

**Implementation Prompts:**
- `EPIC8_IMPLEMENTATION_PROMPT.md`  
- `EPIC8_PHASE2_DELIVERY.md`
- `EPIC8_PHASE3-4_DELIVERY.md`

**Scope (LOCKED):**
1. ✅ Chat panel with Cmd+K shortcut (Phase 1)
2. ✅ Intent router (progress/next/explanation/filter/help) (Phase 1)
3. ✅ LLM-powered explanations with caching (Phase 2) **COMPLETE 2025-10-13**
4. ✅ Free-text answer validation (fuzzy matching + LLM) (Phase 3) **COMPLETE 2025-10-13**
5. ✅ Confusion tracking for adaptive difficulty (Phase 2) **COMPLETE 2025-10-13**
6. ✅ Partial credit scoring in gamification (Phase 4) **COMPLETE 2025-10-13**

**Deliverables:**
- [x] Chat panel implemented (Phase 1)
- [x] Intent router working (Phase 1)
- [x] Explanations generated (Phase 2) **COMPLETE 2025-10-13**
- [x] Free-text validation working (Phase 3) **COMPLETE 2025-10-13**
- [x] Confusion logged (Phase 2) **COMPLETE 2025-10-13**
- [x] Partial credit scoring (Phase 4) **COMPLETE 2025-10-13**

**Feature Flags:**
- `FF_CONVERSATIONAL_UI_V1=true`
- `FF_FREE_TEXT_ANSWERS_V1=true`

**Dependencies:**
- Requires Epic 7 (gamification.ts for progress queries)

**Acceptance:**
```bash
POST /api/chat/message -d '{"message":"How am I doing?"}'
# → { response: "You're at Practitioner level...", intent: "progress" }
```

---

### Epic 9: True Adaptive Difficulty Engine

**Status:** 📋 Planned  
**Priority:** P1 (Core learning science)  
**Effort:** 13 hours

**BRD Traceability:**
- L-2: Adaptive lesson plans with dynamic difficulty adjustment (4 levels: Recall, Application, Analysis, Synthesis)

**FSD Traceability:**
- §30: True Adaptive Difficulty Engine

**Implementation Prompt:** `EPIC9_IMPLEMENTATION_PROMPT.md`

**Scope (LOCKED):**
1. 4 difficulty levels (Bloom's Taxonomy)
2. 5 performance signals (correctness, latency, confusion, attempts, spaced recall)
3. Adaptive algorithm (3 correct → increase, 2 wrong → decrease)
4. Learning style detection (visual/verbal/kinesthetic)
5. Topic weakness detection (comprehension < 70%)

**Deliverables:**
- [ ] Difficulty levels tagged
- [ ] Adaptive algorithm implemented
- [ ] Weak topics detected
- [ ] Learning styles detected
- [ ] Manager adaptive insights

**Feature Flags:**
- `FF_ADAPTIVE_DIFFICULTY_V1=true`
- `FF_LEARNING_STYLE_V1=true`

**Dependencies:**
- Requires Epic 8 (confusion_log for adaptive signals)

**Acceptance:**
```bash
GET /api/adaptive/profile/:userId
# → { preferredDifficulty: 3, preferredStyle: "visual" }

# Verify difficulty increases after 3 correct
POST /api/learn/submit × 3 (all correct)
GET /api/learn/next → { difficultyLevel: 3 }
```

---

### Epic 10: Enhanced Certification Workflow

**Status:** 📋 Planned  
**Priority:** P1 (Trust & compliance)  
**Effort:** 10 hours

**BRD Traceability:**
- E-1: Experts create and ratify Certified content
- E-14: Provenance review and Ed25519 signatures

**FSD Traceability:**
- TBD (will be added upon implementation)

**Scope (LOCKED):**
1. Certification request workflow
2. Expert panel review UI
3. Audit trail (immutable log)
4. Ed25519 signature on approval
5. Quorum-based approval

**Deliverables:**
- [ ] Request certification working
- [ ] Expert review UI
- [ ] Audit trail recorded
- [ ] Signatures generated
- [ ] Quorum logic implemented

**Feature Flags:**
- `FF_CERTIFICATION_WORKFLOW_V1=true`

**Dependencies:**
- Requires Epic 7 (certificate signatures)

**Acceptance:**
```bash
POST /api/certification/request -d '{"trackId":"..."}'
# → { requestId: "...", status: "pending" }

GET /api/certification/audit/:requestId
# → { reviews: [...], signatures: [...] }
```

---

### Epic 11: Self-Serve Ingestion

**Status:** 📋 Planned  
**Priority:** P2 (Self-service)  
**Effort:** 16 hours

**BRD Traceability:**
- B-6: Integrate with HR and LMS systems

**FSD Traceability:**
- TBD (will be added upon implementation)

**Scope (LOCKED):**
1. URL import connector
2. File upload connector (PDF, DOCX)
3. Transcript import connector
4. Automatic content generation pipeline

**Deliverables:**
- [ ] URL import working
- [ ] File upload working
- [ ] Transcript import working
- [ ] Auto-generation pipeline

**Feature Flags:**
- `FF_CONNECTORS_BASIC_V1=true`

**Dependencies:**
- Requires Epic 6 (ensemble generation)

---

### Epic 12: Enterprise Analytics & Reporting

**Status:** 📋 Planned  
**Priority:** P2 (Advanced analytics)  
**Effort:** 20 hours

**BRD Traceability:**
- B-5: Export reports for compliance audits
- B-14: Advanced team and individual analytics

**FSD Traceability:**
- TBD (will be added upon implementation)

**Scope (LOCKED):**
1. Advanced analytics endpoints
2. Custom report builder
3. PDF export for compliance
4. Data warehouse integration

**Deliverables:**
- [ ] Advanced analytics routes
- [ ] Report builder UI
- [ ] PDF export working

**Feature Flags:**
- `FF_ADVANCED_ANALYTICS_V1=true`

**Dependencies:**
- Requires Epic 4 (manager analytics)
- Requires Epic 7 (gamification data)
- Requires Epic 9 (adaptive data)

---

## Traceability Matrix

### BRD to Epic Mapping

| BRD Requirement | Description | Epic(s) | Status |
|----------------|-------------|---------|--------|
| AU-1 | Multi-channel delivery | 2, 5 | Complete |
| AU-2 | Core learning flows | 1-4 | Complete |
| L-2 | Adaptive lesson plans | 9 | Planned |
| L-3 | SSO-required | 2 | Complete |
| L-12 | Conversational interface | 8 | Planned |
| L-16 | Levels, certificates, badges | 7 | Complete |
| L-17 | Channel preferences | 5 | Complete |
| L-18 | Free-text answers | 8 | Planned |
| B-1 | Create teams | 3 | Complete |
| B-2 | Track team progress | 4 | Complete |
| B-3 | 3-LLM ensemble | 6, 6.5 | In Progress |
| B-7 | Slack integration | 5 | Complete |
| B-14 | Comprehension rollups | 4 | Complete |
| B-15 | Manager notifications | 7 | Complete |
| E-1 | Expert certification | 10 | Planned |
| E-14 | Provenance review | 6, 10 | In Progress |

### FSD to Epic Mapping

| FSD Section | Title | Epic | Status |
|------------|-------|------|--------|
| §1 | Platform Structure | 1 | Complete |
| §2 | Enterprise SSO & RBAC | 2 | Complete |
| §3 | Team Management | 3 | Complete |
| §4 | Manager Analytics | 4 | Complete |
| §25 | Slack Integration | 5 | Complete |
| §26 | Ensemble Generation | 6 | In Progress |
| §27 | Research Mode | 6.5 | In Progress |
| §28 | Gamification | 7 | Complete |
| §29 | Conversational UI | 8 | Planned |
| §30 | Adaptive Difficulty | 9 | Planned |

---

## Feature Flag Registry

### User-Facing Feature Flags

| Feature Flag | Epic | Default | Status | Description |
|-------------|------|---------|--------|-------------|
| `FF_CHANNEL_SLACK` | 5 | false | Complete | Enable Slack channel integration |
| `FF_ENSEMBLE_GENERATION_V1` | 6 | false | In Progress | Enable 3-LLM ensemble generation |
| `FF_CONTENT_CANON_V1` | 6/0 | false | Complete | Enable canon storage (shared with Platform v1) |
| `FF_GAMIFICATION_V1` | 7 | false | Complete | Enable levels and badges |
| `FF_CERTIFICATES_V1` | 7 | false | Complete | Enable PDF certificate generation |
| `FF_MANAGER_NOTIFICATIONS_V1` | 7 | false | Complete | Enable manager notifications |
| `FF_CONVERSATIONAL_UI_V1` | 8 | false | Phase 1 Complete | Enable chat interface |
| `FF_FREE_TEXT_ANSWERS_V1` | 8 | false | Planned | Enable free-text answer validation |
| `FF_ADAPTIVE_DIFFICULTY_V1` | 9 | false | Planned | Enable adaptive difficulty engine |
| `FF_LEARNING_STYLE_V1` | 9 | false | Planned | Enable learning style detection |
| `FF_CERTIFICATION_WORKFLOW_V1` | 10 | false | Planned | Enable expert certification workflow |
| `FF_BATCH_GENERATION_V1` | 6.6 | false | Planned | Enable batch content generation |
| `FF_CONTENT_LIFECYCLE_V1` | 6.7 | false | Planned | Enable content lifecycle management |

### Infrastructure Toggles (Epic 0)

| Infrastructure Toggle | Epic | Default | Status | Description |
|----------------------|------|---------|--------|-------------|
| `CANON_ENABLED` | 0 | false | Complete | Enable in-memory canon store |
| `COST_GRAPH_ENABLED` | 0 | false | Complete | Enable cost tracking (fresh vs reuse) |
| `QUALITY_THRESHOLD` | 0 | 0.80 | Complete | Minimum content quality score |
| `CANON_MAX_SIZE` | 0 | 1000 | Complete | LRU cache size for canon |
| `CANON_PERSIST_PATH` | 0 | (none) | Complete | Optional JSON persistence path |

### LLM Configuration (Epic 6)

| Configuration Variable | Epic | Default | Status | Description |
|-----------------------|------|---------|--------|-------------|
| `GENERATOR_1` | 6 | gpt-4o | Complete | Generator A model (OpenAI) |
| `GENERATOR_2` | 6 | claude-sonnet-4.5-20250514 | Complete | Generator B model (Anthropic) |
| `FACT_CHECKER` | 6 | o3-mini-2025-01-31 | Complete | Fact-checker model (OpenAI) |
| `UNDERSTANDING_MODEL` | 6 | gpt-4o | Complete | Understanding phase model |
| `ANTHROPIC_API_KEY` | 6 | (required) | Complete | Anthropic API credentials |
| `GOOGLE_GENERATIVE_AI_API_KEY` | 6 | (optional) | Complete | Google Gemini credentials |

### Certificate Configuration (Epic 7)

| Configuration Variable | Epic | Default | Status | Description |
|-----------------------|------|---------|--------|-------------|
| `CERT_SIGNING_KEY` | 7 | (required) | Complete | Ed25519 private key (hex format) |
| `PERSIST_AUDIT_EVENTS` | 7 | false | Complete | Enable audit event logging to database |
| `RETAIN_AUDIT_DAYS` | 7 | 180 | Complete | Audit event retention period (days) |

### Chat Configuration (Epic 8)

| Configuration Variable | Epic | Default | Status | Description |
|-----------------------|------|---------|--------|-------------|
| `CHAT_LLM_MODEL` | 8 | gpt-4o-mini | Phase 1 | Chat explanation model |
| `EXPLANATION_CACHE_TTL` | 8 | 3600 | Planned | Explanation cache TTL (seconds) |
| `LLM_UNDERSTANDING` | 8 | gpt-4o | Planned | Free-text answer validation model |
| `NEXT_PUBLIC_CONVERSATIONAL_UI_V1` | 8 | false | Phase 1 | Enable ChatPanel UI (web) |

---

## Rollout Timeline

### Completed (Epics 1-5, 7)
- Week 1-2: Foundation (Epics 1-4)
- Week 3: Slack Integration (Epic 5)
- Week 4-5: Gamification (Epic 7)

### In Progress (Epics 6, 6.5)
- Week 6-7: Ensemble Generation (Epic 6 + 6.5)

### Planned (Epics 8, 9, 6.6, 6.7, 6.8, 10)
- Week 8: Conversational UI (Epic 8)
- Week 9: Adaptive Difficulty (Epic 9)
- Week 10: Manager Curation Workflow (Epic 6.8)
- Week 11: Content Library Seeding (Epic 6.6)
- Week 12: Content Lifecycle (Epic 6.7)
- Week 13: Enhanced Certification (Epic 10)

---

## Change Control

**To modify this plan:**
1. Create GitHub issue with proposed change
2. Justify with BRD/FSD/business requirements
3. Get approval from project owner
4. Update version number
5. Document change in changelog below

**Status:** LOCKED - No changes without explicit approval

---

## Changelog

### v1.2 (2025-10-13)
- **Added Epic 6.8: Manager Curation Workflow** - New 20-24h epic for manager-centric content curation and assignment
- **Updated content hierarchy** - Documented 5-tier model: Subject > Topic > Module > Quiz > Question
- **Updated Epic 6 scope** - Topic-level generation (4-6 modules per topic) vs. standalone modules
- **Updated Epic 6.6 scope** - Generate 100 topics (not 100 modules), each with 4-6 modules
- **Updated Epic 6.7 scope** - Freshness management at topic level (6-month default)
- **Updated Epic 8 scope** - Added inline chat UI, hierarchy awareness, natural language guardrails
- **Updated Epic 10 scope** - Certification at topic OR module level
- **Updated rollout timeline** - Added Week 10 for Epic 6.8 (Manager Curation Workflow)
- **Source:** User requirements refinement based on UAT feedback

### v1.1 (2025-10-13)
- **Added Epic 0: Platform Foundations v1** - Previously undocumented infrastructure epic (20h, complete)
- **Updated Epic 6 model configuration** - Corrected to match production: GPT-4→o3, Claude 3.5→Claude 4.5
- **Updated Epic 8 status** - Changed from "Planned" to "Phase 1 Complete" (infrastructure/skeleton)
- **Expanded Feature Flag Registry** - Added 16 environment variables across 4 categories (Infrastructure, LLM, Certificate, Chat)
- **Updated dependency graph** - Added Epic 0 as foundation layer prerequisite for Epics 6, 8, 9
- **Clarified feature flag ownership** - Documented `FF_CONTENT_CANON_V1` shared between Epic 6 and Platform v1
- **Source:** Epic Reconciliation Process (5 agent reports analyzing Epics 6, 7, Platform v1, 8)

### v1.0 (2025-10-13)
- Initial Epic Master Plan creation
- Consolidated all epic specifications
- Established full BRD/FSD traceability
- Locked scope for Epics 1-12
- Created dependency graph
- Defined feature flag registry

---

**End of Epic Master Plan**

