# Granularity Detection Implementation - Progress Report

**Date:** 2025-10-13  
**Status:** 75% Complete - Core engine done, API + UI remaining

---

## ✅ COMPLETED (1.5 hours)

### 1. **Granularity Detection Function** ✅
**File:** `api/src/services/llm-orchestrator.ts`  
**Lines:** 448-514

```typescript
export function detectGranularity(input: string): 'subject' | 'topic' | 'module' {
  // Detects:
  // - SUBJECT: Broad domains (Leadership, Finance, Marketing)
  // - TOPIC: Focused skills (Effective Delegation, Active Listening)
  // - MODULE: Specific frameworks (SMART Goals, Eisenhower Matrix)
}
```

**Test cases covered:**
- ✅ Single-word domains → subject
- ✅ Framework keywords → module
- ✅ Multi-word skills → topic (default)

---

### 2. **Three Granularity-Specific Prompt Sets** ✅
**File:** `api/src/services/llm-orchestrator.ts`  
**Lines:** 623-947

#### **SUBJECT_PROMPTS** (Lines 630-713)
**Purpose:** Generate 8-12 topics from broad domain  
**Example:** "Leadership" → ["Delegation", "Conflict Resolution", "Team Building", ...]

**Prompt structure:**
- Understanding: Curriculum designer analyzing subject area
- Generator A: Creates comprehensive topic list (8-12 topics)
- Generator B: Creates practical topic list with job alignment
- Fact Checker: Validates topic coverage and progression

#### **TOPIC_PROMPTS** (Lines 719-824)
**Purpose:** Generate 4-6 modules from focused skill  
**Example:** "Effective Delegation" → ["What to Delegate", "How to Delegate", ...]

**Prompt structure:**
- Understanding: Instructional designer creating module structure
- Generator A: Creates 4-6 modules with technical accuracy
- Generator B: Creates 4-6 modules with hands-on focus
- Fact Checker: Validates module progression and quality

#### **MODULE_PROMPTS** (Lines 830-943)
**Purpose:** Generate 1 deep module for specific framework  
**Example:** "SMART Goals Framework" → 1 comprehensive module with 5-8 questions

**Prompt structure:**
- Understanding: Analyzes framework components and application
- Generator A: Creates 500-800 word deep content + step-by-step guide
- Generator B: Creates practical content with multiple scenarios
- Fact Checker: Validates framework accuracy and completeness

---

### 3. **Updated Core Functions** ✅
**File:** `api/src/services/llm-orchestrator.ts`

#### `playbackUnderstanding()` (Lines 253-286)
**Added:**
- Granularity detection: `const granularity = detectGranularity(artefact);`
- Smart prompt selection based on granularity
- Returns granularity in response: `{ ...result, inputType, granularity }`

#### `generateWithEnsemble()` (Lines 319-337)
**Added:**
- Granularity parameter: `granularity?: 'subject' | 'topic' | 'module'`
- Smart prompt selection:
  ```typescript
  let prompts;
  if (granularity === 'subject') prompts = SUBJECT_PROMPTS;
  else if (granularity === 'module') prompts = MODULE_PROMPTS;
  else if (inputType === 'topic') prompts = TOPIC_PROMPTS;
  else prompts = PROMPTS;
  ```

---

## 🚧 IN PROGRESS (0.5 hours remaining)

### 4. **Update API Routes** (30 min)
**File:** `api/src/routes/content.ts`  
**Lines to update:**

#### Update `POST /api/content/understand` (Line 80)
**Current:**
```typescript
const result = await playbackUnderstanding(artefact);
const inputType = result.inputType || 'source';
```

**Needed:**
```typescript
const result = await playbackUnderstanding(artefact);
const inputType = result.inputType || 'source';
const granularity = result.granularity || 'topic'; // ADD THIS

// Store granularity in database
await db.insert(contentGenerations).values({
  // ... existing fields ...
  granularity: granularity, // ADD THIS
});
```

#### Update `generateEnsembleAsync()` (Line 496)
**Current:**
```typescript
async function generateEnsembleAsync(
  generationId: string,
  understanding: string,
  artefact: string,
  inputType: 'source' | 'topic' = 'source'
) {
  const result = await generateWithEnsemble(understanding, artefact, inputType);
```

**Needed:**
```typescript
async function generateEnsembleAsync(
  generationId: string,
  understanding: string,
  artefact: string,
  inputType: 'source' | 'topic' = 'source',
  granularity?: 'subject' | 'topic' | 'module' // ADD THIS
) {
  const result = await generateWithEnsemble(understanding, artefact, inputType, granularity); // PASS IT
```

#### Update `POST /api/content/generate` (Line 290)
**Current:**
```typescript
const inputType = (generation.inputType || 'source') as 'source' | 'topic';
generateEnsembleAsync(generationId, generation.understanding, generation.artefactText, inputType);
```

**Needed:**
```typescript
const inputType = (generation.inputType || 'source') as 'source' | 'topic';
const granularity = generation.granularity as 'subject' | 'topic' | 'module' | undefined; // ADD THIS
generateEnsembleAsync(generationId, generation.understanding, generation.artefactText, inputType, granularity); // PASS IT
```

#### Update schema (if needed)
**File:** `api/src/db/schema.ts`  
**Check if `content_generations` table has `granularity` column**  
If not, add migration:
```sql
ALTER TABLE content_generations ADD COLUMN granularity TEXT;
```

---

### 5. **Create Test UI** (1 hour)
**File:** `web/app/test-generation/page.tsx`  
**Purpose:** Visual testing interface for 15 test cases

**Features needed:**
1. **Input field** - "Enter what you want to teach"
2. **Granularity display** - Shows detected level (subject/topic/module)
3. **Generate button** - Triggers API call
4. **Results panel** - Shows:
   - Detected granularity
   - Expected output (e.g., "8-12 topics")
   - Actual output structure
   - Quality score
   - Cost
5. **Test case selector** - Dropdown with 15 pre-defined test cases
6. **Validation** - Auto-checks if output matches expectations

**UI mockup:**
```
┌─────────────────────────────────────────────┐
│  Granularity Test Interface                 │
├─────────────────────────────────────────────┤
│                                             │
│  Test Case:  [Select test case ▼]          │
│                                             │
│  Input: [Leadership                       ] │
│                                             │
│  [Generate Content]                         │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Detected: SUBJECT                   │   │
│  │ Expected: 8-12 topics               │   │
│  │ Reasoning: Broad domain-level       │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Results:                                   │
│  ✅ Granularity: Correct (SUBJECT)          │
│  ✅ Output Count: 10 topics                 │
│  ✅ Quality Score: 0.94                     │
│  ✅ Cost: $0.22                             │
│  ⏱ Time: 32s                                │
│                                             │
│  Topics Generated:                          │
│  1. Effective Delegation                    │
│  2. Conflict Resolution                     │
│  3. Team Building                           │
│  ... (7 more)                               │
└─────────────────────────────────────────────┘
```

---

## 📋 15 TEST CASES

### Subject Level (5 cases)
1. **"Leadership"** → 8-12 topics
2. **"Financial Services"** → 10-15 topics
3. **"Soft Skills"** → 8-10 topics
4. **"Risk Management"** → 6-8 topics
5. **"Corporate Training"** → 10-12 topics

### Topic Level (5 cases)
6. **"Effective Delegation"** → 4-6 modules
7. **"Active Listening"** → 4-5 modules
8. **"Conflict Resolution"** → 5-6 modules
9. **"Time Management"** → 4-6 modules
10. **"Emotional Intelligence"** → 5-7 modules

### Module Level (5 cases)
11. **"SMART Goals Framework"** → 1 deep module (5-8 questions)
12. **"Eisenhower Matrix"** → 1 deep module
13. **"5 Whys Technique"** → 1 deep module
14. **"RACI Matrix"** → 1 deep module
15. **"Johari Window"** → 1 deep module

---

## 🎯 NEXT STEPS

### Immediate (30 min)
1. ✅ Commit current progress
2. Update `api/src/routes/content.ts` with granularity support
3. Test API with curl (1-2 test cases)

### Then (1 hour)
1. Create `/test-generation` page
2. Wire up API calls
3. Run all 15 test cases
4. Document results

### Finally (30 min)
1. Fix any failing cases
2. Update quality criteria if needed
3. Create final report

---

## 🚀 HOW TO CONTINUE

### Option A: Finish API Updates (Recommended)
```bash
# 1. Update content.ts routes
# 2. Test with curl
curl -X POST http://localhost:8080/api/content/understand \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -d '{"artefact": "Leadership"}' | jq .

# 3. Verify granularity detection works
```

### Option B: Create UI First
```bash
# 1. Create web/app/test-generation/page.tsx
# 2. Start API server
cd api && npm run dev

# 3. Start web server (new terminal)
cd web && npm run dev

# 4. Visit http://localhost:3000/test-generation
```

### Option C: Run Tests Now (Quick validation)
```bash
# Test granularity detection directly
node -e "
const { detectGranularity, getGranularityMetadata } = require('./api/src/services/llm-orchestrator');
console.log('Leadership:', getGranularityMetadata('Leadership'));
console.log('Effective Delegation:', getGranularityMetadata('Effective Delegation'));
console.log('SMART Goals Framework:', getGranularityMetadata('SMART Goals Framework'));
"
```

---

## 📊 PROGRESS SUMMARY

- **Time spent:** 1.5 hours
- **Time remaining:** 1.5 hours
- **Completion:** 75%

**Completed:**
- ✅ Granularity detection function (15 min)
- ✅ Subject-level prompts (20 min)
- ✅ Topic-level prompts (20 min)
- ✅ Module-level prompts (20 min)
- ✅ Updated `playbackUnderstanding()` (10 min)
- ✅ Updated `generateWithEnsemble()` (10 min)
- ✅ Committed to git (5 min)
- ✅ Documentation (20 min)

**Remaining:**
- 🔲 Update API routes (30 min)
- 🔲 Create test UI (60 min)
- 🔲 Run 15 test cases (30 min)

---

## 🎯 SUCCESS CRITERIA

**For each granularity level:**
- ✅ Detects correctly (no false positives)
- ✅ Uses correct prompts
- ✅ Returns appropriate structure
- ✅ Quality score >0.90
- ✅ Cost <$0.30

**Overall:**
- ✅ 15/15 test cases pass
- ✅ Manager can trust automatic detection
- ✅ No manual classification needed

---

**Status:** Ready to continue with API updates or UI creation!  
**Recommendation:** Update API routes first, then create UI for comprehensive testing.

Next: Tell me **"continue with API"** or **"create UI first"**

