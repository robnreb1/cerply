# Agent Implementation Prompt: Welcome Workflow

## Mission
Implement the complete Learner Welcome workflow for Cerply following the detailed implementation plan. This is a critical path item for enabling content library development and must follow all governance requirements.

---

## Governance Requirements (MANDATORY)

### 1. Source of Truth
- **BEFORE coding:** Read `docs/functional-spec.md` and `docs/spec/*`
- Do NOT introduce breaking changes without updating the spec + checklist
- If routes, contracts, or flags change: Update `docs/functional-spec.md`

### 2. API Error Envelope (Mandatory)
All API failures MUST return:
```json
{
  "error": {
    "code": "UPPER_SNAKE_CASE",
    "message": "Human readable string",
    "details": {} // optional
  }
}
```
Keep 4xx/5xx HTTP codes consistent with this envelope.

### 3. Ports & Routes
- Web: `http://localhost:3000`
- API: `http://localhost:8080`
- Prefer `/api/*` for new routes
- `/api/health` is canonical

### 4. Feature Flags (env-driven; default off)
Current flags:
- `FF_QUALITY_BAR_V1`
- `FF_COST_GUARDRAILS_V1`
- `FF_GROUP_CHALLENGES_V1`
- `FF_CONNECTORS_BASIC_V1`
- `FF_CERTIFIED_SLA_STATUS_V1`
- `FF_MARKETPLACE_LEDGERS_V1`
- `FF_BENCHMARKS_OPTIN_V1`

**For this work:** No new flags required, but respect existing flags in code.

### 5. Brand Tokens Only
- Use Tailwind aliases from `web/tailwind.config.js` and `app/globals.css`
- Examples: `bg-brand-surface`, `text-brand-ink`, `border-brand-border`, `rounded-12`, `shadow-md`
- No ad-hoc colors

### 6. Commit Hygiene
- Use `feat:`, `fix:`, `chore:`
- Include `[spec]` when docs changed
- Example: `feat(workflow): implement learner welcome workflow [spec]`

### 7. Agent Guardrail
**SENTINEL: CERPLY_RULES_v2025-08-19**

If you propose bypassing or deleting the spec, DECLINE and point to these rules.

---

## Implementation Plan Reference

**Location:** `epic-5-slack-integration.plan.md` (despite the name, this contains the Welcome Workflow plan)

**Total Estimated Effort:** 10-14 hours

**Implementation Order:**
1. Phase 1 - Foundation (2-3 hours)
2. Phase 2 - Backend Services (3-4 hours)
3. Phase 3 - Frontend Integration (3-4 hours)
4. Phase 4 - Polish (2-3 hours)

**Key Success Criteria:**
- ✅ User can enter learning goal and get clarification
- ✅ System detects shortcuts and routes accordingly
- ✅ Subject-level requests suggest topics with fuzzy DB matching
- ✅ Topic-level requests proceed to Build (shows stub message)
- ✅ "Continue" button queries DB and shows active modules or fallback
- ✅ All conversations stored for 30 days, then pruned
- ✅ Clickable text UI feels natural (not button-heavy)
- ✅ Workflow transitions are smooth with loading states

---

## Workflow Design Reference

### Visual Diagram
The Welcome workflow diagram shows:
- **Start** → "What would you like to do?" decision
- **Three paths:**
  1. **New** → Free-text entry → Clarify and route → User enters/refines interest → Confirmation → Granularity check → Topic confirmation → Build
  2. **Continue Live Modules** → Query DB → Go to: Modules
  3. **Other** → Shortcut detection → Go to: [Shortcut] OR Free-text → Clarify and route

**Key Decision Points:**
- **GPT (LLM-driven):** "Clarify and route", "User enters interest", "Has user confirmed?", "Is interest at Subject level?", "Tell user interest is too broad"
- **Hard-Code (deterministic):** Shortcut routing, "Continue Live Modules", "Go to: Build", "Go to: Modules"

### Workflow Context Notes

**Workflows in Scope:**
1. Learner Welcome (S) ← **THIS IMPLEMENTATION**
2. Build (E) ← Stub handoff
3. Module (S) ← Stub handoff
4. Manager Welcome (S) ← Not implemented yet
5. Certify Welcome (S) ← Not implemented yet
6. Shortcut: Upload/New/Account/Progress/Curate/Search/Certify/About/Challenge (S) ← Stub handoffs
7. Refresh (E) ← Not implemented yet

**Key Principles:**
- **S=Screen workflow** (UI/conversational, user-facing)
- **E=Engine workflow** (backend processing, no user interaction during execution)
- **Content is ALWAYS built at Topic level** (never Subject, aggregate up from Module)
- **All interactions happen in same chat window** (some may slide in/out of frame)
- **Avoid overt buttons** - use clickable text (styled as bold/colored words)
- **Shortcuts are background prompts** - LLM must detect intent

**Memory Rules:**
- **30 days:** Full conversation history retained
- **After 30 days:** Prune to decision points only + module inputs + account/progress data
- **Topic-level storage:** All module interactions stored at question/guidance level, shared across users (not duplicated)

**Content Hierarchy:**
1. Subject - Logical group for Topics (fuzzy boundaries, evolves over time)
2. **Topic** - Level at which content is built (clear scope, primary unit)
3. Module - Content delivered to user (flexible construction within Topic)
4. Question - On-screen content
5. Guidance notes - Supporting notes for questions

---

## Specific Implementation Requirements

### Database Schema Changes

**Add to `api/src/db/schema.ts`:**

```typescript
// New table: user_conversations
export const userConversations = pgTable('user_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  conversationId: uuid('conversation_id').notNull().defaultRandom(),
  messages: jsonb('messages').notNull().$type<{ role: string; content: string; timestamp: string }[]>(),
  workflowId: text('workflow_id').notNull(), // 'learner_welcome', 'module', etc.
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastActive: timestamp('last_active').notNull().defaultNow(),
});

// New table: user_workflow_decisions
export const userWorkflowDecisions = pgTable('user_workflow_decisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workflowId: text('workflow_id').notNull(),
  decisionPoint: text('decision_point').notNull(), // e.g., 'confirmed_topic', 'selected_subject'
  data: jsonb('data').notNull(), // Store structured decision data
  timestamp: timestamp('timestamp').notNull().defaultNow(),
});

// Add indexes
CREATE INDEX idx_user_conversations_user_id ON user_conversations(user_id);
CREATE INDEX idx_user_conversations_last_active ON user_conversations(last_active);
CREATE INDEX idx_workflow_decisions_user_id ON user_workflow_decisions(user_id);
```

**Migration:** Create `api/migrations/XXX_welcome_workflow.sql` with proper up/down functions.

### API Endpoints to Create

#### 1. `/api/workflow/detect-intent` (POST)
**Purpose:** Classify user input as shortcut, learning, or other

**Request:**
```typescript
{
  userInput: string;
  conversationHistory: { role: string; content: string }[];
  userId: string;
}
```

**Response:**
```typescript
{
  intent: 'shortcut' | 'learning' | 'other' | 'unclear';
  confidence: number; // 0-1
  shortcutType?: 'upload' | 'progress' | 'curate' | 'search' | 'certify' | 'about' | 'challenge' | 'new';
  learningTopic?: string; // Extracted if learning intent
  suggestedRoute: 'continue_conversation' | 'route_to_shortcut' | 'route_to_learning';
}
```

**Implementation:**
- Use LLM to classify intent (system prompt with examples)
- Check conversation context (recent messages)
- Return structured classification

#### 2. `/api/topics/search` (POST)
**Purpose:** Fuzzy search existing topics or generate suggestions

**Request:**
```typescript
{
  query: string; // User's topic interest
  userId: string;
  limit?: number; // Default 5
}
```

**Response:**
```typescript
{
  matches: Array<{
    topicId: string | null; // null if LLM-generated
    title: string;
    description: string;
    exists: boolean; // true if in DB, false if generated
    confidence: number; // 0-1 for fuzzy match
  }>;
  source: 'database' | 'generated' | 'hybrid';
}
```

**Implementation:**
- **Step 1:** Query database for topics using fuzzy matching (Levenshtein distance or similar)
  - Threshold: >0.7 similarity = strong match
  - Search across: `topics.title`, `topics.description`, `topics.keywords` (if exists)
- **Step 2:** If <3 strong matches, call LLM to generate 3-5 topic suggestions
- **Step 3:** Return combined results, DB matches first

**Fuzzy Matching Algorithm:**
```typescript
function calculateSimilarity(str1: string, str2: string): number {
  // Use Levenshtein distance or similar
  // Return score 0-1 (1 = identical)
}
```

#### 3. `/api/learner/active-modules` (GET)
**Purpose:** Get user's active learning modules for "Continue" path

**Request:**
- Query param: `userId`

**Response:**
```typescript
{
  activeModules: Array<{
    topicId: string;
    topicTitle: string;
    moduleId: string;
    moduleTitle: string;
    progress: number; // 0-100
    lastActive: string; // ISO timestamp
    priority: number; // 1-10, calculated from objectives + level
  }>;
  hasActiveModules: boolean;
}
```

**Priority Calculation (per user requirements):**
```typescript
function calculatePriority(module) {
  // Higher priority = shorter time frame + lower current level
  const timeFrameWeight = (10 - module.timeFrameToMaster) / 10; // Shorter = higher
  const levelWeight = (10 - module.currentLevel) / 10; // Lower level = higher
  return (timeFrameWeight * 0.6) + (levelWeight * 0.4); // Weighted average
}
```

**Implementation:**
- Query `learner_profiles` or `user_topics` for active topics (progress < 100%, lastActive < 30 days)
- Join with `topics` and `modules` tables
- Calculate priority for each
- Sort by priority DESC
- Return top 5-10

#### 4. `/api/conversation/store` (POST)
**Purpose:** Store conversation messages for 30-day retention

**Request:**
```typescript
{
  userId: string;
  conversationId: string;
  messages: Array<{ role: string; content: string; timestamp: string }>;
  workflowId: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  conversationId: string;
}
```

**Implementation:**
- Insert or update `user_conversations` table
- Update `lastActive` timestamp
- Set up background job (cron) to prune conversations older than 30 days

### Frontend Changes

#### New File: `web/app/lib/workflow-state.ts`

```typescript
export type WorkflowType = 
  | 'learner_welcome'
  | 'build'
  | 'module'
  | 'manager_welcome'
  | 'certify_welcome'
  | 'shortcut_upload'
  | 'shortcut_progress'
  | 'shortcut_curate'
  | 'shortcut_search'
  | 'shortcut_certify'
  | 'shortcut_about'
  | 'shortcut_challenge'
  | 'shortcut_new';

export interface WorkflowState {
  currentWorkflow: WorkflowType;
  workflowData: Record<string, any>;
  workflowStack: WorkflowType[]; // For returning from shortcuts
  conversationHistory: Array<{ role: string; content: string; timestamp: string }>;
  conversationId: string;
}

export interface WorkflowTransition {
  nextWorkflow: WorkflowType;
  data: Record<string, any>;
  action: 'TRANSITION' | 'CONTINUE' | 'STUB'; // STUB = handoff not implemented yet
  messageToDisplay?: string;
  uiComponent?: 'topic_selection' | 'loading' | 'error' | null;
}

// Session storage helpers
export function saveWorkflowState(state: WorkflowState): void {
  localStorage.setItem('cerply_workflow_state', JSON.stringify(state));
}

export function loadWorkflowState(): WorkflowState | null {
  const saved = localStorage.getItem('cerply_workflow_state');
  return saved ? JSON.parse(saved) : null;
}

export function clearWorkflowState(): void {
  localStorage.removeItem('cerply_workflow_state');
}
```

#### New File: `web/app/workflows/welcome.ts`

```typescript
import { WorkflowState, WorkflowTransition } from '../lib/workflow-state';

export async function executeWelcomeWorkflow(
  userInput: string,
  currentState: WorkflowState
): Promise<WorkflowTransition> {
  // Implementation of Welcome workflow logic
  // Follow the flowchart:
  // 1. Detect entry point (New, Continue, Shortcut, Free-text)
  // 2. Route through appropriate path
  // 3. Return transition to next workflow or continue conversation
  
  // TODO: Implement full logic per plan
}
```

**Key Functions to Implement:**
- `detectEntryPoint(userInput, history)`
- `clarifyAndRoute(userInput, history)` - Calls `/api/workflow/detect-intent`
- `understandInterest(userInput)` - Calls existing `/api/content/understand`
- `confirmUnderstanding(understanding)` - Generates confirmation question
- `checkGranularity(understanding)` - Checks if Subject/Topic/Module
- `suggestTopics(subject)` - Calls `/api/topics/search`
- `handleTopicConfirmation(topic)` - Returns transition to Build (stubbed)
- `handleContinue(userId)` - Calls `/api/learner/active-modules`

#### Updated File: `web/app/page.tsx`

**Major Refactor:**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { WorkflowState, WorkflowTransition, saveWorkflowState, loadWorkflowState } from './lib/workflow-state';
import { executeWelcomeWorkflow } from './workflows/welcome';
import TopicSelection from '@/components/TopicSelection';
import WorkflowLoading from '@/components/WorkflowLoading';
import ClickableText from '@/components/ClickableText';

export default function HomePage() {
  const [workflowState, setWorkflowState] = useState<WorkflowState>({
    currentWorkflow: 'learner_welcome',
    workflowData: {},
    workflowStack: [],
    conversationHistory: [],
    conversationId: crypto.randomUUID(),
  });

  const [messages, setMessages] = useState<Message[]>([/* welcome message */]);
  const [isLoading, setIsLoading] = useState(false);
  const [showTopicSelection, setShowTopicSelection] = useState(false);
  const [topicOptions, setTopicOptions] = useState<any[]>([]);

  useEffect(() => {
    // Load saved state from localStorage
    const saved = loadWorkflowState();
    if (saved) setWorkflowState(saved);
  }, []);

  async function handleSend(userInput: string) {
    setIsLoading(true);
    
    // Add user message
    const userMessage = { role: 'user', content: userInput, timestamp: new Date().toISOString() };
    const updatedHistory = [...workflowState.conversationHistory, userMessage];
    
    // Execute current workflow
    let transition: WorkflowTransition;
    
    switch (workflowState.currentWorkflow) {
      case 'learner_welcome':
        transition = await executeWelcomeWorkflow(userInput, {
          ...workflowState,
          conversationHistory: updatedHistory
        });
        break;
      // Add other workflows as implemented
      default:
        transition = {
          nextWorkflow: 'learner_welcome',
          data: {},
          action: 'CONTINUE',
          messageToDisplay: 'This workflow is not yet implemented.'
        };
    }

    // Handle transition
    if (transition.action === 'STUB') {
      // Stubbed workflow - show message, keep chat active
      setMessages(prev => [...prev, userMessage, {
        role: 'assistant',
        content: transition.messageToDisplay || 'This feature is coming soon.',
        timestamp: new Date().toISOString()
      }]);
    } else if (transition.action === 'TRANSITION') {
      // Transition to new workflow
      const newState = {
        ...workflowState,
        currentWorkflow: transition.nextWorkflow,
        workflowData: { ...workflowState.workflowData, ...transition.data },
        conversationHistory: updatedHistory
      };
      setWorkflowState(newState);
      saveWorkflowState(newState);
      
      // Show UI component if needed
      if (transition.uiComponent === 'topic_selection') {
        setTopicOptions(transition.data.topics);
        setShowTopicSelection(true);
      }
    }
    
    // Store conversation in DB
    await fetch('/api/conversation/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'current-user-id', // Get from auth context
        conversationId: workflowState.conversationId,
        messages: updatedHistory,
        workflowId: workflowState.currentWorkflow
      })
    });
    
    setIsLoading(false);
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg, i) => (
          <div key={i} className={`mb-4 ${msg.role === 'user' ? 'text-right' : ''}`}>
            <div className={`inline-block p-3 rounded-12 ${
              msg.role === 'user' 
                ? 'bg-brand-primary text-white' 
                : 'bg-brand-surface text-brand-ink'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && <WorkflowLoading workflow={workflowState.currentWorkflow} />}
      </div>

      {/* Topic Selection UI (conditional) */}
      {showTopicSelection && (
        <TopicSelection 
          topics={topicOptions} 
          onSelect={(topic) => {
            setShowTopicSelection(false);
            handleSend(topic.title);
          }}
        />
      )}

      {/* Input */}
      <div className="border-t border-brand-border p-4">
        <input
          type="text"
          placeholder="What would you like to learn?"
          className="w-full p-3 border border-brand-border rounded-12"
          onKeyPress={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value) {
              handleSend(e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
        />
      </div>

      {/* Shortcuts */}
      <div className="border-t border-brand-border p-2 flex gap-2 justify-center">
        {['Upload', 'Challenge', 'Progress', 'Account', 'Curate'].map(shortcut => (
          <button
            key={shortcut}
            onClick={() => handleSend(`shortcut:${shortcut.toLowerCase()}`)}
            className="px-3 py-1 text-sm text-brand-ink hover:text-brand-primary"
          >
            {shortcut}
          </button>
        ))}
      </div>
    </div>
  );
}
```

#### New Component: `web/components/TopicSelection.tsx`

```typescript
interface Topic {
  topicId: string | null;
  title: string;
  description: string;
  exists: boolean;
  confidence?: number;
}

interface TopicSelectionProps {
  topics: Topic[];
  onSelect: (topic: Topic) => void;
  onRefine?: () => void;
}

export default function TopicSelection({ topics, onSelect, onRefine }: TopicSelectionProps) {
  return (
    <div className="bg-brand-surface border border-brand-border rounded-12 p-4 m-4">
      <h3 className="text-lg font-semibold mb-3 text-brand-ink">
        Choose a topic to focus on:
      </h3>
      <div className="space-y-2">
        {topics.map((topic, i) => (
          <button
            key={i}
            onClick={() => onSelect(topic)}
            className="w-full text-left p-3 border border-brand-border rounded-8 hover:bg-brand-primary hover:text-white transition"
          >
            <div className="font-medium">{topic.title}</div>
            <div className="text-sm opacity-75 mt-1">{topic.description}</div>
            {topic.exists && (
              <div className="text-xs mt-1 text-brand-primary">
                ✓ Content available
              </div>
            )}
          </button>
        ))}
      </div>
      {onRefine && (
        <button
          onClick={onRefine}
          className="mt-3 text-sm text-brand-ink hover:text-brand-primary"
        >
          I want something more specific...
        </button>
      )}
    </div>
  );
}
```

#### New Component: `web/components/ClickableText.tsx`

```typescript
interface ClickableTextProps {
  text: string;
  onClick: () => void;
  className?: string;
}

export default function ClickableText({ text, onClick, className = '' }: ClickableTextProps) {
  return (
    <button
      onClick={onClick}
      onKeyPress={(e) => e.key === 'Enter' && onClick()}
      className={`inline font-semibold text-brand-primary hover:underline cursor-pointer ${className}`}
      tabIndex={0}
      role="button"
    >
      {text}
    </button>
  );
}
```

#### New Component: `web/components/WorkflowLoading.tsx`

```typescript
const LOADING_MESSAGES = {
  learner_welcome: 'Understanding your request...',
  build: 'Preparing your curriculum...',
  module: 'Loading your lesson...',
  topic_search: 'Searching for topics...',
};

interface WorkflowLoadingProps {
  workflow: string;
  message?: string;
}

export default function WorkflowLoading({ workflow, message }: WorkflowLoadingProps) {
  const displayMessage = message || LOADING_MESSAGES[workflow] || 'Loading...';
  
  return (
    <div className="flex items-center gap-3 p-3 bg-brand-surface rounded-12">
      <div className="animate-spin h-5 w-5 border-2 border-brand-primary border-t-transparent rounded-full" />
      <span className="text-brand-ink">{displayMessage}</span>
    </div>
  );
}
```

### Backend Services

#### New File: `api/src/services/conversation-memory.ts`

```typescript
import { db } from '../db';
import { userConversations, userWorkflowDecisions } from '../db/schema';
import { eq, lt } from 'drizzle-orm';

export async function storeConversation(
  userId: string,
  conversationId: string,
  messages: any[],
  workflowId: string
) {
  // Insert or update conversation
  await db.insert(userConversations).values({
    userId,
    conversationId,
    messages,
    workflowId,
    lastActive: new Date(),
  }).onConflictDoUpdate({
    target: [userConversations.conversationId],
    set: {
      messages,
      lastActive: new Date(),
    }
  });
}

export async function storeWorkflowDecision(
  userId: string,
  workflowId: string,
  decisionPoint: string,
  data: any
) {
  await db.insert(userWorkflowDecisions).values({
    userId,
    workflowId,
    decisionPoint,
    data,
  });
}

export async function getRecentConversations(userId: string, daysBack: number = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);
  
  return await db.select()
    .from(userConversations)
    .where(eq(userConversations.userId, userId))
    .where(lt(userConversations.lastActive, cutoff))
    .orderBy(userConversations.lastActive);
}

export async function pruneOldConversations() {
  // Run as background job
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  
  const oldConversations = await db.select()
    .from(userConversations)
    .where(lt(userConversations.lastActive, cutoff));
  
  for (const conv of oldConversations) {
    // Extract decision points from messages
    const decisionPoints = extractDecisionPoints(conv.messages);
    
    // Store decision points
    for (const dp of decisionPoints) {
      await storeWorkflowDecision(
        conv.userId,
        conv.workflowId,
        dp.point,
        dp.data
      );
    }
    
    // Delete full conversation
    await db.delete(userConversations)
      .where(eq(userConversations.id, conv.id));
  }
}

function extractDecisionPoints(messages: any[]) {
  // Extract messages where user made a decision
  // E.g., confirmed topic, selected module, etc.
  // TODO: Implement logic to identify decision points
  return [];
}
```

#### New File: `api/src/services/topic-search.ts`

```typescript
import { db } from '../db';
import { topics } from '../db/schema';
import { like, or } from 'drizzle-orm';
import { callOpenAI } from './llm-orchestrator';

export async function searchTopics(query: string, limit: number = 5) {
  // Step 1: Fuzzy search in database
  const dbMatches = await fuzzySearchDB(query, limit);
  
  // Step 2: If insufficient matches, generate via LLM
  let generatedTopics = [];
  if (dbMatches.length < 3) {
    generatedTopics = await generateTopicSuggestions(query, 5 - dbMatches.length);
  }
  
  return {
    matches: [...dbMatches, ...generatedTopics],
    source: dbMatches.length > 0 && generatedTopics.length > 0 ? 'hybrid' : 
            dbMatches.length > 0 ? 'database' : 'generated'
  };
}

async function fuzzySearchDB(query: string, limit: number) {
  // Search topics by title/description
  const results = await db.select()
    .from(topics)
    .where(or(
      like(topics.title, `%${query}%`),
      like(topics.description, `%${query}%`)
    ))
    .limit(limit * 2); // Get more for similarity ranking
  
  // Calculate similarity and rank
  const ranked = results
    .map(topic => ({
      topicId: topic.id,
      title: topic.title,
      description: topic.description || '',
      exists: true,
      confidence: calculateSimilarity(query, topic.title)
    }))
    .filter(t => t.confidence > 0.7) // Threshold
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
  
  return ranked;
}

async function generateTopicSuggestions(subject: string, count: number) {
  const prompt = `Generate ${count} focused learning topics for the subject "${subject}". 
Each topic should be:
- Specific enough to build a complete curriculum
- 3-8 words long
- Relevant to professional development
- Different from each other

Return as JSON array:
[
  { "title": "...", "description": "..." },
  ...
]`;

  const result = await callOpenAI('gpt-4o', prompt, 'You are a curriculum design expert.', 3, 0.7);
  const parsed = JSON.parse(result.text);
  
  return parsed.map(t => ({
    topicId: null,
    title: t.title,
    description: t.description,
    exists: false,
    confidence: 1.0
  }));
}

function calculateSimilarity(str1: string, str2: string): number {
  // Levenshtein distance implementation
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  
  // Simple word overlap for now
  const words1 = s1.split(' ');
  const words2 = s2.split(' ');
  const overlap = words1.filter(w => words2.includes(w)).length;
  const maxWords = Math.max(words1.length, words2.length);
  
  return overlap / maxWords;
}
```

---

## Testing Requirements

### Unit Tests Required

**File:** `api/tests/workflows/welcome.test.ts`

Test cases:
1. Intent detection
   - Shortcut patterns ("I want to upload", "show my progress")
   - Learning patterns ("teach me X", "I need to learn Y")
   - Other patterns ("what is Cerply?", random text)
2. Topic fuzzy search
   - Exact match
   - Partial match (>70% similarity)
   - No match (trigger LLM generation)
3. Active modules query
   - User with active modules
   - User with no active modules
   - Priority calculation correctness
4. Conversation memory
   - Store conversation
   - Retrieve recent conversations
   - Prune old conversations (keep decision points)

**File:** `api/tests/services/topic-search.test.ts`

Test similarity algorithm:
- Exact match = 1.0
- Substring match = 0.9
- Word overlap = proportional
- No overlap = 0.0

### Integration Tests Required

**File:** `web/e2e/welcome-workflow.spec.ts`

End-to-end scenarios:
1. **Happy path: Topic request**
   - User: "teach me python programming"
   - System: Confirms understanding
   - User: "yes"
   - System: Detects as Topic-level, proceeds to Build (shows stub)
   
2. **Subject-level request with topic selection**
   - User: "teach me leadership"
   - System: Confirms understanding
   - User: "yes"
   - System: Detects as Subject-level, suggests 3-5 topics
   - User: Selects "Team Management"
   - System: Confirms topic, proceeds to Build (shows stub)
   
3. **Continue path with active modules**
   - User: Clicks "Continue" (or types "continue my learning")
   - System: Queries DB, finds active modules
   - System: Shows "Welcome back! Resuming [Topic]..."
   - System: Routes to Module (shows stub)
   
4. **Continue path with NO active modules**
   - User: Clicks "Continue"
   - System: Queries DB, finds nothing
   - System: "You don't have any active modules yet. What would you like to learn?"
   - User: Proceeds to enter new topic
   
5. **Shortcut detection**
   - User: "show my progress"
   - System: Detects "progress" shortcut
   - System: Shows stub message
   
6. **Refinement loop**
   - User: "teach me sales"
   - System: Confirms understanding
   - User: "no, I mean B2B enterprise sales"
   - System: Re-generates understanding, confirms again
   - User: "yes"
   - System: Proceeds

### Manual Testing Checklist

After implementation, manually verify:

- [ ] Welcome message displays on first load
- [ ] User can type and send messages
- [ ] LLM understanding generates correctly
- [ ] Confirmation question appears
- [ ] Affirmative response ("yes") is detected
- [ ] Subject-level request shows topic selection UI
- [ ] Topic selection UI has 3-5 options
- [ ] Clicking a topic proceeds to Build (stub message)
- [ ] "Continue" button queries DB correctly
- [ ] If no active modules, fallback message appears
- [ ] If active modules exist, prioritization is correct
- [ ] Conversation stored in localStorage
- [ ] Conversation synced to DB via API
- [ ] Shortcuts footer buttons visible
- [ ] Clicking shortcut shows appropriate message
- [ ] Loading states appear during API calls
- [ ] Error states handled gracefully (no crashes)
- [ ] UI is accessible (keyboard navigation works)
- [ ] Brand colors used consistently (no ad-hoc colors)
- [ ] Responsive design (mobile + desktop)

---

## Completion Summary Requirements

When you complete this implementation, provide a comprehensive summary with the following sections:

### 1. Implementation Summary
- What was built (features completed)
- What was deferred/stubbed (handoffs not implemented)
- Any deviations from the plan (with rationale)

### 2. Technical Changes
- New files created (list with brief description)
- Existing files modified (list with what changed)
- Database schema changes (tables added, columns added)
- API endpoints added (with routes and purpose)

### 3. Testing Results
- Unit test results (pass/fail counts, coverage %)
- Integration test results (scenarios tested, outcomes)
- Manual testing checklist completion (all items checked)
- Known issues discovered during testing

### 4. Code Quality
- Linter status (any errors remaining?)
- TypeScript compilation (any errors remaining?)
- Accessibility check (keyboard navigation, screen readers)
- Performance metrics (load times, API response times)

### 5. Governance Compliance
- [ ] Used error envelope format for all API errors
- [ ] Used brand tokens (no ad-hoc colors)
- [ ] Followed commit hygiene (feat/fix/chore, [spec] tags)
- [ ] Updated `docs/functional-spec.md` (if routes/contracts changed)
- [ ] No breaking changes introduced (or documented if unavoidable)

### 6. Deployment Readiness
- [ ] Database migrations tested (up and down)
- [ ] Environment variables documented (if any new ones added)
- [ ] Feature flags configured correctly (if any used)
- [ ] No hardcoded secrets in code
- [ ] Staging deployment instructions (if different from usual)

### 7. Known Limitations
- Stubbed handoffs (Build, Module, Shortcuts)
- Edge cases not yet handled
- Performance bottlenecks (if any)
- Technical debt incurred (and plan to address)

### 8. Next Steps
- What needs to be done for full completion (unstub handoffs)
- Dependencies for other workflows (Build, Module)
- Recommended improvements for future iterations

### 9. Demo Instructions
Step-by-step guide to demo the Welcome workflow:
1. Start servers (web + api)
2. Navigate to http://localhost:3000
3. Type "teach me python programming"
4. Observe: [expected behavior]
5. Type "yes"
6. Observe: [expected behavior]
7. (Include 3-5 demo scenarios)

### 10. Questions for Reconciliation
Any questions or ambiguities encountered during implementation that need clarification before moving to next workflow.

---

## Additional Context

### Current Codebase State
- Conversational UI exists but doesn't use workflow state machine
- `/api/content/understand` endpoint exists (use for understanding step)
- `/api/content/generate` endpoint exists (but not called from Welcome workflow yet)
- Adaptive engine deployed (don't modify)
- Database connection working (PostgreSQL on Render)

### Key Files to Reference
- `web/app/page.tsx` - Current chat implementation (will be refactored)
- `api/src/services/conversation-engine.ts` - Has 20 hardcoded affirmative responses (keep these)
- `api/src/services/llm-orchestrator.ts` - Has granularity detection (use for Subject/Topic check)
- `api/src/db/schema.ts` - Current database schema
- `docs/functional-spec.md` - Source of truth for system behavior

### Success Metrics
After implementation, the Welcome workflow should:
- Handle 90%+ of user inputs correctly (route to right path)
- Respond within 3 seconds (LLM calls)
- Store 100% of conversations (no data loss)
- Suggest relevant topics 80%+ of the time (for Subject-level)
- Prioritize active modules correctly (time frame + level algorithm)

---

## IMPORTANT REMINDERS

1. **No shortcuts:** Implement all logic as specified, don't skip steps
2. **Test thoroughly:** All unit + integration tests must pass
3. **Follow governance:** Error envelopes, brand tokens, commit hygiene
4. **Document deviations:** If you must deviate from plan, explain why
5. **Provide complete summary:** Use the template above, don't omit sections

**When complete, provide the full completion summary for reconciliation.**

---

SENTINEL: CERPLY_RULES_v2025-08-19

