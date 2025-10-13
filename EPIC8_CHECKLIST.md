# Epic 8: Implementation Checklist

## Phase 1: Infrastructure ✅ COMPLETE

### Database Schema ✅
- [x] Create migration `014_conversational_ui.sql`
- [x] Create staging variant `014_conversational_ui_render.sql`
- [x] Apply to staging database
- [x] Apply to production database
- [x] Create test user in staging
- [x] Verify tables: `chat_sessions`, `chat_messages`, `confusion_log`
- [x] Verify `attempts` table extended

### API Services ✅
- [x] Create `intent-router.ts` service
- [x] Create `explanation-engine.ts` skeleton
- [x] Create `free-text-validator.ts` skeleton
- [x] Add unit tests for intent-router

### API Routes ✅
- [x] Create `chat-learning.ts` routes file
- [x] Implement `POST /api/chat/message`
- [x] Implement `GET /api/chat/sessions`
- [x] Implement `GET /api/chat/sessions/:id`
- [x] Implement `POST /api/chat/explanation`
- [x] Implement `POST /api/chat/feedback`
- [x] Register routes in `api/src/index.ts`
- [x] Add RBAC middleware
- [x] Add feature flags
- [x] Add admin token bypass for dev

### Web UI ✅
- [x] Create `ChatPanel.tsx` component
- [x] Add keyboard shortcuts (Cmd+K, /, Esc)
- [x] Add markdown rendering
- [x] Add suggestion chips
- [x] Add loading states
- [x] Add error handling
- [x] Integrate into `/learn` page
- [x] Add feature flag `NEXT_PUBLIC_CONVERSATIONAL_UI_V1`

### Dev/Test Setup ✅
- [x] Create `start-epic8-api.sh`
- [x] Create `start-epic8-web.sh`
- [x] Create test user script
- [x] Create migration application script
- [x] Install dependencies: `fast-levenshtein`, `react-markdown`
- [x] Test basic flow end-to-end

### Documentation ✅
- [x] Create `EPIC8_PHASE1_DELIVERY.md`
- [x] Create `EPIC8_UAT_PLAN.md`
- [x] Create `EPIC8_PHASE1_SUMMARY.md`
- [x] Create `EPIC8_CHECKLIST.md` (this file)

---

## Phase 2: Intent Classification Enhancement ⚠️ PLANNED

### Tune Intent Router
- [ ] Analyze UAT query logs
- [ ] Add new keywords/patterns based on real queries
- [ ] Implement LLM fallback for ambiguous queries (optional)
- [ ] Improve confidence scoring
- [ ] Target: 90%+ accuracy

**Estimated:** 2 hours  
**Depends on:** UAT completion

---

## Phase 3: LLM Explanation Engine ⚠️ PLANNED

### OpenAI Integration
- [ ] Configure `OPENAI_API_KEY` in production
- [ ] Implement `generateExplanation()` with OpenAI calls
- [ ] Write ELI12 system prompts
- [ ] Add confusion log tracking
- [ ] Test with 5-10 sample questions
- [ ] (Optional) Set up Redis caching

### Cost Optimization
- [ ] Set up explanation caching (60 min TTL)
- [ ] Add cost monitoring logs
- [ ] Test cache hit rates

**Estimated:** 3 hours  
**Cost:** ~$0.40-0.80/month with caching

---

## Phase 4: Free-Text Answer Validation ⚠️ PLANNED

### Fuzzy Matching
- [ ] Wire up `validateFreeTextAnswer()` in `/api/learn/submit`
- [ ] Test Levenshtein similarity threshold (80%? 85%?)
- [ ] Handle edge cases (case, punctuation, extra words)

### LLM Fallback
- [ ] Implement LLM validation for ambiguous answers
- [ ] Generate constructive feedback
- [ ] Calculate partial credit (0.0-1.0)

### Integration
- [ ] Update `/api/learn/submit` endpoint
- [ ] Test with sample Q&A pairs
- [ ] Verify `attempts` table updates

**Estimated:** 4 hours  
**Cost:** ~$0.002 per free-text answer

---

## Phase 5: Real Data Integration ⚠️ PLANNED

### Progress Query Handler
- [ ] Wire up `getAllLearnerLevels(userId)`
- [ ] Wire up `getUserCertificates(userId)`
- [ ] Wire up `getLearnerBadges(userId)`
- [ ] Calculate completion % from attempts
- [ ] Format rich response (progress bars, emoji)

### Next Question Handler
- [ ] Integrate with `/api/learn/next` logic
- [ ] Return actual next question preview
- [ ] Add contextual suggestions

### Filter Handler
- [ ] Parse topic/track from query
- [ ] Filter questions by topic
- [ ] Return relevant question list

**Estimated:** 4 hours  
**Depends on:** Seeded database with real content

---

## Phase 6: Extend Learn Routes ⚠️ PLANNED

### Update `/api/learn/submit`
- [ ] Integrate free-text validator
- [ ] Handle `answerText` parameter
- [ ] Return `partialCredit` and `feedback`
- [ ] Update response format

### Testing
- [ ] Test MCQ submissions (existing flow)
- [ ] Test free-text submissions (new flow)
- [ ] Test mixed submissions

**Estimated:** 1.5 hours

---

## Phase 7: UX Polish ⚠️ PLANNED

### Chat Panel Enhancements
- [ ] Add typing indicator ("Assistant is typing...")
- [ ] Improve message formatting (bold, lists, code blocks)
- [ ] Add progress bars/charts for progress query
- [ ] Add badges/certificates display
- [ ] Persist session across page reloads
- [ ] Improve mobile responsiveness
- [ ] Add context awareness (show current question)

### Keyboard & Accessibility
- [ ] Test screen reader compatibility
- [ ] Improve focus management
- [ ] Add keyboard navigation through suggestions
- [ ] Test on Windows/Linux

**Estimated:** 3 hours

---

## Phase 8: Testing & Documentation ⚠️ PLANNED

### Unit Tests
- [ ] Test explanation engine (mock OpenAI)
- [ ] Test free-text validator (fixture Q&A pairs)
- [ ] Test chat routes (Fastify test harness)
- [ ] Achieve >80% coverage for new code

### E2E Tests
- [ ] Test chat flow (open → send → receive → close)
- [ ] Test keyboard shortcuts
- [ ] Test intent routing
- [ ] Test free-text submission

### Documentation
- [ ] Update `docs/functional-spec.md` with §29
- [ ] Update `docs/spec/flags.md` with final flags
- [ ] Create user guide / help docs
- [ ] Update `README.md` with Epic 8 features
- [ ] Write API documentation for new routes

### Smoke Tests
- [ ] Run `api/scripts/smoke-chat.sh`
- [ ] Verify all routes return 200 OK
- [ ] Check database logs for errors

**Estimated:** 3 hours

---

## UAT (User Acceptance Testing) ⚠️ NEXT STEP

### Preparation
- [ ] Review `EPIC8_UAT_PLAN.md`
- [ ] Recruit 5-10 internal testers
- [ ] Schedule 30-min sessions
- [ ] Create entry survey (Google Forms)
- [ ] Create exit survey (Google Forms)
- [ ] Create observation notes template

### Execution
- [ ] Run Scenario 1: Chat Discovery (5 min each)
- [ ] Run Scenario 2: Basic Interaction (10 min each)
- [ ] Run Scenario 3: Intent Classification (15 min each)
- [ ] Run Scenario 4: Conversation Flow (10 min each)
- [ ] Run Scenario 5: Edge Cases (10 min each)
- [ ] Run Scenario 6: Keyboard Shortcuts (5 min each)
- [ ] (Optional) Scenario 7: Mobile (5 min each)

### Analysis
- [ ] Export chat logs from database
- [ ] Analyze intent distribution
- [ ] Compile UX issues list
- [ ] Calculate metrics (discovery rate, query success, satisfaction)
- [ ] Write UAT Results Report

### Decision
- [ ] Review with stakeholders
- [ ] Make Go/No-Go decision for Phase 2-8
- [ ] Prioritize Phase 2-8 tasks based on feedback

**Estimated:** 1 week (Oct 14-20)

---

## Post-UAT: Phase 2-8 Sprint ⚠️ PLANNED

### Recommended Order (Based on Impact)
1. Phase 5: Real Data Integration (4h) - Most visible UX improvement
2. Phase 3: LLM Explanations (3h) - Core differentiator
3. Phase 7: UX Polish (3h) - Professional feel
4. Phase 4: Free-Text Answers (4h) - Complex, test last
5. Phase 2: Intent Tuning (2h) - Use UAT data
6. Phase 8: Testing & Docs (3h) - Final validation

**Total:** ~19 hours (2-3 days)

---

## Production Rollout ⚠️ FUTURE

### Internal Beta (Week 1)
- [ ] Enable for 10-20 internal users
- [ ] Monitor confusion logs
- [ ] Track explanation requests
- [ ] Collect feedback

### External Beta (Week 2)
- [ ] Enable for 2-3 friendly customers
- [ ] Monitor costs (OpenAI usage)
- [ ] A/B test: Chat vs traditional UI
- [ ] Measure engagement metrics

### Full Rollout (Week 3-4)
- [ ] Enable `FF_CONVERSATIONAL_UI_V1=true` in production
- [ ] Gradual rollout (10% → 50% → 100%)
- [ ] Monitor performance and costs
- [ ] Customer success training materials

---

## Summary

**Phase 1:** ✅ Complete (Oct 12)  
**UAT:** ⚠️ Planned (Oct 14-20)  
**Phase 2-8:** ⚠️ Planned (Oct 21-25)  
**Beta:** ⚠️ Planned (Nov 1-15)  
**Rollout:** ⚠️ Planned (Nov 15-30)

**Current Status:** Infrastructure ready, awaiting UAT validation before Phase 2-8 enhancement sprint.

