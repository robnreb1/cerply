# Epic Master Plan - Cerply B2B Enterprise MVP
**Version:** 1.5  
**Status:** LOCKED (Changes require explicit approval)  
**Last Updated:** 2025-10-16  
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
| **6.6** | P1 | 📋 Planned | B-3 (scaling) | §31 | EPIC6.6_CONTENT_LIBRARY_SEEDING_PROMPT.md | 12h |
| **6.7** | P1 | 📋 Planned | L-11, B-3 | TBD | TBD | 8h |
| **6.8** | P1 | 📋 Planned | B-3, B-12 | §32 | EPIC6.8_IMPLEMENTATION_PROMPT.md | 20-24h |
| **7** | P1 | ✅ Complete | L-16, B-15 | §28 | EPIC7_IMPLEMENTATION_PROMPT.md | 18h |
| **8** | P1 | ✅ Complete | L-12, L-18 | §29 | EPIC8_IMPLEMENTATION_PROMPT.md | 13.5h actual (10% under budget) |
| **9** | P1 | ✅ Complete | L-2 | §30 | EPIC9_IMPLEMENTATION_PROMPT_v2.md | 13h |
| **10** | P2 | 📋 Post-MVP | E-1, E-14 | TBD | TBD | 10h |
| **11** | P2 | 📋 Post-MVP | B-6 | TBD | TBD | 16h |
| **12** | P2 | 📋 Post-MVP | B-5, B-14 | TBD | TBD | 20h |
| **13** | P1 | 📋 Planned | L-12, L-18 (enhancement) | §33 | EPIC13_AGENT_ORCHESTRATOR_PROMPT.md | 24-28h |

**Legend:**
- ✅ Complete: Deployed to production
- ⚠️ Phase 1 Complete: Infrastructure complete, additional phases planned
- 🚧 In Progress: Active development
- 📋 Planned: Scope locked, awaiting implementation
- 📋 Post-MVP: Deferred to post-MVP phase

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

### Phase 4: Conversational & Adaptive (Complete)
9. ✅ **Epic 8:** Conversational Learning Interface
10. ✅ **Epic 9:** True Adaptive Difficulty Engine

### Phase 5: Content Operations & Conversational Refactor (MVP-Critical) **PARALLEL EXECUTION**
11. 📋 **Epic 6.6:** Content Library Seeding (400 topics) - **STREAM 1**
12. 📋 **Epic 13:** Agent Orchestrator Architecture - **STREAM 2 (PARALLEL)**
13. 📋 **Epic 6.7:** Content Lifecycle Management
14. 📋 **Epic 6.8:** Manager Curation Workflow

### Phase 6: Post-MVP (Future)
15. 📋 **Epic 10:** Enhanced Certification Workflow (hardcoded flags for MVP)
16. 📋 **Epic 11:** Self-Serve Ingestion
17. 📋 **Epic 12:** Enterprise Analytics & Reporting

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
    ├─ Epic 6.6: Content Library Seeding (requires 6 + 6.5) **PARALLEL STREAM 1**
    ├─ Epic 6.7: Content Lifecycle (requires 6 + Epic 0 canon)
    └─ Epic 6.8: Manager Curation Workflow (requires 6 + 8)

Engagement Layer
└─ Epic 7: Gamification
    ├─ Epic 8: Conversational UI (requires 7 for progress queries + Epic 0 for adaptive)
    │   ├─ Epic 9: Adaptive Difficulty (requires 8 for confusion + Epic 0 for quality)
    │   └─ Epic 13: Agent Orchestrator (refactors 8, requires 8 + 9) **PARALLEL STREAM 2**
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

**Status:** 🚧 In Progress (Granularity Detection ✅ Complete 2025-10-13)  
**Priority:** P1 (Content quality)  
**Effort:** 18 hours (16h base + 2h granularity enhancement)

**BRD Traceability:**
- B-3: 3-LLM ensemble generation (Generator A, Generator B, Fact-Checker)
- B-3: **Intelligent curriculum design** (granularity detection - THE KILLER FEATURE)
- E-14: Provenance tracking for certification

**FSD Traceability:**
- §26: Ensemble Content Generation (updated with granularity detection)

**Implementation Prompt:** `EPIC6_IMPLEMENTATION_PROMPT.md`

**Scope (LOCKED + ENHANCED):**
1. **Conversational Granularity Detection (THE KILLER FEATURE):** Natural language interface intelligently detects Subject (8-12 topics) vs Topic (4-6 modules) vs Module (1 deep module) and adapts conversation accordingly
2. **Adaptive Conversation Flow:** 
   - Subject → Clarifies and suggests topic options
   - Topic → Guides step-by-step module sequence
   - Module → Generates content + parent topic context
3. **Adaptive Prompting:** Uses specialized prompt sets (SUBJECT_PROMPTS, TOPIC_PROMPTS, MODULE_PROMPTS) based on detected granularity
4. Understanding phase (conversational playback + iterative refinement)
5. 3-LLM pipeline (Generator A, Generator B, Fact-Checker)
6. Provenance tracking (which LLM contributed what)
7. Canon storage for generic content reuse

**Deliverables:**
- [x] **Conversational main page** (`web/app/page.tsx`) - natural language first interface
- [x] **Granularity detection function** (`detectGranularity()`) integrated into conversation flow
- [x] **3 prompt sets** (SUBJECT_PROMPTS, TOPIC_PROMPTS, MODULE_PROMPTS)
- [x] **API integration** (granularity field in content_generations table)
- [x] **Adaptive conversation responses** based on detected granularity
- [ ] Understanding phase working (API routes exist, conversation flow in progress)
- [ ] 3-LLM pipeline implemented (code complete, needs Epic 6 base deployment)
- [ ] Provenance tracked (schema ready)
- [ ] Canon storage integrated (code complete)
- [ ] Manager review UI (deferred to Phase 2)

**Feature Flags:**
- `FF_ENSEMBLE_GENERATION_V1=true`
- `FF_CONTENT_CANON_V1=true`

**Database Migration:**
- `018_add_granularity.sql` - Adds `granularity` column to `content_generations`

**Acceptance (Updated):**
```bash
POST /api/content/understand
# Request: { "artefact": "Leadership" }
# Response: {
#   "understanding": "...",
#   "granularity": "subject",  ← NEW
#   "granularityMetadata": {   ← NEW
#     "expected": "8-12 topics",
#     "reasoning": "Broad domain-level request"
#   }
# }

POST /api/content/generate
# → Uses SUBJECT_PROMPTS to generate 8-12 topics
# → { topics: [...], provenance: { generatorA: [...], generatorB: [...], factChecker: [...] } }
```

**Testing:**
- 15 test cases at `/test-generation` (5 subject, 5 topic, 5 module)
- Expected: 100% accurate granularity detection

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

**Status:** 📋 Planned **PARALLEL STREAM 1**  
**Priority:** P1 (Day 1 content)  
**Effort:** 12 hours

**BRD Traceability:**
- B-3: Content scaling for MVP launch (soft skills + financial services)

**FSD Traceability:**
- §31: Content Library Seeding (batch generation with quality gates)

**Implementation Prompt:** `EPIC6.6_CONTENT_LIBRARY_SEEDING_PROMPT.md`

**Scope (LOCKED):**
1. **Phase 1: UAT Pilot (20 topics)**
   - CSV topic input system
   - Batch generation queue (Epic 6 + Epic 6.5 orchestration)
   - Progress tracking dashboard
   - Quality validation (>0.90 quality score, >95% citation accuracy)
   - Cost tracking per topic (<$0.30 target)
   - Manual UAT approval gate

2. **Phase 2: Scale Production (400 topics or $100 budget)**
   - Automated batch processing
   - Canon storage integration
   - Cost ceiling enforcement ($100 or 400 topics, whichever hits first)
   - Ongoing automated seeding (not one-time)
   - Quality monitoring and alerts

**Deliverables:**
- [ ] CSV upload working
- [ ] Batch queue implemented
- [ ] Progress dashboard with cost tracking
- [ ] Quality validation pipeline
- [ ] Phase 1: 20 topics generated and UAT approved
- [ ] Phase 2: 400 topics generated (or $100 spent)
- [ ] Canon storage populated

**Quality Gates:**
- Quality score: >0.90 (target: >0.92)
- Citation accuracy: >95% (fact-checker validation)
- Cost per topic: <$0.30 (3-LLM ensemble cost)
- No ethical flags

**Feature Flags:**
- `FF_BATCH_GENERATION_V1=true`
- `FF_BATCH_COST_CEILING=100` (in USD)
- `FF_BATCH_QUALITY_FLOOR=0.90`

**Dependencies:**
- Requires Epic 6 (ensemble generation)
- Requires Epic 6.5 (research mode)
- Can run IN PARALLEL with Epic 13 (Agent Orchestrator)

**Acceptance:**
```bash
# Phase 1: Upload 20 topics for UAT
POST /api/content/batch/upload -d @topics_pilot.csv
# → { batchId: "...", status: "queued", totalTopics: 20, phase: "uat" }

# Monitor progress
GET /api/content/batch/:batchId/progress
# → { completed: 15, pending: 5, cost: $4.20, avgQuality: 0.93 }

# Phase 2: Scale to 400 topics (or $100 budget)
POST /api/content/batch/upload -d @topics_full.csv
# → { batchId: "...", status: "queued", totalTopics: 400, budgetLimit: 100, phase: "production" }
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

**Status:** ✅ COMPLETE (Phases 1-8 delivered!)  
**Priority:** P1 (UX differentiator)  
**Effort:** 15 hours (13.5h actual, 1.5h remaining saved - **10% under budget**)

**BRD Traceability:**
- L-12: Conversational interface with natural language queries
- L-18: Free-text answers with NLP validation

**FSD Traceability:**
- §29: Conversational Learning Interface

**Implementation Prompts:**
- `EPIC8_IMPLEMENTATION_PROMPT.md`  
- `EPIC8_PHASE2_DELIVERY.md`
- `EPIC8_PHASE3-4_DELIVERY.md`
- `EPIC8_PHASE7_DELIVERY.md`
- `EPIC8_PHASE8_DELIVERY.md` **FINAL**
- `EPIC8_UAT_MANUAL.md` **NEW**

**Scope (LOCKED):**
1. ✅ Chat panel with Cmd+K shortcut (Phase 1)
2. ✅ Intent router (progress/next/explanation/filter/help) **ENHANCED in Phase 7 (93.8% accuracy)**
3. ✅ LLM-powered explanations with caching (Phase 2) **COMPLETE 2025-10-13**
4. ✅ Free-text answer validation (fuzzy matching + LLM) (Phase 3) **COMPLETE 2025-10-13**
5. ✅ Confusion tracking for adaptive difficulty (Phase 2) **COMPLETE 2025-10-13**
6. ✅ Partial credit scoring in gamification (Phase 4) **COMPLETE 2025-10-13**
7. ✅ Natural language guardrails (Phase 7) **COMPLETE 2025-10-13**
8. ✅ E2E testing & UAT (Phase 8) **COMPLETE 2025-10-13 (50 tests, 100% pass rate)**

**Deliverables:**
- [x] Chat panel implemented (Phase 1)
- [x] Intent router working (Phase 1, enhanced Phase 7) **93.8% accuracy**
- [x] Explanations generated (Phase 2) **COMPLETE 2025-10-13**
- [x] Free-text validation working (Phase 3) **COMPLETE 2025-10-13**
- [x] Confusion logged (Phase 2) **COMPLETE 2025-10-13**
- [x] Partial credit scoring (Phase 4) **COMPLETE 2025-10-13**
- [x] Guardrails implemented (Phase 7) **COMPLETE 2025-10-13**
- [x] E2E tests & UAT (Phase 8) **COMPLETE 2025-10-13 (50 tests)**
- [x] Production readiness validated (Phase 8) **COMPLETE 2025-10-13**

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

**Status:** ✅ COMPLETE - DEPLOYED TO PRODUCTION (2025-10-13)  
**Priority:** P1 (Core learning science)  
**Effort:** 13 hours (13h actual, on schedule)

**BRD Traceability:**
- L-2: Adaptive lesson plans with dynamic difficulty adjustment (4 levels: Recall, Application, Analysis, Synthesis)

**FSD Traceability:**
- §30: True Adaptive Difficulty Engine

**Implementation Prompts:** 
- `EPIC9_IMPLEMENTATION_PROMPT_v2.md` (specification)
- `EPIC9_DELIVERY_SUMMARY.md` (implementation summary)
- `EPIC9_PRODUCTION_DELIVERY_SUMMARY.md` (production delivery summary)
- `EPIC9_UAT_GUIDE.md` (user acceptance testing)

**Deployment:**
- **Staging:** 2025-10-13, 20:04 UTC (Docker image: `staging-latest`)
- **Production:** 2025-10-13, ~20:10 UTC (Docker image: `prod`)
- **Feature Flag:** `FF_ADAPTIVE_DIFFICULTY_V1=true`
- **Database Migration:** `018_adaptive_difficulty.sql` (applied successfully)

**Scope (DELIVERED):**
1. ✅ 4 difficulty levels (Bloom's Taxonomy: recall/application/analysis/synthesis)
2. ✅ 5 performance signals (correctness, latency, confusion, partial credit, response time)
3. ✅ Time-weighted mastery algorithm (exponential decay, 30-day half-life)
4. ✅ Learning style detection (visual/verbal/kinesthetic/balanced/unknown)
5. ✅ Topic weakness detection (mastery < 0.70)

**Deliverables:**
- [x] Database migration: `018_adaptive_difficulty.sql`
- [x] Adaptive service: `api/src/services/adaptive.ts` (6 core functions)
- [x] API routes: `api/src/routes/adaptive.ts` (4 endpoints)
- [x] Integration with Epic 8 learn routes
- [x] Enhanced intent router with adaptive patterns
- [x] 25 unit tests + 8 smoke tests
- [x] Drizzle schema updated

**Feature Flags:**
- `FF_ADAPTIVE_DIFFICULTY_V1=true` - Enable adaptive difficulty engine

**Dependencies:**
- ✅ Epic 8 (confusion_log for learning style detection)
- ✅ Epic 7 (gamification for progression context)
- ✅ P0 (content hierarchy for topic-level mastery)

**Acceptance (All Verified):**
```bash
# Get learner profile with weak topics
GET /api/adaptive/profile/:userId
# → { profile: { learningStyle: "visual", ... }, weakTopics: [...] }

# Get recommended difficulty for topic
GET /api/adaptive/topics/:topicId/difficulty/:userId
# → { difficulty: "application", masteryLevel: 0.68, confidence: 0.92 }

# Record attempt and update mastery
POST /api/adaptive/attempt
# Body: { userId, topicId, questionId, correct, difficultyLevel }
# → { success: true, newMastery: 0.72 }

# Get adaptive analytics
GET /api/adaptive/analytics/:userId
# → { overallMastery: 0.68, learningStyle: "visual", topicBreakdown: [...] }
```

**Performance Metrics:**
- Mastery calculation: ~50ms (target < 100ms) ✅
- API response time: ~120ms p95 (target < 200ms) ✅
- Learning style detection: ~300ms (target < 500ms) ✅
- Test coverage: 100% (target > 80%) ✅

---

### Epic 13: Agent Orchestrator Architecture

**Status:** 📋 Planned **PARALLEL STREAM 2**  
**Priority:** P1 (UX foundation refactor)  
**Effort:** 24-28 hours

**BRD Traceability:**
- L-12: Conversational interface with natural language queries (architectural enhancement)
- L-18: Free-text answers with NLP validation (architectural enhancement)

**FSD Traceability:**
- §29: Conversational Learning Interface (refactor)
- §33: Agent Orchestrator Architecture (NEW)

**Implementation Prompt:** `EPIC13_AGENT_ORCHESTRATOR_PROMPT.md`

**Scope (LOCKED):**

**Phase 1: Agent Infrastructure (8h)**
1. Agent service with OpenAI function calling
2. Tool registry system
3. Agent state management
4. Conversation memory with 30-day retention
5. LLM provider abstraction

**Phase 2: Tool Migration (10h)**
6. Convert existing workflows to tools:
   - `searchTopics(query, userId)` - Find existing content
   - `detectGranularity(input)` - Classify subject/topic/module
   - `getUserProgress(userId)` - Get active modules
   - `generateContent(topic, userId)` - Create learning materials
   - `confirmWithUser(question)` - Ask clarification
   - `storeDecision(userId, decision)` - Log workflow decisions
7. Tool validation & error handling
8. Tool composition (chaining)

**Phase 3: Agent Integration (8h)**
9. Replace intent detection with agent decisions
10. Replace workflow routing with agent tool calls
11. Maintain backward compatibility during migration
12. A/B testing framework (pattern vs agent)

**Phase 4: Testing & Optimization (4-6h)**
13. Edge case testing (30+ scenarios from backlog)
14. Performance optimization (target <500ms p95)
15. Cost optimization (monitor LLM spend)
16. Gradual rollout strategy (10% → 50% → 100%)

**Deliverables:**
- [ ] Agent orchestrator service (`api/src/services/agent-orchestrator.ts`)
- [ ] Tool registry (`api/src/services/agent-tools.ts`)
- [ ] Conversation memory service (`api/src/services/agent-memory.ts`)
- [ ] Agent API routes (`api/src/routes/agent.ts`)
- [ ] Database migration: `020_agent_conversations.sql`
- [ ] Database migration: `021_agent_tool_calls.sql`
- [ ] A/B testing framework
- [ ] 30+ edge case tests
- [ ] Migration runbook

**Feature Flags:**
- `FF_AGENT_ORCHESTRATOR_V1=false` - Enable agent architecture
- `FF_AGENT_AB_TEST_V1=false` - Enable A/B testing (pattern vs agent)
- `AGENT_LLM_MODEL=gpt-4o` - Agent thinking model
- `AGENT_TOOL_TIMEOUT=10000` - Tool execution timeout (ms)
- `AGENT_MAX_ITERATIONS=5` - Max agent reasoning loops

**Dependencies:**
- ✅ Epic 8 (Conversational UI) - Complete
- ✅ Epic 9 (Adaptive Difficulty) - Complete
- Can run IN PARALLEL with Epic 6.6 (Content Library Seeding)

**Acceptance:**
```bash
# Agent handles natural language variations
POST /api/agent/chat
Body: { userId: "...", message: "learn something new" }
# → { message: "Perfect. What would you like to learn?", toolCalls: ["detectIntent"] }

# Agent routes intelligently
POST /api/agent/chat
Body: { userId: "...", message: "teach me quantum physics" }
# → { 
#   message: "Right, quantum physics...",
#   toolCalls: ["detectGranularity", "searchTopics", "confirmWithUser"]
# }

# Edge cases handled naturally (no code changes)
POST /api/agent/chat
Body: { userId: "...", message: "it is" }
# → { message: "Thank you. I'm putting that together now...", toolCalls: ["generateContent"] }

# Performance metrics
Latency p95: <500ms ✅
Cost per conversation: <$0.01 ✅
Edge case accuracy: >95% ✅
```

**Performance Targets:**
- Agent reasoning: <300ms (LLM function calling)
- Tool execution: <200ms (existing workflows)
- Total latency p95: <500ms
- Cost per conversation: <$0.01 (gpt-4o-mini for most, gpt-4o for complex)
- Edge case coverage: >95% (no "system confused" errors)

**Success Metrics:**
- Natural language understanding: >99% (vs 90% current pattern matching)
- Developer velocity: 2x faster for new edge cases
- User satisfaction: "system understands me" sentiment >90%

---

### Epic 10: Enhanced Certification Workflow

**Status:** 📋 Post-MVP (Deferred)  
**Priority:** P2 (Post-MVP)  
**Effort:** 10 hours  
**MVP Solution:** Hardcoded `is_certified` flags on specific topics

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
| L-2 | Adaptive lesson plans | 9 | Complete |
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
| §29 | Conversational UI | 8 | Complete |
| §30 | Adaptive Difficulty | 9 | Complete |
| §31 | Content Library Seeding | 6.6 | Planned |
| §32 | Manager Curation Workflow | 6.8 | Planned |
| §33 | Agent Orchestrator Architecture | 13 | Planned |

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
| `FF_BATCH_COST_CEILING` | 6.6 | 100 | Planned | Budget ceiling for batch generation (USD) |
| `FF_BATCH_QUALITY_FLOOR` | 6.6 | 0.90 | Planned | Minimum quality score for batch content |
| `FF_CONTENT_LIFECYCLE_V1` | 6.7 | false | Planned | Enable content lifecycle management |
| `FF_AGENT_ORCHESTRATOR_V1` | 13 | false | Planned | Enable agent orchestrator architecture |
| `FF_AGENT_AB_TEST_V1` | 13 | false | Planned | Enable A/B testing (pattern vs agent) |

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

### Agent Configuration (Epic 13)

| Configuration Variable | Epic | Default | Status | Description |
|-----------------------|------|---------|--------|-------------|
| `AGENT_LLM_MODEL` | 13 | gpt-4o | Planned | Agent thinking model (function calling) |
| `AGENT_TOOL_TIMEOUT` | 13 | 10000 | Planned | Tool execution timeout (milliseconds) |
| `AGENT_MAX_ITERATIONS` | 13 | 5 | Planned | Maximum agent reasoning loops |
| `AGENT_CONVERSATION_MEMORY_DAYS` | 13 | 30 | Planned | Conversation history retention (days) |

---

## Rollout Timeline

### Completed (Epics 1-5, 7)
- Week 1-2: Foundation (Epics 1-4)
- Week 3: Slack Integration (Epic 5)
- Week 4-5: Gamification (Epic 7)

### In Progress (Epics 6, 6.5)
- Week 6-7: Ensemble Generation (Epic 6 + 6.5)

### Completed (Epics 8, 9)
- ✅ Week 8: Conversational UI (Epic 8)
- ✅ Week 9: Adaptive Difficulty (Epic 9)

### MVP-Critical (Epics 6.6, 13, 6.7, 6.8) **PARALLEL EXECUTION**

**Week 10-13: Parallel Streams**

**STREAM 1: Content Library Seeding (Epic 6.6)** 
- Week 10: Phase 1 - UAT Pilot (20 topics)
- Week 10-11: UAT approval and quality validation
- Week 11-12: Phase 2 - Scale Production (400 topics or $100 budget)
- Week 12: Canon integration and monitoring

**STREAM 2: Agent Orchestrator (Epic 13) - PARALLEL**
- Week 10: Phase 1 - Agent infrastructure & tool registry
- Week 11: Phase 2 - Tool migration & integration
- Week 12: Phase 3 - A/B testing & optimization
- Week 13: Phase 4 - Gradual rollout (10% → 50% → 100%)

**These two streams are INDEPENDENT and can run simultaneously with different engineers.**

**Week 14-15: Content Operations**
- Week 14: Content Lifecycle Management (Epic 6.7)
- Week 15-16: Manager Curation Workflow (Epic 6.8)

### Post-MVP (Epics 10, 11, 12)
- Post-MVP: Enhanced Certification Workflow (Epic 10) - Hardcoded for MVP
- Post-MVP: Self-Serve Ingestion (Epic 11)
- Post-MVP: Enterprise Analytics (Epic 12)

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

### v1.5 (2025-10-16)
- **Added Epic 13: Agent Orchestrator Architecture** - New 24-28h epic to refactor conversational layer from pattern matching to AI agent with tool-calling (24-28h)
- **Updated Epic 6.6 scope** - Phased approach: 20 topics UAT pilot, then scale to 400 topics or $100 budget
- **Parallel execution strategy** - Epic 6.6 (Content Seeding) and Epic 13 (Agent Orchestrator) can run simultaneously as independent streams
- **Updated FSD mapping** - Added §31 (Content Library Seeding) and §33 (Agent Orchestrator Architecture)
- **Updated dependency graph** - Shows Epic 13 as refactor of Epic 8, parallel with Epic 6.6
- **Updated rollout timeline** - Weeks 10-13 show two parallel streams for accelerated delivery
- **Source:** Architectural review identifying pattern matching limitations and need for natural language agent

### v1.4 (2025-10-13)
- **Epic 9 Complete** - ✅ Adaptive Difficulty Engine (13h, on budget, 26 tests passing)
- **Epic 10 moved to Post-MVP** - Enhanced Certification deferred; MVP will use hardcoded `is_certified` flags
- **Updated rollout timeline** - Epic 6.6 (Batch Seeding) is now next priority
- **Updated quality criteria** - Raised bar to >0.90 quality score, >95% citation accuracy
- **Source:** Strategic decision to focus on content seeding before expert certification workflow

### v1.3 (2025-10-13)
- **Epic 8 Complete** - ✅ Conversational Learning Interface (Phases 1-8, 13.5h actual, 10% under budget)
- **P0 Migration Complete** - Content hierarchy database schema deployed to staging
- **90 tests passing** - Epic 8 test suite (intent routing, explanations, free-text validation, E2E)
- **Performance targets exceeded** - 93.8% intent accuracy (target: 90%), $0.00009/explanation (target: $0.0002)
- **Source:** Epic 8 agent closure + P0 migration reconciliation

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

