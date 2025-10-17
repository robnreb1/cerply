# Welcome Workflow Testing Plan

## ✅ Deterministic Response Inventory

### 1. Confirmation Responses (20 variations)
**Location:** `api/src/services/conversation-engine.ts` lines 35-56
**Trigger:** User confirms with "yes", "sure", "ok", etc.
**Examples:**
- "Thank you. I'm setting that up for you now."
- "Thanks. I'll get that organized for you."
- "Thank you. I'm preparing your learning content now."
- _(17 more variations)_

### 2. Transition Messages (21 variations) 
**Location:** `web/app/page.tsx` lines 161-183
**Trigger:** After confirmation, system shows next step options
**Examples:**
- "While we build your modules, would you like to continue with your live content, or perhaps explore other skills you may want to develop?"
- "I'm preparing your learning path now. In the meantime, would you like to continue with your current topics or explore something new?"
- "Your modules are being structured. Would you like to resume your active learning, or shall we look at other areas?"
- _(18 more variations)_

**Total Deterministic Responses: 41** ✅

---

## 🧪 Next Test Suite

### Test 1: **Basic Learning Request Flow** ✅ (COMPLETED)
- [x] User: "teach me to code"
- [x] Cerply: Clarification with supporting info
- [x] User: "yes"
- [x] Cerply: Instant confirmation + transition message
- [x] Performance: First response ~1.8s, confirmation ~70ms

**Status:** PASSED ✅

---

### Test 2: **Different Learning Phrasings**
Test that pattern matching works for various learning requests:

**Test Cases:**
1. `"learn python"` → Should detect learning intent instantly (~15ms)
2. `"how to build a website"` → Should detect learning intent instantly
3. `"explain quantum physics"` → Should detect learning intent instantly
4. `"I want to understand machine learning"` → Should detect learning intent
5. `"study Spanish"` → Should detect learning intent instantly

**Expected:**
- All requests detected as "learning" intent
- Fast pattern matching (10-20ms)
- Natural LLM clarification response
- Smooth confirmation flow

---

### Test 3: **Confirmation Variations** ✨ NOW INTELLIGENT
Test that all affirmative responses trigger hardcoded reply using **LLM classification** (not patterns):

**Test Cases (Natural Language):**
1. `"yes"` → Hardcoded response (~200-500ms)
2. `"yeah"` → Hardcoded response
3. `"sure"` → Hardcoded response
4. `"ok"` → Hardcoded response
5. `"sounds great"` → Hardcoded response
6. `"that's perfect"` → Hardcoded response
7. `"I'd like that"` → Hardcoded response
8. `"let's go with that"` → Hardcoded response
9. `"exactly what I want"` → Hardcoded response
10. `"that sounds good to me"` → Hardcoded response

**Expected:**
- Fast LLM classification (~200-500ms)
- Handles ANY natural language affirmative
- Random variation from 20 responses
- Followed by random transition message from 21 variations
- No pattern matching needed - fully adaptive!

**Note:** See `INTELLIGENT_AFFIRMATIVE_CLASSIFICATION.md` for implementation details

---

### Test 4: **Negative/Refinement Flow**
Test what happens when user doesn't confirm:

**Test Cases:**
1. User: `"teach me to code"`
2. Cerply: Clarification
3. User: `"no, I meant JavaScript specifically"` → Should refine understanding

**Expected:**
- Not detected as affirmative (no hardcoded response)
- Goes to LLM for refinement
- Asks for confirmation again
- Smooth conversational flow

---

### Test 5: **Continue Workflow** (STUB)
Test the "continue with live content" path:

**Test Cases:**
1. User: `"continue"` → Should detect as 'continue' intent
2. User: `"resume"` → Should detect as 'continue' intent
3. User: `"pick up where I left off"` → Should detect as 'continue' intent

**Expected:**
- Instant pattern matching for "continue"/"resume"
- Calls `/api/learner/active-modules`
- Shows friendly message about active modules
- OR prompts for new learning if no active modules

**Current Status:** Workflow exists but shows stub message

---

### Test 6: **Shortcut Routing** (STUB)
Test shortcut detection:

**Test Cases:**
1. User clicks "Progress" → Should route to progress shortcut
2. User clicks "Curate" → Should route to curate shortcut
3. User types `"show me my progress"` → Should detect progress intent

**Expected:**
- Instant pattern matching for shortcuts
- Appropriate routing to shortcut workflows
- Stub messages for unimplemented shortcuts

**Current Status:** Detection works, workflows show stub messages

---

### Test 7: **Conversation Memory & State**
Test that conversation is persisted:

**Test Cases:**
1. Complete a learning flow
2. Hard refresh page (Cmd+Shift+R)
3. Check if conversation history is restored

**Expected:**
- Conversation messages visible after refresh
- Workflow state maintained
- Can continue conversation naturally

**Current Status:** Should work (localStorage + DB storage)

---

### Test 8: **Performance & Stress Testing**
Test system under realistic usage:

**Test Cases:**
1. 5 different learning requests in a row
2. Mix of confirmations and refinements
3. Switch between shortcuts and learning
4. Multiple users (simulate with different browser sessions)

**Expected:**
- Consistent performance (~1.8s first, ~70ms confirmation)
- No memory leaks
- Proper state isolation between users
- Database stores all conversations

---

### Test 9: **Edge Cases**
Test unusual inputs:

**Test Cases:**
1. Very long topic request (500+ characters)
2. Empty input
3. Special characters / emoji
4. Non-English characters
5. Just punctuation

**Expected:**
- Graceful handling
- Appropriate error messages
- No crashes
- Fallback to safe responses

---

### Test 10: **Hugh Grant Tone Consistency**
Test that all LLM responses maintain the requested tone:

**Test Cases:**
1. Request 10 different learning topics
2. Review all clarification responses
3. Verify tone consistency

**Expected:**
- Polite, understated, well-spoken
- Simple, clear language (no jargon)
- No enthusiasm or exclamation marks (unless natural)
- Varied phrasing (not templated)
- Supporting information (not just restatement)

---

## 📊 Current Test Status

| Test | Status | Performance | Notes |
|------|--------|-------------|-------|
| 1. Basic Flow | ✅ PASSED | First: 1.8s, Confirm: 500ms | Excellent |
| 2. Phrasings | 🔲 TODO | - | Next priority |
| 3. Confirmations | ✨ INTELLIGENT | ~200-500ms | LLM classifier - handles ANY phrasing |
| 4. Refinement | ✅ PASSED | ~1.5s LLM response | Context preserved |
| 5. Continue | 🟡 STUB | - | Workflow exists |
| 6. Shortcuts | 🟡 STUB | - | Detection works |
| 7. Memory | 🔲 TODO | - | Should work |
| 8. Performance | 🔲 TODO | - | After main flows |
| 9. Edge Cases | 🔲 TODO | - | Before production |
| 10. Tone | 🔲 TODO | - | Ongoing validation |

---

## 🎯 Recommended Testing Order

1. **Test 2** (Different Phrasings) - Validates pattern matching breadth
2. **Test 3** (Confirmation Variations) - Validates hardcoded responses
3. **Test 4** (Refinement Flow) - Critical user journey
4. **Test 10** (Tone) - Quick validation during Tests 2-4
5. **Test 7** (Memory) - Infrastructure validation
6. **Test 5** (Continue) - When ready to implement
7. **Test 6** (Shortcuts) - When ready to implement
8. **Test 8** (Performance) - Before going wider
9. **Test 9** (Edge Cases) - Before production

---

## 🚀 Quick Start: Test 2 (Next Test)

**Test:** Different learning phrasings

**Steps:**
1. Hard refresh: `Cmd+Shift+R`
2. Type: `"learn python"`
3. Verify: Fast response (~1.8s), natural clarification
4. Type: `"yes"`
5. Verify: Instant response + transition
6. Refresh page
7. Type: `"how to build a website"`
8. Verify: Same performance
9. Type: `"yes"`
10. Verify: Different hardcoded variations

**Success Criteria:**
- All requests detected correctly
- Performance consistent (~1.8s, ~70ms)
- Tone maintained
- Different response variations

