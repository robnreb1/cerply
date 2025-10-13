# Epic 6: Granularity Detection Test Plan

**Date:** 2025-10-13  
**Critical Feature:** Intelligent detection of Subject vs Topic vs Module  
**Why Critical:** This IS the product differentiation - automated curriculum design

---

## 🎯 The Real Test

**Forget 4-6 modules.** The engine must intelligently detect:

### Subject (Broad Scope)
**Input:** "Leadership"  
**Expected:** Generate 8-12 **topics** (e.g., "Delegation", "Conflict Resolution", "Team Building")  
**Structure:** Subject → Topics (no modules yet)

### Topic (Focused Scope)
**Input:** "Effective Delegation"  
**Expected:** Generate 4-6 **modules** (e.g., "What to Delegate", "How to Delegate", "Following Up")  
**Structure:** Topic → Modules → Questions

### Module (Specific Scope)
**Input:** "SMART Goals Framework"  
**Expected:** Generate 1 **module** with deep content  
**Structure:** Module → Questions

---

## 🚨 Current Gap: Code Only Detects 'source' vs 'topic'

### What the code does now:
```typescript
// api/src/services/llm-orchestrator.ts line 437
export function detectInputType(input: string): 'source' | 'topic' {
  const topicIndicators = /^(teach me|learn about|explain|what (is|are)|how (does|do|to)|understand|create training on)/i;
  const isShort = input.trim().length < 200;
  const hasTopicRequest = topicIndicators.test(input.trim());
  
  return (hasTopicRequest || isShort) ? 'topic' : 'source';
}
```

**Problem:** No granularity detection! It treats "Leadership" (subject) and "SMART Goals" (module) the same.

### What we need:
```typescript
export function detectGranularity(input: string): 'subject' | 'topic' | 'module' {
  // SUBJECT indicators: Very broad, domain-level
  const subjectIndicators = /^(leadership|management|communication|finance|marketing|sales|hr|operations|strategy|innovation)$/i;
  
  // MODULE indicators: Very specific, framework/tool/technique
  const moduleIndicators = /(framework|model|method|technique|tool|principle|rule|law|theory|formula)/i;
  
  // TOPIC indicators: Focused skill/concept (default)
  // Anything between subject and module
  
  if (subjectIndicators.test(input.trim())) return 'subject';
  if (moduleIndicators.test(input.trim())) return 'module';
  return 'topic'; // Default to topic for most requests
}
```

---

## 🧪 Test Cases (15 Total)

### Subject Level (5 tests)
| Input | Expected Output | Why |
|-------|----------------|-----|
| "Leadership" | 8-12 topics | Single word, domain-level |
| "Financial Services" | 10-15 topics | Industry-level |
| "Soft Skills" | 8-10 topics | Category-level |
| "Risk Management" | 6-8 topics | Broad discipline |
| "Corporate Training" | 10-12 topics | Meta category |

**Success criteria:**
- ✅ Returns list of topics (not modules)
- ✅ Each topic is focused and teachable
- ✅ Topics don't overlap
- ✅ Comprehensive coverage of subject

---

### Topic Level (5 tests)
| Input | Expected Output | Why |
|-------|----------------|-----|
| "Effective Delegation" | 4-6 modules | Specific skill |
| "Active Listening" | 4-5 modules | Focused competency |
| "Conflict Resolution" | 5-6 modules | Multi-step process |
| "Time Management" | 4-6 modules | Practical skill |
| "Emotional Intelligence" | 5-7 modules | Complex skill set |

**Success criteria:**
- ✅ Returns list of modules (not topics)
- ✅ Each module is a learning unit
- ✅ Modules form logical progression
- ✅ 3-5 questions per module
- ✅ Quality score >0.90

---

### Module Level (5 tests)
| Input | Expected Output | Why |
|-------|----------------|-----|
| "SMART Goals Framework" | 1 module | Specific framework |
| "Eisenhower Matrix" | 1 module | Specific tool |
| "5 Whys Technique" | 1 module | Specific method |
| "RACI Matrix" | 1 module | Specific model |
| "Johari Window" | 1 module | Specific concept |

**Success criteria:**
- ✅ Returns 1 module with deep content
- ✅ Module explains framework thoroughly
- ✅ Includes step-by-step guide
- ✅ 5-8 questions (more depth)
- ✅ Practical examples

---

## 🛠️ Testing Approach

### Option 1: API Testing (Current)
**Problem:** API is not running (you got `curl: (7) Failed to connect to localhost port 8080`)

**Fix:**
```bash
cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/api
npm run dev
```

### Option 2: Web UI Testing (Preferred)
**You asked:** "Can I use the UIs to test this feature?"

**Answer:** Yes! But we need to check/create the right UI component.

**Current UIs:**
1. **`/curate`** - For document imports (not content generation)
2. **`/curator`** - For URL/file ingestion (old workflow)
3. **`/learn`** - For learner experience (consumes content, doesn't create)

**Missing:** Manager content generation UI

**Solution:** Create a simple test page at `/test-generation` for this critical test

---

## 🚀 Recommended Testing Flow

### Phase 1: Fix the Code (30 min)
1. **Update `detectGranularity()` function** - Add subject/topic/module detection
2. **Update LLM prompts** - Different prompts for each granularity level
3. **Update API routes** - Return appropriate structure based on granularity

### Phase 2: Create Test UI (30 min)
**Create:** `web/app/test-generation/page.tsx`

**Features:**
- Text input: "Enter what you want to teach"
- Button: "Generate"
- Output: Shows detected granularity + generated content structure
- Validation: Shows quality score, module count, structure

### Phase 3: Run 15 Tests (1 hour)
**Test each case:**
1. Enter input
2. Click generate
3. Verify:
   - ✅ Correct granularity detected
   - ✅ Appropriate structure returned
   - ✅ Quality score >0.90
   - ✅ Content makes sense

### Phase 4: Iterate (1-2 hours)
**If tests fail:**
- Adjust detection logic
- Tune LLM prompts
- Re-test until all 15 pass

---

## 📋 What Should I Do Now?

**Option A: Start API & Test via curl** (fastest)
1. Start API server
2. Test 3-5 cases manually
3. Identify gaps in detection logic

**Option B: Create Test UI & Test Visually** (best UX)
1. I create `/test-generation` page
2. You test interactively in browser
3. See results in real-time

**Option C: Fix Code First** (most thorough)
1. I implement `detectGranularity()`
2. I update prompts for 3 levels
3. I create test UI
4. You run all 15 tests

---

## ✅ My Recommendation: Option C

**Why:**
1. **No point testing broken code** - Current detection is too simple
2. **UI makes testing intuitive** - You can see what's happening
3. **15 tests validate the feature** - Proves it works across all scenarios
4. **This IS the product** - Worth investing time to get it right

**Timeline:**
- 1 hour: Fix detection logic + prompts
- 30 min: Create test UI
- 1 hour: Run 15 tests + iterate
- **Total: 2.5 hours to bulletproof the core feature**

---

## 🎯 Success Criteria (Final)

### For Each Granularity Level:

**Subject:**
- ✅ Detects broad/domain-level input
- ✅ Returns 8-15 topics (not modules)
- ✅ Topics are coherent and non-overlapping
- ✅ Covers subject comprehensively

**Topic:**
- ✅ Detects focused skill/concept input
- ✅ Returns 4-7 modules (not topics)
- ✅ Modules form logical learning progression
- ✅ Quality score >0.90 per module

**Module:**
- ✅ Detects specific framework/tool input
- ✅ Returns 1 module with deep content
- ✅ Includes step-by-step guide + examples
- ✅ 5-8 questions for thorough assessment

### Overall:
- ✅ 15/15 test cases pass
- ✅ No false positives (misclassification)
- ✅ Cost <$0.30 per generation (any level)
- ✅ Manager can trust the system to "get it right"

---

## 🚨 Why This Matters

**Bad granularity detection = Bad product:**
- Manager asks for "Leadership" → Gets 1 module (useless)
- Manager asks for "SMART Goals" → Gets 12 modules (bloated)
- Manager asks for "Delegation" → Gets random structure (confusing)

**Good granularity detection = Magic:**
- Manager types natural request
- System understands scope automatically
- Generates perfect structure every time
- Manager trusts Cerply to "just work"

**This is NOT a test. This is THE product.**

---

## 📝 Next Steps

**Tell me which option:**

**A)** "Start API, I'll test via curl" → I'll help debug connection
**B)** "Create test UI, I'll test visually" → I'll build `/test-generation` page  
**C)** "Fix code first, then UI, then test" → I'll implement proper detection + UI

**No corners cut. This feature must be perfect.**

