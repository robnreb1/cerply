# Conversational Subject Refinement

## 🎯 Philosophy Change

**OLD APPROACH (WRONG):**
- Detect subject → Generate 5 topic suggestions → Show UI widget with buttons
- Static, predetermined list
- Not adaptive to user's specific interest
- Feels like a menu, not a conversation

**NEW APPROACH (CORRECT):**
- Detect subject → Start **guided conversational refinement**
- LLM adapts questions based on user's answers
- Multi-level narrowing: Subject → Sub-area → Specialization → Topic
- Natural dialogue until we reach a focused topic
- Only then ask "Does that work for you?" and proceed to build

---

## 💬 Example Flow

### Flow 1: Science → Physics → Astrophysics

```
User: "science"
Cerply: "I'd be happy to help with science. Are you interested in Physics, 
         Chemistry, Biology, Earth Sciences, or something else entirely?"

User: "physics"
Cerply: "Let's narrow that down a little. Would you like to explore Astrophysics, 
         Quantum Physics, Classical Mechanics, Thermodynamics, or something more specific?"

User: "astrophysics"
Cerply: "Great, so you'll be covering stellar evolution, cosmology, and the 
         physics of celestial phenomena. Does that work for you?"

User: "yes"
Cerply: "Thank you. I'm preparing your learning content now."
        "While we wait, would you like to continue with your live topics..."
```

### Flow 2: Leadership → Team Management → Conflict Resolution

```
User: "leadership"
Cerply: "I can help with leadership. Are you interested in Team Management, 
         Strategic Thinking, Communication Skills, or something else?"

User: "team management"
Cerply: "Let's get more specific. Would you like to focus on Conflict Resolution, 
         Delegation Skills, Team Building, or Performance Management?"

User: "conflict resolution"
Cerply: "Right, you'll learn de-escalation techniques, mediation strategies, 
         and how to turn disagreements into productive conversations. Does that work for you?"

User: "yes"
Cerply: "Thanks. I'm setting that up for you now."
```

---

## 🏗️ Technical Implementation

### 1. **Granularity Detection** (Unchanged)

**File:** `api/src/services/llm-orchestrator.ts`
- Function: `detectGranularity(input)`
- Returns: `'subject'` | `'topic'` | `'module'`
- Examples:
  - "science" → `'subject'`
  - "physics" → `'subject'` (still broad)
  - "astrophysics" → `'topic'` (focused)

### 2. **Workflow Routing** (Modified)

**File:** `web/app/workflows/welcome.ts`

**Before:**
```typescript
if (granularity === 'subject') {
  // Search topics, show UI widget
  return { action: 'SHOW_TOPIC_SELECTION', data: { topicSuggestions: [...] } };
}
```

**After:**
```typescript
if (granularity === 'subject') {
  // Start conversational refinement
  return { 
    action: 'SUBJECT_REFINEMENT', 
    data: { 
      subjectName: userInput,
      refinementLevel: 'subject'
    } 
  };
}
```

### 3. **Frontend Handler** (New)

**File:** `web/app/page.tsx` (lines 380-432)

```typescript
if (transition.action === 'SUBJECT_REFINEMENT') {
  // Call conversation API with special state
  const conversationResponse = await fetch('/api/conversation', {
    method: 'POST',
    body: JSON.stringify({
      userInput: userInput,
      messageHistory: updatedState.conversationHistory,
      currentState: 'refining_subject', // NEW STATE
      originalRequest: transition.data.subjectName,
      metadata: {
        granularity: 'subject',
        refinementLevel: 'subject',
      },
    }),
  });
  
  // Display LLM's conversational response
  const convData = await conversationResponse.json();
  setMessages(prev => [...prev, { role: 'assistant', content: convData.content }]);
}
```

### 4. **Conversation Engine** (New State)

**File:** `api/src/services/conversation-engine.ts` (lines 155-192)

**Key Logic:**
```typescript
if (context.currentState === 'refining_subject') {
  const subject = context.originalRequest || userInput;
  const conversationHistory = context.messageHistory.slice(-4);
  
  userPrompt = `CONTEXT: The learner wants to learn about "${subject}" (a BROAD SUBJECT).

CONVERSATION SO FAR:
${conversationHistory}

YOUR TASK: Guide them from broad → specific through natural conversation.

INTELLIGENT REFINEMENT STRATEGY:
1. If this is their FIRST mention of the subject:
   - Offer 3-5 MAJOR SUB-AREAS
   - Include "or something else?" at the end
   - Example: "Are you interested in Physics, Chemistry, Biology, or something else?"

2. If they've narrowed down ONCE but it's STILL broad:
   - Go ONE LEVEL DEEPER with 3-5 specializations
   - Example: "Would you like to explore Astrophysics, Quantum Physics, or something more specific?"

3. If they've narrowed down TWICE or their answer is SPECIFIC:
   - Treat it as a focused TOPIC
   - Explain what they'll learn (2-3 concrete things)
   - Ask for confirmation: "Does that work for you?"

CRITICAL RULES:
- Keep response to 2-3 sentences MAX
- Use simple, clear language
- Make it conversational, not like a menu
- Adapt options based on their interest
```

---

## 🔄 State Transitions

```
User Input ("science")
  ↓
Granularity Detection → 'subject'
  ↓
Workflow: action = 'SUBJECT_REFINEMENT'
  ↓
Frontend: Call /api/conversation with currentState='refining_subject'
  ↓
Conversation Engine: Generate adaptive question
  ↓
Frontend: Display response, await user reply
  ↓
User Input ("physics")
  ↓
Granularity Detection → 'subject' (still broad)
  ↓
Frontend: Detect we're still in refinement (check message history)
  ↓
Frontend: Call /api/conversation with currentState='refining_subject' again
  ↓
Conversation Engine: Go deeper, generate next level question
  ↓
User Input ("astrophysics")
  ↓
Granularity Detection → 'topic' (focused!)
  ↓
Workflow: action = 'CONFIRM_TOPIC'
  ↓
Frontend: Call /api/conversation with currentState='confirming'
  ↓
Conversation Engine: Explain what they'll learn + ask confirmation
  ↓
User Input ("yes")
  ↓
Affirmative Classifier → isAffirmative=true
  ↓
Hardcoded Response → "Thank you. I'm preparing..."
  ↓
Transition Message → "While we wait..."
  ↓
Build Workflow (to be implemented)
```

---

## 🧪 Testing Instructions

### Test 1: Basic Subject Refinement
```
1. Hard refresh (Cmd+Shift+R)
2. Type: "science"
3. Expected: "I'd be happy to help with science. Are you interested in Physics, Chemistry, Biology...?"
4. Type: "physics"
5. Expected: "Let's narrow that down. Astrophysics, Quantum Physics, Classical Mechanics...?"
6. Type: "astrophysics"
7. Expected: "Great, you'll cover stellar evolution... Does that work for you?"
8. Type: "yes"
9. Expected: "Thank you. I'm preparing..." + transition message
```

### Test 2: Free-text Refinement
```
1. Type: "leadership"
2. Expected: Offers sub-areas like "Team Management, Strategic Thinking..."
3. Type: "I want to learn how to handle difficult team members"
4. Expected: Should recognize this as specific (conflict resolution) and confirm
```

### Test 3: Multi-level Refinement
```
1. Type: "business"
2. Expected: Offers broad areas (Finance, Marketing, Operations, etc.)
3. Type: "finance"
4. Expected: Goes deeper (Corporate Finance, Personal Finance, Investment, etc.)
5. Type: "investment"
6. Expected: Goes even deeper or confirms if specific enough
```

### Test 4: "Something else" Handling
```
1. Type: "science"
2. Expected: "...Physics, Chemistry, Biology, or something else?"
3. Type: "I'm interested in environmental science"
4. Expected: Should adapt and either offer sub-areas or confirm
```

---

## 📊 Success Criteria

- ✅ No UI widget with topic buttons
- ✅ Pure conversational flow
- ✅ LLM adapts questions based on conversation history
- ✅ Multi-level refinement (2-3 rounds if needed)
- ✅ Only asks confirmation when topic-level reached
- ✅ Hugh Grant tone maintained throughout
- ✅ Responses stay 2-3 sentences
- ✅ Natural, not menu-like

---

## 🔧 Files Changed

| File | Changes | Lines |
|------|---------|-------|
| `api/src/services/conversation-engine.ts` | Added 'refining_subject' state + intelligent refinement prompt | +47 |
| `web/app/workflows/welcome.ts` | Replaced topic widget with conversational refinement | -50, +10 |
| `web/app/page.tsx` | Added SUBJECT_REFINEMENT handler | +53 |
| `web/app/lib/workflow-state.ts` | Added 'SUBJECT_REFINEMENT' to action types | +1 |

**Total:** 4 files, ~61 net lines added

---

## 🚀 Deployment

**Status:** ✅ API server restarted with changes

**Ready to test:** Hard refresh and type "science"

---

## 📝 Key Differences from Previous Approach

| Aspect | OLD (UI Widget) | NEW (Conversational) |
|--------|----------------|---------------------|
| **Presentation** | Buttons in UI component | Natural chat messages |
| **Adaptability** | Static 5 topics | LLM adapts to user |
| **Depth** | Single level | Multi-level (2-3 rounds) |
| **User Experience** | Feels like menu | Feels like conversation |
| **Flexibility** | Predetermined topics | Handles "something else" naturally |
| **Intelligence** | DB search + template | LLM-powered guidance |
| **Tone** | Generic | Hugh Grant style |

---

## 🎯 Why This Approach is Better

1. **More Helpful:** Guides user intelligently based on their specific interest
2. **More Natural:** Feels like talking to an expert advisor, not clicking through a menu
3. **More Flexible:** Handles unexpected requests ("I want to learn about X specifically")
4. **More Scalable:** Works for ANY subject without pre-generating topic lists
5. **More Intelligent:** LLM understands context and adapts questions
6. **B2B Ready:** Professional, guided experience suitable for enterprise learners

---

## 🔗 Related Documents

- `GRANULARITY_DETECTION_FIX.md` - Granularity detection implementation
- `INTELLIGENT_AFFIRMATIVE_CLASSIFICATION.md` - Affirmative response handling
- `CONTENT_GENERATION_STRATEGY.md` - Topics as anchor point
- `WELCOME_WORKFLOW_TEST_PLAN.md` - Test suite

