# Epic 6: Ensemble Content Generation — Implementation Prompt

**For:** New Agent/Developer  
**Date:** 2025-10-10  
**Estimated Effort:** 16-20 hours (2 overnights)  
**Priority:** P0 (Core Product Quality)

---

## Table of Contents

1. [Project Context](#1-project-context)
2. [Epic 6 Requirements](#2-epic-6-requirements)
3. [Implementation Plan](#3-implementation-plan)
4. [Code Patterns & Examples](#4-code-patterns--examples)
5. [LLM Configuration](#5-llm-configuration)
6. [Acceptance Criteria](#6-acceptance-criteria)
7. [Testing Instructions](#7-testing-instructions)
8. [Rollout Plan](#8-rollout-plan)
9. [References](#9-references)
10. [Quick Start Checklist](#10-quick-start-checklist)
11. [Prompt Templates](#11-prompt-templates)
12. [Cost & Performance](#12-cost--performance)

---

## 1. Project Context

### What is Cerply?

Cerply is a B2B enterprise learning platform that transforms company information (policies, regulations, transcripts) into adaptive learning experiences with guaranteed retention. The platform's core differentiator is a **3-LLM ensemble pipeline** that generates high-quality, factually accurate content with full provenance transparency.

**Current Status (Epics 1-5 Complete):**

| Epic | Status | Key Deliverables |
|------|--------|------------------|
| **Epic 1: D2C Removal** | ✅ Complete | Enterprise-only access |
| **Epic 2: SSO & RBAC** | ✅ Complete | SAML/OIDC, 3 roles |
| **Epic 3: Team Management** | ✅ Complete | Teams, learners, CSV import |
| **Epic 4: Manager Analytics** | ✅ Complete | 7 analytics endpoints, dashboards |
| **Epic 5: Slack Integration** | ✅ Complete | Slack DM delivery, Block Kit |

**What's Missing (Epic 6 Goal):**
- Content generation is currently **stubbed with mock data**
- No real LLM integration for playback, generation, or fact-checking
- No provenance tracking (which LLM contributed what)
- No canon storage for reusing generic content
- No manager refinement workflow

### Why Epic 6 Matters

**The Problem:** Single-model AI (ChatGPT, Claude) hallucinates facts and produces inconsistent pedagogical quality. Generic AI tools have no governance, auditability, or provenance for enterprise compliance.

**The Cerply Solution:** 3-LLM Ensemble Pipeline
- **Generator A** (GPT-4o): Creates content independently
- **Generator B** (Claude Sonnet): Creates content independently with different approach
- **Fact-Checker** (GPT-4): Verifies both, removes hallucinations, selects best elements

**Result:** Audit-ready, factually accurate content with 70% cost reduction over time via canon reuse.

### Tech Stack

Same as Epic 5:
- **API:** Fastify 4.x + Drizzle ORM + PostgreSQL 15
- **Web:** Next.js 14 (App Router) + Tailwind CSS
- **LLM APIs:** OpenAI (GPT-4o, GPT-4), Anthropic (Claude Sonnet 3.5)
- **Testing:** Vitest + Playwright

### Key Code Patterns (Established in Epics 1-5)

1. **Feature Flags:** `FF_ENSEMBLE_GENERATION_V1`, `FF_CONTENT_CANON_V1`
2. **RBAC Middleware:** `requireManager(req, reply)` - always `return reply`
3. **Error Envelopes:** `{ error: { code, message, details? } }`
4. **Tenant Isolation:** Filter all queries by `organization_id`
5. **Migration Headers:** Standard format with Epic/BRD/FSD references

### Files to Study Before Starting

**Critical Reading (2 hours):**
1. **`EPIC5_IMPLEMENTATION_PROMPT.md`** - Follow this pattern/structure
2. **`api/src/routes/managerAnalytics.ts`** - Route pattern with RBAC
3. **`api/src/services/analytics.ts`** - Service layer pattern
4. **`api/drizzle/007_manager_analytics.sql`** - Migration format
5. **`docs/MVP_B2B_ROADMAP.md`** - Epic 6 section (lines 348-490)

---

## 2. Epic 6 Requirements

### Goal

Implement a 3-LLM ensemble pipeline that replaces mock content generation with real, high-quality content validated across multiple models. Managers upload artefacts → LLM plays back understanding → Manager confirms → 3 LLMs generate independently → Fact-checker selects best → Manager refines → Content published with provenance.

### User Stories

**Story 1: Manager Uploads Artefact**
- **As a manager,** I want to upload a policy document or paste text,
- **So that** the system can generate learning content from it.
- **Acceptance:** Upload PDF/DOCX or paste text (max 50k chars), receive confirmation.

**Story 2: LLM Plays Back Understanding**
- **As a manager,** I want the LLM to summarize its understanding of my artefact,
- **So that** I can confirm it's accurate before generating content.
- **Acceptance:** LLM responds with "I understand this covers [X], focusing on [Y] and [Z]". Manager can confirm or refine (max 3 iterations).

**Story 3: Ensemble Generates Content**
- **As a manager,** I want 3 LLMs to independently generate content,
- **So that** I get higher quality with cross-validation.
- **Acceptance:** Generator A + B create modules, Fact-Checker validates, final content includes provenance tags.

**Story 4: Manager Refines Content**
- **As a manager,** I want to edit generated modules and see which LLM contributed each section,
- **So that** I can approve high-quality content with full transparency.
- **Acceptance:** UI shows provenance tags, inline editing, "Regenerate" button per module.

**Story 5: Generic Content Reused**
- **As a manager,** I want generic content (e.g., fire safety) to be reused across my organization,
- **So that** I save costs and maintain consistency.
- **Acceptance:** Generic content tagged, stored in canon, reused when similarity >90%.

### Database Schema

#### Table: `content_generations`
Tracks each content generation request.

```sql
CREATE TABLE content_generations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  manager_id            UUID NOT NULL REFERENCES users(id),
  artefact_text         TEXT NOT NULL, -- Source material
  understanding         TEXT, -- LLM's playback
  understanding_approved BOOLEAN DEFAULT FALSE,
  refinement_iterations INTEGER DEFAULT 0,
  status                TEXT NOT NULL DEFAULT 'pending', -- pending, understanding, generating, completed, failed
  content_type          TEXT CHECK (content_type IN ('generic', 'proprietary', 'mixed')),
  
  -- Generation results
  generator_a_output    JSONB, -- {modules: [...], model: 'gpt-4o'}
  generator_b_output    JSONB, -- {modules: [...], model: 'claude-sonnet-3.5'}
  fact_checker_output   JSONB, -- {finalModules: [...], provenance: [...], confidence: 0.95}
  
  -- Metadata
  total_cost_usd        NUMERIC(10,4), -- Sum of all LLM calls
  total_tokens          INTEGER,
  generation_time_ms    INTEGER,
  
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_generations_org ON content_generations(organization_id);
CREATE INDEX idx_content_generations_manager ON content_generations(manager_id);
CREATE INDEX idx_content_generations_status ON content_generations(status);
CREATE INDEX idx_content_generations_type ON content_generations(content_type);
```

#### Table: `content_refinements`
Tracks manager's refinement iterations.

```sql
CREATE TABLE content_refinements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id     UUID NOT NULL REFERENCES content_generations(id) ON DELETE CASCADE,
  iteration         INTEGER NOT NULL, -- 1, 2, 3 (max 3)
  manager_feedback  TEXT NOT NULL, -- "Focus more on evacuation procedures"
  llm_response      TEXT NOT NULL, -- Updated understanding
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(generation_id, iteration)
);

CREATE INDEX idx_content_refinements_generation ON content_refinements(generation_id);
```

#### Table: `content_provenance`
Tracks which LLM contributed which sections.

```sql
CREATE TABLE content_provenance (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id     UUID NOT NULL REFERENCES content_generations(id) ON DELETE CASCADE,
  module_id         TEXT NOT NULL, -- Reference to specific module
  section_type      TEXT NOT NULL, -- 'explanation', 'question', 'example'
  source_llm        TEXT NOT NULL, -- 'generator-a', 'generator-b', 'fact-checker'
  source_model      TEXT NOT NULL, -- 'gpt-4o', 'claude-sonnet-3.5', 'gpt-4'
  confidence_score  NUMERIC(3,2), -- 0.00 to 1.00
  selected_by       TEXT, -- 'fact-checker', 'manager'
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_provenance_generation ON content_provenance(generation_id);
CREATE INDEX idx_content_provenance_module ON content_provenance(module_id);
```

### API Routes

#### 1. `POST /api/content/understand`
Submit artefact and get LLM's understanding playback.

**RBAC:** Manager/admin only  
**Feature Flag:** `FF_ENSEMBLE_GENERATION_V1`

**Request:**
```json
{
  "artefact": "Fire safety procedures: In case of fire, call 999...",
  "artefactType": "text" // or "url", "file"
}
```

**Response (200):**
```json
{
  "generationId": "gen-123",
  "understanding": "I understand this document covers emergency fire safety procedures, focusing on three key steps: alerting authorities (999), safe evacuation protocols, and assembly point procedures. The content emphasizes immediate action and coordinated response.",
  "status": "understanding"
}
```

**Errors:**
- `400 INVALID_REQUEST`: Artefact too long (>50k chars)
- `503 LLM_UNAVAILABLE`: LLM API error

---

#### 2. `POST /api/content/refine`
Refine LLM's understanding (up to 3 iterations).

**RBAC:** Manager/admin only

**Request:**
```json
{
  "generationId": "gen-123",
  "feedback": "Actually, focus more on the evacuation routes and less on calling 999."
}
```

**Response (200):**
```json
{
  "generationId": "gen-123",
  "understanding": "I understand this document focuses primarily on safe evacuation routes during fire emergencies, including primary and secondary exit paths, assembly points, and accountability procedures. Alerting authorities is mentioned but not the primary emphasis.",
  "iteration": 2,
  "maxIterations": 3,
  "status": "understanding"
}
```

**Errors:**
- `400 MAX_REFINEMENTS_REACHED`: Already refined 3 times
- `404 GENERATION_NOT_FOUND`

---

#### 3. `POST /api/content/generate`
Trigger 3-LLM ensemble generation (async).

**RBAC:** Manager/admin only

**Request:**
```json
{
  "generationId": "gen-123",
  "contentType": "generic" // or "proprietary", "mixed"
}
```

**Response (202 Accepted):**
```json
{
  "generationId": "gen-123",
  "status": "generating",
  "estimatedTimeSeconds": 45,
  "pollUrl": "/api/content/generations/gen-123"
}
```

**Errors:**
- `400 UNDERSTANDING_NOT_APPROVED`: Must approve understanding first
- `503 LLM_UNAVAILABLE`

---

#### 4. `GET /api/content/generations/:id`
Poll generation status and results.

**RBAC:** Manager/admin only

**Response (200):**
```json
{
  "id": "gen-123",
  "status": "completed", // pending, understanding, generating, completed, failed
  "progress": 100, // 0-100
  "modules": [
    {
      "id": "module-1",
      "title": "Fire Safety: Evacuation Procedures",
      "content": "When a fire alarm sounds...",
      "questions": [
        {
          "id": "q1",
          "text": "What is the first step when you hear a fire alarm?",
          "options": ["A. Evacuate immediately", "B. Finish your work", "C. Call 999", "D. Ignore it"],
          "correctAnswer": "A",
          "explanation": "Immediate evacuation is critical to ensure personal safety."
        }
      ],
      "provenance": {
        "explanation_source": "generator-a (gpt-4o)",
        "question_source": "generator-b (claude-sonnet-3.5)",
        "selected_by": "fact-checker",
        "confidence": 0.95
      }
    }
  ],
  "totalCost": 0.42,
  "totalTokens": 8500,
  "generationTimeMs": 42000
}
```

---

#### 5. `PATCH /api/content/generations/:id`
Edit or approve generated content.

**RBAC:** Manager/admin only

**Request:**
```json
{
  "modules": [
    {
      "id": "module-1",
      "title": "Updated Title",
      "content": "Updated content..."
    }
  ],
  "approved": true
}
```

**Response (200):**
```json
{
  "generationId": "gen-123",
  "status": "approved",
  "publishedAt": "2025-10-10T15:30:00Z"
}
```

---

#### 6. `POST /api/content/regenerate/:id`
Regenerate a specific module.

**RBAC:** Manager/admin only

**Request:**
```json
{
  "moduleId": "module-1",
  "instruction": "Make the questions harder, focus on edge cases"
}
```

**Response (202):**
```json
{
  "generationId": "gen-124",
  "status": "generating",
  "moduleId": "module-1"
}
```

### Feature Flags

```bash
# Enable ensemble generation
FF_ENSEMBLE_GENERATION_V1=true

# Enable canon storage for generic content
FF_CONTENT_CANON_V1=true

# LLM models
LLM_GENERATOR_1=gpt-4o          # First generator
LLM_GENERATOR_2=claude-sonnet-3.5-20241022  # Second generator
LLM_FACT_CHECKER=gpt-4          # Fact-checker (most capable)

# API keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Cost controls
MAX_GENERATION_COST_USD=5.00    # Abort if exceeds
WARN_GENERATION_COST_USD=2.00   # Log warning
```

---

## 3. Implementation Plan

### Phase 1: Database Schema (1 hour)

**File:** `api/drizzle/009_ensemble_generation.sql`

```sql
------------------------------------------------------------------------------
-- Epic 6: Ensemble Content Generation (Quality Pipeline)
-- BRD: B-3, E-14 | FSD: §26 Ensemble Content Generation v1
------------------------------------------------------------------------------

-- [Insert full schema from section 2 above]
```

**File:** `api/src/db/schema.ts`

Add after existing schemas:

```typescript
// Epic 6: Ensemble Content Generation
export const contentGenerations = pgTable('content_generations', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  managerId: uuid('manager_id').notNull().references(() => users.id),
  artefactText: text('artefact_text').notNull(),
  understanding: text('understanding'),
  understandingApproved: boolean('understanding_approved').default(false),
  refinementIterations: integer('refinement_iterations').default(0),
  status: text('status').notNull().default('pending'),
  contentType: text('content_type'), // 'generic' | 'proprietary' | 'mixed'
  generatorAOutput: jsonb('generator_a_output'),
  generatorBOutput: jsonb('generator_b_output'),
  factCheckerOutput: jsonb('fact_checker_output'),
  totalCostUsd: numeric('total_cost_usd', { precision: 10, scale: 4 }),
  totalTokens: integer('total_tokens'),
  generationTimeMs: integer('generation_time_ms'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const contentRefinements = pgTable('content_refinements', {
  id: uuid('id').defaultRandom().primaryKey(),
  generationId: uuid('generation_id').notNull().references(() => contentGenerations.id, { onDelete: 'cascade' }),
  iteration: integer('iteration').notNull(),
  managerFeedback: text('manager_feedback').notNull(),
  llmResponse: text('llm_response').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const contentProvenance = pgTable('content_provenance', {
  id: uuid('id').defaultRandom().primaryKey(),
  generationId: uuid('generation_id').notNull().references(() => contentGenerations.id, { onDelete: 'cascade' }),
  moduleId: text('module_id').notNull(),
  sectionType: text('section_type').notNull(),
  sourceLlm: text('source_llm').notNull(),
  sourceModel: text('source_model').notNull(),
  confidenceScore: numeric('confidence_score', { precision: 3, scale: 2 }),
  selectedBy: text('selected_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

**Acceptance:**
- [ ] Migration runs without errors
- [ ] 3 tables created with indexes
- [ ] Drizzle schema compiles

---

### Phase 2: LLM Orchestrator Service (4 hours)

**File:** `api/src/services/llm-orchestrator.ts` (NEW)

This is the core of Epic 6. Implement LLM provider abstraction and the 3-LLM pipeline.

```typescript
/**
 * LLM Orchestrator Service
 * Epic 6: Ensemble Content Generation
 * Manages multi-LLM pipeline with provenance tracking
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Initialize clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// LLM Models
const GENERATOR_1 = process.env.LLM_GENERATOR_1 || 'gpt-4o';
const GENERATOR_2 = process.env.LLM_GENERATOR_2 || 'claude-sonnet-3.5-20241022';
const FACT_CHECKER = process.env.LLM_FACT_CHECKER || 'gpt-4';

export interface LLMResult {
  content: string;
  model: string;
  tokens: number;
  costUsd: number;
  durationMs: number;
}

export interface EnsembleResult {
  generatorA: LLMResult;
  generatorB: LLMResult;
  factChecker: LLMResult;
  finalModules: Module[];
  provenance: ProvenanceRecord[];
  totalCost: number;
  totalTokens: number;
  totalTime: number;
}

/**
 * Call OpenAI model with retry logic
 */
async function callOpenAI(
  model: string,
  prompt: string,
  systemPrompt: string,
  retries: number = 3
): Promise<LLMResult> {
  const start = Date.now();
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      const tokens = response.usage?.total_tokens || 0;
      const cost = calculateOpenAICost(model, tokens);
      
      return {
        content: response.choices[0].message.content || '',
        model,
        tokens,
        costUsd: cost,
        durationMs: Date.now() - start,
      };
    } catch (error: any) {
      if (attempt === retries) throw new Error(`OpenAI error after ${retries} attempts: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
    }
  }
  throw new Error('Unreachable');
}

/**
 * Call Anthropic model with retry logic
 */
async function callAnthropic(
  model: string,
  prompt: string,
  systemPrompt: string,
  retries: number = 3
): Promise<LLMResult> {
  const start = Date.now();
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model,
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      });

      const tokens = response.usage.input_tokens + response.usage.output_tokens;
      const cost = calculateAnthropicCost(model, tokens);
      
      return {
        content: response.content[0].type === 'text' ? response.content[0].text : '',
        model,
        tokens,
        costUsd: cost,
        durationMs: Date.now() - start,
      };
    } catch (error: any) {
      if (attempt === retries) throw new Error(`Anthropic error after ${retries} attempts: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw new Error('Unreachable');
}

/**
 * Step 1: Playback Understanding
 * LLM reads artefact and explains its understanding
 */
export async function playbackUnderstanding(artefact: string): Promise<LLMResult> {
  const systemPrompt = PROMPTS.understanding.system;
  const userPrompt = PROMPTS.understanding.user.replace('{{ARTEFACT}}', artefact);
  
  return callOpenAI(GENERATOR_1, userPrompt, systemPrompt);
}

/**
 * Step 2: Refine Understanding
 * Manager provides feedback, LLM adjusts understanding
 */
export async function refineUnderstanding(
  artefact: string,
  previousUnderstanding: string,
  feedback: string
): Promise<LLMResult> {
  const systemPrompt = PROMPTS.refinement.system;
  const userPrompt = PROMPTS.refinement.user
    .replace('{{ARTEFACT}}', artefact)
    .replace('{{PREVIOUS_UNDERSTANDING}}', previousUnderstanding)
    .replace('{{FEEDBACK}}', feedback);
  
  return callOpenAI(GENERATOR_1, userPrompt, systemPrompt);
}

/**
 * Step 3: Generate with Ensemble
 * Generator A and Generator B create content independently
 */
export async function generateWithEnsemble(
  understanding: string,
  artefact: string
): Promise<EnsembleResult> {
  const start = Date.now();
  
  // Generator A (GPT-4o)
  const generatorAPrompt = PROMPTS.generatorA.user
    .replace('{{UNDERSTANDING}}', understanding)
    .replace('{{ARTEFACT}}', artefact);
  const generatorA = await callOpenAI(
    GENERATOR_1,
    generatorAPrompt,
    PROMPTS.generatorA.system
  );

  // Generator B (Claude Sonnet)
  const generatorBPrompt = PROMPTS.generatorB.user
    .replace('{{UNDERSTANDING}}', understanding)
    .replace('{{ARTEFACT}}', artefact);
  const generatorB = await callAnthropic(
    GENERATOR_2,
    generatorBPrompt,
    PROMPTS.generatorB.system
  );

  // Fact-Checker (GPT-4)
  const factCheckerPrompt = PROMPTS.factChecker.user
    .replace('{{GENERATOR_A_OUTPUT}}', generatorA.content)
    .replace('{{GENERATOR_B_OUTPUT}}', generatorB.content)
    .replace('{{ARTEFACT}}', artefact);
  const factChecker = await callOpenAI(
    FACT_CHECKER,
    factCheckerPrompt,
    PROMPTS.factChecker.system
  );

  // Parse fact-checker output (JSON with provenance)
  const factCheckerData = JSON.parse(factChecker.content);
  
  return {
    generatorA,
    generatorB,
    factChecker,
    finalModules: factCheckerData.modules,
    provenance: factCheckerData.provenance,
    totalCost: generatorA.costUsd + generatorB.costUsd + factChecker.costUsd,
    totalTokens: generatorA.tokens + generatorB.tokens + factChecker.tokens,
    totalTime: Date.now() - start,
  };
}

/**
 * Calculate OpenAI cost based on model and tokens
 */
function calculateOpenAICost(model: string, tokens: number): number {
  const rates: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 0.0025 / 1000, output: 0.01 / 1000 },
    'gpt-4': { input: 0.03 / 1000, output: 0.06 / 1000 },
  };
  // Simplified: Assume 50/50 input/output split
  const rate = rates[model] || rates['gpt-4'];
  return (tokens / 2) * (rate.input + rate.output);
}

/**
 * Calculate Anthropic cost based on model and tokens
 */
function calculateAnthropicCost(model: string, tokens: number): number {
  const rates: Record<string, { input: number; output: number }> = {
    'claude-sonnet-3.5-20241022': { input: 0.003 / 1000, output: 0.015 / 1000 },
  };
  const rate = rates[model] || rates['claude-sonnet-3.5-20241022'];
  return (tokens / 2) * (rate.input + rate.output);
}

// Export for tests
export const PROMPTS = {
  understanding: {
    system: 'You are an expert learning designer analyzing source material. Your role is to understand what the material covers and explain it clearly to a manager.',
    user: `Please read the following artefact and explain your understanding:

{{ARTEFACT}}

Respond with a clear summary starting with "I understand this covers..." Include the main topics, key concepts, and intended audience if apparent.`
  },
  
  refinement: {
    system: 'You are refining your understanding based on manager feedback. Adjust your summary to reflect their priorities.',
    user: `Original artefact:
{{ARTEFACT}}

Your previous understanding:
{{PREVIOUS_UNDERSTANDING}}

Manager feedback:
{{FEEDBACK}}

Provide an updated understanding incorporating their feedback.`
  },
  
  generatorA: {
    system: 'You are Generator A, an expert at creating pedagogically sound micro-learning modules. Generate clear, structured content with questions that test comprehension.',
    user: `Based on this understanding:
{{UNDERSTANDING}}

Source material:
{{ARTEFACT}}

Create 3-5 micro-learning modules. Each module should have:
1. A clear title
2. 2-3 paragraphs of explanation (max 300 words)
3. 3-5 multiple choice questions with explanations
4. Real-world examples

Output as JSON: { "modules": [{title, content, questions: [{text, options, correctAnswer, explanation}], examples}] }`
  },
  
  generatorB: {
    system: 'You are Generator B, an expert at creating engaging learning content with a focus on practical application and diverse teaching styles.',
    user: `Based on this understanding:
{{UNDERSTANDING}}

Source material:
{{ARTEFACT}}

Create 3-5 micro-learning modules with a different pedagogical approach than standard content. Focus on:
- Storytelling and scenarios
- Visual descriptions (for future illustration)
- Analogies and metaphors
- Kinesthetic learning cues

Output as JSON: { "modules": [{title, content, questions, examples}] }`
  },
  
  factChecker: {
    system: 'You are a fact-checker and content judge. Your role is to verify accuracy, remove hallucinations, and select the best elements from both generators.',
    user: `Generator A output:
{{GENERATOR_A_OUTPUT}}

Generator B output:
{{GENERATOR_B_OUTPUT}}

Source material (ground truth):
{{ARTEFACT}}

Tasks:
1. Verify all facts against source material
2. Remove any hallucinations or unsupported claims
3. Select clearest explanations (may mix from A and B)
4. Select best questions (diversity and pedagogical value)
5. Ensure progression from simple to complex

Output JSON:
{
  "modules": [{
    "title": "...",
    "content": "...",
    "questions": [...],
    "provenance": {
      "content_source": "generator-a" or "generator-b",
      "questions_source": ["generator-a-q1", "generator-b-q2"],
      "confidence": 0.95
    }
  }],
  "provenance": [{
    "module_id": "module-1",
    "section": "content",
    "source": "generator-a",
    "model": "gpt-4o",
    "reason": "Clearer explanation with better structure"
  }]
}`
  }
};
```

**Acceptance:**
- [ ] `llm-orchestrator.ts` created with 5+ exported functions
- [ ] Can call OpenAI and Anthropic APIs
- [ ] Retry logic works (test with invalid API key)
- [ ] Cost calculation accurate (verify against API docs)
- [ ] Prompt templates follow format

---

### Phase 3: Understanding & Refinement API (2 hours)

**File:** `api/src/routes/content.ts` (NEW)

```typescript
/**
 * Content Generation Routes
 * Epic 6: Ensemble Content Generation
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { contentGenerations, contentRefinements } from '../db/schema';
import { requireManager, getSession } from '../middleware/rbac';
import {
  playbackUnderstanding,
  refineUnderstanding,
  generateWithEnsemble,
} from '../services/llm-orchestrator';

const FF_ENSEMBLE_GENERATION_V1 = process.env.FF_ENSEMBLE_GENERATION_V1 === 'true';

export async function registerContentRoutes(app: FastifyInstance) {
  /**
   * POST /api/content/understand
   * Submit artefact and get understanding playback
   */
  app.post(
    '/api/content/understand',
    async (
      req: FastifyRequest<{ Body: { artefact: string; artefactType?: string } }>,
      reply: FastifyReply
    ) => {
      if (!FF_ENSEMBLE_GENERATION_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireManager(req, reply)) return reply;

      const session = getSession(req);
      const { artefact, artefactType = 'text' } = req.body;

      if (!artefact || artefact.length > 50000) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_REQUEST',
            message: 'Artefact required (max 50k chars)',
            details: { maxLength: 50000, provided: artefact?.length }
          }
        });
      }

      try {
        // Call LLM for understanding
        const result = await playbackUnderstanding(artefact);

        // Create generation record
        const [generation] = await db
          .insert(contentGenerations)
          .values({
            organizationId: session!.organizationId,
            managerId: session!.userId,
            artefactText: artefact,
            understanding: result.content,
            status: 'understanding',
            totalCostUsd: result.costUsd.toString(),
            totalTokens: result.tokens,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning({ id: contentGenerations.id });

        return reply.send({
          generationId: generation.id,
          understanding: result.content,
          status: 'understanding',
          cost: result.costUsd,
          tokens: result.tokens
        });
      } catch (error: any) {
        console.error('Understanding error:', error);
        return reply.status(503).send({
          error: {
            code: 'LLM_UNAVAILABLE',
            message: error.message
          }
        });
      }
    }
  );

  /**
   * POST /api/content/refine
   * Refine understanding based on manager feedback
   */
  app.post(
    '/api/content/refine',
    async (
      req: FastifyRequest<{ Body: { generationId: string; feedback: string } }>,
      reply: FastifyReply
    ) => {
      if (!FF_ENSEMBLE_GENERATION_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireManager(req, reply)) return reply;

      const session = getSession(req);
      const { generationId, feedback } = req.body;

      // Get generation
      const [generation] = await db
        .select()
        .from(contentGenerations)
        .where(eq(contentGenerations.id, generationId))
        .limit(1);

      if (!generation) {
        return reply.status(404).send({
          error: { code: 'GENERATION_NOT_FOUND', message: 'Generation not found' }
        });
      }

      // Check ownership
      if (generation.managerId !== session!.userId && session!.role !== 'admin') {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Not your generation' }
        });
      }

      // Check max refinements
      if (generation.refinementIterations >= 3) {
        return reply.status(400).send({
          error: {
            code: 'MAX_REFINEMENTS_REACHED',
            message: 'Maximum 3 refinement iterations allowed'
          }
        });
      }

      try {
        // Refine understanding
        const result = await refineUnderstanding(
          generation.artefactText,
          generation.understanding!,
          feedback
        );

        // Store refinement
        await db.insert(contentRefinements).values({
          generationId,
          iteration: generation.refinementIterations + 1,
          managerFeedback: feedback,
          llmResponse: result.content,
          createdAt: new Date(),
        });

        // Update generation
        await db
          .update(contentGenerations)
          .set({
            understanding: result.content,
            refinementIterations: generation.refinementIterations + 1,
            updatedAt: new Date(),
          })
          .where(eq(contentGenerations.id, generationId));

        return reply.send({
          generationId,
          understanding: result.content,
          iteration: generation.refinementIterations + 1,
          maxIterations: 3,
          status: 'understanding'
        });
      } catch (error: any) {
        return reply.status(503).send({
          error: { code: 'LLM_UNAVAILABLE', message: error.message }
        });
      }
    }
  );

  // POST /api/content/generate
  // GET /api/content/generations/:id
  // PATCH /api/content/generations/:id
  // POST /api/content/regenerate/:id
  // [Implement in Phase 4]
}
```

**Register in `api/src/index.ts`:**
```typescript
await safeRegister('./routes/content', ['registerContentRoutes']);
```

**Acceptance:**
- [ ] `content.ts` created with 2 routes (understand, refine)
- [ ] Routes enforce RBAC (manager only)
- [ ] Feature flag checked
- [ ] Understanding stored in DB
- [ ] Refinement iterations capped at 3
- [ ] Cost tracked per LLM call

---

### Phase 4: Generation API (3 hours)

Continue `api/src/routes/content.ts` with generation endpoints:

```typescript
  /**
   * POST /api/content/generate
   * Trigger 3-LLM ensemble generation (async)
   */
  app.post(
    '/api/content/generate',
    async (
      req: FastifyRequest<{ Body: { generationId: string; contentType: string } }>,
      reply: FastifyReply
    ) => {
      if (!FF_ENSEMBLE_GENERATION_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireManager(req, reply)) return reply;

      const { generationId, contentType } = req.body;

      // Get generation
      const [generation] = await db
        .select()
        .from(contentGenerations)
        .where(eq(contentGenerations.id, generationId))
        .limit(1);

      if (!generation || !generation.understanding) {
        return reply.status(400).send({
          error: {
            code: 'UNDERSTANDING_NOT_APPROVED',
            message: 'Must approve understanding before generating'
          }
        });
      }

      // Update status
      await db
        .update(contentGenerations)
        .set({ status: 'generating', contentType, updatedAt: new Date() })
        .where(eq(contentGenerations.id, generationId));

      // Start async generation (in background)
      generateEnsembleAsync(generationId, generation.understanding, generation.artefactText);

      return reply.status(202).send({
        generationId,
        status: 'generating',
        estimatedTimeSeconds: 45,
        pollUrl: `/api/content/generations/${generationId}`
      });
    }
  );

  /**
   * GET /api/content/generations/:id
   * Poll generation status
   */
  app.get(
    '/api/content/generations/:id',
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      if (!FF_ENSEMBLE_GENERATION_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireManager(req, reply)) return reply;

      const { id } = req.params;

      const [generation] = await db
        .select()
        .from(contentGenerations)
        .where(eq(contentGenerations.id, id))
        .limit(1);

      if (!generation) {
        return reply.status(404).send({
          error: { code: 'GENERATION_NOT_FOUND', message: 'Not found' }
        });
      }

      return reply.send({
        id: generation.id,
        status: generation.status,
        progress: generation.status === 'completed' ? 100 : generation.status === 'generating' ? 50 : 0,
        modules: generation.factCheckerOutput ? (generation.factCheckerOutput as any).modules : [],
        provenance: generation.factCheckerOutput ? (generation.factCheckerOutput as any).provenance : [],
        totalCost: parseFloat(generation.totalCostUsd || '0'),
        totalTokens: generation.totalTokens,
        generationTimeMs: generation.generationTimeMs
      });
    }
  );
}

/**
 * Background async generation
 * In production, use a proper job queue (Bull, BullMQ, etc.)
 */
async function generateEnsembleAsync(
  generationId: string,
  understanding: string,
  artefact: string
) {
  try {
    const result = await generateWithEnsemble(understanding, artefact);

    // Store results
    await db
      .update(contentGenerations)
      .set({
        status: 'completed',
        generatorAOutput: result.generatorA as any,
        generatorBOutput: result.generatorB as any,
        factCheckerOutput: {
          modules: result.finalModules,
          provenance: result.provenance
        } as any,
        totalCostUsd: result.totalCost.toString(),
        totalTokens: result.totalTokens,
        generationTimeMs: result.totalTime,
        updatedAt: new Date(),
      })
      .where(eq(contentGenerations.id, generationId));

    // Store provenance records
    for (const prov of result.provenance) {
      await db.insert(contentProvenance).values({
        generationId,
        moduleId: prov.moduleId,
        sectionType: prov.section,
        sourceLlm: prov.source,
        sourceModel: prov.model,
        confidenceScore: prov.confidence?.toString(),
        selectedBy: 'fact-checker',
        createdAt: new Date(),
      });
    }
  } catch (error: any) {
    console.error('Generation error:', error);
    await db
      .update(contentGenerations)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(eq(contentGenerations.id, generationId));
  }
}
```

**Acceptance:**
- [ ] `POST /api/content/generate` triggers async generation
- [ ] `GET /api/content/generations/:id` returns status/results
- [ ] Provenance stored in separate table
- [ ] Cost tracked across all 3 LLMs
- [ ] Failed generations marked with status='failed'

---

### Phase 5: Manager UI Components (4 hours)

**File:** `web/app/curator/understand/page.tsx` (NEW)

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UnderstandPage() {
  const router = useRouter();
  const [artefact, setArtefact] = useState('');
  const [understanding, setUnderstanding] = useState('');
  const [generationId, setGenerationId] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await fetch('/api/content/understand', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ artefact }),
        credentials: 'include',
      });
      const data = await res.json();
      setUnderstanding(data.understanding);
      setGenerationId(data.generationId);
    } catch (error) {
      alert('Failed to get understanding');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    router.push(`/curator/generate/${generationId}`);
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Upload Artefact</h1>
      
      <textarea
        className="w-full h-64 p-4 border rounded"
        placeholder="Paste your policy document, transcript, or any learning material..."
        value={artefact}
        onChange={(e) => setArtefact(e.target.value)}
      />
      
      <button
        onClick={handleSubmit}
        disabled={loading || !artefact}
        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {loading ? 'Analyzing...' : 'Get Understanding'}
      </button>

      {understanding && (
        <div className="mt-8 p-6 bg-gray-50 rounded">
          <h2 className="text-xl font-semibold mb-4">LLM Understanding:</h2>
          <p className="mb-4">{understanding}</p>
          
          <div className="flex gap-4">
            <button
              onClick={handleConfirm}
              className="px-6 py-2 bg-green-600 text-white rounded"
            >
              ✓ Confirm & Generate
            </button>
            <button
              onClick={() => router.push(`/curator/refine/${generationId}`)}
              className="px-6 py-2 bg-yellow-600 text-white rounded"
            >
              ✎ Refine Understanding
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

**File:** `web/app/curator/generate/[id]/page.tsx` (NEW)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function GeneratePage() {
  const params = useParams();
  const generationId = params.id as string;
  const [status, setStatus] = useState('pending');
  const [modules, setModules] = useState<any[]>([]);
  const [provenance, setProvenance] = useState<any[]>([]);

  useEffect(() => {
    // Start generation
    fetch('/api/content/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ generationId, contentType: 'generic' }),
      credentials: 'include',
    });

    // Poll for results
    const interval = setInterval(async () => {
      const res = await fetch(`/api/content/generations/${generationId}`, {
        credentials: 'include'
      });
      const data = await res.json();
      setStatus(data.status);
      if (data.status === 'completed') {
        setModules(data.modules);
        setProvenance(data.provenance);
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [generationId]);

  if (status !== 'completed') {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">Generating Content...</h1>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded mb-4"></div>
          <div className="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
          <p className="text-gray-600">3-LLM Ensemble Pipeline Running...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Generated Content</h1>
      
      {modules.map((module, idx) => (
        <div key={idx} className="mb-8 p-6 border rounded">
          <h2 className="text-2xl font-semibold mb-4">{module.title}</h2>
          <p className="mb-4">{module.content}</p>
          
          <div className="mt-4 p-4 bg-blue-50 rounded text-sm">
            <strong>Provenance:</strong> Content from {module.provenance.content_source},
            Questions from {module.provenance.questions_source.join(', ')}
            (Confidence: {module.provenance.confidence})
          </div>
          
          <h3 className="text-lg font-semibold mt-6 mb-2">Questions:</h3>
          {module.questions.map((q: any, qIdx: number) => (
            <div key={qIdx} className="mb-4 p-4 bg-gray-50 rounded">
              <p className="font-medium">{q.text}</p>
              <ul className="mt-2 space-y-1">
                {q.options.map((opt: string, oIdx: number) => (
                  <li key={oIdx} className={opt === q.correctAnswer ? 'text-green-600 font-semibold' : ''}>
                    {opt}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-gray-600"><strong>Explanation:</strong> {q.explanation}</p>
            </div>
          ))}
        </div>
      ))}
      
      <button className="px-6 py-3 bg-green-600 text-white rounded text-lg">
        ✓ Approve & Publish
      </button>
    </div>
  );
}
```

**Acceptance:**
- [ ] 3 UI pages created (understand, refine, generate)
- [ ] Can upload artefact and see understanding
- [ ] Can refine understanding (max 3 times)
- [ ] Can trigger generation and see progress
- [ ] Provenance displayed for each module
- [ ] UI styled with Tailwind (matches Cerply brand)

---

### Phase 6: Canon Storage & Reuse (2 hours)

**File:** `api/src/services/canon.ts` (NEW)

```typescript
/**
 * Canon Storage Service
 * Stores and reuses generic content across organizations
 */

import { db } from '../db';
import { contentGenerations } from '../db/schema';
import { eq } from 'drizzle-orm';

// Simple keyword-based detection (in production, use embeddings)
const GENERIC_KEYWORDS = [
  'fire safety', 'gdpr', 'data protection', 'first aid',
  'workplace safety', 'harassment', 'discrimination',
  'security awareness', 'phishing', 'password'
];

/**
 * Detect if content is generic (industry-standard)
 */
export function isGenericContent(text: string): boolean {
  const lowerText = text.toLowerCase();
  return GENERIC_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

/**
 * Check if similar generic content exists in canon
 * Returns existing content if similarity > 90%
 */
export async function checkCanonReuse(
  artefactText: string,
  organizationId: string
): Promise<any | null> {
  if (!isGenericContent(artefactText)) {
    return null; // Not generic, can't reuse
  }

  // Find similar generic content (simple text similarity for MVP)
  const canonContent = await db
    .select()
    .from(contentGenerations)
    .where(eq(contentGenerations.contentType, 'generic'))
    .where(eq(contentGenerations.status, 'completed'))
    .limit(10);

  for (const content of canonContent) {
    const similarity = calculateTextSimilarity(artefactText, content.artefactText);
    if (similarity > 0.9) {
      return content.factCheckerOutput; // Reuse this content
    }
  }

  return null;
}

/**
 * Simple text similarity (cosine similarity would be better)
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size; // Jaccard similarity
}

/**
 * Calculate cost savings from canon reuse
 */
export function calculateCanonSavings(originalCost: number): number {
  return originalCost * 0.7; // 70% savings
}
```

**Acceptance:**
- [ ] `canon.ts` service created
- [ ] Generic content detection works
- [ ] Similarity check works (>90% threshold)
- [ ] Cost savings calculated
- [ ] Canon content tagged in DB

---

### Phase 7: Tests (3 hours)

**File:** `api/tests/ensemble-generation.test.ts` (NEW)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  playbackUnderstanding,
  refineUnderstanding,
  generateWithEnsemble,
  PROMPTS,
} from '../src/services/llm-orchestrator';
import { isGenericContent, checkCanonReuse } from '../src/services/canon';

describe('LLM Orchestrator', () => {
  describe('playbackUnderstanding', () => {
    it('should call OpenAI with correct prompt', async () => {
      // Mock OpenAI
      vi.mock('openai');
      
      const artefact = 'Fire safety: Call 999, evacuate, meet at assembly point';
      // const result = await playbackUnderstanding(artefact);
      
      // expect(result.content).toContain('fire safety');
      // expect(result.tokens).toBeGreaterThan(0);
      // expect(result.costUsd).toBeGreaterThan(0);
    });
  });

  describe('PROMPTS', () => {
    it('should have all required prompt templates', () => {
      expect(PROMPTS.understanding).toBeDefined();
      expect(PROMPTS.refinement).toBeDefined();
      expect(PROMPTS.generatorA).toBeDefined();
      expect(PROMPTS.generatorB).toBeDefined();
      expect(PROMPTS.factChecker).toBeDefined();
    });

    it('should have placeholder variables', () => {
      expect(PROMPTS.understanding.user).toContain('{{ARTEFACT}}');
      expect(PROMPTS.refinement.user).toContain('{{FEEDBACK}}');
      expect(PROMPTS.generatorA.user).toContain('{{UNDERSTANDING}}');
    });
  });
});

describe('Canon Storage', () => {
  describe('isGenericContent', () => {
    it('should detect generic content', () => {
      expect(isGenericContent('Fire safety procedures for evacuation')).toBe(true);
      expect(isGenericContent('GDPR compliance requirements')).toBe(true);
      expect(isGenericContent('Acme Corp internal policy XYZ')).toBe(false);
    });
  });
});

// Add 30+ more tests...
```

**File:** `api/scripts/smoke-ensemble.sh` (NEW)

```bash
#!/bin/bash
# Smoke tests for Epic 6: Ensemble Content Generation

set -e

API_BASE="${API_BASE:-http://localhost:8080}"
ADMIN_TOKEN="${ADMIN_TOKEN:-dev-admin-token-12345}"

echo "=== Epic 6: Ensemble Generation - Smoke Tests ==="

# Test 1: Submit artefact
echo "Test 1: Submit artefact and get understanding"
GEN_ID=$(curl -sS -X POST "${API_BASE}/api/content/understand" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  -H "content-type: application/json" \
  -d '{"artefact":"Fire safety: Call 999, evacuate immediately, meet at assembly point."}' \
  | jq -r '.generationId')

echo "Generation ID: $GEN_ID"

# Test 2: Refine understanding
echo "Test 2: Refine understanding"
curl -sS -X POST "${API_BASE}/api/content/refine" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  -H "content-type: application/json" \
  -d "{\"generationId\":\"$GEN_ID\",\"feedback\":\"Focus more on evacuation routes\"}" \
  | jq -e '.iteration == 1'

# Test 3: Trigger generation
echo "Test 3: Trigger generation"
curl -sS -X POST "${API_BASE}/api/content/generate" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  -H "content-type: application/json" \
  -d "{\"generationId\":\"$GEN_ID\",\"contentType\":\"generic\"}" \
  | jq -e '.status == "generating"'

# Test 4: Poll generation (may not complete in smoke test)
echo "Test 4: Poll generation status"
curl -sS "${API_BASE}/api/content/generations/$GEN_ID" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  | jq -e 'has("status")'

echo "✅ All smoke tests passed!"
```

**Acceptance:**
- [ ] 40+ unit tests written
- [ ] Smoke test script created and executable
- [ ] Tests pass locally
- [ ] Mock LLM responses for tests (no real API calls)

---

### Phase 8: Documentation (1 hour)

**Updates Required:**

1. **`docs/functional-spec.md`** - Add section 26:
```markdown
## 26) Ensemble Content Generation v1 — ✅ IMPLEMENTED

**Covers BRD:** B-3, E-14

**Status:** Implemented 2025-10-XX | Epic: Epic 6 | Tests: `api/tests/ensemble-generation.test.ts`

**Summary:**
3-LLM ensemble pipeline for high-quality content generation with provenance tracking. Generator A (GPT-4o) and Generator B (Claude Sonnet) independently create content, Fact-Checker (GPT-4) validates and selects best elements. Managers refine understanding iteratively, approve final content with full transparency. Generic content stored in canon for 70% cost savings.

[Full documentation here]
```

2. **`api/README.md`** - Add content endpoints
3. **`docs/runbooks/ensemble-troubleshooting.md`** - Create troubleshooting guide
4. **`README.md`** - Add LLM API setup instructions

---

## 4. Code Patterns & Examples

[Include all patterns from Epic 5, plus:]

### LLM Provider Abstraction Pattern

```typescript
async function callLLM(
  provider: 'openai' | 'anthropic',
  model: string,
  prompt: string,
  systemPrompt: string
): Promise<LLMResult> {
  if (provider === 'openai') {
    return callOpenAI(model, prompt, systemPrompt);
  } else {
    return callAnthropic(model, prompt, systemPrompt);
  }
}
```

### Async Job Processing Pattern

```typescript
// Simple async (for MVP)
async function startBackgroundJob(fn: () => Promise<void>) {
  fn().catch(console.error); // Fire and forget
}

// Production: Use Bull/BullMQ
// const queue = new Queue('content-generation');
// await queue.add('generate', { generationId, ... });
```

### Provenance Tracking Pattern

```typescript
interface ProvenanceRecord {
  moduleId: string;
  section: 'content' | 'question' | 'example';
  source: 'generator-a' | 'generator-b' | 'fact-checker';
  model: string;
  confidence?: number;
  reason?: string;
}
```

---

## 5. LLM Configuration

### OpenAI Setup

```bash
# Get API key from https://platform.openai.com/api-keys
export OPENAI_API_KEY=sk-...

# Test connection
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  | jq '.data[] | select(.id | contains("gpt-4"))'
```

### Anthropic Setup

```bash
# Get API key from https://console.anthropic.com/
export ANTHROPIC_API_KEY=sk-ant-...

# Test connection
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-3.5-20241022","max_tokens":100,"messages":[{"role":"user","content":"Hello"}]}'
```

### Cost Optimization

**Strategies:**
1. **Canon Reuse:** Check for similar generic content before generating (70% savings)
2. **Model Selection:** Use cheaper models for less critical tasks
3. **Prompt Optimization:** Reduce input tokens, be specific
4. **Caching:** Cache embeddings and summaries
5. **Budget Alerts:** Stop generation if exceeds threshold

---

## 6. Acceptance Criteria

**Before marking Epic 6 complete:**

### Database (5 items)
- [ ] Migration `009_ensemble_generation.sql` runs without errors
- [ ] 3 tables created (content_generations, content_refinements, content_provenance)
- [ ] Indexes created on all foreign keys
- [ ] Drizzle schema compiles and types correct
- [ ] Can query tables with no errors

### LLM Orchestrator (10 items)
- [ ] Can call OpenAI API successfully
- [ ] Can call Anthropic API successfully
- [ ] Retry logic works (test with invalid key)
- [ ] Cost calculation accurate (verify against API pricing docs)
- [ ] Token counting works
- [ ] Playback understanding returns coherent summary
- [ ] Refinement incorporates feedback
- [ ] Generator A produces valid JSON modules
- [ ] Generator B produces valid JSON modules
- [ ] Fact-Checker produces valid JSON with provenance

### API Routes (12 items)
- [ ] `POST /api/content/understand` works
- [ ] `POST /api/content/refine` works (max 3 iterations)
- [ ] `POST /api/content/generate` triggers async generation
- [ ] `GET /api/content/generations/:id` returns status
- [ ] RBAC enforced (manager/admin only)
- [ ] Feature flag disables routes when false
- [ ] Tenant isolation enforced
- [ ] Error envelopes correct format
- [ ] Understanding stored in DB
- [ ] Refinements stored with iteration count
- [ ] Provenance stored in separate table
- [ ] Failed generations marked with status='failed'

### UI Components (8 items)
- [ ] Can upload artefact text
- [ ] LLM understanding displayed
- [ ] Can confirm or refine understanding
- [ ] Refinement iteration counter shows (X/3)
- [ ] Generation progress shown
- [ ] Modules displayed with content + questions
- [ ] Provenance tags visible per module
- [ ] UI styled with Tailwind (brand colors)

### Canon Storage (5 items)
- [ ] Generic content detected by keywords
- [ ] Similarity check works (>90%)
- [ ] Canon content reused when found
- [ ] Cost savings calculated (70%)
- [ ] Generic content tagged in DB

### Tests (5 items)
- [ ] 40+ unit tests written
- [ ] Tests pass locally (`npm test -- ensemble`)
- [ ] Smoke tests pass (`bash api/scripts/smoke-ensemble.sh`)
- [ ] LLM calls mocked in tests (no real API)
- [ ] Linter passes with no errors

### Documentation (5 items)
- [ ] `docs/functional-spec.md` section 26 updated
- [ ] `api/README.md` updated with content endpoints
- [ ] `docs/runbooks/ensemble-troubleshooting.md` created
- [ ] Prompt templates documented
- [ ] Cost estimation guide created

---

## 7. Testing Instructions

[Similar format to Epic 5, with curl commands for all 6 endpoints and expected outputs]

---

## 8. Rollout Plan

**Week 1:** Development with mock LLMs  
**Week 2:** Staging with real LLMs  
**Week 3:** Production pilot (1-2 customers, cost monitoring)  
**Week 4:** GA with budget alerts

---

## 9. References

- `EPIC5_IMPLEMENTATION_PROMPT.md` - Follow this structure
- OpenAI API: https://platform.openai.com/docs/api-reference
- Anthropic API: https://docs.anthropic.com/claude/reference
- Prompt Engineering: https://platform.openai.com/docs/guides/prompt-engineering

---

## 10. Quick Start Checklist

- [ ] Read project context (section 1)
- [ ] Study Epic 5 prompt as reference
- [ ] Review Epic 4 analytics service pattern
- [ ] Set up OpenAI and Anthropic API keys
- [ ] Implement Phase 1: Database (1 hour)
- [ ] Implement Phase 2: LLM Orchestrator (4 hours)
- [ ] Implement Phase 3: API routes (2 hours)
- [ ] Implement Phase 4: Generation API (3 hours)
- [ ] Implement Phase 5: UI components (4 hours)
- [ ] Implement Phase 6: Canon storage (2 hours)
- [ ] Implement Phase 7: Tests (3 hours)
- [ ] Implement Phase 8: Documentation (1 hour)
- [ ] Run all acceptance criteria
- [ ] Create PR with `[spec] Epic 6: Ensemble Content Generation`

---

## 11. Prompt Templates

[Full templates included in Phase 2 code above]

---

## 12. Cost & Performance

**Estimated Costs per Generation:**
- Generator A (GPT-4o): ~3,000 tokens = $0.12
- Generator B (Claude Sonnet): ~3,000 tokens = $0.13
- Fact-Checker (GPT-4): ~6,000 tokens (reading both) = $0.27
- **Total:** ~$0.52 per generation

**Canon Reuse Savings:**
- First generation: $0.52
- Reused generation: $0.00
- **70% savings after 10 reuses**

**Performance Targets:**
- Understanding playback: < 5 seconds
- Refinement: < 5 seconds
- Full ensemble generation: < 60 seconds total
- UI response time: < 200ms (excluding LLM calls)

**Budget Alerts:**
```typescript
const MAX_COST = parseFloat(process.env.MAX_GENERATION_COST_USD || '5.00');
const WARN_COST = parseFloat(process.env.WARN_GENERATION_COST_USD || '2.00');

if (totalCost > MAX_COST) {
  throw new Error(`Generation exceeds budget: $${totalCost}`);
}
if (totalCost > WARN_COST) {
  console.warn(`Generation cost high: $${totalCost}`);
}
```

---

**End of Epic 6 Implementation Prompt**

**Estimated Reading Time:** 60 minutes  
**Estimated Implementation Time:** 16-20 hours  
**Total Epic Time:** ~17-21 hours

**Questions?** Refer to `docs/MVP_B2B_ROADMAP.md` Epic 6 section or `EPIC5_IMPLEMENTATION_PROMPT.md` for additional patterns.

**Good luck! 🚀**

