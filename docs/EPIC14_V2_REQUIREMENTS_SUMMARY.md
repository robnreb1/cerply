# Epic 14 v2.0 - Requirements Summary & Next Steps

**Date:** October 20, 2025  
**Context:** User feedback session after staging deployment revealed fundamental architecture mismatch  
**Status:** Requirements clarified, ready for epic building agent

---

## 🎯 What Changed

### **v1.0 (Implemented but Wrong)**
- Form-based UI with manual fields (title, description, difficulty)
- Manager acts as database administrator
- Feels disconnected from Cerply's AI-first promise

### **v2.0 (User Vision - AI-First)**
- Conversational UI where agent builds modules through dialogue
- Manager works with an AI consultant
- Aligns with "infinite expertise at infinite scale"

---

## 📋 Validated Requirements

### 1. **Content Creation: Two Modes**

#### **Mode A: AI-Assisted Research**
- Manager prompts: "I need to train my sales team on our new product pricing model"
- Agent researches public sources (like learner flow)
- Manager reviews and refines AI-generated content
- Manager augments with proprietary information
- **Proprietary content is ring-fenced** (tagged separately from public)

#### **Mode B: Upload-First**
- Manager uploads proprietary docs (PDFs, slides, videos) via chat
- Agent analyzes and structures content
- Optionally supplements with public research
- **Proprietary content remains ring-fenced throughout**

**Key Insight:** Both modes must clearly distinguish proprietary from public content for firewall/privacy reasons (B2B requirement).

---

### 2. **Proprietary Content = Firewall Protected**

**Definition:** Company-specific information that must be:
- **Access-controlled:** Only visible to org members
- **Privacy-protected:** Never used for AI training or leaked to other orgs
- **Audit-tracked:** All access logged for compliance

**Implementation:**
```typescript
interface ContentBlock {
  source: 'proprietary' | 'public_web' | 'ai_generated';
  organizationId: string | null; // null for public content
  accessControl: 'org_only' | 'public';
  isRingFenced: boolean; // true for proprietary
}
```

**NOT about granularity** (chunk vs document) - it's about **access control** and **privacy**.

---

### 3. **Proficiency = Mastery of Difficulty Level**

**NOT:** Raw quiz scores (e.g., "answered 17/20 questions correctly")  
**IS:** "What difficulty level can the learner consistently operate at?"

**Example:** "Can answer Expert-level questions correctly 80% of the time in last 10 attempts"

**Calculation:**
```typescript
function calculateProficiency(recentAttempts: Attempt[], targetDifficulty: number): number {
  const attemptsAtTarget = recentAttempts.filter(a => a.difficulty === targetDifficulty);
  if (attemptsAtTarget.length < 5) return 0; // Not enough data
  
  const successRate = attemptsAtTarget.filter(a => a.correct).length / attemptsAtTarget.length;
  return Math.round(successRate * 100); // 0-100%
}
```

**This aligns with adaptive learning:** Proficiency is about operating at a complexity level, not rote memorization.

---

### 4. **Time-Bound = Deadline for Proficiency Target**

**NOT:** "This module takes 30 minutes to complete"  
**IS:** "Learner must reach 80% proficiency by December 31st"

**Implementation:**
```typescript
interface ModuleAssignment {
  targetProficiencyPct: number; // 70%, 80%, 90%
  deadlineAt: Date; // Must achieve target by this date
  currentProficiencyPct: number; // Current progress
  riskStatus: 'on_track' | 'at_risk' | 'overdue' | 'achieved';
}
```

**Escalation:**
- **7 days before deadline + < 70% of target:** Alert manager and learner ("at-risk")
- **After deadline + not achieved:** Alert both ("overdue")
- **Target achieved:** Congratulate learner, notify manager

---

### 5. **Difficulty Level = Learning Journey Arc**

**User's Question:** "I was going to say that difficulty level could represent the starting or end point of the module, or perhaps move it exclusively to the delivery content (questions, etc.) as they will adapt up and down in difficulty."

**Interpretation:**
- **Option A:** Module defines "journey arc" (e.g., Intermediate → Expert)
- **Option B (Preferred):** Move difficulty entirely to **question/delivery layer** (adaptive engine handles it)

**Recommendation:**
- Module defines `target_mastery_level` (e.g., "Expert-level TypeScript proficiency")
- Questions are tagged with difficulty (1-5)
- Adaptive engine adjusts which questions are presented in real-time
- Proficiency is measured by success at target difficulty level

**This avoids confusion:** Module isn't "difficult" - it's adaptive. The target is a mastery level.

---

## 🏗️ Architecture: Conversational Module Builder

### **User Flow (High-Level)**

```
Manager → "I need to train my sales team on our new product pricing model"

Agent → "I can help you create comprehensive pricing training. Let me ask a few questions:
         1. Do you have proprietary pricing documents I should use as the foundation?
            Or should I research industry best practices for pricing models?
         2. What's your team's current knowledge level of pricing strategy?
         3. When do you need the team to be proficient?"

Manager → [uploads pricing deck] "Use this as the base. They're experienced sellers but new to this product.
           Need them ready by Jan 15th."

Agent → "Perfect! I've analyzed your pricing deck and identified 5 core concepts.
         I'm now enriching this with:
         - Competitive pricing research (public sources)
         - Best practices from similar product launches
         - Interactive scenarios based on your pricing tiers
         
         I'll calibrate for experienced sellers targeting expert-level mastery by Jan 15th.
         Your proprietary pricing data will be ring-fenced.
         
         [Preview of generated module structure appears]
         
         Does this look right? Any areas you want me to adjust?"
```

### **Technical Components**

1. **Conversational API:** `POST /api/curator/modules/conversation`
   - Maintains conversation state
   - Calls module creation agent service
   - Processes file uploads inline

2. **Module Creation Agent:** `api/src/services/module-creation-agent.ts`
   - Analyzes conversation history
   - Asks clarifying questions
   - Generates module preview when ready
   - Integrates with Epic 6 (content generation) and Epic 13 (agent orchestrator)

3. **Conversational UI:** `/manager/modules/create`
   - Chat interface (like learner flow)
   - File upload inline
   - Module preview card
   - Suggestion buttons for common actions

4. **Proficiency Tracking Service:**
   - Background job (hourly) to calculate current proficiency
   - Update risk status based on deadline proximity
   - Trigger notifications

---

## 📊 Database Schema Changes

### **New Columns:**

```sql
-- manager_modules table
ALTER TABLE manager_modules ADD COLUMN target_mastery_level TEXT DEFAULT 'intermediate';
ALTER TABLE manager_modules ADD COLUMN starting_level TEXT;
ALTER TABLE manager_modules DROP COLUMN difficulty_level; -- Replaced
ALTER TABLE manager_modules ADD COLUMN content_generation_prompt TEXT;

-- module_proprietary_content table
ALTER TABLE module_proprietary_content ADD COLUMN content_source TEXT DEFAULT 'proprietary';
ALTER TABLE module_proprietary_content ADD COLUMN is_ring_fenced BOOLEAN DEFAULT true;
ALTER TABLE module_proprietary_content ADD COLUMN access_control TEXT DEFAULT 'org_only';

-- module_assignments table
ALTER TABLE module_assignments ADD COLUMN target_proficiency_pct INTEGER DEFAULT 80;
ALTER TABLE module_assignments ADD COLUMN deadline_at TIMESTAMPTZ;
ALTER TABLE module_assignments ADD COLUMN current_proficiency_pct INTEGER DEFAULT 0;
ALTER TABLE module_assignments ADD COLUMN risk_status TEXT DEFAULT 'on_track';
```

### **New Table:**

```sql
CREATE TABLE module_creation_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES manager_modules(id),
  manager_id UUID NOT NULL REFERENCES users(id),
  conversation_turns JSONB NOT NULL, -- Array of {role, content, timestamp}
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## ✅ What You Said (Direct Quotes)

### **On Content Creation:**
> "Managers create content by either; a) prompting Cerply to do the research and collect the content, in the same way as the Learner flow, but can then review and refine the content in detail, as well as augment with their own information, or b) uploading content via the chat interface and then, optionally, augmenting with Cerply sourced public information. Either way, proprietary content should be ring fenced."

### **On Time-Bound:**
> "'time-bound' means the manager can set a cut off date by which the Learner needs to achieve a certain level or proficiency, it's not how long a module lasts for."

### **On Difficulty:**
> "Difficulty at module level needs to be handled carefully as our adaptive learning approach should make most modules fully accessible, it may simply mean moving [it exclusively to the delivery content (questions, etc.) as they will adapt up and down in difficulty]."

### **On Proficiency:**
> "I think it should be according to the difficulty level the user is consistently and recently able to operate at."

### **On Deadline Escalation:**
> "Escalate to manager and learner."

### **On AI-First Vision:**
> "Just keep in mind, like the learner screens, everything needs to be intelligent. The interface should be an agent that tries to understand the manager's needs and builds out the perfect, multi-modal, content, from which the manager can then prompt further requests to refine. At the moment the screens do not feel like they are building from an AI first perspective. We have access to infinite experts and infinite scale; let's make it feel like that please."

---

## 📄 Documentation Files Created

1. **Epic Prompt (for epic building agent):**
   - `docs/EPIC14_V2_AI_FIRST_CONVERSATIONAL_MODULES.md`
   - 32-40 hour implementation estimate
   - Complete technical specification
   - Database schema, API routes, UI components
   - Acceptance criteria and testing strategy

2. **Requirements Summary (this file):**
   - `docs/EPIC14_V2_REQUIREMENTS_SUMMARY.md`
   - Distills user feedback into actionable requirements
   - Direct quotes from user for traceability

---

## 🚀 Next Steps

### **For You (User):**
1. **Review the epic prompt:** `docs/EPIC14_V2_AI_FIRST_CONVERSATIONAL_MODULES.md`
   - Confirm this matches your vision
   - Flag any gaps or misinterpretations
   - Approve for handoff to epic building agent

2. **Update functional spec:** Once approved, we'll update `docs/functional-spec.md` to reflect v2.0 requirements

### **For Epic Building Agent:**
1. **Implement conversational module builder** (Phase 1)
   - Conversation API and agent service
   - File upload processing
   - Module preview generation

2. **Implement proficiency & deadline tracking** (Phase 2)
   - Proficiency calculation
   - Background job for updates
   - Risk status and notifications

3. **Implement conversational UI** (Phase 3)
   - Chat interface
   - Module preview component
   - Suggestion buttons and action flows

---

## ❓ Open Questions

1. **Difficulty nomenclature:** Should we rename `difficulty_level` to `complexity_level` or `mastery_level` to avoid confusion with accessibility?

2. **Proprietary content granularity:** Currently tracked at content block level. Is document-level tagging sufficient, or do we need chunk-level?

3. **Proficiency sample size:** Require minimum 5 attempts at target difficulty before calculating proficiency. Is this threshold reasonable?

4. **Notification frequency:** Risk status checked hourly. Should at-risk/overdue notifications be rate-limited (e.g., once per day)?

---

## 🎯 Success Criteria

**User's Vision:**
> "We have access to infinite experts and infinite scale; let's make it feel like that."

**Measurable Outcomes:**
- Manager can create a module in < 3 minutes via conversation (vs 5-10 min with forms)
- 100% of proprietary content is correctly ring-fenced (zero access control violations)
- Proficiency tracking accuracy: 95%+ (measured against manual review)
- Manager satisfaction: "Feels like working with an expert consultant" (qualitative feedback)

---

**This document captures your requirements and is ready for you to review before handing off to the epic building agent.** ✅

