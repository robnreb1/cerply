# Epic 8: Conversational UI - UAT Plan

**Phase:** Phase 1 Infrastructure Testing  
**Timeline:** 1 week (Oct 14-20, 2025)  
**Participants:** 5-10 internal users  
**Scope:** UX validation, intent classification tuning, feedback collection

---

## 1. UAT Objectives

### Primary Goals

1. **Validate UX Flow**
   - Is the chat panel discoverable?
   - Are keyboard shortcuts intuitive?
   - Is the conversation flow natural?

2. **Tune Intent Classification**
   - Collect real-world query patterns
   - Identify "unknown" intent queries
   - Build training data for Phase 2 ML enhancement

3. **Gather Feature Feedback**
   - What questions do users naturally ask?
   - Which features feel missing?
   - What responses are confusing?

### Success Criteria

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Discovery Rate** | >50% find chat within 5 min | Entry survey + analytics |
| **Query Success** | >70% queries return helpful response | Intent match rate |
| **Satisfaction** | >4/5 stars | Exit survey |
| **Unknown Queries** | <30% classified as "unknown" | Log analysis |
| **Bugs/Issues** | 0 critical, <5 minor | Bug tracker |

---

## 2. Test Environment Setup

### Prerequisites

**For Test Coordinator:**

1. **Backend API:**
   ```bash
   cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh
   ./start-epic8-api.sh
   
   # Verify:
   curl http://localhost:8080/api/health
   # Should return: {"ok":true,...}
   ```

2. **Frontend Web:**
   ```bash
   cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh
   ./start-epic8-web.sh
   
   # Verify:
   # Open http://localhost:3000/learn
   # Press Cmd+K → Chat panel should appear
   ```

3. **Database:**
   - Staging database (Render): Already configured
   - Test user exists: `00000000-0000-0000-0000-000000000001`

**For Test Participants:**

- **Access:** http://localhost:3000/learn (local network or ngrok for remote)
- **Auth:** Admin token configured (no login required for Phase 1)
- **Browser:** Chrome/Firefox/Safari (latest versions)
- **Device:** Desktop (mobile testing in Phase 7)

---

## 3. Test Scenarios

### Scenario 1: Chat Discovery (5 minutes)

**Goal:** Verify users can find and open the chat panel.

**Instructions for Tester:**
1. Visit http://localhost:3000/learn
2. Explore the page naturally
3. Try to find a way to chat with the system
4. **Do NOT tell them about Cmd+K** (test discoverability)

**Success Criteria:**
- [ ] User finds chat within 5 minutes
- [ ] User understands how to open/close chat
- [ ] Keyboard shortcuts work (Cmd+K, /, Esc)

**Data to Collect:**
- Time to first chat open
- Method of discovery (found `/` hint? Noticed keyboard shortcut? Random keypress?)
- Confusion points

**Improvement Ideas:**
- Add visual hint: "Press / to chat" near input
- Add animated icon to draw attention
- Add onboarding tooltip

---

### Scenario 2: Basic Chat Interaction (10 minutes)

**Goal:** Test basic message sending and receiving.

**Instructions for Tester:**
1. Open chat (Cmd+K or /)
2. Try these messages in order:
   - "help"
   - "How am I doing?"
   - "What's next?"
   - "Random gibberish xyz"

**Expected Behavior:**

| Message | Expected Response | Intent |
|---------|-------------------|--------|
| "help" | Help text with examples | help |
| "How am I doing?" | Placeholder progress message | progress |
| "What's next?" | Placeholder next message | next |
| "Random gibberish xyz" | "I'm not sure I understand..." | unknown |

**Success Criteria:**
- [ ] All messages sent successfully
- [ ] Responses appear within 2 seconds
- [ ] Suggestion chips clickable and work
- [ ] Markdown rendering works (bold, lists)
- [ ] No errors in browser console

**Data to Collect:**
- Response time (perceived)
- Any UI glitches
- Confusion about responses

---

### Scenario 3: Intent Classification Testing (15 minutes)

**Goal:** Test how well the system understands natural language queries.

**Instructions for Tester:**
"Ask the chat assistant questions naturally, as if talking to a human. Try different phrasings for the same question."

**Example Queries to Try:**

**Progress Queries:**
- "How am I doing?"
- "Show my progress"
- "What's my score?"
- "Am I doing well?"
- "Can you tell me how I'm progressing?"
- "Show my stats"

**Next Question Queries:**
- "What's next?"
- "Give me another question"
- "Next question please"
- "What should I learn next?"
- "Continue"

**Help Queries:**
- "Help"
- "What can you do?"
- "I need assistance"
- "Show commands"

**Filter Queries:**
- "Show me fire safety questions"
- "I want to learn about data privacy"
- "Skip this topic"

**Explanation Queries:**
- "Why is option A correct?"
- "I don't understand this answer"
- "Explain why option B is wrong"
- "Can you clarify this question?"

**Success Criteria:**
- [ ] >70% of queries classified correctly
- [ ] Similar phrasings return same intent
- [ ] "Unknown" queries get helpful suggestions

**Data to Collect:**
- Each query + returned intent + confidence
- Queries that felt misclassified
- Natural phrasings not recognized

**Export Data:**
```sql
-- Run after UAT to export results
SELECT 
  content,
  intent,
  metadata,
  created_at
FROM chat_messages
WHERE role = 'user'
ORDER BY created_at DESC;
```

---

### Scenario 4: Conversation Flow (10 minutes)

**Goal:** Test multi-turn conversations and context.

**Instructions for Tester:**
Have a natural conversation:

1. "Help"
2. Click suggestion: "How am I doing?"
3. Ask follow-up: "What should I do next?"
4. Try another topic: "Show me new questions"
5. Return to progress: "How many questions have I answered?"

**Success Criteria:**
- [ ] Message history preserved in session
- [ ] Suggestion chips helpful
- [ ] Conversation feels natural
- [ ] No repeated responses

**Known Limitations (Expected):**
- ⚠️ System does NOT remember context (treats each message independently)
- ⚠️ Progress responses are placeholder text
- ⚠️ No typing indicators

**Data to Collect:**
- Where did conversation break down?
- What context did user expect to be remembered?
- Which suggestions were helpful vs ignored?

---

### Scenario 5: Edge Cases & Error Handling (10 minutes)

**Goal:** Test robustness and error handling.

**Instructions for Tester:**
Try to break the system:

1. **Empty message:** Try to send without typing anything
2. **Very long message:** Paste 500+ words
3. **Special characters:** `<script>alert('xss')</script>`, emojis 🔥✅
4. **Rapid messages:** Send 10 messages rapidly
5. **Close during loading:** Send message, immediately close panel
6. **Page reload:** Send messages, reload page, check history

**Success Criteria:**
- [ ] Empty messages blocked
- [ ] Long messages handled gracefully
- [ ] Special characters don't break UI
- [ ] No duplicate messages
- [ ] No crashes or errors

**Known Limitations (Expected):**
- ⚠️ Session NOT preserved on reload (expected for Phase 1)
- ⚠️ No rate limiting (add in Phase 5)

**Data to Collect:**
- Any crashes or errors
- UI glitches
- Performance issues

---

### Scenario 6: Keyboard Shortcuts & Accessibility (5 minutes)

**Goal:** Verify shortcuts work across platforms.

**Instructions for Tester:**

| Platform | Shortcut | Expected |
|----------|----------|----------|
| **Mac** | Cmd+K | Opens chat |
| **Mac** | / key | Opens chat |
| **Mac** | Esc | Closes chat |
| **Windows** | Ctrl+K | Opens chat |
| **Windows** | / key | Opens chat |
| **Windows** | Esc | Closes chat |

**Additional Tests:**
- Tab navigation through UI
- Enter to send, Shift+Enter for new line
- Screen reader compatibility (read message text)

**Success Criteria:**
- [ ] All shortcuts work
- [ ] No interference with page keyboard shortcuts
- [ ] Focus management correct (returns to input after send)

**Data to Collect:**
- Shortcuts that didn't work
- Platform-specific issues
- Accessibility concerns

---

### Scenario 7: Mobile Responsiveness (Optional - Phase 7 Focus)

**Goal:** Basic mobile functionality test.

**Instructions for Tester:**
1. Open http://localhost:3000/learn on mobile device
2. Try to open chat (Cmd+K won't work - need tap gesture)
3. Send messages
4. Close chat

**Known Limitations (Expected):**
- ⚠️ No mobile-specific open gesture yet
- ⚠️ May not be optimized for small screens
- ⚠️ Keyboard may cover input

**Success Criteria (Low Bar for Phase 1):**
- [ ] Messages can be sent and received
- [ ] UI doesn't break
- [ ] Text readable

**Data to Collect:**
- Major blockers for mobile use
- Desired gestures (swipe, tap icon, etc.)

---

## 4. Feedback Collection

### During Testing: Observation Notes

**Test Coordinator should note:**
- First reactions ("Oh, this is cool!" vs "Where is the chat?")
- Points of confusion (pauses, head scratches)
- Natural language used (queries, phrasings)
- Features requested ("Can it do X?")

**Template:**
```
Tester: [Name]
Date/Time: [Timestamp]
Scenario: [1-7]

Observations:
- [Positive behaviors]
- [Confusion points]
- [Natural queries used]
- [Feature requests]

Quotes:
- "[Direct user quotes]"
```

### After Testing: Surveys

#### Entry Survey (Before Testing)
1. How comfortable are you with chat interfaces? (1-5 scale)
2. Do you use keyboard shortcuts regularly? (Yes/No)
3. What would you expect a "learning assistant" to help with?

#### Exit Survey (After Testing)
1. **Discovery:** How easy was it to find the chat? (1-5)
2. **Usability:** How intuitive was the chat interface? (1-5)
3. **Helpfulness:** How helpful were the responses? (1-5)
4. **Satisfaction:** Overall, how satisfied are you? (1-5)
5. **Open Feedback:**
   - What did you like most?
   - What was most frustrating?
   - What features are missing?
   - Would you use this in real learning? (Yes/No/Maybe)

---

## 5. Data Collection & Analysis

### Automated Logging

**Database Queries to Run After UAT:**

```sql
-- 1. Intent distribution
SELECT 
  intent,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM chat_messages
WHERE role = 'user'
GROUP BY intent
ORDER BY count DESC;

-- 2. Most common queries
SELECT 
  content,
  intent,
  COUNT(*) as frequency
FROM chat_messages
WHERE role = 'user'
GROUP BY content, intent
HAVING COUNT(*) > 1
ORDER BY frequency DESC
LIMIT 20;

-- 3. Unknown queries (need better classification)
SELECT 
  content,
  created_at
FROM chat_messages
WHERE role = 'user' AND intent = 'unknown'
ORDER BY created_at DESC;

-- 4. Session engagement
SELECT 
  session_id,
  COUNT(*) as message_count,
  MAX(created_at) - MIN(created_at) as session_duration
FROM chat_messages
GROUP BY session_id
ORDER BY message_count DESC;

-- 5. Average response time (if logged)
-- Note: Not tracked in Phase 1, add in Phase 5
```

### Manual Analysis

**UAT Coordinator should compile:**

1. **Intent Classification Report:**
   - List of misclassified queries
   - Suggested new keywords/patterns
   - Ambiguous queries needing LLM fallback

2. **UX Issues Report:**
   - Critical bugs (blocking usage)
   - Minor bugs (annoying but workable)
   - Enhancement requests

3. **Feature Requests:**
   - Prioritize: Must-have vs Nice-to-have
   - Map to Phases 2-8 or defer to Epic 9

4. **Metrics Summary:**
   - Discovery rate: X% found chat in <5 min
   - Query success: Y% queries returned helpful response
   - Satisfaction: Average Z/5 stars
   - Unknown rate: W% queries classified as unknown

---

## 6. Go/No-Go Decision Criteria

### Proceed to Phase 2-8 if:

✅ **All Critical:**
- [ ] Chat panel works in 100% of tests
- [ ] No data loss or corruption
- [ ] Intent classification >60% accurate
- [ ] Zero critical bugs

✅ **At Least 3 of 4:**
- [ ] Discovery rate >40%
- [ ] Query success >60%
- [ ] Satisfaction >3.5/5
- [ ] Unknown queries <40%

### Pause & Fix if:

⚠️ **Any Critical:**
- [ ] Chat panel fails to load
- [ ] Messages lost or corrupted
- [ ] Critical security issue
- [ ] Data privacy concern

⚠️ **All 3 of:**
- [ ] Discovery rate <30%
- [ ] Query success <50%
- [ ] Satisfaction <3/5

---

## 7. Timeline & Roles

### Week 1: Preparation (1 day)

**Day 1 (Oct 14):**
- [ ] Test coordinator reviews this plan
- [ ] Set up local test environment
- [ ] Recruit 5-10 internal testers
- [ ] Schedule 30-min sessions with each

**Deliverables:**
- [ ] Test schedule (who, when)
- [ ] Entry survey form (Google Forms)
- [ ] Exit survey form
- [ ] Observation notes template

### Week 1: Testing (3 days)

**Days 2-4 (Oct 15-17):**
- [ ] Run 30-min sessions with each tester
- [ ] Capture screen recordings (optional but helpful)
- [ ] Take observation notes
- [ ] Collect surveys

**Deliverables:**
- [ ] Completed observation notes (5-10)
- [ ] Entry survey responses
- [ ] Exit survey responses
- [ ] Screen recordings

### Week 1: Analysis (2 days)

**Days 5-6 (Oct 18-19):**
- [ ] Export chat logs from database
- [ ] Analyze intent distribution
- [ ] Compile UX issues list
- [ ] Calculate metrics
- [ ] Write UAT report

**Deliverables:**
- [ ] UAT Results Report (see template below)
- [ ] Intent classification training data
- [ ] Prioritized bug/enhancement list
- [ ] Go/No-Go recommendation

### Week 1: Decision (1 day)

**Day 7 (Oct 20):**
- [ ] Review UAT report with stakeholders
- [ ] Make Go/No-Go decision
- [ ] If GO: Plan Phase 2-8 sprint
- [ ] If NO-GO: Plan fixes and re-test

---

## 8. UAT Results Report Template

```markdown
# Epic 8 Phase 1 UAT Results

**Date:** [Oct 14-20, 2025]
**Participants:** [N testers]
**Coordinator:** [Name]

## Executive Summary
[2-3 sentences: Overall success, key findings, recommendation]

## Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Discovery Rate | >50% | X% | ✅/⚠️/❌ |
| Query Success | >70% | Y% | ✅/⚠️/❌ |
| Satisfaction | >4/5 | Z/5 | ✅/⚠️/❌ |
| Unknown Rate | <30% | W% | ✅/⚠️/❌ |

## Intent Classification Results

**Distribution:**
- progress: X%
- next: Y%
- help: Z%
- unknown: W%

**Top Misclassified Queries:**
1. "[Query]" → [Returned intent] (should be [correct intent])
2. ...

**Suggested Improvements:**
- Add keywords: [list]
- Add patterns: [list]
- Consider LLM fallback for: [scenarios]

## UX Findings

**What Worked Well:**
- [Positive feedback]
- [Features users loved]

**What Needs Improvement:**
- [Critical issues]
- [Enhancement requests]

**Quotes:**
- "[User quote 1]"
- "[User quote 2]"

## Bugs Found

**Critical (P0):**
- [None expected for Phase 1]

**Major (P1):**
- [List]

**Minor (P2):**
- [List]

## Recommendations

### Phase 2-8 Readiness: ✅ GO / ⚠️ GO WITH FIXES / ❌ NO-GO

**Reason:** [Explanation]

**Before Phase 2-8:**
- [ ] Fix: [Issue 1]
- [ ] Fix: [Issue 2]
- [ ] Add: [Feature request]

**Phase 2-8 Priorities:**
1. [Top priority]
2. [Second priority]
3. ...

---

**Prepared by:** [Coordinator]
**Date:** [Oct 20, 2025]
```

---

## 9. Risk Mitigation

### Known Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Low tester participation** | Medium | High | Recruit backup testers |
| **Environment issues** | Low | High | Test setup 1 day early |
| **Unclear feedback** | Medium | Medium | Use observation + survey |
| **Bias (internal testers)** | High | Low | Acknowledge in report |
| **Scope creep** | Medium | Medium | Stick to Phase 1 scope |

### Contingency Plans

**If <5 testers available:**
- Extend timeline to 2 weeks
- Recruit from partner/customer (friendly)

**If critical bugs found:**
- Pause UAT
- Fix bugs
- Re-test with same participants

**If intent classification <60%:**
- Proceed anyway (expected for Phase 1)
- Use UAT data to improve in Phase 2

---

## 10. Success Definition

**Epic 8 Phase 1 UAT is successful if:**

1. **Infrastructure Validated:**
   - Chat panel loads and works consistently
   - No data loss or corruption
   - No critical bugs

2. **UX Validated:**
   - Users can find and use chat
   - Conversation flow feels natural
   - Satisfaction >3.5/5 (allowing for placeholder responses)

3. **Data Collected:**
   - 100+ real-world queries logged
   - Intent classification training data
   - Clear Phase 2-8 priorities

**What success does NOT require (Phase 1):**
- ❌ Helpful responses (placeholder text expected)
- ❌ 100% intent accuracy (Phase 2 focus)
- ❌ Perfect UX polish (Phase 7 focus)
- ❌ Mobile optimization (Phase 7 focus)

---

## 11. Next Steps After UAT

### If GO ✅

**Immediate (Week 2):**
1. Prioritize Phase 2-8 tasks based on UAT feedback
2. Plan sprint: 2-3 days focused work
3. Configure OpenAI API key
4. Seed database with real content for testing

**Sprint Order (Suggested):**
1. Phase 5: Real data integration (most impactful for UX)
2. Phase 3: LLM explanations (core feature)
3. Phase 7: UX polish (typing indicators, formatting)
4. Phase 4: Free-text answers (complex, test last)
5. Phase 2: Intent classifier tuning (use UAT data)
6. Phase 8: Testing & documentation

### If NO-GO ❌

**Immediate:**
1. Fix critical bugs
2. Address discovery/usability issues
3. Re-run UAT with fixes (mini-UAT, 2-3 testers)

**Before Phase 2-8:**
- Achieve GO criteria
- Re-validate with small group

---

## Appendix A: Sample Test Script

**For Test Coordinator to read to participants:**

> "Thanks for helping test our new conversational learning feature! This is early-stage, so some responses will be basic placeholders - that's expected.
>
> I'm going to give you scenarios to try. Please think aloud as you go, and be honest about what's confusing or frustrating. There are no wrong answers - we're testing the system, not you!
>
> At the end, I'll ask for your feedback via a short survey. The whole session should take about 30 minutes. Ready? Let's start!"

---

## Appendix B: Quick Reference for Testers

**Keyboard Shortcuts:**
- `Cmd+K` (Mac) or `Ctrl+K` (Windows) - Open chat
- `/` key - Open chat
- `Esc` - Close chat
- `Enter` - Send message
- `Shift+Enter` - New line in message

**Expected Behavior (Phase 1):**
- ✅ Chat panel opens/closes
- ✅ Messages sent and received
- ✅ Suggestion chips clickable
- ⚠️ Responses are placeholder text (not real data)
- ⚠️ Session lost on page reload

**What to Test:**
1. Can you find the chat?
2. Can you send messages?
3. Do responses make sense?
4. What features feel missing?

---

**Document Version:** 1.0  
**Created:** Oct 12, 2025  
**Owner:** Epic 8 Test Coordinator  
**Status:** Ready for UAT

