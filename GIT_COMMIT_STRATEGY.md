# Git Commit Strategy - Major Strategic Refocus

**Date:** 2025-10-17  
**Scope:** Strategic MVP refocus + Epic 13 (Agent Orchestrator) + Epic 16 (Learning Science) + Epic 17 (Multimodal - post-MVP)  
**Risk:** **HIGH** - 80+ uncommitted files, significant strategic changes

---

## 🚨 **Current Risk**

We have **significant uncommitted work** that represents a **major strategic shift**:
- Strategic refocus (manager-first, not content-first)
- Epic 13: Agent Orchestrator (full AI agent architecture)
- Epic 16: Research-backed learning science
- Epic 17: Multimodal learning (post-MVP)
- Epic 14: Manager workflows prompt
- Database migrations (5 new tables)
- New services, routes, components

**If local disk fails or git reset happens, we lose weeks of work.**

---

## 📋 **Commit Strategy**

### **Option A: Single Large Commit (Fastest)** ⚡
**Pros:** Quick, preserves current state  
**Cons:** Hard to review, hard to revert specific pieces  

```bash
git add .
git commit -m "feat: strategic MVP refocus + Epic 13/16/17 [spec]

Major Changes:
- Strategic refocus: Manager workflows > bulk content seeding
- Epic 13: Agent Orchestrator architecture (AI agent with tools)
- Epic 16: Evidence-based learning design (10 proven techniques)
- Epic 17: Multimodal learning (post-MVP)
- Epic 14: Manager module workflows prompt
- 5 new database migrations (agent, batch, phd content)
- 12 new services (agent, batch, phd-ensemble, workflow)
- 4 new API routes (agent, batch, phd, workflow)
- Frontend: Welcome workflow + agent integration

Database:
- agent_conversations, agent_tool_calls tables
- batch_jobs, batch_topics tables
- rich content corpus tables

Epic Status:
- Epic 13: 95% complete (tests need fixes)
- Epic 14: Prompt created
- Epic 16: Research integrated
- Epic 17: Documented (post-MVP)

See: EPIC13_STATUS_AND_TEST_PLAN.md
See: MVP_STRATEGIC_REFOCUS_SUMMARY.md
See: EPIC16_RESEARCH_INTEGRATION_SUMMARY.md"

git push origin fix/ci-quality-canon-version-kpi
```

---

### **Option B: Logical Grouped Commits (Better)** 👍
**Pros:** Easier to review, easier to revert, better history  
**Cons:** Takes 10-15 minutes  

#### **Commit 1: Strategic Refocus Documentation**
```bash
git add \
  MVP_STRATEGIC_REFOCUS_SUMMARY.md \
  docs/EPIC_MASTER_PLAN_v1.6_MVP_REFOCUS.md \
  docs/EPIC14_MANAGER_MODULE_WORKFLOWS_PROMPT.md \
  MVP_ROADMAP_WITH_LEARNING_DESIGN.md \
  7_DAY_LAUNCH_ROADMAP.md

git commit -m "docs: strategic MVP refocus - manager workflows over content seeding [spec]

Strategic Shift:
- Deprioritize bulk content seeding (Epic 6.6 → post-MVP)
- Prioritize manager workflows (Epic 14) and learner modules (Epic 15)
- Agent Orchestrator (Epic 13) enables dynamic content generation
- Learning science integration (Epic 16) ensures efficacy

New P0 Epics:
- Epic 13: Agent Orchestrator (AI agent architecture)
- Epic 14: Manager Module Workflows
- Epic 15: Learning Module Delivery
- Epic 16: Learning Experience Design & Testing

Post-MVP:
- Epic 6.6: Bulk content seeding
- Epic 17: Multimodal learning

Updated timeline: 7 weeks (84-108 hours) including retention testing

See: MVP_STRATEGIC_REFOCUS_SUMMARY.md"
```

#### **Commit 2: Epic 16 - Learning Science Integration**
```bash
git add \
  docs/EPIC16_LEARNING_EXPERIENCE_DESIGN_PROMPT.md \
  EPIC16_RESEARCH_INTEGRATION_SUMMARY.md \
  docs/EPIC17_MULTIMODAL_LEARNING_PROMPT.md

git commit -m "feat: Epic 16 - evidence-based learning science integration [spec]

Research Integration (Consensus 2025):
10 Proven Techniques:
1. Retrieval practice (free-text > MCQ)
2. Spaced repetition (SM-2 algorithm)
3. Interleaving (mix concepts)
4. Worked examples with fading (CLT)
5. Elaborated feedback (what/why/how)
6. Self-explanation prompts
7. Microlearning (5-10 min chunks)
8. AI tutoring (Socratic dialogue)
9. Elo-based adaptivity (70-80% success targeting)
10. Desirable difficulties

Explicitly Avoided:
- Learning styles (VAK) - proven myth

Epic 17 (Post-MVP):
- Multimodal learning (Mayer's CLT)
- Video, diagrams, animations
- Only after validating text-based efficacy

Success Metrics:
- 70%+ retention at 7 days
- 60%+ retention at 30 days
- Spaced repetition improves retention by 20%+

See: EPIC16_RESEARCH_INTEGRATION_SUMMARY.md"
```

#### **Commit 3: Epic 13 - Database Migrations**
```bash
git add \
  api/migrations/020_agent_conversations.sql \
  api/migrations/021_agent_tool_calls.sql \
  api/migrations/019_welcome_workflow.sql

git commit -m "feat(db): Epic 13 agent orchestrator tables [spec]

New Tables:
- agent_conversations: 30-day conversation history
- agent_tool_calls: Tool execution audit trail
- workflow_states: Welcome workflow state machine

Schema:
- userId references, cascade delete
- Conversation memory retention
- Tool performance metrics
- Decision point tracking

See: docs/architecture/agent-orchestrator.md"
```

#### **Commit 4: Epic 13 - Core Services**
```bash
git add \
  api/src/services/agent-orchestrator.ts \
  api/src/services/agent-tools.ts \
  api/src/services/agent-memory.ts \
  api/src/services/affirmative-classifier.ts \
  api/src/services/conversation-memory.ts \
  api/src/services/topic-search.ts \
  api/src/db/schema.ts

git commit -m "feat: Epic 13 agent orchestrator core services [spec]

Agent Architecture:
- OpenAI function calling with tool execution
- 6 core tools (search, detect, progress, generate, confirm, store)
- Conversation memory (30-day retention)
- LLM-powered affirmative classification
- Topic search with fuzzy matching

Core Services:
- agent-orchestrator.ts (358 lines) - Reasoning loop
- agent-tools.ts (352 lines) - Tool registry
- agent-memory.ts (248 lines) - Memory management
- affirmative-classifier.ts - LLM intent detection
- topic-search.ts - Fuzzy search + LLM suggestions

Features:
- Meta-request detection ("learn something new")
- Affirmative flexibility ("yes", "sounds good", "perfect")
- Granularity detection (subject/topic/module)
- Filler word handling ("please", "teach me")
- Error handling (timeouts, retries, fallbacks)

See: docs/architecture/agent-orchestrator.md"
```

#### **Commit 5: Epic 13 - API Routes & Frontend**
```bash
git add \
  api/src/routes/agent.ts \
  api/src/routes/workflow.ts \
  api/src/index.ts \
  web/app/page.tsx \
  web/app/workflows/ \
  web/components/ClickableText.tsx \
  web/components/TopicSelection.tsx \
  web/components/WorkflowLoading.tsx

git commit -m "feat: Epic 13 agent routes and frontend integration [spec]

API Routes:
- POST /api/agent/chat - Main chat with reasoning
- GET /api/agent/memory/:userId - Conversation history
- POST /api/agent/reset/:userId - Clear state
- GET /api/agent/stats/:userId - Analytics
- GET /api/agent/health - Health check

Frontend:
- Feature-flagged agent routing (FF_AGENT_ORCHESTRATOR_V1)
- Welcome workflow state machine
- Clickable text interactions
- Topic selection UI
- Contextual loading messages
- Backward compatibility with workflow system

Integration:
- Seamless switching (agent ↔ workflow)
- Graceful error handling
- Natural loading states

See: docs/architecture/agent-orchestrator.md"
```

#### **Commit 6: Epic 13 - Tests & Documentation**
```bash
git add \
  api/tests/agent-orchestrator.test.ts \
  EPIC13_AGENT_ORCHESTRATOR_PROMPT.md \
  EPIC13_DELIVERY_COMPLETE.md \
  EPIC13_PHASE1_COMPLETE.md \
  EPIC13_QUICK_START.md \
  EPIC13_STATUS_AND_TEST_PLAN.md \
  EPIC13_TEST_GUIDE.md \
  docs/architecture/agent-orchestrator.md \
  docs/architecture/tool-development-guide.md

git commit -m "test(epic13): agent orchestrator test suite and docs [spec]

Test Suite:
- 26 test scenarios (14 passing, 12 need mock fixes)
- Meta-request detection (5 scenarios)
- Affirmative flexibility (3 scenarios)
- Granularity detection (3 scenarios)
- Error handling (3 scenarios)
- Conversation memory (2 scenarios)
- Performance (2 scenarios)

Known Issues:
- 12 tests timeout (5s) due to real OpenAI API calls
- Need to separate unit (mocked) vs integration (real API) tests
- Conversation history test needs 1s delay

Status: 95% complete
- Core implementation: 100%
- Documentation: 100%
- Tests: 54% passing (needs mock fixes)

Documentation:
- Architecture guide (agent-orchestrator.md)
- Tool development guide
- Test guide with 7 manual test flows
- Quick start guide
- Status & comprehensive test plan

See: EPIC13_STATUS_AND_TEST_PLAN.md"
```

#### **Commit 7: Batch & PhD Content Generation**
```bash
git add \
  api/migrations/022_batch_generation.sql \
  api/migrations/023_rich_content_corpus.sql \
  api/src/routes/batch-content.ts \
  api/src/routes/phd-content.ts \
  api/src/services/batch-generation.ts \
  api/src/services/phd-ensemble.ts \
  api/src/services/llm-orchestrator.ts \
  EPIC6.6_CONTENT_LIBRARY_SEEDING_PROMPT.md \
  EPIC6.6_DELIVERY_SUMMARY.md \
  PHD_ENSEMBLE_SUMMARY.md \
  topics_pilot.csv \
  topics_full.csv

git commit -m "feat: batch content generation + PhD-level ensemble [spec]

Batch Generation Service:
- CSV parsing with validation
- Sequential topic generation
- Budget enforcement ($100 or 400 topics)
- Quality validation (>0.90, 95% citations)
- Retry logic with exponential backoff
- Progress tracking

PhD Ensemble (4-stage pipeline):
- Lead: GPT-5 (16K tokens, comprehensive generation)
- Fallback: o3 (if GPT-5 fails)
- Critique: Claude Opus 4 (academic quality review)
- Verify: GPT-4o (factual + citation validation)

Content Architecture:
- Comprehensive corpus (PhD-level detail)
- Full citations with verification
- Example questions only (dynamic generation in delivery)
- Minimize MCQs (force engagement)

Database:
- batch_jobs: Job tracking
- batch_topics: Topic status
- content_corpus: Encyclopedia-level content
- topic_citations: Verified citations
- phd_ensemble_provenance: Multi-model audit trail

Status: Deferred to post-MVP per strategic refocus

See: EPIC6.6_DELIVERY_SUMMARY.md, PHD_ENSEMBLE_SUMMARY.md"
```

#### **Commit 8: Conversation Engine Updates**
```bash
git add \
  api/src/routes/conversation.ts \
  api/src/services/conversation-engine.ts \
  CONVERSATIONAL_UX_IMPROVEMENTS.md \
  CONVERSATIONAL_SUBJECT_REFINEMENT.md \
  CONVERSATION_DEPTH_AWARE_CONFIRMATIONS.md \
  INTELLIGENT_AFFIRMATIVE_CLASSIFICATION.md

git commit -m "feat: conversational UX improvements [spec]

Conversation Engine Enhancements:
- LLM-powered affirmative classification (replaces pattern matching)
- Conversational subject refinement (guided narrowing)
- Conversation depth-aware responses (first vs subsequent)
- Filler word handling ("please", "teach me about")
- Natural variations (UK spellings, phrasings)

Tone Adjustments:
- Hugh Grant-like: understated, concise, simple language
- Removed "enthusiastic life coach" tone
- Removed duplicative phrases ("valuable skill to develop")
- Professional but warm

Confirmation Flow:
- 20 hardcoded variations (instant, non-templated feel)
- LLM classification for edge cases
- Graceful transition messages

See: CONVERSATIONAL_UX_IMPROVEMENTS.md"
```

#### **Commit 9: Documentation & Status Files**
```bash
git add \
  docs/functional-spec.md \
  docs/EPIC_MASTER_PLAN.md \
  PRODUCT_STATUS_EXECUTIVE_SUMMARY.md \
  LAUNCH_READINESS_CHECKLIST.md \
  MEETING_MATERIALS_INDEX.md \
  api/start-local.sh \
  *.md

git commit -m "docs: update specs and status tracking [spec]

Functional Spec Updates:
- Epic 13: Agent Orchestrator section
- Epic 16: Learning science integration
- Strategic refocus reflected
- Manager workflows prioritized

Status Documents:
- Product status executive summary
- Launch readiness checklist
- Meeting materials index
- Test results and delivery summaries

Development:
- start-local.sh with all env vars
- Monitoring scripts for batch jobs
- Test execution guides

Epic Master Plan:
- v1.6 with strategic refocus
- Reprioritized: 13/14/15/16 P0, 6.6/17 post-MVP
- Updated timeline (7 weeks)

See: docs/EPIC_MASTER_PLAN_v1.6_MVP_REFOCUS.md"
```

---

### **Option C: Feature Branch (Safest)** 🛡️
**Pros:** Safest, allows PR review, easy to revert entire feature  
**Cons:** Adds complexity, requires branch management  

```bash
# Create feature branch
git checkout -b feat/strategic-refocus-epic13-16-17

# Make commits 1-9 from Option B above

# Push feature branch
git push origin feat/strategic-refocus-epic13-16-17

# Create PR for review
gh pr create --title "Strategic MVP Refocus + Epic 13/16/17" \
  --body "See GIT_COMMIT_STRATEGY.md for details"
```

---

## 🎯 **Recommendation**

**For immediate safety:** **Option B (Grouped Commits)** 👍

**Why:**
1. **Preserves work history** - easier to understand what changed
2. **Easier to review** - logical chunks
3. **Easier to revert** - can rollback specific pieces
4. **Better for team** - clear commit messages
5. **Takes only 10-15 minutes** - worth the investment

**Then:**
1. Push to current branch (`fix/ci-quality-canon-version-kpi`)
2. Create PR if you want review
3. Or merge directly to main if confident

---

## 📋 **Execution Checklist**

### **Before Committing:**
- [ ] Review files to commit (nothing sensitive)
- [ ] Check no local secrets in code
- [ ] Verify migrations are idempotent
- [ ] Confirm tests can run (even if some fail)

### **After Committing:**
- [ ] Push to remote immediately
- [ ] Verify push succeeded
- [ ] Create PR or merge to main
- [ ] Tag release if appropriate (e.g., v1.6.0-epic13)

---

## ⚠️ **Files to Exclude (if any)**

Check these files before committing:
```bash
# Likely should exclude:
phd-test-python.log
phd-pilot-logs/

# Verify no secrets in:
api/start-local.sh (has OPENAI_API_KEY placeholder - OK if placeholder)
```

---

## 🚀 **Quick Execution Script**

If you want Option B, I can create a shell script to execute all 9 commits automatically.

**Alternatively, execute manually:**
```bash
# Copy/paste each commit block from Option B above
# Takes ~10 minutes to run all 9
```

---

**Bottom Line:** We have **significant uncommitted work** representing a **major strategic shift**. Commit ASAP to preserve work, preferably with grouped commits (Option B) for better history and reviewability.

**Shall I proceed with Option B and execute the commits?**

