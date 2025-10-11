# Epic 8: Conversational Learning Interface — Implementation Prompt

**For:** New Agent/Developer  
**Date:** 2025-10-11  
**Estimated Effort:** 15-16 hours (1.5-2 overnights)  
**Priority:** P1 (UX Differentiator)

---

## Table of Contents

1. [Project Context](#1-project-context)
2. [Epic 8 Requirements](#2-epic-8-requirements)
3. [Implementation Plan](#3-implementation-plan)
4. [Code Patterns & Examples](#4-code-patterns--examples)
5. [LLM Configuration](#5-llm-configuration)
6. [Acceptance Criteria](#6-acceptance-criteria)
7. [Testing Instructions](#7-testing-instructions)
8. [Rollout Plan](#8-rollout-plan)
9. [References](#9-references)
10. [Quick Start Checklist](#10-quick-start-checklist)

---

## 1. Project Context

### What is Cerply?

Cerply is a B2B enterprise learning platform that transforms company knowledge into adaptive, personalized learning experiences. The platform uses 3-LLM ensemble generation, gamification, and conversational interfaces to achieve 60-80% completion rates (vs 30-40% for traditional LMS).

**Current Status (Epics 1-7 Complete):**

| Epic | Status | Key Deliverables |
|------|--------|------------------|
| **Epic 1: D2C Removal** | ✅ Complete | Enterprise-only access |
| **Epic 2: SSO & RBAC** | ✅ Complete | SAML/OIDC, 3 roles |
| **Epic 3: Team Management** | ✅ Complete | Teams, learners, CSV import |
| **Epic 4: Manager Analytics** | ✅ Complete | 7 analytics endpoints |
| **Epic 5: Slack Integration** | ✅ Complete | Slack DM delivery |
| **Epic 6: Ensemble Generation** | ✅ Complete | 3-LLM pipeline |
| **Epic 6.5: Research Mode** | ✅ Complete | Topic-based research |
| **Epic 7: Gamification** | ✅ Complete | Levels, certificates, badges |

**What's Missing (Epic 8 Goal):**

Currently, learners interact through structured UI (buttons, forms, multiple choice). Epic 8 adds:
- No natural language queries ("How am I doing?", "What's next?")
- No conversational help ("I don't understand this answer")
- No free-text answer input (only multiple choice)
- No confusion tracking for adaptive difficulty signals
- No Cmd+K quick actions

### Why Epic 8 Matters

**The Problem:** Traditional LMS forces learners into rigid UI patterns. Multiple choice questions feel artificial. Learners can't ask natural questions about their progress.

**The Cerply Solution:** Conversational Learning Interface
- **Natural Language Queries:** "How am I doing?" → Progress summary
- **Intent Router:** Lightweight NLP classifies queries without expensive LLM calls
- **Explanation Engine:** LLM-powered explanations when learners are confused
- **Free-Text Answers:** "Type your answer..." with NLP + LLM validation
- **Confusion Tracking:** Feeds adaptive difficulty engine (Epic 9)

**Result:** More natural learning experience, higher engagement, adaptive signals for personalization.

### Tech Stack

Same as Epic 5-7:
- **API:** Fastify 4.x + Drizzle ORM + PostgreSQL 15
- **Web:** Next.js 14 (App Router) + Tailwind CSS
- **LLM:** OpenAI GPT-4o-mini for explanations (gpt-4o-mini for cost efficiency)
- **Testing:** Vitest + Playwright
- **Markdown:** `marked` library for rendering chat responses

### Key Code Patterns (Established in Epics 1-7)

1. **Feature Flags:** `FF_CONVERSATIONAL_UI_V1`, `FF_FREE_TEXT_ANSWERS_V1`
2. **RBAC Middleware:** `requireLearner(req, reply)` - always `return reply`
3. **Error Envelopes:** `{ error: { code, message, details? } }`
4. **Session Management:** `getSession(req)` for user context
5. **Migration Headers:** Standard format with Epic/BRD/FSD references
6. **Service Layer:** Extract core logic to services (not inline in routes)

### Files to Study Before Starting

**Critical Reading (2 hours):**
1. **`EPIC7_IMPLEMENTATION_PROMPT.md`** - Follow this structure
2. **`api/src/routes/gamification.ts`** - RBAC pattern with getSession()
3. **`api/src/services/gamification.ts`** - Service layer pattern
4. **`web/components/ChatPanel.tsx`** (if exists from previous work) - UI pattern
5. **`docs/MVP_B2B_ROADMAP.md`** - Epic 8 section (lines 787-926)

---

## 2. Epic 8 Requirements

### Goal

Implement a conversational learning interface that allows learners to interact naturally via chat, ask questions in natural language, receive LLM-powered explanations, and answer questions using free-text input instead of multiple choice.

### User Stories

**Story 1: Natural Language Progress Queries**
- **As a learner,** I want to ask "How am I doing?" in natural language,
- **So that** I get a quick progress summary without navigating dashboards.
- **Acceptance:** Query classified as "progress" intent, returns summary from gamification service.

**Story 2: Conversational Help**
- **As a learner,** I want to ask "I don't understand this answer" when confused,
- **So that** I receive a simpler explanation that helps me learn.
- **Acceptance:** LLM generates ELI12-style explanation, logged to confusion_log for adaptive signals.

**Story 3: Free-Text Answer Input**
- **As a learner,** I want to type my answer instead of selecting multiple choice,
- **So that** I can express my understanding more naturally.
- **Acceptance:** Free-text answer validated by LLM, partial credit awarded, constructive feedback provided.

**Story 4: Keyboard Shortcuts**
- **As a learner,** I want to press Cmd+K to open chat instantly,
- **So that** I can quickly ask questions without clicking.
- **Acceptance:** Cmd+K and / open chat panel, Escape closes it.

**Story 5: Confusion Tracking**
- **As the system,** I want to track when learners are confused on topics,
- **So that** Epic 9 (Adaptive Difficulty) can adjust question difficulty.
- **Acceptance:** Confusion queries logged with question_id, later used by adaptive engine.

### Database Schema

#### Table: `chat_sessions`
Tracks chat conversations for context and history.

```sql
CREATE TABLE chat_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at            TIMESTAMPTZ
);

CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);
```

**Example row:**
```json
{
  "id": "session-123",
  "user_id": "user-abc",
  "started_at": "2025-10-11T10:00:00Z",
  "ended_at": null
}
```

#### Table: `chat_messages`
Stores individual messages in conversations.

```sql
CREATE TABLE chat_messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role                TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content             TEXT NOT NULL,
  intent              TEXT, -- 'progress', 'next', 'explanation', 'filter', 'help'
  metadata            JSONB, -- { questionId, trackId, etc }
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at DESC);
```

**Example row:**
```json
{
  "id": "msg-456",
  "session_id": "session-123",
  "role": "user",
  "content": "How am I doing?",
  "intent": "progress",
  "metadata": null,
  "created_at": "2025-10-11T10:00:05Z"
}
```

#### Table: `confusion_log`
Tracks learner confusion for adaptive difficulty signals.

```sql
CREATE TABLE confusion_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id         UUID NOT NULL, -- References items table (not enforced FK for flexibility)
  query               TEXT NOT NULL, -- What learner asked
  explanation_provided TEXT NOT NULL, -- LLM explanation given
  helpful             BOOLEAN, -- Learner feedback: was this helpful?
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_confusion_log_user ON confusion_log(user_id);
CREATE INDEX idx_confusion_log_question ON confusion_log(question_id);
CREATE INDEX idx_confusion_log_helpful ON confusion_log(helpful) WHERE helpful IS NOT NULL;
```

**Example row:**
```json
{
  "id": "conf-789",
  "user_id": "user-abc",
  "question_id": "item-fire-safety-q5",
  "query": "I don't understand why option A is correct",
  "explanation_provided": "Great question! Option A is correct because...",
  "helpful": true,
  "created_at": "2025-10-11T10:05:00Z"
}
```

### API Routes

#### 1. `POST /api/chat/message`
Send a chat message and get a response.

**RBAC:** Learner only (requireLearner)  
**Feature Flag:** `FF_CONVERSATIONAL_UI_V1`

**Request:**
```json
{
  "message": "How am I doing?",
  "sessionId": "optional-session-id"
}
```

**Response:**
```json
{
  "sessionId": "session-123",
  "response": "You're doing great! You've completed 15/20 questions with 85% accuracy. You're currently at Practitioner level.",
  "intent": "progress",
  "suggestions": [
    "What's my next question?",
    "Show me my badges",
    "Help"
  ]
}
```

**Intent Router Flow:**
1. Classify intent (progress/next/explanation/filter/help)
2. Route to appropriate handler:
   - progress → Call gamification service
   - next → Call learn service
   - explanation → Call explanation engine
   - filter → Parse topic, redirect to filtered view
   - help → Return help text
3. Store message in chat_messages table

#### 2. `GET /api/chat/sessions`
List recent chat sessions for the learner.

**RBAC:** Learner only  
**Feature Flag:** `FF_CONVERSATIONAL_UI_V1`

**Query Params:**
- `limit` (default: 10, max: 50)
- `offset` (default: 0)

**Response:**
```json
{
  "sessions": [
    {
      "id": "session-123",
      "startedAt": "2025-10-11T10:00:00Z",
      "endedAt": null,
      "messageCount": 5,
      "lastMessage": "You're doing great! You've completed..."
    }
  ],
  "total": 12,
  "limit": 10,
  "offset": 0
}
```

#### 3. `GET /api/chat/sessions/:id`
Get full message history for a session.

**RBAC:** Learner only (must own session)  
**Feature Flag:** `FF_CONVERSATIONAL_UI_V1`

**Response:**
```json
{
  "session": {
    "id": "session-123",
    "startedAt": "2025-10-11T10:00:00Z",
    "endedAt": null
  },
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "content": "How am I doing?",
      "intent": "progress",
      "createdAt": "2025-10-11T10:00:05Z"
    },
    {
      "id": "msg-2",
      "role": "assistant",
      "content": "You're doing great! You've completed...",
      "createdAt": "2025-10-11T10:00:06Z"
    }
  ]
}
```

#### 4. `POST /api/chat/explanation`
Request a deeper explanation for a specific question.

**RBAC:** Learner only  
**Feature Flag:** `FF_CONVERSATIONAL_UI_V1`

**Request:**
```json
{
  "questionId": "item-fire-safety-q5",
  "query": "I don't understand why option A is correct",
  "sessionId": "optional-session-id"
}
```

**Response:**
```json
{
  "explanation": "Great question! Option A is correct because raising the alarm immediately alerts others to the danger. This is crucial in fire safety because...",
  "alternatives": [
    "Think of it like this: imagine you're in a building and you smell smoke...",
    "Another way to understand it: the alarm system is designed to..."
  ],
  "relatedResources": [
    {
      "title": "Fire Safety Basics",
      "url": "/learn/fire-safety/basics"
    }
  ]
}
```

**Side Effects:**
- Logs to confusion_log table
- Caches explanation (1 hour TTL) for cost savings

#### 5. `POST /api/chat/feedback`
Mark an explanation as helpful or not helpful.

**RBAC:** Learner only  
**Feature Flag:** `FF_CONVERSATIONAL_UI_V1`

**Request:**
```json
{
  "confusionLogId": "conf-789",
  "helpful": true
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Thanks for your feedback!"
}
```

#### 6. `POST /api/learn/submit` (Enhanced)
Extend existing endpoint to support free-text answers.

**RBAC:** Learner only  
**Feature Flag:** `FF_FREE_TEXT_ANSWERS_V1` (for free-text support)

**Request (New Field):**
```json
{
  "questionId": "item-fire-safety-q5",
  "answerText": "You should raise the alarm first to alert everyone",
  "answerIndex": null  // null when using answerText
}
```

**Response:**
```json
{
  "correct": true,
  "partialCredit": 1.0,
  "feedback": "Exactly right! Raising the alarm is the first priority in fire safety because it alerts everyone to evacuate immediately.",
  "canonicalAnswer": "Raise the alarm immediately",
  "score": 1
}
```

**Validation Flow:**
1. Fuzzy match against canonical answer (Levenshtein distance)
2. If close match (>80% similarity) → correct
3. If unclear → Call LLM for validation
4. LLM returns: correct/partial/incorrect + constructive feedback
5. Track validation accuracy for quality improvement

### Feature Flags

```bash
# Enable conversational UI
FF_CONVERSATIONAL_UI_V1=true

# Enable free-text answer input
FF_FREE_TEXT_ANSWERS_V1=true

# LLM model for chat responses (default: gpt-4o-mini for cost efficiency)
CHAT_LLM_MODEL=gpt-4o-mini

# Explanation caching TTL in seconds (default: 3600 = 1 hour)
EXPLANATION_CACHE_TTL=3600
```

### Environment Variables

```bash
# OpenAI API key (required for explanation engine)
OPENAI_API_KEY=sk-...

# Model configuration
CHAT_LLM_MODEL=gpt-4o-mini  # Default for explanations
LLM_UNDERSTANDING=gpt-4o    # For free-text validation (higher accuracy)

# Caching
EXPLANATION_CACHE_TTL=3600  # 1 hour
```

---

## 3. Implementation Plan

### Phase 1: Database Schema (1 hour)

**File:** `api/drizzle/011_conversational_ui.sql`

```sql
------------------------------------------------------------------------------
-- Epic 8: Conversational Learning Interface
-- BRD: L-12 (Conversational interface), L-18 (Free-text answers)
-- FSD: Will be added as new section post-§28 upon Epic 8 completion
-- Roadmap: docs/MVP_B2B_ROADMAP.md (Epic 8, lines 787-926)
------------------------------------------------------------------------------

-- Chat sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role                TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content             TEXT NOT NULL,
  intent              TEXT, -- 'progress', 'next', 'explanation', 'filter', 'help'
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);

-- Confusion tracking (for adaptive difficulty signals)
CREATE TABLE IF NOT EXISTS confusion_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id         UUID NOT NULL,
  query               TEXT NOT NULL,
  explanation_provided TEXT NOT NULL,
  helpful             BOOLEAN,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_confusion_log_user ON confusion_log(user_id);
CREATE INDEX IF NOT EXISTS idx_confusion_log_question ON confusion_log(question_id);
CREATE INDEX IF NOT EXISTS idx_confusion_log_helpful ON confusion_log(helpful) WHERE helpful IS NOT NULL;
```

**Update Drizzle Schema:**

**File:** `api/src/db/schema.ts`

Add table definitions:

```typescript
export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
});

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').notNull().references(() => chatSessions.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'user' | 'assistant' | 'system'
  content: text('content').notNull(),
  intent: text('intent'), // 'progress' | 'next' | 'explanation' | 'filter' | 'help'
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const confusionLog = pgTable('confusion_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  questionId: uuid('question_id').notNull(),
  query: text('query').notNull(),
  explanationProvided: text('explanation_provided').notNull(),
  helpful: boolean('helpful'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

**Run Migration:**
```bash
cd api
npm run db:migrate
```

**Acceptance:**
- [ ] Migration runs without errors
- [ ] 3 new tables created
- [ ] Indexes created
- [ ] Foreign key constraints enforced

---

### Phase 2: Intent Router Service (2 hours)

**File:** `api/src/services/intent-router.ts` (NEW)

Lightweight NLP to classify query intent without expensive LLM calls.

```typescript
/**
 * Intent Router Service
 * Epic 8: Conversational Learning Interface
 * Classifies user queries into intents for efficient routing
 */

export type Intent = 'progress' | 'next' | 'explanation' | 'filter' | 'help' | 'unknown';

interface IntentResult {
  intent: Intent;
  confidence: number; // 0.0 to 1.0
  extractedEntities?: {
    trackId?: string;
    topicName?: string;
    questionId?: string;
  };
}

/**
 * Classify user query into intent category
 * Uses keyword matching and regex patterns (no LLM needed for most queries)
 */
export function classifyIntent(query: string): IntentResult {
  const lowerQuery = query.toLowerCase().trim();

  // Progress intent
  const progressPatterns = [
    /how am i doing/i,
    /my progress/i,
    /show.*stats/i,
    /what.*score/i,
    /my level/i,
    /my badges/i,
  ];
  
  if (progressPatterns.some(p => p.test(lowerQuery))) {
    return { intent: 'progress', confidence: 0.95 };
  }

  // Next intent
  const nextPatterns = [
    /what.*next/i,
    /next question/i,
    /give me.*question/i,
    /continue/i,
  ];
  
  if (nextPatterns.some(p => p.test(lowerQuery))) {
    return { intent: 'next', confidence: 0.95 };
  }

  // Explanation intent
  const explanationPatterns = [
    /don't understand/i,
    /confused/i,
    /explain/i,
    /why.*correct/i,
    /why.*wrong/i,
    /help.*understand/i,
  ];
  
  if (explanationPatterns.some(p => p.test(lowerQuery))) {
    return { intent: 'explanation', confidence: 0.90 };
  }

  // Filter intent
  const filterPatterns = [
    /show.*me.*questions?/i,
    /filter.*by/i,
    /only.*show/i,
    /skip/i,
  ];
  
  if (filterPatterns.some(p => p.test(lowerQuery))) {
    // Extract topic name if mentioned
    const topicMatch = lowerQuery.match(/(?:show|filter).*?([\w\s]+)\s+questions?/i);
    return {
      intent: 'filter',
      confidence: 0.85,
      extractedEntities: topicMatch ? { topicName: topicMatch[1].trim() } : undefined,
    };
  }

  // Help intent
  const helpPatterns = [
    /^help$/i,
    /how.*work/i,
    /what can i/i,
    /what commands/i,
  ];
  
  if (helpPatterns.some(p => p.test(lowerQuery))) {
    return { intent: 'help', confidence: 0.95 };
  }

  // Unknown intent (requires LLM or fallback to help)
  return { intent: 'unknown', confidence: 0.5 };
}

/**
 * Generate help text for learners
 */
export function getHelpText(): string {
  return `Here are some things you can ask me:

**Progress & Stats:**
- "How am I doing?"
- "Show my progress"
- "What's my current level?"
- "Show my badges"

**Learning:**
- "What's next?"
- "Give me a question"
- "I don't understand this answer"
- "Explain why option A is correct"

**Navigation:**
- "Show me fire safety questions"
- "Skip this topic"

**Other:**
- "Help" - Show this message

Just ask naturally - I'll understand!`;
}
```

**Acceptance:**
- [ ] Progress queries classified correctly (>90% confidence)
- [ ] Next queries classified correctly
- [ ] Explanation queries classified correctly
- [ ] Filter queries extract topic names
- [ ] Help intent returns help text
- [ ] Unknown intent has low confidence (<0.6)

---

### Phase 3: Explanation Engine (2 hours)

**File:** `api/src/services/explanation-engine.ts` (NEW)

LLM-powered explanation generation with caching.

```typescript
/**
 * Explanation Engine Service
 * Epic 8: Conversational Learning Interface
 * Generates ELI12-style explanations when learners are confused
 */

import OpenAI from 'openai';
import { db } from '../db';
import { items, confusionLog } from '../db/schema';
import { eq } from 'drizzle-orm';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const CHAT_LLM_MODEL = process.env.CHAT_LLM_MODEL || 'gpt-4o-mini';
const EXPLANATION_CACHE_TTL = parseInt(process.env.EXPLANATION_CACHE_TTL || '3600', 10); // 1 hour

// In-memory cache for explanations
const explanationCache = new Map<string, { explanation: string; timestamp: number }>();

interface ExplanationResult {
  explanation: string;
  alternatives: string[];
  relatedResources: Array<{ title: string; url: string }>;
  cached: boolean;
}

/**
 * Generate explanation for a question that learner is confused about
 */
export async function generateExplanation(
  questionId: string,
  learnerQuery: string,
  userId: string
): Promise<ExplanationResult> {
  // Check cache first
  const cacheKey = `${questionId}:${learnerQuery}`;
  const cached = explanationCache.get(cacheKey);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < EXPLANATION_CACHE_TTL * 1000) {
    console.log('[Explanation Engine] Cache hit:', cacheKey);
    return {
      explanation: cached.explanation,
      alternatives: [], // Not cached for simplicity
      relatedResources: [],
      cached: true,
    };
  }

  // Fetch question from DB
  const [question] = await db.select().from(items).where(eq(items.id, questionId)).limit(1);
  
  if (!question) {
    throw new Error('Question not found');
  }

  // Generate explanation using LLM
  const prompt = buildExplanationPrompt(question, learnerQuery);
  
  const completion = await openai.chat.completions.create({
    model: CHAT_LLM_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are a helpful learning assistant. Explain concepts in simple, clear language suitable for a 12-year-old (ELI12 style). Be encouraging and constructive.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 300,
  });

  const explanation = completion.choices[0]?.message?.content || 'I apologize, but I could not generate an explanation at this time.';

  // Cache explanation
  explanationCache.set(cacheKey, { explanation, timestamp: now });

  // Log to confusion_log for adaptive difficulty signals
  await db.insert(confusionLog).values({
    userId,
    questionId,
    query: learnerQuery,
    explanationProvided: explanation,
    helpful: null, // Will be updated when learner provides feedback
  });

  return {
    explanation,
    alternatives: [], // TODO: Generate alternatives in future
    relatedResources: [], // TODO: Link to related content
    cached: false,
  };
}

/**
 * Build LLM prompt for explanation
 */
function buildExplanationPrompt(question: any, learnerQuery: string): string {
  const options = Array.isArray(question.options) 
    ? question.options 
    : (question.options?.values || []);
  
  const correctAnswerIndex = typeof question.answer === 'number' ? question.answer : 0;
  const correctAnswer = options[correctAnswerIndex] || 'Unknown';

  return `A learner is confused about this question:

**Question:** ${question.stem || 'Question text not available'}

**Options:**
${options.map((opt: string, i: number) => `${String.fromCharCode(65 + i)}) ${opt}`).join('\n')}

**Correct Answer:** ${String.fromCharCode(65 + correctAnswerIndex)}) ${correctAnswer}

**Learner's Question:** "${learnerQuery}"

Please explain why the correct answer is right in simple, encouraging language. Use analogies or examples if helpful. Keep it under 200 words.`;
}

/**
 * Mark explanation as helpful or not helpful
 */
export async function markExplanationHelpful(
  confusionLogId: string,
  helpful: boolean
): Promise<void> {
  await db.update(confusionLog)
    .set({ helpful })
    .where(eq(confusionLog.id, confusionLogId));
}

/**
 * Get confusion statistics for a user (useful for adaptive difficulty)
 */
export async function getUserConfusionStats(userId: string): Promise<{
  totalConfusions: number;
  helpfulCount: number;
  unhelpfulCount: number;
  topConfusedQuestions: string[];
}> {
  const confusions = await db.select()
    .from(confusionLog)
    .where(eq(confusionLog.userId, userId));

  const helpfulCount = confusions.filter(c => c.helpful === true).length;
  const unhelpfulCount = confusions.filter(c => c.helpful === false).length;

  // Find most confused questions (appears most in log)
  const questionCounts = new Map<string, number>();
  confusions.forEach(c => {
    questionCounts.set(c.questionId, (questionCounts.get(c.questionId) || 0) + 1);
  });

  const topConfusedQuestions = Array.from(questionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([questionId]) => questionId);

  return {
    totalConfusions: confusions.length,
    helpfulCount,
    unhelpfulCount,
    topConfusedQuestions,
  };
}
```

**Acceptance:**
- [ ] Explanation generated for valid question ID
- [ ] Explanation cached (1 hour TTL)
- [ ] Cache hit on repeat queries
- [ ] Confusion logged to database
- [ ] Helpful feedback updates confusion_log
- [ ] Cost: ~$0.001 per explanation (gpt-4o-mini)

---

### Phase 4: Free-Text Answer Validation (2 hours)

**File:** `api/src/services/free-text-validator.ts` (NEW)

Validate free-text answers using fuzzy matching + LLM.

```typescript
/**
 * Free-Text Answer Validation Service
 * Epic 8: Conversational Learning Interface
 * Validates learner's free-text answers using NLP + LLM
 */

import OpenAI from 'openai';
import Levenshtein from 'fast-levenshtein'; // npm install fast-levenshtein

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const LLM_UNDERSTANDING = process.env.LLM_UNDERSTANDING || 'gpt-4o';

interface ValidationResult {
  correct: boolean;
  partialCredit: number; // 0.0 to 1.0
  feedback: string;
  method: 'fuzzy' | 'llm';
}

/**
 * Validate free-text answer against canonical answer
 */
export async function validateFreeTextAnswer(
  learnerAnswer: string,
  canonicalAnswer: string,
  questionStem: string
): Promise<ValidationResult> {
  // Step 1: Fuzzy matching (fast, cheap)
  const similarity = calculateSimilarity(learnerAnswer, canonicalAnswer);
  
  if (similarity > 0.90) {
    // Very close match - accept immediately
    return {
      correct: true,
      partialCredit: 1.0,
      feedback: `Exactly right! ${canonicalAnswer}`,
      method: 'fuzzy',
    };
  }

  if (similarity > 0.70 && similarity <= 0.90) {
    // Close match - give partial credit
    return {
      correct: true,
      partialCredit: similarity,
      feedback: `Good! You're on the right track. The canonical answer is: "${canonicalAnswer}"`,
      method: 'fuzzy',
    };
  }

  // Step 2: LLM validation (for complex answers)
  return await validateWithLLM(learnerAnswer, canonicalAnswer, questionStem);
}

/**
 * Calculate similarity using Levenshtein distance
 */
function calculateSimilarity(text1: string, text2: string): number {
  const norm1 = text1.toLowerCase().trim();
  const norm2 = text2.toLowerCase().trim();
  
  const distance = Levenshtein.get(norm1, norm2);
  const maxLength = Math.max(norm1.length, norm2.length);
  
  return maxLength === 0 ? 1.0 : 1 - (distance / maxLength);
}

/**
 * Validate answer using LLM (for semantic understanding)
 */
async function validateWithLLM(
  learnerAnswer: string,
  canonicalAnswer: string,
  questionStem: string
): Promise<ValidationResult> {
  const prompt = `You are grading a learner's answer to a question.

**Question:** ${questionStem}

**Canonical Answer:** ${canonicalAnswer}

**Learner's Answer:** ${learnerAnswer}

Please evaluate:
1. Is the learner's answer correct, partially correct, or incorrect?
2. What partial credit score (0.0 to 1.0) should they receive?
3. Provide constructive feedback in 1-2 sentences.

Respond in JSON format:
{
  "correct": true/false,
  "partialCredit": 0.0 to 1.0,
  "feedback": "Your constructive feedback here"
}`;

  const completion = await openai.chat.completions.create({
    model: LLM_UNDERSTANDING,
    messages: [
      {
        role: 'system',
        content: 'You are a fair and encouraging grader. Accept answers that demonstrate understanding, even if phrasing differs. Provide constructive feedback.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.3, // Lower temperature for consistent grading
    max_tokens: 200,
    response_format: { type: 'json_object' },
  });

  try {
    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
    
    return {
      correct: result.correct ?? false,
      partialCredit: result.partialCredit ?? 0.0,
      feedback: result.feedback || 'Unable to evaluate answer.',
      method: 'llm',
    };
  } catch (err) {
    console.error('[Free-Text Validator] LLM response parse error:', err);
    
    return {
      correct: false,
      partialCredit: 0.0,
      feedback: 'Sorry, I could not evaluate your answer. Please try rephrasing or selecting a multiple choice option.',
      method: 'llm',
    };
  }
}

/**
 * Check if question should use free-text input
 * (vs forcing multiple choice)
 */
export function shouldUseFreeText(questionType: string, optionCount: number): boolean {
  // Force MCQ for yes/no or binary questions
  if (optionCount === 2) {
    return false;
  }

  // Force MCQ for categorical questions (3-4 distinct options)
  if (questionType === 'mcq' && optionCount <= 4) {
    return false; // Still allow MCQ as primary, but free-text as alternative
  }

  // Encourage free-text for open-ended questions
  if (questionType === 'free') {
    return true;
  }

  // Default: Allow both MCQ and free-text
  return true;
}
```

**Acceptance:**
- [ ] High similarity (>90%) → immediate acceptance
- [ ] Medium similarity (70-90%) → partial credit
- [ ] Low similarity → LLM validation
- [ ] LLM returns JSON with correct/partialCredit/feedback
- [ ] Cost: ~$0.005 per LLM validation (gpt-4o for accuracy)
- [ ] Fallback to error message if LLM fails

---

### Phase 5: Chat API Routes (2 hours)

**File:** `api/src/routes/chat.ts` (NEW)

Implement 5 chat endpoints with RBAC and session management.

```typescript
/**
 * Chat Routes
 * Epic 8: Conversational Learning Interface
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db';
import { chatSessions, chatMessages, users } from '../db/schema';
import { requireLearner, getSession } from '../middleware/rbac';
import { classifyIntent, getHelpText } from '../services/intent-router';
import { generateExplanation, markExplanationHelpful } from '../services/explanation-engine';
import { getLearnerLevel, getAllLearnerLevels } from '../services/gamification';
import { getUserCertificates } from '../services/certificates';
import { getLearnerBadges } from '../services/badges';

const FF_CONVERSATIONAL_UI_V1 = process.env.FF_CONVERSATIONAL_UI_V1 === 'true';

export async function registerChatRoutes(app: FastifyInstance) {
  /**
   * POST /api/chat/message
   * Send a chat message and get response
   */
  app.post(
    '/api/chat/message',
    async (req: FastifyRequest<{ Body: { message: string; sessionId?: string } }>, reply: FastifyReply) => {
      if (!FF_CONVERSATIONAL_UI_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireLearner(req, reply)) return reply;

      const session = getSession(req);
      const { message, sessionId } = req.body;

      if (!message || message.trim().length === 0) {
        return reply.status(400).send({
          error: { code: 'BAD_REQUEST', message: 'Message cannot be empty' }
        });
      }

      // Get or create session
      let activeSessionId = sessionId;
      
      if (!activeSessionId) {
        const [newSession] = await db.insert(chatSessions).values({
          userId: session.userId,
        }).returning();
        activeSessionId = newSession.id;
      }

      // Classify intent
      const { intent, confidence, extractedEntities } = classifyIntent(message);

      // Store user message
      await db.insert(chatMessages).values({
        sessionId: activeSessionId,
        role: 'user',
        content: message,
        intent,
        metadata: extractedEntities ? { extractedEntities } : null,
      });

      // Route to appropriate handler
      let response = '';
      const suggestions: string[] = [];

      switch (intent) {
        case 'progress':
          response = await handleProgressQuery(session.userId);
          suggestions.push("What's my next question?", "Show my badges", "Help");
          break;

        case 'next':
          response = "Let me fetch your next question...";
          suggestions.push("I don't understand", "Skip this", "Help");
          break;

        case 'explanation':
          response = "To provide a detailed explanation, please specify which question you need help with. You can also use the 'Request Explanation' button on any question.";
          suggestions.push("Help", "What's next?");
          break;

        case 'filter':
          const topicName = extractedEntities?.topicName || 'unknown';
          response = `I'll filter to show only ${topicName} questions. (This feature is coming soon!)`;
          suggestions.push("What's next?", "Show my progress");
          break;

        case 'help':
          response = getHelpText();
          suggestions.push("How am I doing?", "What's next?");
          break;

        default:
          response = "I'm not sure I understand. Try asking 'How am I doing?' or 'What's next?'. Type 'help' to see what I can do!";
          suggestions.push("Help", "How am I doing?");
      }

      // Store assistant response
      await db.insert(chatMessages).values({
        sessionId: activeSessionId,
        role: 'assistant',
        content: response,
        intent,
      });

      return reply.send({
        sessionId: activeSessionId,
        response,
        intent,
        confidence,
        suggestions,
      });
    }
  );

  /**
   * GET /api/chat/sessions
   * List recent chat sessions
   */
  app.get(
    '/api/chat/sessions',
    async (req: FastifyRequest<{ Querystring: { limit?: number; offset?: number } }>, reply: FastifyReply) => {
      if (!FF_CONVERSATIONAL_UI_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireLearner(req, reply)) return reply;

      const session = getSession(req);
      const limit = Math.min(req.query.limit || 10, 50);
      const offset = req.query.offset || 0;

      const sessions = await db.select()
        .from(chatSessions)
        .where(eq(chatSessions.userId, session.userId))
        .orderBy(desc(chatSessions.startedAt))
        .limit(limit)
        .offset(offset);

      // Get message count and last message for each session
      const sessionsWithMeta = await Promise.all(
        sessions.map(async (s) => {
          const messages = await db.select()
            .from(chatMessages)
            .where(eq(chatMessages.sessionId, s.id))
            .orderBy(desc(chatMessages.createdAt))
            .limit(1);

          const messageCount = await db.select()
            .from(chatMessages)
            .where(eq(chatMessages.sessionId, s.id));

          return {
            id: s.id,
            startedAt: s.startedAt,
            endedAt: s.endedAt,
            messageCount: messageCount.length,
            lastMessage: messages[0]?.content || '',
          };
        })
      );

      return reply.send({
        sessions: sessionsWithMeta,
        total: sessions.length,
        limit,
        offset,
      });
    }
  );

  /**
   * GET /api/chat/sessions/:id
   * Get full message history for session
   */
  app.get(
    '/api/chat/sessions/:id',
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      if (!FF_CONVERSATIONAL_UI_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireLearner(req, reply)) return reply;

      const session = getSession(req);
      const { id } = req.params;

      // Verify session ownership
      const [chatSession] = await db.select()
        .from(chatSessions)
        .where(and(
          eq(chatSessions.id, id),
          eq(chatSessions.userId, session.userId)
        ))
        .limit(1);

      if (!chatSession) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Session not found' }
        });
      }

      // Get all messages
      const messages = await db.select()
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, id))
        .orderBy(chatMessages.createdAt);

      return reply.send({
        session: {
          id: chatSession.id,
          startedAt: chatSession.startedAt,
          endedAt: chatSession.endedAt,
        },
        messages: messages.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          intent: m.intent,
          createdAt: m.createdAt,
        })),
      });
    }
  );

  /**
   * POST /api/chat/explanation
   * Request deeper explanation for question
   */
  app.post(
    '/api/chat/explanation',
    async (req: FastifyRequest<{ Body: { questionId: string; query: string; sessionId?: string } }>, reply: FastifyReply) => {
      if (!FF_CONVERSATIONAL_UI_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireLearner(req, reply)) return reply;

      const session = getSession(req);
      const { questionId, query, sessionId } = req.body;

      if (!questionId || !query) {
        return reply.status(400).send({
          error: { code: 'BAD_REQUEST', message: 'questionId and query required' }
        });
      }

      try {
        const result = await generateExplanation(questionId, query, session.userId);

        return reply.send(result);
      } catch (err: any) {
        return reply.status(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: err.message || 'Failed to generate explanation'
          }
        });
      }
    }
  );

  /**
   * POST /api/chat/feedback
   * Mark explanation as helpful or not
   */
  app.post(
    '/api/chat/feedback',
    async (req: FastifyRequest<{ Body: { confusionLogId: string; helpful: boolean } }>, reply: FastifyReply) => {
      if (!FF_CONVERSATIONAL_UI_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireLearner(req, reply)) return reply;

      const { confusionLogId, helpful } = req.body;

      if (!confusionLogId || typeof helpful !== 'boolean') {
        return reply.status(400).send({
          error: { code: 'BAD_REQUEST', message: 'confusionLogId and helpful (boolean) required' }
        });
      }

      try {
        await markExplanationHelpful(confusionLogId, helpful);

        return reply.send({
          ok: true,
          message: 'Thanks for your feedback!'
        });
      } catch (err: any) {
        return reply.status(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: err.message || 'Failed to save feedback'
          }
        });
      }
    }
  );
}

/**
 * Handle progress query - get learner stats
 */
async function handleProgressQuery(userId: string): Promise<string> {
  try {
    // Get learner levels across all tracks
    const levels = await getAllLearnerLevels(userId);
    const certificates = await getUserCertificates(userId);
    const badges = await getLearnerBadges(userId);

    if (levels.length === 0) {
      return "You haven't started any tracks yet. Let's get started! What would you like to learn?";
    }

    const levelSummary = levels.map(l => `${l.trackTitle}: ${l.level} (${l.correctAttempts} correct)`).join('\n');

    return `Here's your progress:

**Levels:**
${levelSummary}

**Certificates:** ${certificates.length} earned
**Badges:** ${badges.length} unlocked

Keep up the great work! 🎉`;
  } catch (err) {
    console.error('[Chat] Progress query error:', err);
    return "I couldn't fetch your progress right now. Please try again in a moment.";
  }
}
```

**Register Routes:**

**File:** `api/src/index.ts`

Add after other route registrations:

```typescript
// Chat routes (Epic 8)
await safeRegister('./routes/chat', ['registerChatRoutes']);
```

**Acceptance:**
- [ ] POST /api/chat/message works with all intents
- [ ] Session auto-created on first message
- [ ] GET /api/chat/sessions returns user's sessions
- [ ] GET /api/chat/sessions/:id returns message history
- [ ] POST /api/chat/explanation generates LLM explanation
- [ ] POST /api/chat/feedback updates confusion_log
- [ ] All routes enforce requireLearner RBAC
- [ ] Feature flag gates all routes

---

### Phase 6: Extend Learn Routes for Free-Text (1.5 hours)

**File:** `api/src/routes/learn.ts` (MODIFY)

Add free-text answer support to existing `/api/learn/submit` endpoint.

```typescript
// Add import at top
import { validateFreeTextAnswer, shouldUseFreeText } from '../services/free-text-validator';

const FF_FREE_TEXT_ANSWERS_V1 = process.env.FF_FREE_TEXT_ANSWERS_V1 === 'true';

// Modify existing POST /api/learn/submit endpoint
app.post('/api/learn/submit', async (req, reply) => {
  const { questionId, answerIndex, answerText } = req.body;

  if (!requireLearner(req, reply)) return reply;

  const session = getSession(req);

  // Validate input
  if (!questionId) {
    return reply.status(400).send({
      error: { code: 'BAD_REQUEST', message: 'questionId required' }
    });
  }

  // Free-text validation path
  if (FF_FREE_TEXT_ANSWERS_V1 && answerText && answerText.trim().length > 0) {
    try {
      // Fetch question
      const [question] = await db.select().from(items).where(eq(items.id, questionId)).limit(1);
      
      if (!question) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Question not found' }
        });
      }

      // Get canonical answer
      const options = Array.isArray(question.options) ? question.options : (question.options?.values || []);
      const correctIndex = typeof question.answer === 'number' ? question.answer : 0;
      const canonicalAnswer = options[correctIndex] || 'Unknown';

      // Validate answer
      const validation = await validateFreeTextAnswer(
        answerText,
        canonicalAnswer,
        question.stem || ''
      );

      // Record attempt
      await db.insert(attempts).values({
        userId: session.userId,
        itemId: questionId,
        correct: validation.correct,
        score: validation.partialCredit,
        answerGiven: answerText,
        latencyMs: null, // TODO: Track from frontend
      });

      return reply.send({
        correct: validation.correct,
        partialCredit: validation.partialCredit,
        feedback: validation.feedback,
        canonicalAnswer,
        method: validation.method,
      });
    } catch (err: any) {
      console.error('[Learn] Free-text validation error:', err);
      return reply.status(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to validate answer'
        }
      });
    }
  }

  // Original MCQ validation path
  if (typeof answerIndex !== 'number') {
    return reply.status(400).send({
      error: { code: 'BAD_REQUEST', message: 'answerIndex or answerText required' }
    });
  }

  // ... rest of original MCQ logic ...
});
```

**Acceptance:**
- [ ] Free-text answers validated when answerText provided
- [ ] MCQ answers still work when answerIndex provided
- [ ] Partial credit recorded in attempts table
- [ ] Feedback returned to learner
- [ ] Feature flag controls free-text support

---

### Phase 7: Chat UI Component (3 hours)

**File:** `web/components/ChatPanel.tsx` (NEW)

React component with Cmd+K shortcut and markdown rendering.

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, HelpCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  intent?: string;
  createdAt?: string;
}

interface ChatPanelProps {
  onClose?: () => void;
}

export default function ChatPanel({ onClose }: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: Cmd+K or / to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === '/' && !isOpen && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          sessionId,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to send message');
      }

      const data = await res.json();

      setSessionId(data.sessionId);

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        intent: data.intent,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
        title="Open chat (Cmd+K)"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-blue-600 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <h3 className="font-semibold">Chat Assistant</h3>
        </div>
        <button
          onClick={() => {
            setIsOpen(false);
            if (onClose) onClose();
          }}
          className="text-white hover:bg-blue-700 p-1 rounded"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <HelpCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Ask me anything!</p>
            <p className="text-xs mt-2">Try: "How am I doing?" or "What's next?"</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {msg.role === 'assistant' ? (
                <ReactMarkdown className="prose prose-sm max-w-none">
                  {msg.content}
                </ReactMarkdown>
              ) : (
                <p className="text-sm">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-3 rounded-lg">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
```

**Integrate into Learn Page:**

**File:** `web/app/learn/page.tsx` (MODIFY)

Add chat panel:

```tsx
import ChatPanel from '@/components/ChatPanel';

export default function LearnPage() {
  return (
    <div className="...">
      {/* Existing content */}
      
      {/* Chat Panel */}
      <ChatPanel />
    </div>
  );
}
```

**Install Dependencies:**

```bash
cd web
npm install react-markdown
```

**Acceptance:**
- [ ] Chat panel opens with Cmd+K or /
- [ ] Messages display correctly (user right, assistant left)
- [ ] Markdown rendered in assistant messages
- [ ] Typing indicator shows during loading
- [ ] Auto-scrolls to latest message
- [ ] Enter sends message, Shift+Enter adds newline
- [ ] Escape closes panel

---

### Phase 8: Testing & Documentation (2 hours)

**Unit Tests:**

**File:** `api/tests/intent-router.test.ts` (NEW)

```typescript
import { describe, it, expect } from 'vitest';
import { classifyIntent } from '../src/services/intent-router';

describe('Intent Router', () => {
  it('should classify progress queries', () => {
    const result = classifyIntent('How am I doing?');
    expect(result.intent).toBe('progress');
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('should classify next queries', () => {
    const result = classifyIntent("What's next?");
    expect(result.intent).toBe('next');
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('should classify explanation queries', () => {
    const result = classifyIntent("I don't understand this answer");
    expect(result.intent).toBe('explanation');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('should return unknown for unclear queries', () => {
    const result = classifyIntent('asdfghjkl');
    expect(result.intent).toBe('unknown');
    expect(result.confidence).toBeLessThan(0.6);
  });
});
```

**Route Tests:**

**File:** `api/tests/chat-routes.test.ts` (NEW)

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { build } from '../src/app';
import { FastifyInstance } from 'fastify';

describe('Chat Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.FF_CONVERSATIONAL_UI_V1 = 'true';
    app = await build();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/chat/message requires authentication', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/chat/message',
      payload: { message: 'test' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('POST /api/chat/message validates message', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/chat/message',
      headers: { cookie: 'cerply.sid=test-session' },
      payload: { message: '' },
    });

    expect(response.statusCode).toBe(400);
    const json = response.json();
    expect(json.error.code).toBe('BAD_REQUEST');
  });

  // Add more tests...
});
```

**Smoke Tests:**

**File:** `api/scripts/smoke-chat.sh` (NEW)

```bash
#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:8080}"
ADMIN_TOKEN="${ADMIN_TOKEN:-dev-admin-token-12345}"
ORG_ID="${ORG_ID:-test-org-id}"

echo "🔍 Smoke Testing Epic 8: Conversational UI"
echo "API: $API_BASE"
echo ""

# Test 1: Send chat message
echo "Test 1: POST /api/chat/message"
curl -X POST "$API_BASE/api/chat/message" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -H "x-org-id: $ORG_ID" \
  -H "content-type: application/json" \
  -d '{"message":"How am I doing?"}' | jq
echo ""

# Test 2: List sessions
echo "Test 2: GET /api/chat/sessions"
curl "$API_BASE/api/chat/sessions?limit=10" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -H "x-org-id: $ORG_ID" | jq
echo ""

# Test 3: Request explanation
echo "Test 3: POST /api/chat/explanation"
curl -X POST "$API_BASE/api/chat/explanation" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -H "x-org-id: $ORG_ID" \
  -H "content-type: application/json" \
  -d '{"questionId":"test-q1","query":"I dont understand"}' | jq
echo ""

echo "✅ Smoke tests complete"
```

Make executable:
```bash
chmod +x api/scripts/smoke-chat.sh
```

**Documentation Updates:**

**File:** `docs/functional-spec.md`

Add new section:

```markdown
## 29) Conversational Learning Interface (Epic 8) — ✅ IMPLEMENTED

**Covers BRD:** L-12 (Conversational interface), L-18 (Free-text answers)

**Epic Status:** ✅ IMPLEMENTED 2025-10-11 | Epic: Epic 8 | Tests: `api/tests/chat.test.ts`

Natural language chat interface for learners with intent routing, LLM-powered explanations, free-text answer validation, and confusion tracking for adaptive difficulty signals.

**Key Features:**
- Chat panel with Cmd+K shortcut
- Intent router classifies queries (progress/next/explanation/filter/help)
- LLM explanations with caching (1 hour TTL, ~$0.001 per explanation)
- Free-text answer validation with partial credit
- Confusion tracking feeds Epic 9 (Adaptive Difficulty)

**API Routes:**
- POST /api/chat/message - Send message, get response
- GET /api/chat/sessions - List recent sessions
- GET /api/chat/sessions/:id - Get session history
- POST /api/chat/explanation - Request explanation
- POST /api/chat/feedback - Mark explanation helpful
- POST /api/learn/submit - Enhanced with free-text support

**Database Schema:**
- chat_sessions (id, user_id, started_at, ended_at)
- chat_messages (id, session_id, role, content, intent, metadata)
- confusion_log (id, user_id, question_id, query, explanation_provided, helpful)

**Feature Flags:**
- FF_CONVERSATIONAL_UI_V1 - Enable chat interface
- FF_FREE_TEXT_ANSWERS_V1 - Enable free-text answers
- CHAT_LLM_MODEL - Model for explanations (default: gpt-4o-mini)
```

**File:** `docs/spec/flags.md`

Add:

```markdown
Conversational Learning Interface (Epic 8)
- FF_CONVERSATIONAL_UI_V1 (default: false) - Enable chat panel and natural language queries
- FF_FREE_TEXT_ANSWERS_V1 (default: false) - Enable free-text answer input (vs MCQ only)
- CHAT_LLM_MODEL (default: gpt-4o-mini) - LLM model for explanations
- EXPLANATION_CACHE_TTL (default: 3600) - Cache TTL in seconds
```

**Acceptance:**
- [ ] All tests pass (unit, route, smoke)
- [ ] Documentation updated
- [ ] Feature flags documented
- [ ] Smoke tests executable

---

## 5. LLM Configuration

### Models

**Explanation Engine:**
- Model: `gpt-4o-mini` (default)
- Cost: ~$0.001 per explanation
- Max tokens: 300
- Temperature: 0.7 (balanced creativity)
- Caching: 1 hour TTL

**Free-Text Validation:**
- Model: `gpt-4o` (higher accuracy needed)
- Cost: ~$0.005 per validation
- Max tokens: 200
- Temperature: 0.3 (consistent grading)
- Response format: JSON

### Prompt Templates

**Explanation Prompt:**
```
You are a helpful learning assistant. Explain concepts in simple, clear language suitable for a 12-year-old (ELI12 style). Be encouraging and constructive.

A learner is confused about this question:
[Question stem]
[Options]
[Correct answer]

Learner's Question: "[query]"

Please explain why the correct answer is right in simple, encouraging language. Use analogies or examples if helpful. Keep it under 200 words.
```

**Free-Text Validation Prompt:**
```
You are grading a learner's answer to a question.

Question: [stem]
Canonical Answer: [canonical]
Learner's Answer: [learner]

Please evaluate:
1. Is the learner's answer correct, partially correct, or incorrect?
2. What partial credit score (0.0 to 1.0) should they receive?
3. Provide constructive feedback in 1-2 sentences.

Respond in JSON format:
{"correct": true/false, "partialCredit": 0.0-1.0, "feedback": "..."}
```

### Cost Optimization

**Caching Strategy:**
- Explanation cache: 1 hour (most learners ask similar questions)
- Hit rate: ~60-70% expected
- Cost savings: ~$0.0006 per cached hit

**Fuzzy Matching First:**
- 90% similarity → immediate accept (no LLM)
- 70-90% → partial credit (no LLM)
- <70% → LLM validation
- Expected LLM usage: 30-40% of answers

**Total Cost per Learner:**
- 20 questions with free-text: ~$0.02 (60% fuzzy, 40% LLM)
- 5 explanation requests: ~$0.002 (with 60% cache hit rate)
- **Total: ~$0.022 per learner per track**

---

## 6. Acceptance Criteria

### Database & Schema
- [ ] chat_sessions table created with indexes
- [ ] chat_messages table created with indexes
- [ ] confusion_log table created with indexes
- [ ] Drizzle schema updated
- [ ] Migration runs without errors
- [ ] Foreign key constraints enforced

### Intent Router
- [ ] Progress queries classified (>90% confidence)
- [ ] Next queries classified (>90% confidence)
- [ ] Explanation queries classified (>85% confidence)
- [ ] Filter queries classified and extract topic names
- [ ] Help queries classified
- [ ] Unknown queries return low confidence

### Explanation Engine
- [ ] Explanation generated for valid question ID
- [ ] Explanation cached (1 hour TTL)
- [ ] Cache hit on repeat queries
- [ ] Confusion logged to database
- [ ] Helpful feedback updates confusion_log
- [ ] Cost: ~$0.001 per explanation (gpt-4o-mini)
- [ ] Error handling for invalid question ID

### Free-Text Validation
- [ ] High similarity (>90%) → immediate acceptance
- [ ] Medium similarity (70-90%) → partial credit
- [ ] Low similarity → LLM validation
- [ ] LLM returns JSON with correct/partialCredit/feedback
- [ ] Cost: ~$0.005 per LLM validation
- [ ] Fallback to error message if LLM fails
- [ ] Fuzzy matching works for common variations

### Chat API Routes
- [ ] POST /api/chat/message works with all intents
- [ ] Session auto-created on first message
- [ ] Intent classified and routed correctly
- [ ] Progress query returns gamification data
- [ ] Help query returns help text
- [ ] GET /api/chat/sessions returns user's sessions
- [ ] GET /api/chat/sessions/:id returns message history
- [ ] Session ownership verified (RBAC)
- [ ] POST /api/chat/explanation generates explanation
- [ ] POST /api/chat/feedback updates confusion_log
- [ ] All routes enforce requireLearner RBAC
- [ ] Feature flag gates all routes
- [ ] Error envelopes returned on failures

### Learn Route Enhancement
- [ ] POST /api/learn/submit accepts answerText
- [ ] Free-text validation called when answerText provided
- [ ] MCQ validation still works when answerIndex provided
- [ ] Partial credit recorded in attempts table
- [ ] Feedback returned to learner
- [ ] Feature flag controls free-text support

### Chat UI Component
- [ ] Chat panel opens with Cmd+K
- [ ] Chat panel opens with / key
- [ ] Chat panel closes with Escape
- [ ] Messages display correctly (user right, assistant left)
- [ ] Markdown rendered in assistant messages
- [ ] Typing indicator shows during loading
- [ ] Auto-scrolls to latest message
- [ ] Enter sends message
- [ ] Shift+Enter adds newline
- [ ] Empty messages prevented
- [ ] Session persists across messages
- [ ] Error messages displayed on API failure

### Testing
- [ ] Unit tests pass for intent router
- [ ] Unit tests pass for explanation engine
- [ ] Unit tests pass for free-text validator
- [ ] Route tests pass for all chat endpoints
- [ ] Route tests verify RBAC enforcement
- [ ] Smoke tests pass for all 5 endpoints
- [ ] E2E test: Send message → get response
- [ ] E2E test: Request explanation → mark helpful

### Documentation
- [ ] Functional spec updated (new section §29)
- [ ] Feature flags documented in docs/spec/flags.md
- [ ] Use cases documented in docs/spec/use-cases.md
- [ ] API routes documented in openapi.yaml
- [ ] README updated with chat instructions

### Feature Flags
- [ ] FF_CONVERSATIONAL_UI_V1 gates chat routes
- [ ] FF_FREE_TEXT_ANSWERS_V1 gates free-text validation
- [ ] CHAT_LLM_MODEL configurable
- [ ] EXPLANATION_CACHE_TTL configurable
- [ ] Routes return 404 when flags disabled

---

## 7. Testing Instructions

### Unit Tests

Run intent router tests:
```bash
cd api
npm run test src/services/intent-router.test.ts
```

Run explanation engine tests:
```bash
npm run test src/services/explanation-engine.test.ts
```

Run free-text validator tests:
```bash
npm run test src/services/free-text-validator.test.ts
```

### Route Tests

Run chat route tests:
```bash
cd api
npm run test tests/chat-routes.test.ts
```

Expected output:
- All tests pass
- RBAC enforcement verified
- Feature flag gating verified

### Smoke Tests

**Prerequisites:**
1. API running on http://localhost:8080
2. Feature flags enabled:
   ```bash
   export FF_CONVERSATIONAL_UI_V1=true
   export FF_FREE_TEXT_ANSWERS_V1=true
   export OPENAI_API_KEY=sk-...
   ```

**Run smoke tests:**
```bash
cd api
./scripts/smoke-chat.sh
```

Expected output:
- All 5 endpoints return 200
- Chat message returns response with intent
- Sessions list returns array
- Explanation returns LLM-generated text
- Feedback returns success message

### E2E Tests

**Scenario 1: Chat Conversation**
1. Navigate to /learn
2. Press Cmd+K
3. Type "How am I doing?"
4. Verify progress summary returned
5. Type "What's next?"
6. Verify next question fetched

**Scenario 2: Request Explanation**
1. Answer a question incorrectly
2. Click "I don't understand"
3. Verify explanation displayed
4. Click "Helpful" or "Not Helpful"
5. Verify feedback recorded

**Scenario 3: Free-Text Answer**
1. Navigate to question
2. Type answer in text field (not MCQ)
3. Submit
4. Verify validation feedback
5. Verify partial credit if applicable

---

## 8. Rollout Plan

### Phase 1: Internal Testing (Week 1)

**Flags:**
```bash
FF_CONVERSATIONAL_UI_V1=false  # Off in production
FF_FREE_TEXT_ANSWERS_V1=false
```

**Actions:**
- Deploy code to staging
- Enable flags in staging only
- Internal team tests chat functionality
- Validate LLM costs and latency
- Fix any bugs

### Phase 2: Beta Users (Week 2)

**Flags:**
```bash
FF_CONVERSATIONAL_UI_V1=true  # Enable in production
FF_FREE_TEXT_ANSWERS_V1=false  # Keep off for now
```

**Actions:**
- Enable chat in production (no free-text yet)
- Invite 10-20 beta learners
- Monitor chat usage and costs
- Collect feedback on intent routing accuracy
- Refine prompts if needed

### Phase 3: Free-Text Answers (Week 3)

**Flags:**
```bash
FF_CONVERSATIONAL_UI_V1=true
FF_FREE_TEXT_ANSWERS_V1=true  # Enable free-text
```

**Actions:**
- Enable free-text answers in production
- Monitor validation accuracy
- Track fuzzy match vs LLM usage ratio
- Optimize prompts for better grading
- Monitor costs closely

### Phase 4: Full Rollout (Week 4)

**Flags:**
- All flags enabled
- No changes

**Actions:**
- Announce feature to all learners
- Update documentation
- Monitor for 1 week
- Prepare Epic 9 (Adaptive Difficulty) to use confusion data

---

## 9. References

### Key Files to Study

1. **`docs/MVP_B2B_ROADMAP.md`** (lines 787-926) - Epic 8 requirements
2. **`docs/brd/cerply-brd.md`** (L-12, L-18) - BRD requirements
3. **`EPIC7_IMPLEMENTATION_PROMPT.md`** - Follow this structure
4. **`api/src/routes/gamification.ts`** - RBAC pattern
5. **`api/src/services/gamification.ts`** - Service layer pattern
6. **`web/components/ChatPanel.tsx`** - UI component reference

### Dependencies

**API:**
- `openai` (already installed from Epic 6)
- `fast-levenshtein` - Fuzzy string matching
- `marked` - Markdown parsing (optional, for preview)

**Web:**
- `react-markdown` - Markdown rendering in UI
- `lucide-react` (already installed) - Icons

### External Resources

- OpenAI API Docs: https://platform.openai.com/docs/api-reference
- Levenshtein Distance: https://en.wikipedia.org/wiki/Levenshtein_distance
- React Markdown: https://github.com/remarkjs/react-markdown
- Cmd+K Pattern: https://ui.shadcn.com/docs/components/command

---

## 10. Quick Start Checklist

Before starting implementation:

- [ ] Read this prompt fully (30 min)
- [ ] Review Epic 7 implementation for patterns (30 min)
- [ ] Review BRD L-12 and L-18 (15 min)
- [ ] Study `api/src/routes/gamification.ts` for RBAC (15 min)
- [ ] Study `api/src/services/gamification.ts` for service layer (15 min)
- [ ] Verify OpenAI API key set: `echo $OPENAI_API_KEY` (1 min)
- [ ] Verify feature flags understand: `FF_CONVERSATIONAL_UI_V1`, `FF_FREE_TEXT_ANSWERS_V1` (5 min)

Implementation order:

1. [ ] Phase 1: Database Schema (1 hour)
2. [ ] Phase 2: Intent Router Service (2 hours)
3. [ ] Phase 3: Explanation Engine (2 hours)
4. [ ] Phase 4: Free-Text Validator (2 hours)
5. [ ] Phase 5: Chat API Routes (2 hours)
6. [ ] Phase 6: Extend Learn Routes (1.5 hours)
7. [ ] Phase 7: Chat UI Component (3 hours)
8. [ ] Phase 8: Testing & Documentation (2 hours)

Post-implementation:

- [ ] Run all tests: `npm run test`
- [ ] Run smoke tests: `./api/scripts/smoke-chat.sh`
- [ ] Test E2E scenarios manually
- [ ] Update functional spec
- [ ] Update feature flags documentation
- [ ] Commit with `[spec]` tag: `git commit -m "feat(chat): Epic 8 conversational UI [spec]"`

---

## Total Effort Summary

| Phase | Task | Hours |
|-------|------|-------|
| 1 | Database Schema | 1 |
| 2 | Intent Router Service | 2 |
| 3 | Explanation Engine | 2 |
| 4 | Free-Text Validator | 2 |
| 5 | Chat API Routes | 2 |
| 6 | Extend Learn Routes | 1.5 |
| 7 | Chat UI Component | 3 |
| 8 | Testing & Documentation | 2 |
| **Total** | | **15.5 hours** |

**Estimated:** 1.5-2 overnights  
**Priority:** P1 (UX Differentiator)  
**Epic:** 8 of 12  
**Status:** Ready for implementation

---

**End of Epic 8 Implementation Prompt**

Good luck! 🚀

