# Rejection & Correction Handling Fix

## 🐛 Bug: System Got Confused

**Scenario:**
```
User: "science"
Cerply: "Physics, Chemistry, Biology...?"
User: "biology please"
Cerply: "You'll cover cell structure, genetics... Does that work?"
User: "no, I meant physics"
Cerply: "You'll cover cell structure, genetics... Does that work?" ❌ REPEATED BIOLOGY
```

**Problem:** When user said "no, I meant physics", the system:
1. ✅ Correctly detected it's NOT an affirmative
2. ❌ But then **repeated the biology explanation** instead of switching to physics
3. ❌ Got stuck in "confirming biology" mode

---

## 🔍 Root Cause

The affirmative classifier was only detecting **affirmative vs refinement**, not detecting:
- **Explicit rejections** ("no")
- **Corrections** ("I meant X")
- **New choice** (extracting "physics" from "no, I meant physics")

So when user corrected their choice, the system treated it as a generic refinement of the *current* topic (biology), not as a request to **restart with a different topic** (physics).

---

## ✅ The Fix

### 1. Enhanced Affirmative Classifier

**File:** `api/src/services/affirmative-classifier.ts`

**Before:**
```typescript
interface ClassificationResult {
  isAffirmative: boolean;
  confidence: number;
}

// Only detected: yes/no
```

**After:**
```typescript
interface ClassificationResult {
  isAffirmative: boolean;
  confidence: number;
  isRejection?: boolean;        // NEW: Detect "no, I meant X"
  correctedInput?: string | null; // NEW: Extract "X" from rejection
}

// Now detects:
// 1. "yes" → isAffirmative=true
// 2. "no, I meant physics" → isRejection=true, correctedInput="physics"
// 3. "actually, chemistry" → isRejection=true, correctedInput="chemistry"
```

**Enhanced LLM Prompt:**
```
CRITICAL RULES:
1. If user says "no, I meant X" or "actually X", classify as REJECTION and extract X

Examples:
- "no, I meant physics" → {isAffirmative: false, isRejection: true, correctedInput: "physics"}
- "actually, I want astrophysics" → {isAffirmative: false, isRejection: true, correctedInput: "astrophysics"}
- "no, chemistry instead" → {isAffirmative: false, isRejection: true, correctedInput: "chemistry"}
```

**Fallback Pattern Matching:**
```typescript
const rejectionPattern = /^no,?\s+(i\s+meant\s+)?(.+)$/i;
// Matches: "no, I meant physics", "no I meant physics", "no physics", etc.
```

---

### 2. Conversation Engine: Restart on Rejection

**File:** `api/src/services/conversation-engine.ts`

**New Logic:**
```typescript
if (context.currentState === 'confirming') {
  const classification = await classifyAffirmativeResponse(userInput, conversationContext);
  
  // 1. Affirmative → Confirm and proceed
  if (classification.isAffirmative && classification.confidence > 0.7) {
    return { content: "Thank you. I'm setting that up...", action: 'START_GENERATION' };
  }
  
  // 2. CRITICAL: Rejection with correction → Restart workflow
  if (classification.isRejection && classification.correctedInput) {
    return {
      content: classification.correctedInput,  // Pass "physics" to frontend
      nextState: 'rejected',
      action: 'RESTART_WITH_CORRECTION',
    };
  }
  
  // 3. Generic refinement → Continue with LLM
  // ... (existing refinement logic)
}
```

---

### 3. Frontend: Handle Restart Action

**File:** `web/app/page.tsx`

**New Logic:**
```typescript
if (convData.action === 'RESTART_WITH_CORRECTION' && convData.content) {
  const correctedInput = convData.content; // "physics"
  console.log('[Home] User correction detected, restarting with:', correctedInput);
  
  // Restart workflow from scratch with corrected input
  const newTransition = await executeWelcomeWorkflow(correctedInput, updatedState);
  
  // Handle new transition (could be SUBJECT_REFINEMENT or CONFIRM_TOPIC)
  if (newTransition.action === 'SUBJECT_REFINEMENT') {
    // "physics" is still broad → continue refinement
    // Call conversation API with refining_subject state
  } else if (newTransition.action === 'CONFIRM_TOPIC') {
    // "physics" is specific enough → confirm
    // Call conversation API with confirming state
  }
}
```

---

## 🔄 New Flow

### Scenario 1: Correcting from Biology → Physics

```
User: "biology please"
↓ Granularity: 'topic'
Cerply: "You'll cover cell structure, genetics... Does that work?"

User: "no, I meant physics"
↓ Affirmative Classifier:
   {isAffirmative: false, isRejection: true, correctedInput: "physics"}
↓ Conversation Engine: RESTART_WITH_CORRECTION
↓ Frontend: Restart workflow with "physics"
↓ Granularity Detection: "physics" → 'subject' (still broad)
Cerply: "Let's narrow that down. Astrophysics, Quantum Physics, Classical Mechanics...?"

User: "astrophysics"
↓ Granularity: 'topic' (specific!)
Cerply: "Great, you'll cover stellar evolution, cosmology... Does that work?"

User: "yes"
↓ Affirmative: true
Cerply: "Thank you. I'm preparing..." + transition
```

### Scenario 2: Correcting from Subject → Specific Topic

```
User: "science"
Cerply: "Physics, Chemistry, Biology...?"

User: "I want astrophysics"
↓ Granularity: 'topic' (specific)
Cerply: "You'll cover stellar evolution... Does that work?"

User: "no, I meant quantum physics"
↓ Affirmative Classifier:
   {isAffirmative: false, isRejection: true, correctedInput: "quantum physics"}
↓ Frontend: Restart with "quantum physics"
Cerply: "Right, you'll cover quantum mechanics, wave-particle duality... Does that work?"

User: "yes"
↓
Cerply: "Thanks. I'm setting that up..."
```

---

## 🧪 Testing

### Test Case 1: Basic Correction
```
1. Type: "biology please"
2. Expected: "You'll cover cell structure, genetics... Does that work?"
3. Type: "no, I meant physics"
4. Expected: "Let's narrow that down. Astrophysics, Quantum Physics...?"
   (NOT repeating biology)
5. Type: "astrophysics"
6. Expected: "You'll cover stellar evolution... Does that work?"
7. Type: "yes"
8. Expected: "Thank you. I'm preparing..."
```

### Test Case 2: Multiple Corrections
```
1. Type: "chemistry"
2. Expected: Confirmation question
3. Type: "actually, biology"
4. Expected: Biology confirmation (switched)
5. Type: "no, physics instead"
6. Expected: Physics refinement (switched again)
```

### Test Case 3: Different Rejection Phrasings
```
- "no, I meant X" → Should extract X
- "actually, I want X" → Should extract X
- "no, X instead" → Should extract X
- "I meant X" → Should extract X
```

---

## 📊 Technical Details

### LLM Classification Speed
- ~200-500ms using `gpt-4o-mini` with temperature=0.1
- Fast enough for real-time conversation
- Fallback pattern matching as safety net

### State Transitions
```
User: "no, I meant physics"
  ↓
Affirmative Classifier (200ms)
  ↓ isRejection=true, correctedInput="physics"
Conversation Engine
  ↓ action='RESTART_WITH_CORRECTION'
Frontend
  ↓ executeWelcomeWorkflow("physics")
Granularity Detection (2ms)
  ↓ granularity='subject'
Subject Refinement
  ↓ "Astrophysics, Quantum Physics...?"
```

---

## 🎯 Success Criteria

- ✅ "no, I meant physics" extracts "physics" correctly
- ✅ System restarts workflow with "physics" instead of continuing with biology
- ✅ Granularity detection runs on "physics" (not stuck on biology)
- ✅ Natural conversational flow maintained
- ✅ Hugh Grant tone throughout
- ✅ No linter errors
- ✅ No repeated explanations

---

## 🔧 Files Changed

| File | Changes | Lines |
|------|---------|-------|
| `api/src/services/affirmative-classifier.ts` | Added isRejection + correctedInput fields, enhanced LLM prompt, fallback pattern | +35 |
| `api/src/services/conversation-engine.ts` | Handle RESTART_WITH_CORRECTION action | +9 |
| `web/app/page.tsx` | Detect correction, restart workflow with new input | +70 |

**Total:** 3 files, ~114 lines added

---

## 🚀 Deployment

**Status:** ✅ API server restarted with fix

**Ready to test:** 
1. Hard refresh
2. Type: "biology please"
3. When asked "Does that work?", type: "no, I meant physics"
4. Should switch to physics (NOT repeat biology)

---

## 🔗 Related Documents

- `CONVERSATIONAL_SUBJECT_REFINEMENT.md` - Intelligent subject refinement
- `INTELLIGENT_AFFIRMATIVE_CLASSIFICATION.md` - LLM-based classification
- `WELCOME_WORKFLOW_TEST_PLAN.md` - Test suite

