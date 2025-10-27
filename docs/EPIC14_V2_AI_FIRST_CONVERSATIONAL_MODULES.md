# Epic 14 v2.0: AI-First Conversational Module Builder

**Version:** 2.0 (Major Revision - AI-First Architecture)  
**Epic Priority:** P0 (MVP-CRITICAL)  
**Estimated Effort:** 32-40 hours  
**Dependencies:** Epic 6 (content generation), Epic 13 (agent orchestrator), Epic 7 (chat infrastructure)  
**Status:** Ready to implement  
**Supersedes:** Epic 14 v1.0 (form-based UI)

---

## 🎯 Vision Statement

**Cerply is infinite expertise at infinite scale.** The manager interface must feel like working with a world-class instructional designer, content strategist, and learning consultant—not filling out database forms.

### The Transformation

**BEFORE (v1.0 - Form-Based):**
- Manager fills out:
  - Title field
  - Description textarea
  - Difficulty dropdown
  - Estimated minutes input
- Feels like database admin work

**AFTER (v2.0 - AI-First Conversational):**
- Manager has a conversation:
  - "I need to train my sales team on our new product pricing model"
  - Agent asks clarifying questions
  - Agent generates comprehensive module structure
  - Manager refines via natural language prompts
- Feels like working with an expert consultant

---

## 🧠 Core Requirements (User-Validated)

### 1. Content Creation Modes

#### **Mode A: AI-Assisted Research (Like Learner Flow)**
```
Manager → "I need a module on advanced TypeScript patterns"
Agent → "I can research and build comprehensive training on advanced TypeScript. 
         Let me gather:
         - Industry best practices
         - Code examples from authoritative sources
         - Interactive coding challenges
         - Real-world case studies
         
         Should I focus on any specific patterns (generics, decorators, etc.)?"

Manager → "Focus on generics and type guards. Add examples from our codebase."
Agent → [Generates module with public research + awaits proprietary content]
```

**Key Features:**
- Agent researches public sources (web, docs, videos)
- Manager reviews and refines AI-generated content
- Manager augments with proprietary information
- **Proprietary content is ring-fenced** (tagged separately from public)

#### **Mode B: Upload-First Approach**
```
Manager → [Uploads internal pricing deck PDF]
Agent → "I've analyzed your pricing document. It covers:
         - 3 pricing tiers (Basic, Pro, Enterprise)
         - Competitive positioning
         - Discount structures
         
         Should I supplement this with:
         - Public research on pricing best practices?
         - Interactive scenarios for sales negotiations?
         - Quiz questions to test comprehension?"

Manager → "Yes, add negotiation scenarios and quiz questions"
Agent → [Blends proprietary content with public research]
```

**Key Features:**
- Manager uploads proprietary docs (PDFs, slides, videos)
- Agent analyzes and structures content
- Optionally supplements with public research
- **Proprietary content remains ring-fenced throughout**

### 2. Proprietary Content = Firewall Protected

**Definition:** Proprietary content is **company-specific information** that must be:
- **Access-controlled:** Only visible to org members
- **Privacy-protected:** Never used for AI training or leaked to other orgs
- **Audit-tracked:** All access logged for compliance

**Implementation:**
```typescript
interface ContentBlock {
  id: string;
  type: 'text' | 'video' | 'document' | 'simulation';
  content: string;
  source: 'proprietary' | 'public_web' | 'ai_generated';
  organizationId: string | null; // null for public content
  accessControl: 'org_only' | 'public';
}
```

**Access Rules:**
- `accessControl: 'org_only'` → Filter by `user.organizationId === content.organizationId`
- `accessControl: 'public'` → Available to all learners
- Agent can **blend both** for privileged users (org members)

### 3. Proficiency = Mastery of Difficulty Level

**NOT:** Raw quiz scores  
**IS:** "What difficulty level can the learner consistently operate at?"

**Measurement:**
- Track success rate at each difficulty tier (1-5) over recent attempts (last 10-20)
- Example: "Can answer Expert-level questions correctly 80% of the time"
- Proficiency threshold: "Learner must consistently answer Advanced (Level 4) questions with 85% accuracy"

**Implementation:**
```typescript
interface ProficiencyTracking {
  userId: string;
  moduleId: string;
  currentDifficultyLevel: 1 | 2 | 3 | 4 | 5; // Beginner → Expert
  recentAttempts: {
    difficulty: number;
    correct: boolean;
    timestamp: Date;
  }[]; // Last 20 attempts
  proficiencyScore: number; // 0-100 (% of target mastery achieved)
  targetDifficultyLevel: 3 | 4 | 5; // Manager-set target
}

// Calculation
function calculateProficiency(recent: Attempt[], target: number): number {
  const attemptsAtTarget = recent.filter(a => a.difficulty === target);
  if (attemptsAtTarget.length < 5) return 0; // Not enough data
  
  const successRate = attemptsAtTarget.filter(a => a.correct).length / attemptsAtTarget.length;
  return Math.round(successRate * 100);
}
```

### 4. Time-Bound = Deadline for Proficiency Target

**NOT:** "This module takes 30 minutes to complete"  
**IS:** "Learner must reach 80% proficiency by December 31st"

**Implementation:**
```typescript
interface ModuleAssignment {
  id: string;
  moduleId: string;
  userId: string;
  targetProficiencyPct: number; // 70%, 80%, 90%
  deadlineAt: Date; // Must achieve target by this date
  currentProficiencyPct: number; // Current progress
  status: 'on_track' | 'at_risk' | 'overdue' | 'achieved';
}

// Escalation logic
if (assignment.deadlineAt < new Date() && assignment.status !== 'achieved') {
  await notifyManager(assignment.moduleId, assignment.userId, 'DEADLINE_MISSED');
  await notifyLearner(assignment.userId, assignment.moduleId, 'DEADLINE_MISSED');
}

// Risk detection (7 days before deadline)
const daysUntilDeadline = Math.floor((assignment.deadlineAt - Date.now()) / (1000 * 60 * 60 * 24));
if (daysUntilDeadline <= 7 && assignment.currentProficiencyPct < assignment.targetProficiencyPct * 0.7) {
  assignment.status = 'at_risk';
  await notifyManager(assignment.moduleId, assignment.userId, 'AT_RISK');
}
```

### 5. Difficulty Level = Learning Journey Arc

**Insight:** Module-level "difficulty" is misleading because adaptive learning makes content accessible to all.

**Reframing:**
- **NOT:** "This module is Expert-level" (excludes beginners)
- **IS:** "This module takes you from Intermediate → Expert" (shows journey)

**OR** (Preferred):
- **Move difficulty entirely to question/delivery layer**
- Adaptive engine adjusts question difficulty in real-time
- Module simply defines "target mastery level" (e.g., "Expert-level TypeScript proficiency")

**Implementation:**
```typescript
interface ModuleConfiguration {
  id: string;
  title: string;
  targetMasteryLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  startingLevel?: 'beginner' | 'intermediate'; // Optional (adaptive engine detects)
  
  // Questions tagged with difficulty
  questions: {
    id: string;
    difficulty: 1 | 2 | 3 | 4 | 5; // Engine adjusts which are presented
    variants: QuestionVariant[]; // Multiple difficulty versions
  }[];
}
```

---

## 🏗️ Architecture: Conversational Module Builder

### Phase 1: Conversational Interface

**Replace:** Form-based module creation  
**With:** Chat-based AI agent that builds modules through conversation

#### **User Flow:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Manager Interface: /manager/modules/create                       │
│                                                                  │
│ [Chat Input Box]                                                 │
│ "What would you like to train your team on?"                     │
│                                                                  │
│ Manager types: "I need to train my sales team on our new        │
│                product pricing model"                            │
│                                                                  │
│ Agent responds:                                                  │
│ "I can help you create comprehensive pricing training.          │
│  Let me ask a few questions:                                    │
│                                                                  │
│  1. Do you have proprietary pricing documents?                  │
│     [Upload Files] or [I'll describe it]                         │
│                                                                  │
│  2. What's your team's current knowledge level?                  │
│     ○ New to sales (beginner)                                   │
│     ● Experienced sellers (intermediate)                         │
│     ○ Senior account executives (advanced)                       │
│                                                                  │
│  3. When do you need the team proficient?                        │
│     [Date Picker: Jan 15, 2026]                                  │
│     Target proficiency: [85%] [▼]                                │
│                                                                  │
│  4. Should I supplement with public research?                    │
│     [✓] Competitive pricing strategies                           │
│     [✓] Sales negotiation best practices                         │
│     [ ] Customer psychology research                             │
│                                                                  │
│ [Continue]                                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Agent generates preview:                                         │
│                                                                  │
│ "Perfect! I've created a module structure:                       │
│                                                                  │
│  📊 Module: New Product Pricing Mastery                         │
│  🎯 Target: Intermediate → Advanced                             │
│  📅 Deadline: Jan 15, 2026 (85% proficiency)                     │
│  ⏱️ Estimated: 45-60 minutes to expert-level mastery           │
│                                                                  │
│  📚 Content Structure:                                           │
│  1. Your Pricing Tiers (Proprietary) 🔒                         │
│     - Analysis of your uploaded pricing deck                     │
│     - 3 tiers: Basic, Pro, Enterprise                            │
│     - Internal discount structures                               │
│                                                                  │
│  2. Competitive Positioning (Public Research) 🌐                │
│     - Industry benchmarking                                      │
│     - Competitor analysis                                        │
│                                                                  │
│  3. Negotiation Scenarios (AI-Generated) 🤖                     │
│     - 5 realistic sales scenarios                                │
│     - Objection handling scripts                                 │
│     - Discount authority guidance                                │
│                                                                  │
│  4. Interactive Assessment (Adaptive) 🎯                        │
│     - 15 questions (difficulty adapts to learner)                │
│     - Real-world pricing decisions                               │
│     - Instant feedback with explanations                         │
│                                                                  │
│ [Refine Further] [Assign to Team] [Save as Draft]              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Manager refines:                                                 │
│ "Add a section on how to handle enterprise custom pricing       │
│  requests"                                                       │
│                                                                  │
│ Agent: "Great idea! I'll add:                                    │
│  5. Enterprise Custom Pricing (Interactive Workshop)            │
│     - Decision framework for custom quotes                       │
│     - Approval workflow and escalation paths                     │
│     - Case studies from your top 3 enterprise deals              │
│                                                                  │
│     Should I use real customer names (visible only to your team) │
│     or anonymize them?"                                          │
│                                                                  │
│ [Real Names (Org Only)] [Anonymize] [Skip Case Studies]        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Technical Specification

### 1. Database Schema Updates

```sql
-- Migration: 030_manager_modules_ai_first.sql

-- Update manager_modules table
-- Step 1: Add new columns
ALTER TABLE manager_modules ADD COLUMN target_mastery_level TEXT DEFAULT 'intermediate' 
  CHECK (target_mastery_level IN ('beginner', 'intermediate', 'advanced', 'expert', 'master'));
ALTER TABLE manager_modules ADD COLUMN starting_level TEXT 
  CHECK (starting_level IN ('beginner', 'intermediate', 'advanced'));
ALTER TABLE manager_modules ADD COLUMN content_generation_prompt TEXT; -- Original manager prompt

-- Step 2: Migrate existing difficulty_level data to target_mastery_level
UPDATE manager_modules 
SET target_mastery_level = CASE 
  WHEN difficulty_level = 'beginner' THEN 'beginner'
  WHEN difficulty_level = 'intermediate' THEN 'intermediate'
  WHEN difficulty_level = 'advanced' THEN 'advanced'
  WHEN difficulty_level = 'expert' THEN 'expert'
  ELSE 'intermediate' -- fallback for any unexpected values
END
WHERE difficulty_level IS NOT NULL;

-- Step 3: Now safe to drop old column
ALTER TABLE manager_modules DROP COLUMN difficulty_level; -- Replaced by target_mastery_level

COMMENT ON COLUMN manager_modules.target_mastery_level IS 'Target mastery level learners should achieve (Epic 14 v2.0) - includes master level';
COMMENT ON COLUMN manager_modules.starting_level IS 'Optional starting level (adaptive engine auto-detects if null)';
COMMENT ON COLUMN manager_modules.content_generation_prompt IS 'Original conversational prompt from manager';

-- Update module_proprietary_content table
ALTER TABLE module_proprietary_content ADD COLUMN content_source TEXT DEFAULT 'proprietary' 
  CHECK (content_source IN ('proprietary', 'ai_generated', 'public_web'));
ALTER TABLE module_proprietary_content ADD COLUMN is_ring_fenced BOOLEAN DEFAULT true;
ALTER TABLE module_proprietary_content ADD COLUMN access_control TEXT DEFAULT 'org_only' 
  CHECK (access_control IN ('org_only', 'public'));

COMMENT ON COLUMN module_proprietary_content.content_source IS 'Origin of content for provenance tracking (Epic 14 v2.0)';
COMMENT ON COLUMN module_proprietary_content.is_ring_fenced IS 'True if content must be firewalled from other orgs';
COMMENT ON COLUMN module_proprietary_content.access_control IS 'Access control policy for this content block';

-- Update module_assignments table
ALTER TABLE module_assignments ADD COLUMN target_proficiency_pct INTEGER DEFAULT 80 
  CHECK (target_proficiency_pct BETWEEN 50 AND 100);
ALTER TABLE module_assignments ADD COLUMN deadline_at TIMESTAMPTZ;
ALTER TABLE module_assignments ADD COLUMN current_proficiency_pct INTEGER DEFAULT 0 
  CHECK (current_proficiency_pct BETWEEN 0 AND 100);
ALTER TABLE module_assignments ADD COLUMN risk_status TEXT DEFAULT 'on_track' 
  CHECK (risk_status IN ('on_track', 'at_risk', 'overdue', 'achieved'));

COMMENT ON COLUMN module_assignments.target_proficiency_pct IS 'Target % of questions at target difficulty answered correctly (Epic 14 v2.0)';
COMMENT ON COLUMN module_assignments.deadline_at IS 'Deadline for achieving target proficiency (Epic 14 v2.0)';
COMMENT ON COLUMN module_assignments.current_proficiency_pct IS 'Current proficiency % (auto-calculated)';
COMMENT ON COLUMN module_assignments.risk_status IS 'Risk status based on progress vs deadline (Epic 14 v2.0)';

-- New table: Module conversation history
CREATE TABLE IF NOT EXISTS module_creation_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES manager_modules(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_turns JSONB NOT NULL, -- Array of {role, content, timestamp}
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_module_creation_conversations_module ON module_creation_conversations(module_id);
CREATE INDEX idx_module_creation_conversations_manager ON module_creation_conversations(manager_id);

COMMENT ON TABLE module_creation_conversations IS 'Conversational history for module creation (Epic 14 v2.0)';

-- New table: Notification log (for rate limiting)
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES module_assignments(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'at_risk', 'overdue', 'achieved'
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_log_assignment ON notification_log(assignment_id, notification_type, sent_at);

COMMENT ON TABLE notification_log IS 'Rate limiting log for proficiency/deadline notifications (Epic 14 v2.0 - once per day)';

-- Indexes for proficiency tracking
CREATE INDEX idx_module_assignments_deadline ON module_assignments(deadline_at) WHERE risk_status IN ('on_track', 'at_risk');
CREATE INDEX idx_module_assignments_risk ON module_assignments(risk_status, deadline_at);
```

### 2. API Routes

#### **Conversational Module Creation**

```typescript
// POST /api/curator/modules/conversation
// Start or continue a module creation conversation
app.post('/api/curator/modules/conversation', requireManager, async (req, reply) => {
  const { conversationId, userMessage, uploadedFiles } = req.body;
  const managerId = req.user.id;
  
  // Retrieve or create conversation
  let conversation;
  if (conversationId) {
    conversation = await db.select()
      .from(moduleCreationConversations)
      .where(and(
        eq(moduleCreationConversations.id, conversationId),
        eq(moduleCreationConversations.managerId, managerId)
      ))
      .limit(1);
    
    if (!conversation.length) {
      return reply.status(404).send({ error: { code: 'CONVERSATION_NOT_FOUND' } });
    }
    conversation = conversation[0];
  } else {
    // Create new conversation
    const newConv = await db.insert(moduleCreationConversations).values({
      managerId,
      conversationTurns: [],
    }).returning();
    conversation = newConv[0];
  }
  
  // Process uploaded files (if any)
  let uploadedContent = null;
  if (uploadedFiles && uploadedFiles.length > 0) {
    uploadedContent = await processProprietaryUploads(uploadedFiles, managerId);
  }
  
  // Add user message to conversation
  const turns = conversation.conversationTurns as any[] || [];
  turns.push({
    role: 'manager',
    content: userMessage,
    uploadedContent,
    timestamp: new Date(),
  });
  
  // Call agent orchestrator to generate response
  const agentResponse = await moduleCreationAgent({
    conversationHistory: turns,
    managerId,
    organizationId: req.user.organizationId,
  });
  
  // Add agent response
  turns.push({
    role: 'agent',
    content: agentResponse.message,
    suggestions: agentResponse.suggestions, // e.g., ["Upload Files", "Describe Content", "Skip"]
    modulePreview: agentResponse.modulePreview, // If agent has enough info to generate preview
    timestamp: new Date(),
  });
  
  // Update conversation
  await db.update(moduleCreationConversations)
    .set({
      conversationTurns: turns,
      updatedAt: new Date(),
    })
    .where(eq(moduleCreationConversations.id, conversation.id));
  
  // If module preview is ready, optionally create draft module
  let draftModuleId = null;
  if (agentResponse.readyToCreate && agentResponse.modulePreview) {
    const draft = await db.insert(managerModules).values({
      createdBy: managerId,
      title: agentResponse.modulePreview.title,
      description: agentResponse.modulePreview.description,
      status: 'draft',
      targetMasteryLevel: agentResponse.modulePreview.targetMasteryLevel,
      estimatedMinutes: agentResponse.modulePreview.estimatedMinutes,
      contentGenerationPrompt: userMessage, // Original prompt
    }).returning();
    
    draftModuleId = draft[0].id;
    
    // Link conversation to module
    await db.update(moduleCreationConversations)
      .set({ moduleId: draftModuleId })
      .where(eq(moduleCreationConversations.id, conversation.id));
  }
  
  return reply.send({
    conversationId: conversation.id,
    agentMessage: agentResponse.message,
    suggestions: agentResponse.suggestions,
    modulePreview: agentResponse.modulePreview,
    draftModuleId,
  });
});
```

#### **Module Creation Agent (Service)**

```typescript
// api/src/services/module-creation-agent.ts

interface ModuleCreationContext {
  conversationHistory: ConversationTurn[];
  managerId: string;
  organizationId: string;
}

interface AgentResponse {
  message: string; // Agent's response to manager
  suggestions: string[]; // Action buttons (e.g., ["Upload Files", "Continue", "Generate Preview"])
  modulePreview?: ModulePreview; // Generated module structure (if ready)
  readyToCreate: boolean; // True if agent has enough info to create module
}

interface ModulePreview {
  title: string;
  description: string;
  targetMasteryLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  estimatedMinutes: number;
  contentBlocks: ContentBlock[];
  questions: QuestionBlock[];
}

interface ContentBlock {
  title: string;
  type: 'text' | 'video' | 'document' | 'simulation';
  source: 'proprietary' | 'ai_generated' | 'public_web';
  content: string;
  isRingFenced: boolean;
}

export async function moduleCreationAgent(ctx: ModuleCreationContext): Promise<AgentResponse> {
  // Analyze conversation history to determine intent
  const intent = analyzeIntent(ctx.conversationHistory);
  
  // Determine what information is still needed
  const missingInfo = detectMissingInformation(ctx.conversationHistory);
  
  if (missingInfo.length > 0) {
    // Ask clarifying questions
    return askClarifyingQuestions(missingInfo);
  }
  
  // All info collected - generate module preview
  const preview = await generateModulePreview(ctx);
  
  return {
    message: `Perfect! I've created a module structure. Here's what I've built for you:

📊 **${preview.title}**
🎯 Target: ${preview.targetMasteryLevel} mastery
⏱️ Estimated: ${preview.estimatedMinutes} minutes

📚 **Content Structure:**
${preview.contentBlocks.map((block, i) => `
${i + 1}. ${block.title} ${block.isRingFenced ? '🔒 (Proprietary)' : block.source === 'ai_generated' ? '🤖' : '🌐'}
`).join('\n')}

Would you like to:
- Refine this further (add/remove sections)
- Assign to your team now
- Save as draft for later`,
    suggestions: ['Refine Further', 'Assign to Team', 'Save as Draft'],
    modulePreview: preview,
    readyToCreate: true,
  };
}

function analyzeIntent(history: ConversationTurn[]): string {
  // Use lightweight NLP or LLM to understand manager's goal
  // Examples: "create_training", "upload_content", "refine_module"
  const lastManagerMessage = history.filter(t => t.role === 'manager').slice(-1)[0];
  
  // Simple keyword matching (can be enhanced with LLM)
  if (lastManagerMessage.content.toLowerCase().includes('train')) return 'create_training';
  if (lastManagerMessage.content.toLowerCase().includes('upload')) return 'upload_content';
  if (lastManagerMessage.uploadedContent) return 'process_upload';
  
  return 'create_training';
}

function detectMissingInformation(history: ConversationTurn[]): string[] {
  const collected = {
    topic: false,
    targetAudience: false,
    deadline: false,
    proprietaryContent: false,
  };
  
  // Parse conversation to detect what's been collected
  for (const turn of history) {
    if (turn.role === 'manager') {
      if (turn.content.length > 20) collected.topic = true;
      if (turn.content.includes('team') || turn.content.includes('audience')) collected.targetAudience = true;
      if (turn.uploadedContent) collected.proprietaryContent = true;
    }
  }
  
  const missing = [];
  if (!collected.topic) missing.push('topic');
  if (!collected.targetAudience) missing.push('targetAudience');
  if (!collected.deadline) missing.push('deadline');
  // proprietaryContent is optional
  
  return missing;
}

function askClarifyingQuestions(missing: string[]): AgentResponse {
  const questions = {
    topic: "What topic would you like to create training for?",
    targetAudience: "Who is this training for? (e.g., new sales reps, experienced managers)",
    deadline: "When do you need your team to be proficient? (This helps me pace the content)",
  };
  
  const nextQuestion = missing[0];
  
  return {
    message: questions[nextQuestion],
    suggestions: nextQuestion === 'targetAudience' 
      ? ['New employees (beginner)', 'Experienced team (intermediate)', 'Senior experts (advanced)']
      : nextQuestion === 'deadline'
      ? ['1 week', '2 weeks', '1 month', 'Custom date']
      : ['Continue'],
    readyToCreate: false,
  };
}

async function generateModulePreview(ctx: ModuleCreationContext): Promise<ModulePreview> {
  // Extract info from conversation
  const topic = extractTopic(ctx.conversationHistory);
  const targetAudience = extractTargetAudience(ctx.conversationHistory);
  const proprietaryContent = extractProprietaryContent(ctx.conversationHistory);
  
  // Call content generation service (Epic 6)
  const generatedContent = await generateTopicContent({
    topic,
    targetMasteryLevel: targetAudience,
    includePublicResearch: true,
  });
  
  // Blend proprietary and generated content
  const contentBlocks: ContentBlock[] = [];
  
  // Add proprietary content first (if any)
  if (proprietaryContent) {
    contentBlocks.push({
      title: `Your ${proprietaryContent.type}`,
      type: 'document',
      source: 'proprietary',
      content: proprietaryContent.summary,
      isRingFenced: true,
    });
  }
  
  // Add generated content
  for (const section of generatedContent.sections) {
    contentBlocks.push({
      title: section.title,
      type: 'text',
      source: section.source, // 'ai_generated' or 'public_web'
      content: section.content,
      isRingFenced: false,
    });
  }
  
  return {
    title: generatedContent.title,
    description: generatedContent.description,
    targetMasteryLevel: targetAudience,
    estimatedMinutes: Math.ceil(contentBlocks.length * 10), // ~10 min per section
    contentBlocks,
    questions: generatedContent.questions,
  };
}
```

#### **Proficiency Tracking & Deadline Management**

```typescript
// Background job: Update proficiency and check deadlines (runs every hour)
export async function updateProficiencyTracking() {
  // Get all active assignments
  const assignments = await db.select()
    .from(moduleAssignments)
    .where(eq(moduleAssignments.status, 'in_progress'));
  
  for (const assignment of assignments) {
    // Calculate current proficiency
    const recentAttempts = await db.select()
      .from(questionPerformanceStats)
      .where(eq(questionPerformanceStats.moduleId, assignment.moduleId))
      .where(eq(questionPerformanceStats.userId, assignment.userId)) // Assuming we track per-user
      .orderBy(desc(questionPerformanceStats.lastAttemptedAt))
      .limit(20);
    
    const targetDifficulty = await getModuleTargetDifficulty(assignment.moduleId);
    const proficiency = calculateProficiency(recentAttempts, targetDifficulty);
    
    // Update assignment
    await db.update(moduleAssignments)
      .set({ currentProficiencyPct: proficiency })
      .where(eq(moduleAssignments.id, assignment.id));
    
    // Check deadline and update risk status
    await updateRiskStatus(assignment);
  }
}

async function updateRiskStatus(assignment: ModuleAssignment) {
  if (!assignment.deadlineAt) return;
  
  const now = new Date();
  const daysUntilDeadline = Math.floor((assignment.deadlineAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  let newStatus: 'on_track' | 'at_risk' | 'overdue' | 'achieved' = 'on_track';
  const previousStatus = assignment.riskStatus;
  
  // Achieved target
  if (assignment.currentProficiencyPct >= assignment.targetProficiencyPct) {
    newStatus = 'achieved';
    // Only notify once when status changes
    if (previousStatus !== 'achieved' && shouldSendNotification(assignment.id, 'achieved')) {
      await notifyManager(assignment.moduleId, assignment.userId, 'PROFICIENCY_ACHIEVED');
      await notifyLearner(assignment.userId, assignment.moduleId, 'CONGRATULATIONS');
      await recordNotificationSent(assignment.id, 'achieved');
    }
  }
  // Overdue
  else if (daysUntilDeadline < 0) {
    newStatus = 'overdue';
    // Only notify once per day (user requirement)
    if (shouldSendNotification(assignment.id, 'overdue')) {
      await notifyManager(assignment.moduleId, assignment.userId, 'DEADLINE_MISSED');
      await notifyLearner(assignment.userId, assignment.moduleId, 'DEADLINE_MISSED');
      await recordNotificationSent(assignment.id, 'overdue');
    }
  }
  // At risk (7 days before deadline, < 70% of target proficiency)
  else if (daysUntilDeadline <= 7 && assignment.currentProficiencyPct < assignment.targetProficiencyPct * 0.7) {
    newStatus = 'at_risk';
    // Only notify once per day (user requirement)
    if (shouldSendNotification(assignment.id, 'at_risk')) {
      await notifyManager(assignment.moduleId, assignment.userId, 'AT_RISK');
      await recordNotificationSent(assignment.id, 'at_risk');
    }
  }
  
  await db.update(moduleAssignments)
    .set({ riskStatus: newStatus })
    .where(eq(moduleAssignments.id, assignment.id));
}

// Rate limiting: Once per day per assignment per notification type
async function shouldSendNotification(assignmentId: string, notificationType: string): Promise<boolean> {
  const lastSent = await db.select()
    .from(notificationLog)
    .where(and(
      eq(notificationLog.assignmentId, assignmentId),
      eq(notificationLog.notificationType, notificationType)
    ))
    .orderBy(desc(notificationLog.sentAt))
    .limit(1);
  
  if (!lastSent.length) return true; // Never sent before
  
  const hoursSinceLastSent = (Date.now() - lastSent[0].sentAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceLastSent >= 24; // Only send if 24+ hours have passed
}

async function recordNotificationSent(assignmentId: string, notificationType: string) {
  await db.insert(notificationLog).values({
    assignmentId,
    notificationType,
    sentAt: new Date(),
  });
}

function calculateProficiency(attempts: any[], targetDifficulty: number): number {
  // Filter attempts at target difficulty level (last 10)
  const relevantAttempts = attempts
    .filter(a => a.perceivedDifficulty === getDifficultyLabel(targetDifficulty))
    .slice(-10); // Last 10 attempts
  
  if (relevantAttempts.length < 10) return 0; // Not enough data - need 10 attempts
  
  const correctCount = relevantAttempts.filter(a => a.correctCount > a.incorrectCount).length;
  
  // User requirement: 8 out of 10 at a level cements that status
  if (correctCount >= 8) {
    return 100; // Achieved proficiency
  }
  
  // Return progress towards proficiency (0-100)
  return Math.round((correctCount / 10) * 100);
}
```

---

## 🎨 UI/UX Specification

### Conversational Module Creation Page

**Route:** `/manager/modules/create`

```tsx
// web/app/manager/modules/create/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';

interface ConversationTurn {
  role: 'manager' | 'agent';
  content: string;
  suggestions?: string[];
  modulePreview?: ModulePreview;
  timestamp: Date;
}

export default function ConversationalModuleCreationPage() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [turns, setTurns] = useState<ConversationTurn[]>([
    {
      role: 'agent',
      content: "Hi! I'm here to help you create a training module. What would you like to train your team on?",
      suggestions: ['Sales skills', 'Technical training', 'Leadership development', 'Describe my own topic'],
      timestamp: new Date(),
    },
  ]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  const handleSend = async (message?: string) => {
    const messageToSend = message || userInput;
    if (!messageToSend.trim() && uploadedFiles.length === 0) return;

    // Add user message to UI immediately
    const newTurn: ConversationTurn = {
      role: 'manager',
      content: messageToSend,
      timestamp: new Date(),
    };
    setTurns([...turns, newTurn]);
    setUserInput('');
    setLoading(true);

    try {
      // Send to API
      const formData = new FormData();
      formData.append('conversationId', conversationId || '');
      formData.append('userMessage', messageToSend);
      uploadedFiles.forEach(file => formData.append('uploadedFiles', file));

      const res = await fetch('/api/curator/modules/conversation', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      // Update conversation ID
      if (!conversationId) setConversationId(data.conversationId);

      // Add agent response
      const agentTurn: ConversationTurn = {
        role: 'agent',
        content: data.agentMessage,
        suggestions: data.suggestions,
        modulePreview: data.modulePreview,
        timestamp: new Date(),
      };
      setTurns(prev => [...prev, agentTurn]);

      // Clear uploaded files
      setUploadedFiles([]);

      // If module created, redirect to edit page
      if (data.draftModuleId) {
        setTimeout(() => {
          window.location.href = `/manager/modules/${data.draftModuleId}`;
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion);
  };

  return (
    <div className="flex h-screen flex-col bg-neutral-50">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <h1 className="text-2xl font-semibold">Create New Module</h1>
        <p className="text-sm text-neutral-600">
          Describe what you want to train your team on, and I'll help you build it.
        </p>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-3xl space-y-4">
          {turns.map((turn, i) => (
            <div key={i} className={`flex ${turn.role === 'manager' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  turn.role === 'manager'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border shadow-sm'
                }`}
              >
                <p className="whitespace-pre-wrap">{turn.content}</p>

                {/* Module Preview (if present) */}
                {turn.modulePreview && (
                  <div className="mt-4 border-t pt-4">
                    <ModulePreviewCard preview={turn.modulePreview} />
                  </div>
                )}

                {/* Suggestions */}
                {turn.suggestions && turn.suggestions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {turn.suggestions.map((suggestion, j) => (
                      <button
                        key={j}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="rounded-full border bg-neutral-50 px-3 py-1 text-sm hover:bg-neutral-100"
                        disabled={loading}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg border bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-400"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: '0.1s' }}></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t bg-white px-6 py-4">
        <div className="mx-auto max-w-3xl">
          {/* File Upload Preview */}
          {uploadedFiles.length > 0 && (
            <div className="mb-2 flex gap-2">
              {uploadedFiles.map((file, i) => (
                <div key={i} className="flex items-center gap-2 rounded border bg-neutral-50 px-3 py-1 text-sm">
                  <span>{file.name}</span>
                  <button
                    onClick={() => setUploadedFiles(uploadedFiles.filter((_, j) => j !== i))}
                    className="text-neutral-500 hover:text-neutral-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            {/* File Upload Button */}
            <label className="cursor-pointer rounded-lg border px-4 py-2 hover:bg-neutral-50">
              📎
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    setUploadedFiles([...uploadedFiles, ...Array.from(e.target.files)]);
                  }
                }}
              />
            </label>

            {/* Text Input */}
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type your message... (or upload files)"
              className="flex-1 rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />

            {/* Send Button */}
            <button
              onClick={() => handleSend()}
              disabled={loading || (!userInput.trim() && uploadedFiles.length === 0)}
              className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModulePreviewCard({ preview }: { preview: ModulePreview }) {
  return (
    <div className="rounded-lg border bg-neutral-50 p-4">
      <h3 className="mb-2 text-lg font-semibold">{preview.title}</h3>
      <p className="mb-4 text-sm text-neutral-600">{preview.description}</p>

      <div className="mb-4 flex gap-4 text-sm">
        <span>🎯 Target: {preview.targetMasteryLevel}</span>
        <span>⏱️ {preview.estimatedMinutes} minutes</span>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold">Content Structure:</p>
        {preview.contentBlocks.map((block, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span className="font-medium text-neutral-600">{i + 1}.</span>
            <div>
              <span className="font-medium">{block.title}</span>
              {block.isRingFenced && <span className="ml-2 text-xs">🔒 Proprietary</span>}
              {block.source === 'ai_generated' && <span className="ml-2 text-xs">🤖 AI-Generated</span>}
              {block.source === 'public_web' && <span className="ml-2 text-xs">🌐 Public Research</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## ✅ Acceptance Criteria (Updated for v2.0)

### **Conversational Module Creation:**
- [ ] Manager can start module creation via chat interface
- [ ] Agent asks clarifying questions (topic, audience, deadline, proprietary content)
- [ ] Manager can upload files (PDFs, docs, videos) inline
- [ ] Agent generates module preview after collecting sufficient info
- [ ] Manager can refine module via additional prompts
- [ ] Draft module is created and linked to conversation history

### **Proprietary Content Handling:**
- [ ] Uploaded content is tagged as `source: 'proprietary'`, `is_ring_fenced: true`
- [ ] Access control is enforced: `organizationId` filter on all queries
- [ ] Proprietary content is visually distinguished in UI (🔒 icon)
- [ ] Blended modules show mix of proprietary and public content

### **Proficiency & Deadline Tracking:**
- [ ] Manager sets target proficiency % and deadline during assignment
- [ ] Background job calculates current proficiency hourly
- [ ] Risk status is updated automatically (`on_track`, `at_risk`, `overdue`, `achieved`)
- [ ] Manager and learner are notified when deadlines missed or at-risk detected

### **Adaptive Difficulty:**
- [ ] Questions are tagged with difficulty level (1-5)
- [ ] Proficiency is calculated based on success rate at target difficulty
- [ ] Module defines `target_mastery_level` (not fixed difficulty)

### **UI/UX:**
- [ ] Chat interface feels conversational and intelligent
- [ ] Agent responses are contextual and helpful
- [ ] Module preview is visually clear and actionable
- [ ] Suggestions (action buttons) guide manager through flow

---

## 🧪 Testing Strategy

### **Unit Tests:**
- Module creation agent logic (intent detection, missing info detection)
- Proficiency calculation
- Risk status determination
- Access control for proprietary content

### **Integration Tests:**
- End-to-end conversational module creation
- File upload and processing
- Proficiency tracking background job
- Notification triggers

### **Manual UAT:**
1. **Create module via conversation**
   - Start conversation, answer agent questions
   - Upload proprietary file mid-conversation
   - Review module preview, refine via prompt
   - Verify draft module created

2. **Assign module with deadline**
   - Set target proficiency (85%) and deadline (2 weeks)
   - Simulate learner progress (answer questions)
   - Verify proficiency updates hourly
   - Verify risk status changes at 7-day threshold
   - Verify notifications sent when overdue

3. **Proprietary content access control**
   - Create module with proprietary content (Org A)
   - Verify learner from Org A can see it
   - Verify learner from Org B cannot see it

---

## 📦 Deliverables

### **Phase 1: Conversational Infrastructure (12-16h)**
1. Database migration (`030_manager_modules_ai_first.sql`)
2. Conversation API route (`POST /api/curator/modules/conversation`)
3. Module creation agent service (`api/src/services/module-creation-agent.ts`)
4. File upload processing for proprietary content

### **Phase 2: Proficiency & Deadline Management (8-10h)**
1. Proficiency calculation logic
2. Background job for proficiency updates
3. Risk status determination
4. Notification triggers (manager + learner)

### **Phase 3: UI Implementation (12-14h)**
1. Conversational module creation page (`/manager/modules/create`)
2. Module preview component
3. File upload inline in chat
4. Suggestion buttons and action flows
5. Module analytics page with proficiency tracking

---

## 🚀 Success Metrics

- Manager can create a module in < 3 minutes via conversation (faster than v1.0 forms)
- 100% of proprietary content is correctly ring-fenced
- Proficiency tracking accuracy: 95%+ (measured against manual review)
- Zero access control violations (cross-org content leaks)
- Manager satisfaction: "Feels like working with an expert consultant" (qualitative feedback)

---

## 📚 Documentation Updates Required

1. **Functional Spec (`docs/functional-spec.md`)**
   - Update Epic 14 section with v2.0 conversational approach
   - Add proprietary content access control rules
   - Add proficiency & deadline tracking specification

2. **Platform Interaction Contract (`docs/platform/interaction-contract.md`)**
   - Add conversational module creation patterns
   - Document agent prompts and clarifying questions

3. **README.md**
   - Update Quick Start with conversational module creation example
   - Add curl examples for conversation API

---

**Ready to implement! This is the AI-first, infinite-expertise vision for Cerply manager workflows.** 🚀

