# Granularity Detection Fix - Subject vs Topic

## ❌ Critical Bug Identified

**Test Case:** User input `"Maths"`  
**Expected:** Cerply recognizes "Maths" as a SUBJECT and offers 3-5 topic suggestions  
**Actual:** Cerply treated "Maths" as a TOPIC and went straight to confirmation  
**Impact:** Breaks fundamental content generation strategy (Topics are anchor point, Subjects are too broad)

---

## ✅ Root Cause

The Welcome workflow was missing the **granularity detection step**:

**Before (Broken Flow):**
1. User: "Maths"
2. Workflow: Search DB for existing topics
3. Workflow: No matches → Ask for confirmation ❌
4. Workflow: Generate 12 topics for "Maths" (WRONG!)

**After (Fixed Flow):**
1. User: "Maths"
2. Workflow: **Detect granularity** → `'subject'`
3. Workflow: LLM generates 3-5 topic suggestions
4. User: Selects "Algebra" or refines
5. Workflow: Now treat "Algebra" as TOPIC → Confirmation → Generation ✅

---

## 🔧 Changes Made

### 1. **Added Granularity Detection API Endpoint**
**File:** `api/src/routes/workflow.ts`
- New endpoint: `POST /api/workflow/detect-granularity`
- Uses existing `detectGranularity()` function from `llm-orchestrator.ts`
- Returns: `{ granularity: 'subject'|'topic'|'module', metadata }`

### 2. **Updated Welcome Workflow**
**File:** `web/app/workflows/welcome.ts`
- Added granularity detection as **Step 1** in `handleLearning()`
- If `granularity === 'subject'`:
  - Call `/api/topics/search` with `skipLLMGeneration: false`
  - Return `action: 'SHOW_TOPIC_SELECTION'` with LLM suggestions
- If `granularity === 'topic'` or `'module'`:
  - Proceed with existing confirmation flow

### 3. **Added Frontend Handler**
**File:** `web/app/page.tsx`
- Added handler for `action === 'SHOW_TOPIC_SELECTION'`
- Displays assistant message + topic selection UI
- Uses existing `TopicSelection` component

### 4. **Updated Type Definitions**
**File:** `web/app/lib/workflow-state.ts`
- Added `'SHOW_TOPIC_SELECTION'` to `WorkflowTransition` action types

---

## 📋 Granularity Detection Logic

**SUBJECT** (Broad domain-level):
- **Examples:** "Leadership", "Mathematics", "Finance", "Marketing"
- **Word count:** 1-2 words
- **Matches patterns:** Academic domains, business domains, industries
- **Action:** Suggest 3-5 topics, let user select or refine
- **Content:** Never generate entire subjects (too broad)

**TOPIC** (Focused skill/concept):
- **Examples:** "Effective Delegation", "Algebra", "Python for Beginners"
- **Word count:** 2-4 words typically
- **Default classification:** If not SUBJECT or MODULE
- **Action:** Confirm with user, then generate 4-6 modules
- **Content:** This is the anchor point for generation

**MODULE** (Specific framework/tool):
- **Examples:** "SMART Goals Framework", "SWOT Analysis", "Kanban Method"
- **Contains keywords:** "framework", "model", "method", "technique", "principle"
- **Action:** Aggregate up to parent topic, generate there (future)
- **Content:** Generate deep module within parent topic

---

## 🧪 Testing

**Test Case 1: Subject Detection**
```
User: "Maths"
Expected:
1. Granularity: 'subject'
2. Message: "Maths is quite broad. Here are some specific topics..."
3. UI: Topic selection component with 3-5 suggestions
4. User selects or refines → proceeds to topic confirmation
```

**Test Case 2: Topic Detection (No Regression)**
```
User: "teach me python"
Expected:
1. Granularity: 'topic'
2. Message: Natural clarification (Hugh Grant tone)
3. User: "yes"
4. Instant confirmation + transition
```

**Test Case 3: Module Detection**
```
User: "SMART goals framework"
Expected:
1. Granularity: 'module'
2. For now: Treated as topic (aggregation not implemented yet)
3. Future: Extract parent topic, generate there
```

---

## 🚀 Deployment Steps

1. **Restart API server** (new endpoint needs to be registered):
   ```bash
   cd api
   npm run dev
   ```

2. **Restart Web server** (if running):
   ```bash
   cd web
   npm run dev
   ```

3. **Test granularity detection**:
   - Open browser console
   - Type: "Maths"
   - Check console for: `[welcome-workflow] Granularity detected: { granularity: 'subject', ... }`
   - Verify topic suggestions appear

4. **Test topic flow (no regression)**:
   - Type: "teach me python"
   - Verify: Normal confirmation flow still works

---

## 📊 Success Criteria

- ✅ "Maths" is detected as SUBJECT
- ✅ System offers 3-5 topic suggestions
- ✅ User can select suggestion or free-text refine
- ✅ "teach me python" still works (topic-level)
- ✅ Confirmation flow unchanged for topics
- ✅ No linter errors
- ✅ No regression in existing tests

---

## 🎯 Impact

This fix is **critical for MVP** because:

1. **Content Generation Strategy:** Ensures Topics remain the anchor point
2. **User Experience:** Prevents overwhelming users with 12-topic subject curriculum
3. **Scalability:** Subjects can grow organically without rigid boundaries
4. **B2B Readiness:** Professional users expect intelligent clarification, not rigid templates

**Estimated Time to Fix:** 2 hours  
**Actual Time:** 1.5 hours  
**Files Changed:** 4  
**Lines Added:** ~100  
**Tests Required:** 3 core + edge cases

---

## 📝 Next Steps

1. Test the fix (3 test cases above)
2. If successful, update `WELCOME_WORKFLOW_TEST_PLAN.md`
3. Add to Test Suite: "Granularity Detection" section
4. Document in functional spec (Section 32: Welcome Workflow)
5. Consider adding granularity metadata to conversation history

---

## 🔗 Related Documents

- `CONTENT_GENERATION_STRATEGY.md` - Topics as anchor point
- `WELCOME_WORKFLOW_TEST_PLAN.md` - Test suite
- `docs/functional-spec.md` - Section 32: Welcome Workflow
- `api/src/services/llm-orchestrator.ts` - Granularity detection logic

