# Epic 8 Phase 2-9 Continuation Prompt (UPDATED)

**For:** Epic 8 Phase 1 Agent  
**Date:** 2025-10-13  
**Status:** Ready for Implementation  
**Updated Scope:** Includes content hierarchy awareness + inline chat UI redesign

---

## STATUTORY REQUIREMENTS (Read First)

**Before implementing Phase 2-9, you MUST read these documents in order:**

1. **docs/ARCHITECTURE_DECISIONS.md (v1.2)** - UPDATED with Content Meta Model
2. **docs/EPIC_MASTER_PLAN.md (v1.2)** - UPDATED with Epic 6.8 and content hierarchy
3. **docs/functional-spec.md (§29, §31, §32)** - Epic 8 status + content hierarchy
4. **EPIC_SCOPE_FIX_CONTENT_HIERARCHY.md** - Critical changes to content structure
5. **EPIC8_IMPLEMENTATION_PROMPT.md** - Your original implementation prompt

---

## Critical Context: Content Hierarchy Change

**Since Phase 1, the content model has changed:**

### Old Model (Phase 1)
```
Tracks → Modules → Items (questions)
```

### New Model (Phase 2-9)
```
Subjects (e.g., Computer Science)
  └─ Topics (e.g., Machine Learning)
      └─ Modules (e.g., LLM Architecture)
          └─ Quizzes (e.g., Quiz 1)
              └─ Questions (e.g., "What does LLM stand for?")
```

**Impact on Your Work:**
- Chat context now includes: Subject > Topic > Module > Question
- Intent router must understand hierarchy ("this topic" vs "other topics in this subject")
- Progress queries show topics (not tracks)
- "What's next?" operates at topic level

---

## Your Mission: Complete Epic 8 Phase 2-9

**Status:** Phase 1 ✅ Complete | Phase 2-9 ⏳ Pending (~14 hours remaining)

### Phase 2-8 Scope (From Original Prompt)

**Phase 2:** LLM Explanation Engine (3h)  
**Phase 3:** Free-Text Answer Validation (2h)  
**Phase 4:** Partial Credit Scoring (1.5h)  
**Phase 5:** Confusion Tracking Integration (1h) ⚠️ **Epic 9 Dependency**  
**Phase 6:** Explanation Caching (1.5h)  
**Phase 7:** Intent Router Improvements (1h)  
**Phase 8:** E2E Testing & UAT (1h)

### NEW Phase 9: Chat UI Redesign + Content Hierarchy Awareness (3h)

**NEW REQUIREMENT:** Chat must be inline with learning, not popup

**What Changed:**
- Remove Cmd+K popup trigger
- Chat always visible below question (contextual inline bubble)
- Add quick action buttons ("I don't understand", "Explain this", "What's next?")
- Add shortcut bar (Dashboard, Content Library, Pause)
- Chat context aware of Subject > Topic > Module hierarchy

**Total Effort:** 11h (original) + 3h (new Phase 9) = **14 hours**

---

## Phase 2: LLM Explanation Engine (3 hours)

### Implementation

**File:** `api/src/services/explanation-engine.ts` (currently stub)

**Requirements:**
- Wire up OpenAI API for `generateExplanation()`
- Accept `questionId` and `learnerQuery` parameters
- Return explanation text with metadata
- Handle API failures gracefully

**Code:**
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CHAT_LLM_MODEL = process.env.CHAT_LLM_MODEL || 'gpt-4o-mini';

/**
 * Generates an explanation for a question using OpenAI
 * 
 * @param questionId - UUID of the question
 * @param learnerQuery - Learner's natural language query (e.g., "Why is B correct?")
 * @param context - Additional context (question stem, options, correct answer)
 * @returns Explanation text and metadata
 */
export async function generateExplanation(
  questionId: string,
  learnerQuery: string,
  context: {
    stem: string;
    options: any[];
    correctAnswer: number;
    guidanceText?: string;
  }
): Promise<{
  explanation: string;
  model: string;
  tokensUsed: number;
  cost: number;
}> {
  try {
    const prompt = `You are a helpful learning assistant. A learner is confused about this question:

Question: ${context.stem}
Options:
${context.options.map((opt, idx) => `${idx + 1}. ${opt.text || opt}`).join('\n')}
Correct Answer: Option ${context.correctAnswer + 1}

Learner's Question: ${learnerQuery}

Provide a clear, concise explanation (ELI12 style - explain like I'm 12 years old). Focus on:
1. Why the correct answer is correct
2. Common misconceptions about incorrect options
3. Key concept the learner should understand

Keep it under 150 words.`;

    const completion = await openai.chat.completions.create({
      model: CHAT_LLM_MODEL,
      messages: [
        { role: 'system', content: 'You are a helpful learning assistant. Explain concepts clearly and simply.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const explanation = completion.choices[0].message.content || 'Sorry, I could not generate an explanation.';
    const tokensUsed = completion.usage?.total_tokens || 0;
    const cost = calculateCost(CHAT_LLM_MODEL, tokensUsed);

    return {
      explanation,
      model: CHAT_LLM_MODEL,
      tokensUsed,
      cost,
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // Fallback: Return guidance text if available
    if (context.guidanceText) {
      return {
        explanation: context.guidanceText,
        model: 'fallback',
        tokensUsed: 0,
        cost: 0,
      };
    }
    
    throw new Error('Failed to generate explanation');
  }
}

function calculateCost(model: string, tokens: number): number {
  // gpt-4o-mini pricing: ~$0.00015 per 1K tokens (input) + $0.00060 per 1K tokens (output)
  // Approximate average: $0.0004 per 1K tokens
  return (tokens / 1000) * 0.0004;
}
```

**Update Route:**
```typescript
// api/src/routes/chat-learning.ts
app.post('/api/chat/explanation', async (req, reply) => {
  const FF_CONVERSATIONAL_UI_V1 = process.env.FF_CONVERSATIONAL_UI_V1 === 'true';
  if (!FF_CONVERSATIONAL_UI_V1) {
    return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Feature not enabled' } });
  }

  const session = getSession(req) || getSessionOrMock(req);
  if (!session) {
    return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Not logged in' } });
  }

  const { questionId, query } = req.body as { questionId: string; query: string };

  // Get question context
  const question = await db.select().from(questions).where(eq(questions.id, questionId)).limit(1);
  if (question.length === 0) {
    return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Question not found' } });
  }

  const q = question[0];
  
  // Generate explanation
  const result = await generateExplanation(questionId, query, {
    stem: q.stem,
    options: q.options as any[],
    correctAnswer: q.correctAnswer || 0,
    guidanceText: q.guidanceText || undefined,
  });

  // Log to confusion_log for Epic 9
  await db.insert(confusionLog).values({
    userId: session.userId,
    questionId,
    query,
    explanationProvided: result.explanation,
    helpful: null, // Will be set via feedback endpoint
  });

  return reply.send({
    explanation: result.explanation,
    model: result.model,
    cost: result.cost,
  });
});
```

---

## Phase 3: Free-Text Answer Validation (2 hours)

**File:** `api/src/services/free-text-validator.ts` (currently stub)

**Requirements:**
- Fuzzy matching with `fast-levenshtein` library (add to package.json)
- >90% similarity = immediate accept
- LLM fallback for semantic validation
- Partial credit scoring (0.0-1.0)

**Install Dependency:**
```bash
cd api
npm install fast-levenshtein
```

**Implementation:**
```typescript
import Levenshtein from 'fast-levenshtein';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const LLM_UNDERSTANDING = process.env.LLM_UNDERSTANDING || 'gpt-4o';

/**
 * Validates a free-text answer using fuzzy matching + LLM fallback
 * 
 * @param learnerAnswer - Learner's free-text answer
 * @param correctAnswer - Expected correct answer (or multiple acceptable answers)
 * @param questionStem - Question text for context
 * @returns Validation result with partial credit score
 */
export async function validateFreeTextAnswer(
  learnerAnswer: string,
  correctAnswer: string | string[],
  questionStem: string
): Promise<{
  isCorrect: boolean;
  partialCredit: number; // 0.0-1.0
  feedback: string;
  validationMethod: 'fuzzy' | 'llm';
}> {
  const learnerNormalized = learnerAnswer.toLowerCase().trim();
  const correctAnswers = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];

  // Phase 1: Fuzzy matching (fast, cheap)
  for (const correct of correctAnswers) {
    const correctNormalized = correct.toLowerCase().trim();
    const distance = Levenshtein.get(learnerNormalized, correctNormalized);
    const maxLen = Math.max(learnerNormalized.length, correctNormalized.length);
    const similarity = 1 - (distance / maxLen);

    if (similarity >= 0.9) {
      return {
        isCorrect: true,
        partialCredit: 1.0,
        feedback: 'Correct!',
        validationMethod: 'fuzzy',
      };
    }
  }

  // Phase 2: LLM validation (semantic understanding)
  try {
    const prompt = `You are an assessment validator. Determine if the learner's answer is correct.

Question: ${questionStem}
Expected Answer(s): ${correctAnswers.join(' OR ')}
Learner's Answer: ${learnerAnswer}

Respond with JSON:
{
  "isCorrect": true/false,
  "partialCredit": 0.0-1.0,  // 1.0 = fully correct, 0.5 = partially correct, 0.0 = incorrect
  "feedback": "Brief explanation (max 50 words)"
}

Partial credit guidelines:
- 1.0: Fully correct (all key concepts present)
- 0.7-0.9: Mostly correct (minor details missing)
- 0.5-0.6: Partially correct (some key concepts present)
- 0.0-0.4: Incorrect or off-topic`;

    const completion = await openai.chat.completions.create({
      model: LLM_UNDERSTANDING,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    
    return {
      isCorrect: result.isCorrect || false,
      partialCredit: result.partialCredit || 0.0,
      feedback: result.feedback || 'Answer evaluated.',
      validationMethod: 'llm',
    };
  } catch (error) {
    console.error('LLM validation error:', error);
    
    // Fallback: Accept if learner answer contains key words from correct answer
    const keyWordsMatch = correctAnswers.some(correct => {
      const correctWords = correct.toLowerCase().split(' ').filter(w => w.length > 3);
      const learnerWords = learnerNormalized.split(' ');
      const matchCount = correctWords.filter(w => learnerWords.includes(w)).length;
      return matchCount / correctWords.length >= 0.5;
    });

    return {
      isCorrect: keyWordsMatch,
      partialCredit: keyWordsMatch ? 0.7 : 0.0,
      feedback: keyWordsMatch ? 'Close enough!' : 'Not quite. Try again.',
      validationMethod: 'fuzzy',
    };
  }
}
```

**Update `/api/learn/submit` Route:**
```typescript
// Handle free-text answers
if (req.body.answerText && FF_FREE_TEXT_ANSWERS_V1) {
  const question = await db.select().from(questions).where(eq(questions.id, questionId));
  
  const validation = await validateFreeTextAnswer(
    req.body.answerText,
    question.guidanceText || 'Expected answer not available',
    question.stem
  );

  await db.insert(attempts).values({
    userId: session.userId,
    questionId,
    answerText: req.body.answerText,
    correct: validation.isCorrect,
    partialCredit: validation.partialCredit,
    feedback: validation.feedback,
    validationMethod: validation.validationMethod,
  });

  return reply.send({
    correct: validation.isCorrect,
    partialCredit: validation.partialCredit,
    feedback: validation.feedback,
  });
}
```

---

## Phase 4: Partial Credit Scoring (1.5 hours)

**Update Attempts Table Schema (Already Extended in Phase 1):**
- `answer_text` TEXT
- `partial_credit` DECIMAL(3, 2) (0.00-1.00)
- `feedback` TEXT
- `validation_method` TEXT ('fuzzy' | 'llm')

**Update Gamification Service:**
```typescript
// api/src/services/gamification.ts

export async function calculateLevel(userId: string, topicId: string) {
  const attempts = await db.select().from(attempts)
    .where(eq(attempts.userId, userId))
    .innerJoin(questions, eq(questions.id, attempts.questionId))
    .innerJoin(quizzes, eq(quizzes.id, questions.quizId))
    .innerJoin(modulesV2, eq(modulesV2.id, quizzes.moduleId))
    .where(eq(modulesV2.topicId, topicId));

  // Count partial credit as fractional correct answers
  const totalCorrect = attempts.reduce((sum, att) => {
    if (att.partialCredit !== null) {
      return sum + att.partialCredit;
    }
    return sum + (att.correct ? 1 : 0);
  }, 0);

  // Level thresholds
  if (totalCorrect >= 201) return 'master';
  if (totalCorrect >= 101) return 'expert';
  if (totalCorrect >= 51) return 'practitioner';
  if (totalCorrect >= 21) return 'learner';
  return 'novice';
}
```

---

## Phase 5: Confusion Tracking Integration (1 hour)

**Already Implemented in Phase 2** (confusion_log insert during explanation generation)

**Add Feedback Endpoint:**
```typescript
// api/src/routes/chat-learning.ts
app.post('/api/chat/feedback', async (req, reply) => {
  const session = getSession(req) || getSessionOrMock(req);
  if (!session) return reply.status(401).send({ error: { code: 'UNAUTHORIZED' } });

  const { confusionId, helpful } = req.body as { confusionId: string; helpful: boolean };

  await db.update(confusionLog)
    .set({ helpful })
    .where(eq(confusionLog.id, confusionId));

  return reply.send({ success: true });
});
```

---

## Phase 6: Explanation Caching (1.5 hours)

**File:** `api/src/services/explanation-cache.ts` (currently stub)

**Implementation:**
```typescript
interface CachedExplanation {
  explanation: string;
  model: string;
  cachedAt: Date;
}

const cache = new Map<string, CachedExplanation>();
const CACHE_TTL = parseInt(process.env.EXPLANATION_CACHE_TTL || '3600') * 1000; // Default: 1 hour

/**
 * Gets cached explanation or generates new one
 */
export async function getOrGenerateExplanation(
  questionId: string,
  learnerQuery: string,
  context: any
): Promise<{ explanation: string; model: string; fromCache: boolean; cost: number }> {
  const cacheKey = `${questionId}:${learnerQuery.toLowerCase().trim()}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.cachedAt.getTime()) < CACHE_TTL) {
    return {
      explanation: cached.explanation,
      model: cached.model,
      fromCache: true,
      cost: 0,
    };
  }

  // Generate new explanation
  const result = await generateExplanation(questionId, learnerQuery, context);

  // Store in cache
  cache.set(cacheKey, {
    explanation: result.explanation,
    model: result.model,
    cachedAt: new Date(),
  });

  return {
    ...result,
    fromCache: false,
  };
}

// Cleanup old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.cachedAt.getTime() > CACHE_TTL) {
      cache.delete(key);
    }
  }
}, CACHE_TTL);
```

**Update Route to Use Cache:**
```typescript
// Replace generateExplanation() call with:
const result = await getOrGenerateExplanation(questionId, query, { ... });

return reply.send({
  explanation: result.explanation,
  fromCache: result.fromCache,
  cost: result.cost,
});
```

---

## Phase 7: Intent Router Improvements + Hierarchy Awareness (1 hour)

**File:** `api/src/services/intent-router.ts`

**Add Hierarchy Awareness:**
```typescript
/**
 * Classifies user query and extracts hierarchy context
 */
export function classifyIntent(query: string, context?: {
  currentSubject?: string;
  currentTopic?: string;
  currentModule?: string;
}): IntentResult {
  const lowerQuery = query.toLowerCase();

  // Progress intent with hierarchy awareness
  const progressPatterns = [
    /how am i doing/i,
    /my progress/i,
    /how.*doing.*this (topic|module|subject)/i,
    /progress.*in.*(topic|module|subject)/i,
  ];
  
  if (progressPatterns.some(p => p.test(lowerQuery))) {
    // Determine scope
    let scope: 'subject' | 'topic' | 'module' | 'all' = 'topic'; // default
    if (lowerQuery.includes('this subject') || lowerQuery.includes('in this subject')) {
      scope = 'subject';
    } else if (lowerQuery.includes('this module') || lowerQuery.includes('in this module')) {
      scope = 'module';
    } else if (lowerQuery.includes('overall') || lowerQuery.includes('all topics')) {
      scope = 'all';
    }

    return {
      intent: 'progress',
      confidence: 0.95,
      extractedEntities: { scope, ...context },
    };
  }

  // Filter intent with hierarchy awareness
  const filterPatterns = [
    /show.*me.*(topic|module|questions?)/i,
    /switch.*to.*(topic|module|subject)/i,
    /other (topics?|modules?|subjects?)/i,
  ];
  
  if (filterPatterns.some(p => p.test(lowerQuery))) {
    // Extract what they want to filter/switch to
    const topicMatch = lowerQuery.match(/(?:show|switch to|other)\s+([\w\s]+)\s+(?:topic|questions?)/i);
    const subjectMatch = lowerQuery.match(/topics? in\s+([\w\s]+)/i);
    
    return {
      intent: 'filter',
      confidence: 0.90,
      extractedEntities: {
        topicName: topicMatch?.[1],
        subjectName: subjectMatch?.[1],
        ...context,
      },
    };
  }

  // Rest of intent classification...
  // (keep existing logic for next, explanation, help intents)
}
```

**Update Chat Handler to Include Hierarchy Context:**
```typescript
// api/src/routes/chat-learning.ts

async function handleProgressQuery(
  userId: string,
  scope: 'subject' | 'topic' | 'module' | 'all' = 'topic',
  context?: { currentSubject?: string; currentTopic?: string; currentModule?: string }
): Promise<string> {
  if (scope === 'topic' && context?.currentTopic) {
    // Show progress for current topic
    const level = await getLearnerLevel(userId, context.currentTopic);
    return `You're currently a **${level.level}** in ${context.currentTopic}! ${level.correctAttempts} questions mastered.`;
  }
  
  if (scope === 'subject' && context?.currentSubject) {
    // Show all topics in current subject
    const topics = await db.select().from(topics)
      .where(eq(topics.subjectId, context.currentSubject));
    // ... return summary
  }

  // Default: Show all topics
  const levels = await getAllLearnerLevels(userId);
  // ... return summary
}
```

---

## Phase 8: E2E Testing & UAT (1 hour)

**Create E2E Test:**
```typescript
// web/e2e/chat-panel-inline.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Inline Chat Panel', () => {
  test('chat is visible below question', async ({ page }) => {
    await page.goto('/learn/123');
    
    // Chat should be visible (not popup)
    const chatBubble = page.locator('[data-testid="chat-bubble"]');
    await expect(chatBubble).toBeVisible();
    
    // Should be below question
    const questionBox = page.locator('[data-testid="question"]');
    const questionBounds = await questionBox.boundingBox();
    const chatBounds = await chatBubble.boundingBox();
    
    expect(chatBounds!.y).toBeGreaterThan(questionBounds!.y + questionBounds!.height);
  });

  test('quick action buttons work', async ({ page }) => {
    await page.goto('/learn/123');
    
    const dontUnderstandBtn = page.locator('button:has-text("I don\'t understand")');
    await dontUnderstandBtn.click();
    
    // Should see explanation
    const explanation = page.locator('[data-testid="explanation"]');
    await expect(explanation).toBeVisible();
  });

  test('shortcut bar navigates correctly', async ({ page }) => {
    await page.goto('/learn/123');
    
    const dashboardBtn = page.locator('button:has-text("Dashboard")');
    await dashboardBtn.click();
    
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
```

**Run Tests:**
```bash
cd web
npm run test:e2e
```

---

## Phase 9: Chat UI Redesign (3 hours) **NEW**

### 9.1 Update ChatPanel Component

**File:** `web/components/ChatPanel.tsx`

**Changes:**
- Remove Cmd+K popup trigger
- Make chat always visible (not toggle)
- Add quick action buttons
- Add shortcut bar
- Position below question (contextual inline)

**New Structure:**
```tsx
'use client';

import { useState } from 'react';

interface ChatPanelProps {
  questionId: string;
  context: {
    subject: string;
    topic: string;
    module: string;
  };
}

export function ChatPanel({ questionId, context }: ChatPanelProps) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');

  const handleQuickAction = async (action: string) => {
    let query = '';
    if (action === 'dont-understand') {
      query = "I don't understand this question. Can you explain?";
    } else if (action === 'explain') {
      query = "Why is this the correct answer?";
    } else if (action === 'whats-next') {
      query = "What's next in my learning path?";
    }

    setInput(query);
    await sendMessage(query);
  };

  const sendMessage = async (text: string) => {
    setMessages(prev => [...prev, { role: 'user', content: text }]);

    const response = await fetch('/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId, message: text, context }),
    });

    const data = await response.json();
    setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    setInput('');
  };

  return (
    <div className="chat-bubble-inline" data-testid="chat-bubble">
      {/* Quick Actions */}
      <div className="quick-actions flex gap-2 mb-3">
        <button
          onClick={() => handleQuickAction('dont-understand')}
          className="btn-quick-action text-sm px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200"
        >
          ❓ I don't understand
        </button>
        <button
          onClick={() => handleQuickAction('explain')}
          className="btn-quick-action text-sm px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200"
        >
          💡 Explain this
        </button>
        <button
          onClick={() => handleQuickAction('whats-next')}
          className="btn-quick-action text-sm px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200"
        >
          ➡️ What's next?
        </button>
      </div>

      {/* Chat Messages */}
      {messages.length > 0 && (
        <div className="chat-messages max-h-60 overflow-y-auto mb-3 space-y-2">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`message ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
            >
              <div
                className={`inline-block px-3 py-2 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chat Input */}
      <div className="chat-input flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
          placeholder="Ask anything..."
          className="flex-1 px-3 py-2 border rounded-lg"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          Send
        </button>
      </div>

      {/* Shortcut Bar */}
      <div className="shortcut-bar flex gap-2 mt-4 pt-4 border-t">
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="btn-shortcut flex items-center gap-1 px-3 py-1 text-sm rounded bg-gray-50 hover:bg-gray-100"
        >
          📊 Dashboard
        </button>
        <button
          onClick={() => window.location.href = '/library'}
          className="btn-shortcut flex items-center gap-1 px-3 py-1 text-sm rounded bg-gray-50 hover:bg-gray-100"
        >
          📚 Content Library
        </button>
        <button
          onClick={async () => {
            await fetch(`/api/topic-assignments/${context.topic}`, {
              method: 'PATCH',
              body: JSON.stringify({ paused: true }),
            });
            alert('Topic paused. You can resume anytime from your dashboard.');
          }}
          className="btn-shortcut flex items-center gap-1 px-3 py-1 text-sm rounded bg-gray-50 hover:bg-gray-100"
        >
          ⏸️ Pause
        </button>
      </div>
    </div>
  );
}
```

### 9.2 Update Learning View to Include Inline Chat

**File:** `web/app/learn/[questionId]/page.tsx`

```tsx
import { ChatPanel } from '@/components/ChatPanel';

export default async function LearnPage({ params }: { params: { questionId: string } }) {
  const question = await getQuestion(params.questionId);
  const hierarchy = await getQuestionHierarchy(params.questionId); // NEW: Get subject/topic/module

  return (
    <div className="learning-container max-w-4xl mx-auto p-6">
      {/* Breadcrumb */}
      <div className="breadcrumb text-sm text-gray-500 mb-4">
        {hierarchy.subject.icon} {hierarchy.subject.title} › {hierarchy.topic.title} › {hierarchy.module.title}
      </div>

      {/* Question Display */}
      <div className="question" data-testid="question">
        <h2 className="text-xl font-semibold mb-4">{question.stem}</h2>
        <div className="options space-y-2">
          {question.options.map((opt, idx) => (
            <button key={idx} className="option-button w-full text-left p-3 border rounded hover:bg-gray-50">
              {opt.text || opt}
            </button>
          ))}
        </div>
      </div>

      {/* Inline Chat Panel - Always visible below question */}
      <div className="mt-8">
        <ChatPanel
          questionId={params.questionId}
          context={{
            subject: hierarchy.subject.title,
            topic: hierarchy.topic.title,
            module: hierarchy.module.title,
          }}
        />
      </div>
    </div>
  );
}

// NEW helper function
async function getQuestionHierarchy(questionId: string) {
  // Query: question → quiz → module → topic → subject
  const result = await db.select({
    subject: subjects,
    topic: topics,
    module: modulesV2,
  })
  .from(questions)
  .innerJoin(quizzes, eq(quizzes.id, questions.quizId))
  .innerJoin(modulesV2, eq(modulesV2.id, quizzes.moduleId))
  .innerJoin(topics, eq(topics.id, modulesV2.topicId))
  .innerJoin(subjects, eq(subjects.id, topics.subjectId))
  .where(eq(questions.id, questionId))
  .limit(1);

  return result[0];
}
```

### 9.3 Add Natural Language Guardrails

**File:** `api/src/services/intent-router.ts`

**Add Guardrails:**
```typescript
// Block inappropriate queries
const BLOCKED_PATTERNS = [
  /jailbreak|ignore (instructions|previous|above)/i,
  /act as|pretend to be|you are now/i,
  /write.*code.*for me|do.*homework|solve.*for me/i,
  /hack|exploit|vulnerability/i,
];

// Redirect out-of-scope queries
const OUT_OF_SCOPE_PATTERNS = {
  personal_advice: /personal.*(?:life|problem|relationship|health)/i,
  technical_support: /(?:app|website|login).*(?:broken|not working|error)/i,
  off_topic: /(?:weather|sports|politics|news)/i,
};

export function classifyIntent(query: string, context?: any): IntentResult {
  const lowerQuery = query.toLowerCase();

  // Check blocked patterns
  if (BLOCKED_PATTERNS.some(p => p.test(lowerQuery))) {
    return {
      intent: 'blocked',
      confidence: 1.0,
      response: "I'm here to help you learn. Let's focus on your coursework.",
    };
  }

  // Check out-of-scope patterns
  for (const [type, pattern] of Object.entries(OUT_OF_SCOPE_PATTERNS)) {
    if (pattern.test(lowerQuery)) {
      const responses = {
        personal_advice: "I'm here to help with learning. For personal matters, reach out to HR or a counselor.",
        technical_support: "For technical issues, contact support@cerply.com or check the Help Center.",
        off_topic: "Let's keep our focus on your learning goals! What can I help you understand?",
      };
      return {
        intent: 'out_of_scope',
        confidence: 0.95,
        response: responses[type as keyof typeof responses],
      };
    }
  }

  // Continue with normal intent classification...
}
```

---

## Verification & Acceptance

**After completing Phase 2-9, verify:**

- [ ] LLM explanations work with real OpenAI calls
- [ ] Free-text answers validated (fuzzy + LLM)
- [ ] Partial credit scoring implemented (0.0-1.0)
- [ ] Confusion tracking logged for Epic 9
- [ ] Explanation caching reduces costs (~60% hit rate)
- [ ] Intent router improved to 90%+ accuracy
- [ ] Intent router hierarchy-aware (subject/topic/module context)
- [ ] Chat UI redesigned (inline, not popup)
- [ ] Quick action buttons work
- [ ] Shortcut bar navigates correctly
- [ ] Natural language guardrails block inappropriate queries
- [ ] Test coverage ≥80% (add Phase 2-9 tests)
- [ ] E2E tests pass
- [ ] FSD §29 updated to "✅ IMPLEMENTED" (not "Phase 1 Complete")

**Verification Commands:**
```bash
# Test coverage
cd api
npm run test:coverage  # Should show ≥80%

# E2E tests
cd ../web
npm run test:e2e  # All tests passing

# Smoke tests
cd ../api
./scripts/smoke-chat.sh  # All green

# Manual test
FF_CONVERSATIONAL_UI_V1=true \
FF_FREE_TEXT_ANSWERS_V1=true \
OPENAI_API_KEY=sk-... \
npm run dev

# In web
cd ../web
NEXT_PUBLIC_CONVERSATIONAL_UI_V1=true npm run dev
```

---

## Final Deliverables

**When Phase 2-9 complete:**
1. Update FSD §29 from "⚠️ PHASE 1 COMPLETE" to "✅ IMPLEMENTED"
2. Add accurate metrics (90% intent accuracy, $0.022 cost, 80% test coverage)
3. Commit with message: `feat(epic8): complete Phase 2-9 - LLM integration, free-text validation, inline chat UI [spec]`
4. Create reconciliation report (optional but recommended)

---

**Total Effort:** 14 hours (11h original + 3h new Phase 9)  
**Dependencies:** Epic 9 will integrate with your Phase 5 (confusion tracking)  
**Next Epic:** Epic 9 (Adaptive Difficulty Engine) or Epic 6.8 (Manager Curation)

**Good luck!** 🚀

---

**End of Updated Prompt**

