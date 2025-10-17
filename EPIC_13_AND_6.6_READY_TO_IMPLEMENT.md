# Epic 13 & Epic 6.6 - Ready for Implementation

**Date:** 2025-10-16  
**Status:** ✅ Documentation Complete, Ready for Parallel Implementation  
**Version:** EPIC_MASTER_PLAN v1.5

---

## 📋 Summary

All documentation has been updated and two comprehensive implementation prompts have been created for parallel execution:

### **Epic 13: Agent Orchestrator Architecture** (24-28h, Weeks 10-13)
- **Stream:** PARALLEL STREAM 2 (UX/Conversational layer)
- **Goal:** Refactor from pattern matching to AI agent with tool-calling
- **Impact:** Natural language understanding 90% → 99%+, eliminates edge case accumulation
- **Prompt:** `EPIC13_AGENT_ORCHESTRATOR_PROMPT.md`

### **Epic 6.6: Content Library Seeding** (12h, Weeks 10-12)
- **Stream:** PARALLEL STREAM 1 (Content generation layer)
- **Goal:** Generate 400 topics or $100 budget (20 UAT pilot → 400 production)
- **Impact:** Populate content library with high-quality learning materials
- **Prompt:** `EPIC6.6_CONTENT_LIBRARY_SEEDING_PROMPT.md`

**These two epics are INDEPENDENT and can run simultaneously with different engineers.**

---

## ✅ Documentation Updates Completed

### 1. EPIC_MASTER_PLAN.md (v1.4 → v1.5)

**Changes:**
- ✅ Added Epic 13 to Epic Status Matrix
- ✅ Added Epic 6.6 with phased approach (20 UAT → 400 production)
- ✅ Updated Epic Dependency Graph (shows parallel execution)
- ✅ Updated Implementation Order (parallel streams highlighted)
- ✅ Updated Rollout Timeline (Weeks 10-13 show two independent streams)
- ✅ Updated FSD to Epic Mapping (added §31, §33)
- ✅ Updated Feature Flag Registry (added 6 new flags)
- ✅ Added Agent Configuration section (4 new config vars)
- ✅ Updated Changelog (v1.5 entry with parallel execution strategy)

**New Sections:**
- **Epic 6.6 Specification:** Full scope, deliverables, quality gates, acceptance criteria
- **Epic 13 Specification:** Full scope, deliverables, performance targets, success metrics

### 2. functional-spec.md

**Changes:**
- ✅ Added §31: Content Library Seeding (Epic 6.6)
- ✅ Added §33: Agent Orchestrator Architecture (Epic 13)
- ✅ Updated section numbering (Backlog moved to §34)

**New Content:**
- Complete FSD entries with API routes, database tables, feature flags
- Implementation summaries with technical achievements
- Acceptance evidence with curl examples
- Traceability links to EPIC_MASTER_PLAN.md

### 3. Implementation Prompts Created

**EPIC13_AGENT_ORCHESTRATOR_PROMPT.md** (comprehensive, 350+ lines)
- Executive summary with problem statement
- 4 phases with detailed deliverables
- Complete technical specifications
- Code skeletons for agent orchestrator, tools, frontend integration
- 30+ edge case test scenarios
- A/B testing framework with rollout strategy
- Risk mitigation strategies
- Success criteria and performance targets

**EPIC6.6_CONTENT_LIBRARY_SEEDING_PROMPT.md** (comprehensive, 400+ lines)
- Executive summary with phased approach
- Phase 1: UAT pilot (20 topics) with quality gates
- Phase 2: Scale production (400 topics or $100 budget)
- Complete technical specifications
- Code skeletons for batch service, API routes, quality validation
- CSV template for topic upload
- Budget enforcement logic
- Risk mitigation strategies
- Success criteria per phase

---

## 🎯 Next Steps for User

### Option 1: Delegate to New Agents

1. **Hand Off Epic 13 Prompt:**
   - Open new Cursor agent session
   - Provide: `EPIC13_AGENT_ORCHESTRATOR_PROMPT.md`
   - Agent executes autonomously (24-28h)
   - Return with outcomes for integration

2. **Hand Off Epic 6.6 Prompt:**
   - Open separate Cursor agent session (or assign to different engineer)
   - Provide: `EPIC6.6_CONTENT_LIBRARY_SEEDING_PROMPT.md`
   - Agent executes autonomously (12h)
   - **Critical:** User UAT approval after 20 topics before Phase 2

3. **Report Back:**
   - Both agents report outcomes independently
   - Integrate results here for final reconciliation

### Option 2: Implement Sequentially

1. **Start with Epic 6.6 (Content First):**
   - Generate 20 topics for UAT
   - User validates quality (>0.90, citations >95%, cost <$0.30)
   - User approves → scale to 400 or $100
   - Result: Content library populated

2. **Then Epic 13 (Agent Orchestrator):**
   - Build agent infrastructure
   - Migrate workflows to tools
   - A/B test (10% → 50% → 100%)
   - Result: Natural language conversation layer

### Option 3: Parallel Implementation (Recommended)

1. **Assign Epic 13 to UX/Conversational Engineer**
2. **Assign Epic 6.6 to Content/Backend Engineer**
3. **Both work simultaneously (no conflicts)**
4. **Integrate at Week 13 for final testing**

**Why Parallel?**
- Epics share NO code files
- Epics share NO database tables
- Epics share NO API endpoints
- Epic 13 calls `generateContent()` tool → Epic 6.6 provides batch generation
- Integration point is clean and well-defined

---

## 📊 Parallel Execution Matrix

| Aspect | Epic 6.6 (Content Seeding) | Epic 13 (Agent Orchestrator) |
|--------|---------------------------|------------------------------|
| **Code Layer** | Backend batch processing, queue workers, LLM ensemble calls | Conversational UI, intent routing, workflow orchestration |
| **Files** | `batch-generation.ts`, `batch-content.ts`, `batch-quality.ts` | `agent-orchestrator.ts`, `agent-tools.ts`, `agent-memory.ts` |
| **Database** | `batch_jobs`, `batch_topics` (Migration 022) | `agent_conversations`, `agent_tool_calls` (Migrations 020, 021) |
| **API Endpoints** | `/api/content/batch/*` | `/api/agent/*` |
| **Frontend** | Optional progress dashboard | Update `page.tsx` to call `/api/agent/chat` |
| **Testing** | Quality validation, cost tracking, batch completion | Edge case scenarios (30+), A/B testing, performance |
| **Timeline** | Week 10-12 (2 weeks) | Week 10-13 (3-4 weeks) |
| **Dependencies** | Epic 6 + 6.5 (completed) | Epic 8 + 9 (completed) |

**Zero Conflicts:** These epics touch completely different parts of the codebase.

---

## 🚀 Quick Start for Agents

### For Epic 13 Agent:

```bash
# Read implementation prompt
cat EPIC13_AGENT_ORCHESTRATOR_PROMPT.md

# Key deliverables:
# 1. api/src/services/agent-orchestrator.ts (Phase 1, 8h)
# 2. api/src/services/agent-tools.ts (Phase 2, 10h)
# 3. api/src/routes/agent.ts (Phase 3, 8h)
# 4. Database migrations 020, 021
# 5. 30+ test scenarios (Phase 4, 4-6h)

# Success criteria:
# - Latency p95 < 500ms
# - Cost per conversation < $0.01
# - Edge case accuracy > 95%
```

### For Epic 6.6 Agent:

```bash
# Read implementation prompt
cat EPIC6.6_CONTENT_LIBRARY_SEEDING_PROMPT.md

# Key deliverables:
# 1. api/src/services/batch-generation.ts (Phase 1, 6h)
# 2. api/src/routes/batch-content.ts (Phase 1, 6h)
# 3. Database migration 022
# 4. CSV upload system
# 5. Progress dashboard API

# Success criteria Phase 1:
# - 20 topics generated
# - Quality > 0.90, Citations > 95%
# - Cost < $0.30 per topic
# - USER APPROVAL before Phase 2

# Success criteria Phase 2:
# - 400 topics OR $100 spent (whichever first)
# - Budget enforcement works
# - Canon storage populated
```

---

## 💡 Key Insights

### Architectural Decision: Agent Orchestrator

**Problem:** Constant edge case accumulation with pattern matching
- "learn something new" vs "teach me physics" → required code change
- "it is" vs "yes" → required regex expansion
- First interaction vs deep conversation → required state tracking

**Solution:** AI agent with tool-calling
- Agent interprets intent naturally
- Tools provide structured actions
- Edge cases handled automatically
- Developer velocity 2x faster

**Trade-Off:**
- +150-300ms latency per interaction (acceptable for better UX)
- +$0.005-0.01 per conversation (worth eliminating "system confused" errors)

### Content Strategy: Phased Approach

**Problem:** Uncertain cost assumptions, need quality validation

**Solution:** 20 UAT pilot → user approval → 400 production
- Validate $0.30/topic cost assumption with real data
- Ensure quality gates (>0.90 score) work at scale
- Get user buy-in before spending $100

**Budget Enforcement:**
- Hard ceiling: $100 (stops generation immediately)
- Expected result: ~333 topics if cost is $0.30, or 400 topics if cost is $0.25

### Parallel Execution: Accelerated Delivery

**Single Stream:** 4-5 weeks (sequential)
**Parallel Streams:** 3-4 weeks (simultaneous)

**Savings:** 1-2 weeks accelerated MVP timeline

---

## 📝 Questions for Implementation Agents

### Epic 13 (Agent Orchestrator)

1. **LLM Model:** Start with `gpt-4o-mini` for speed/cost, upgrade to `gpt-4o` if accuracy < 95%?
2. **Streaming:** Token-by-token or complete messages? (Recommend: complete initially)
3. **Tool Parallelization:** Execute multiple tools simultaneously if no dependencies?
4. **Fallback:** Auto-fallback to pattern-based system after 3 agent failures?

### Epic 6.6 (Content Seeding)

1. **CSV Format:** Support additional columns (target_audience, learning_objectives)? (Recommend: start simple)
2. **Parallel Generation:** Generate 5 topics at a time to speed up? (Recommend: sequential for Phase 1, test in Phase 2)
3. **Canon Integration:** Immediate after generation, or separate batch step? (Recommend: immediate)
4. **UI Dashboard:** Build React dashboard or CLI monitoring? (Recommend: API first, UI optional)

**Recommendation:** Start simple, optimize based on real usage in Phase 1.

---

## 🎉 Ready to Go!

All documentation is complete and comprehensive. Both implementation prompts contain:
- ✅ Executive summaries
- ✅ Complete technical specifications
- ✅ Code skeletons and examples
- ✅ Database schemas
- ✅ API route definitions
- ✅ Test scenarios
- ✅ Success criteria
- ✅ Risk mitigation

**Hand these prompts to new agents and they can execute autonomously.** Return here with outcomes for final integration and reconciliation.

---

**End of Summary**

