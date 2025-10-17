# Welcome Workflow - Manual Testing Guide

**Status:** Ready for Testing  
**Date:** October 16, 2025

---

## Pre-Testing Setup

### Step 1: Run Database Migration

**Command:**
```bash
cd api
npm run migrate
```

**Expected Output:**
```
✓ Migration 019_welcome_workflow.sql applied successfully
```

**What this does:**
- Creates `user_conversations` table
- Creates `user_workflow_decisions` table
- Creates 5 performance indexes

**If migration fails:**
- Check DATABASE_URL is set correctly
- Ensure PostgreSQL is running
- Check connection with: `npm run db:push`

---

### Step 2: Verify Servers Are Running

**API Server (Terminal 1):**
```bash
cd api
bash start-local.sh
```

**Expected:** Server listening at http://0.0.0.0:8080

**Web Server (Terminal 2):**
```bash
cd web
npm run dev
```

**Expected:** Ready in ~1-2s at http://localhost:3000

---

## Test Scenarios (5 Total)

### ✅ Scenario 1: Topic Request (Happy Path)

**Objective:** Verify topic-level learning requests work end-to-end

**Steps:**
1. Navigate to http://localhost:3000
2. **Observe:** Welcome message displays
3. Type: `teach me python programming`
4. Press Enter
5. **Observe:** System processes request (loading indicator)
6. **Observe:** System shows stub message about Build workflow

**Expected Behavior:**
- Loading indicator appears (~2-3 seconds)
- Message shows: "Great! I'll help you learn 'python programming'. (Build workflow coming soon)"
- Chat remains active (can send more messages)
- Workflow state saved to localStorage

**Success Criteria:**
- ✅ Intent detected as "learning"
- ✅ Granularity detected as "topic"
- ✅ Build handoff triggered (stub message shown)
- ✅ No errors in console
- ✅ Conversation stored in localStorage

**If it fails:**
- Check API server logs for errors
- Check browser console for errors
- Verify `/api/workflow/detect-intent` endpoint responds
- Check OpenAI API key is set

---

### ✅ Scenario 2: Subject Request (Topic Suggestions)

**Objective:** Verify subject-level requests show topic selection UI

**Steps:**
1. Refresh page (to reset state)
2. Type: `teach me leadership`
3. Press Enter
4. **Observe:** System detects subject-level granularity
5. **Observe:** Topic selection UI appears with 3-5 topics
6. Click on any topic (e.g., "Team Management")
7. **Observe:** System proceeds to Build handoff

**Expected Behavior:**
- Loading indicator during topic search (~2-3 seconds)
- Topic selection UI displays with:
  - 3-5 topic cards
  - Each with title + description
  - "Content available" badge if topic exists in DB
  - "I want something more specific..." refinement option
- Clicking topic proceeds to Build stub

**Success Criteria:**
- ✅ Subject-level detected correctly
- ✅ Topic search called (DB + LLM if needed)
- ✅ Topic selection UI renders properly
- ✅ Topics are relevant to "leadership"
- ✅ Clicking topic triggers Build handoff
- ✅ No errors in console

**If it fails:**
- Check `/api/topics/search` endpoint
- Verify fuzzy matching works (check API logs)
- Check if LLM is generating topics (if DB empty)
- Verify TopicSelection component renders

---

### ✅ Scenario 3: Continue Path (No Active Modules)

**Objective:** Verify "Continue" fallback when user has no modules

**Steps:**
1. Refresh page
2. Scroll to bottom of page
3. Click "Continue" shortcut button (or type `continue`)
4. **Observe:** System queries database for active modules
5. **Observe:** System shows fallback message

**Expected Behavior:**
- Loading indicator briefly appears
- Message: "You don't have any active learning modules yet. What would you like to learn?"
- Chat remains active
- User can proceed to new learning request

**Success Criteria:**
- ✅ "Continue" intent detected
- ✅ Database queried for active modules
- ✅ Fallback message shown (since DB likely empty)
- ✅ Chat flow continues naturally
- ✅ No errors in console

**If it fails:**
- Check `/api/learner/active-modules` endpoint
- Verify user_id is being sent correctly
- Check database connection

---

### ✅ Scenario 4: Shortcut Detection

**Objective:** Verify shortcut buttons and text detection work

**Steps:**
1. Refresh page
2. Test shortcut button: Click "Progress" at bottom
3. **Observe:** Stub message appears
4. Test shortcut text: Type `show my progress`
5. **Observe:** Same stub message appears

**Expected Behavior:**
- Button click: "The progress dashboard is coming soon..."
- Text input: Same message (intent detection via LLM)
- Chat remains active
- User can continue conversation

**Success Criteria:**
- ✅ Shortcut button click works
- ✅ Shortcut text detection works
- ✅ Stub messages are user-friendly
- ✅ No errors in console

**Test all shortcuts:**
- Upload: "upload a document"
- Progress: "show my progress"
- Curate: "I want to create content" (Manager only)
- Search: "help me find a topic"
- About: "tell me about Cerply"
- Challenge: "I disagree with this"

**If it fails:**
- Check intent detection with shortcuts
- Verify `/api/workflow/detect-intent` classifies correctly
- Check shortcut routing in `welcome.ts`

---

### ✅ Scenario 5: Conversation Persistence

**Objective:** Verify conversation survives page refresh

**Steps:**
1. Refresh page
2. Type: `teach me python`
3. Wait for response
4. Type: `yes`
5. **Observe:** Conversation has 4 messages (welcome + your 2 + system 2)
6. **Refresh the page** (F5 or Cmd+R)
7. **Observe:** All messages still visible

**Expected Behavior:**
- Conversation history restored from localStorage
- All messages in correct order
- Workflow state restored
- Chat input remains functional

**Success Criteria:**
- ✅ Messages stored in localStorage
- ✅ State restored after refresh
- ✅ Conversation continues seamlessly
- ✅ No duplicate messages
- ✅ No errors in console

**Check localStorage:**
- Open browser DevTools (F12)
- Go to Application tab
- Storage > Local Storage > http://localhost:3000
- Look for `cerply_workflow_state` key
- Verify it contains conversation data

**If it fails:**
- Check localStorage permissions
- Verify `saveWorkflowState()` is called after each message
- Check browser console for storage errors

---

## Acceptance Criteria Summary

After completing all 5 scenarios, verify:

### Functional Requirements
- ✅ User can enter learning goals naturally
- ✅ System detects intent accurately (shortcuts vs learning)
- ✅ Topic-level requests proceed to Build handoff
- ✅ Subject-level requests show topic suggestions
- ✅ Continue path handles empty/active modules correctly
- ✅ Shortcuts are detected via buttons and text
- ✅ Conversation persists across page refreshes

### Non-Functional Requirements
- ✅ Response time < 3 seconds for LLM calls
- ✅ No console errors during normal flow
- ✅ UI is accessible (keyboard navigation works)
- ✅ Loading states appear during API calls
- ✅ Error messages are user-friendly
- ✅ Mobile responsive (test on small screen)

### Technical Requirements
- ✅ Database tables created successfully
- ✅ All 4 API endpoints responding
- ✅ Conversation stored in database (check with SQL)
- ✅ localStorage state management working
- ✅ Workflow transitions logged correctly

---

## Troubleshooting Common Issues

### Issue 1: "Unable to connect to API"

**Symptoms:** Frontend shows connection error

**Fixes:**
1. Check API server is running on port 8080
2. Check OPENAI_API_KEY is set in API server
3. Check ADMIN_TOKEN matches in both API and Web
4. Restart API server with: `pkill -9 node && cd api && bash start-local.sh`

### Issue 2: "LLM Unavailable"

**Symptoms:** Intent detection fails with 503 error

**Fixes:**
1. Verify OPENAI_API_KEY is valid (not expired)
2. Check OpenAI API status (platform.openai.com/status)
3. Check API server logs for detailed error
4. System should fallback to pattern matching (check logs)

### Issue 3: Migration Fails

**Symptoms:** `npm run migrate` shows error

**Fixes:**
1. Check DATABASE_URL includes `?sslmode=require` (for Render)
2. Check PostgreSQL is running
3. Try `npm run db:push` instead
4. Manually run SQL from `api/migrations/019_welcome_workflow.sql`

### Issue 4: No Topics Returned

**Symptoms:** Subject-level request shows empty topic list

**Fixes:**
1. Check LLM is generating topics (API logs)
2. Verify `/api/topics/search` endpoint works
3. Database might be empty (expected on first run)
4. LLM should generate 3-5 topics as fallback

### Issue 5: Conversation Not Persisting

**Symptoms:** Messages disappear after refresh

**Fixes:**
1. Check localStorage is enabled in browser
2. Check browser DevTools > Application > Local Storage
3. Verify `saveWorkflowState()` is called (add console.log)
4. Check for storage quota exceeded (unlikely with small data)

---

## Performance Testing (Optional)

If you want to measure performance:

### Response Times

**Measure with browser DevTools (Network tab):**
1. Open DevTools (F12) > Network tab
2. Type a learning request
3. Find `/api/workflow/detect-intent` request
4. Check response time

**Expected:**
- Intent detection: < 3 seconds
- Topic search: < 2 seconds
- Conversation storage: < 500ms
- Active modules query: < 1 second

### Load Testing (Optional)

**Simple load test with curl:**
```bash
# Test intent detection endpoint
time curl -X POST http://localhost:8080/api/workflow/detect-intent \
  -H "Content-Type: application/json" \
  -H "x-admin-token: test-admin-token" \
  -d '{
    "userInput": "teach me python",
    "conversationHistory": [],
    "userId": "test-user"
  }'
```

**Expected:** < 3 seconds total time

---

## Database Verification (Optional)

**Check if conversations are being stored:**

```bash
# Connect to database
psql $DATABASE_URL

# Check user_conversations table
SELECT * FROM user_conversations LIMIT 5;

# Check user_workflow_decisions table
SELECT * FROM user_workflow_decisions LIMIT 5;

# Exit
\q
```

**Expected:**
- Conversations appear in `user_conversations`
- Each message stored in JSONB `messages` column
- `last_active` timestamp updates with each message

---

## Reporting Issues

**If you find bugs, report with:**

1. **Scenario name** (e.g., "Scenario 2: Subject Request")
2. **Steps to reproduce** (e.g., "Typed 'teach me leadership', clicked first topic")
3. **Expected behavior** (e.g., "Should route to Build handoff")
4. **Actual behavior** (e.g., "Topic selection UI disappeared, no response")
5. **Console errors** (paste from browser DevTools)
6. **API logs** (paste from API server terminal)

**Paste in chat and I'll help debug!**

---

## Success Checklist

After completing all scenarios:

- [ ] Scenario 1: Topic request works ✅
- [ ] Scenario 2: Subject request shows topic selection ✅
- [ ] Scenario 3: Continue path handles no modules ✅
- [ ] Scenario 4: Shortcuts detected via button and text ✅
- [ ] Scenario 5: Conversation persists after refresh ✅
- [ ] No console errors during testing ✅
- [ ] Response times < 3 seconds ✅
- [ ] Mobile responsive (bonus) ✅

**If all checked:** ✅ Welcome Workflow APPROVED for production

**Next step:** Create Build Workflow implementation prompt

---

## Quick Reference

**Start Testing:**
```bash
# Terminal 1: API
cd api && bash start-local.sh

# Terminal 2: Web
cd web && npm run dev

# Terminal 3: Migration
cd api && npm run migrate
```

**Test URL:** http://localhost:3000

**Shortcuts to Test:**
- Upload, Challenge, Progress, Account, Curate

**Key DevTools Tabs:**
- Console (errors)
- Network (API calls)
- Application (localStorage)

---

**Ready to test?** Start with Step 1 (database migration), then work through each scenario. Report back with results! 🚀

