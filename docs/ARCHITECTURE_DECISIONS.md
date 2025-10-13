# Architecture Decision Records (ADR)
**Version:** 1.2  
**Status:** LOCKED (Changes require explicit approval)  
**Last Updated:** 2025-10-13  
**Owner:** Cerply Engineering

---

## Purpose

This document establishes **immutable architectural principles** for Cerply B2B Enterprise MVP. All implementation prompts, code contributions, and agent workflows MUST adhere to these decisions.

**Traceability:** Maps to BRD (docs/brd/cerply-brd.md) and FSD (docs/functional-spec.md)

---

## Core Architectural Principles (IMMUTABLE)

### 1. Feature Flag Driven Development

**Decision:** All new features MUST be gated by feature flags.

**Rationale:** Enables safe rollout, A/B testing, and instant rollback without code changes.

**Pattern:**
```typescript
const FF_FEATURE_NAME_V1 = process.env.FF_FEATURE_NAME_V1 === 'true';

if (!FF_FEATURE_NAME_V1) {
  return reply.status(404).send({
    error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
  });
}
```

**Traceability:** 
- BRD: All features (AU-1, L-2, L-12, L-16, L-17, L-18, B-3, B-7, B-15, E-14)
- FSD: §25-§30 (all implemented features use flags)

**Naming Convention:**
- Format: `FF_{FEATURE}_{VERSION}`
- Examples: `FF_SLACK_CHANNEL_V1`, `FF_ADAPTIVE_DIFFICULTY_V1`, `FF_ENSEMBLE_GENERATION_V1`

---

### 2. Error Envelope Standard

**Decision:** All API errors MUST return standardized error envelopes.

**Rationale:** Consistent error handling for frontend, logging, and debugging.

**Format:**
```typescript
{
  error: {
    code: string,        // UPPER_SNAKE_CASE (e.g., 'NOT_FOUND', 'BAD_REQUEST')
    message: string,     // Human-readable message
    details?: object     // Optional context (e.g., validation errors)
  }
}
```

**HTTP Status Codes:**
- 400: Bad Request (BAD_REQUEST)
- 401: Unauthorized (UNAUTHORIZED)
- 403: Forbidden (FORBIDDEN)
- 404: Not Found (NOT_FOUND)
- 409: Conflict (CONFLICT)
- 413: Payload Too Large (PAYLOAD_TOO_LARGE)
- 415: Unsupported Media Type (UNSUPPORTED_MEDIA_TYPE)
- 429: Too Many Requests (RATE_LIMIT_EXCEEDED)
- 500: Internal Server Error (INTERNAL_ERROR)

**Traceability:**
- BRD: Implicit in all user interactions
- FSD: §9 Certified v1 API, §25-§30 (all routes)

---

### 3. RBAC Middleware Pattern

**Decision:** All protected routes MUST use RBAC middleware with explicit role checks.

**Rationale:** Centralized access control, prevents authorization bugs, enables audit trails.

**Pattern:**
```typescript
import { requireLearner, requireManager, requireExpert, getSession } from '../middleware/rbac';

app.get('/api/resource', async (req, reply) => {
  if (!requireLearner(req, reply)) return reply; // CRITICAL: Always return reply
  
  const session = getSession(req);
  // ... use session.userId, session.role, session.orgId
});
```

**Roles:**
- `admin`: Platform administrators (Cerply staff)
- `manager`: Team managers (can view team analytics, assign content)
- `learner`: End users (can access learning content)
- `expert`: Content certifiers (can approve content)

**Traceability:**
- BRD: All role-specific features (B-2, B-14, B-15, E-1, E-2, E-14)
- FSD: §2 Enterprise SSO & RBAC

---

### 4. Service Layer Separation

**Decision:** Business logic MUST be extracted into service files, not inline in routes.

**Rationale:** Testability, reusability, maintainability, separation of concerns.

**Structure:**
```
api/src/
  routes/
    gamification.ts      # Route handlers (thin)
  services/
    gamification.ts      # Business logic (fat)
  db/
    schema.ts            # Database schema
```

**Example:**
```typescript
// ❌ BAD: Logic in route
app.post('/api/gamification/award-badge', async (req, reply) => {
  const badge = await db.insert(badges).values({...}).returning();
  const notification = await db.insert(notifications).values({...});
  // ... complex logic ...
});

// ✅ GOOD: Logic in service
import { awardBadge } from '../services/gamification';

app.post('/api/gamification/award-badge', async (req, reply) => {
  if (!requireLearner(req, reply)) return reply;
  
  const result = await awardBadge(req.body.userId, req.body.badgeType);
  return reply.send(result);
});
```

**Traceability:**
- BRD: Implicit in all complex features
- FSD: All implemented services (gamification, adaptive, chat, etc.)

---

### 5. Database Migration Standards

**Decision:** All schema changes MUST use Drizzle migrations with standardized headers.

**Rationale:** Version control, rollback capability, documentation, traceability.

**Migration Header Format:**
```sql
------------------------------------------------------------------------------
-- Epic X: Feature Name
-- BRD: XX-X (Requirement reference)
-- FSD: §XX (Functional spec section)
-- Roadmap: docs/MVP_B2B_ROADMAP.md (Epic X, lines XXX-XXX)
------------------------------------------------------------------------------
```

**Example:**
```sql
------------------------------------------------------------------------------
-- Epic 9: True Adaptive Difficulty Engine
-- BRD: L-2 (Adaptive lesson plans with dynamic difficulty adjustment)
-- FSD: §30 (True Adaptive Difficulty Engine)
-- Roadmap: docs/MVP_B2B_ROADMAP.md (Epic 9, lines 953-1114)
------------------------------------------------------------------------------

CREATE TABLE learner_profiles (...);
```

**Traceability:**
- BRD: Implicit in all data requirements
- FSD: All schema sections

---

## Database Conventions (LOCKED)

### 1. Primary Keys
- **Always use UUID** (not serial integers)
- Format: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- Rationale: Distributed-friendly, no collision risk, secure

### 2. Timestamps
- **Always use TIMESTAMPTZ** (not TIMESTAMP)
- Include: `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- Optional: `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- Rationale: Timezone-aware, unambiguous, audit-friendly

### 3. Foreign Keys
- **Always include ON DELETE CASCADE** for user data
- Format: `user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`
- Rationale: GDPR compliance, data cleanup, referential integrity

### 4. Tenant Isolation
- Include `organization_id` where applicable (multi-tenant data)
- Index: `CREATE INDEX idx_table_org ON table(organization_id)`
- Rationale: Performance, data isolation, security

### 5. Indexing Strategy
- Index all foreign keys
- Index commonly queried columns (user_id, created_at, status)
- Use partial indexes for filtered queries: `WHERE status = 'active'`

**Traceability:**
- BRD: Implicit in multi-tenant architecture
- FSD: All schema definitions (§2, §3, §7, §27-§30)

---

## API Conventions (LOCKED)

### 1. Route Prefixes
- **All API routes use `/api/*` prefix**
- Health check: `/api/health` (canonical)
- Legacy `/health` may exist but should recommend `/api/health`

**Traceability:**
- BRD: Implicit in API requirements
- FSD: §1 (API structure)

### 2. Ports
- **Web:** http://localhost:3000 (Next.js)
- **API:** http://localhost:8080 (Fastify)

### 3. Session Management
- Always use `getSession(req)` to extract session
- Returns: `{ userId, role, orgId, email }`
- Never parse session manually

### 4. Request Validation
- Validate early, fail fast
- Return 400 BAD_REQUEST for invalid input
- Include validation details in `error.details`

### 5. Response Caching
- Public endpoints: `Cache-Control: public, max-age=300, must-revalidate`
- Private endpoints: `Cache-Control: private, no-store`
- Use ETags for conditional requests

**Traceability:**
- BRD: Performance requirements (implicit)
- FSD: §9 Certified v1 API (caching example)

---

## Tech Stack (LOCKED)

### Backend (API)
- **Runtime:** Node.js 20.x
- **Framework:** Fastify 4.x
- **ORM:** Drizzle ORM
- **Database:** PostgreSQL 15
- **Testing:** Vitest
- **Validation:** Zod (optional, but recommended)

### Frontend (Web)
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS 3.x
- **UI Components:** Custom components (no external UI library)
- **State:** React hooks (no Redux/Zustand unless justified)
- **Testing:** Playwright (E2E), Vitest (unit)

### LLMs
- **Primary:** OpenAI GPT-4o, GPT-4o-mini
- **Abstraction:** Provider-agnostic service layer (future: Anthropic, etc.)
- **Cost Optimization:** Model tiering (nano/mini/standard/ensemble)

### Infrastructure
- **Hosting:** Render (staging + production)
- **CI/CD:** GitHub Actions
- **Secrets:** Environment variables (never commit)

**Traceability:**
- BRD: Technical requirements (implicit)
- FSD: Platform Foundations v1 (§8)

---

## Feature Flag Patterns (LOCKED)

### Naming Convention
```
FF_{FEATURE}_{VERSION}=true|false
```

Examples:
- `FF_SLACK_CHANNEL_V1=true`
- `FF_ENSEMBLE_GENERATION_V1=true`
- `FF_ADAPTIVE_DIFFICULTY_V1=true`
- `FF_CONVERSATIONAL_UI_V1=true`
- `FF_FREE_TEXT_ANSWERS_V1=true`

### Environment Variables for Configuration
```
# LLM Configuration
OPENAI_API_KEY=sk-...
CHAT_LLM_MODEL=gpt-4o-mini
LLM_UNDERSTANDING=gpt-4o

# Slack Configuration
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
SLACK_SIGNING_SECRET=...

# Adaptive Configuration
ADAPTIVE_MIN_DIFFICULTY=1
ADAPTIVE_MAX_DIFFICULTY=4
WEAK_TOPIC_THRESHOLD=0.70
```

**Traceability:**
- BRD: All feature rollout requirements
- FSD: §25-§30 (all feature flags documented)

---

## Epic Dependencies (LOCKED)

### Dependency Graph

```
Epic 1: D2C Removal (Foundation)
  └─> Epic 2: SSO & RBAC (Foundation)
       └─> Epic 3: Team Management
            └─> Epic 4: Manager Analytics
                 └─> Epic 5: Slack Integration
                      └─> Epic 6: Ensemble Generation
                           ├─> Epic 6.5: Research Mode
                           ├─> Epic 6.6: Content Library Seeding
                           └─> Epic 6.7: Content Lifecycle
                      └─> Epic 7: Gamification
                           └─> Epic 8: Conversational UI
                                └─> Epic 9: Adaptive Difficulty
                           └─> Epic 10: Enhanced Certification

Dependencies:
- Epic 8 requires Epic 7 (gamification.ts for progress queries)
- Epic 9 requires Epic 8 (confusion_log for adaptive signals)
- Epic 6.7 requires Epic 6 (canon storage for lifecycle)
- Epic 10 requires Epic 7 (certificate signatures)
```

**Rule:** Never implement a dependent epic before its prerequisites are complete.

**Traceability:**
- BRD: Feature interdependencies
- FSD: All sections build on previous sections
- Roadmap: docs/MVP_B2B_ROADMAP.md (Epic breakdown)

---

## Code Quality Standards (LOCKED)

### 1. TypeScript Strictness
- Strict mode enabled (`"strict": true` in tsconfig.json)
- No `any` types without justification
- Explicit return types for public functions

### 2. Testing Requirements
- **Unit tests:** All service layer functions
- **Route tests:** All API endpoints
- **E2E tests:** All user workflows
- **Smoke tests:** All critical paths

### 3. Linting
- ESLint configured with recommended rules
- Prettier for consistent formatting
- No committed linter warnings

### 4. Documentation
- All public functions have JSDoc comments
- README.md updated for new features
- Functional spec updated with [spec] tag

**Traceability:**
- BRD: Quality requirements (implicit)
- FSD: Platform Foundations v1 (§8) - Quality-first principle

---

## Commit Hygiene (LOCKED)

### Commit Message Format
```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `chore`: Maintenance (no feature change)
- `docs`: Documentation only
- `test`: Test updates
- `refactor`: Code restructure (no feature change)

**Special Tags:**
- `[spec]`: Changes to functional spec or BRD
- `[breaking]`: Breaking API changes

**Examples:**
```
feat(slack): add Slack OAuth flow [spec]
fix(gamification): correct level-up threshold calculation
chore(deps): upgrade fastify to 4.28.1
docs(adaptive): add Epic 9 acceptance criteria
```

**Traceability:**
- BRD: Version control requirements (implicit)
- FSD: All sections tagged with implementation date

---

## Security Standards (LOCKED)

### 1. Authentication
- All `/api/*` routes require authentication (except health checks)
- Session tokens validated on every request
- No bearer tokens in query strings

### 2. Authorization
- RBAC enforced at route level
- No client-side only authorization checks
- Manager routes verify team membership

### 3. Secrets Management
- Never commit secrets to git
- Use environment variables
- Rotate secrets quarterly (production)

### 4. Input Validation
- Validate all user input
- Sanitize for SQL injection (Drizzle handles this)
- Rate limiting on expensive endpoints

### 5. CORS
- Public endpoints: `Access-Control-Allow-Origin: *`
- Private endpoints: Strict origin checking

**Traceability:**
- BRD: Security requirements (implicit in enterprise context)
- FSD: §2 SSO & RBAC, §9 Certified API (CORS headers)

---

## LLM Integration Standards (LOCKED)

### 1. Provider Abstraction
- Never call OpenAI directly in routes
- Use service layer: `services/llm-provider.ts`
- Future-proof for Anthropic, etc.

### 2. Prompt Management
- Store prompts in dedicated files: `api/prompts/*.prompt.md`
- Version prompts (v1, v2, etc.)
- Track prompt performance metrics

### 3. Cost Optimization
- Use model tiering (nano/mini/standard/ensemble)
- Cache expensive LLM calls (1 hour TTL default)
- Track cost per user per month

### 4. Error Handling
- Graceful fallback if LLM fails
- Never expose LLM errors to users
- Log LLM errors for debugging

**Traceability:**
- BRD: B-3, B-3.1, L-12, L-18 (LLM-powered features)
- FSD: §8 Platform Foundations (cost orchestration), §26-§30 (LLM features)

---

## Content Meta Model (LOCKED)

**Decision:** All content MUST follow a 5-tier hierarchy: Subject > Topic > Module > Quiz > Question

**Rationale:**
- **Topics** are the collection unit - what we generate (4-6 modules per topic)
- **Modules** are the provision unit - what learners consume
- Clear separation enables better freshness management, certification, and content reuse
- Proprietary content (company-specific) kept separate from canonical (public) content

**Structure:**
```
Subject (e.g., "Computer Science")
  └─ Topic (e.g., "Machine Learning") ← Content collection level
      └─ Module (e.g., "LLM Architecture") ← Content provision level
          └─ Quiz (e.g., "Quiz 1", "Quiz 2")
              └─ Question (e.g., "What does LLM stand for?")
                  └─ Guidance (explanation text within question)
```

**Mandatory Patterns:**

### 1. Content Generation

**All content generation MUST happen at topic level:**
- Manager prompts "Teach me X" → Generate full topic (4-6 modules)
- Manager uploads document → Analyze if topic-level or module-level
- Manager provides URL → Scrape and determine scope

**Storage:**
```typescript
// Store in topics table (not tracks)
await db.insert(topics).values({
  subjectId: '...',
  organizationId: session.organizationId, // NULL = canonical (public)
  title: 'Machine Learning',
  contentSource: 'research' | 'upload' | 'url' | 'prompt',
  isProprietary: !!session.organizationId, // true if org-specific
  isCertified: false,
  lastRefreshedAt: new Date(),
  refreshFrequencyMonths: 6,
});
```

### 2. Certification

**Certification MUST be applied at topic OR module level:**
- Topic certification: All modules inherit certified status
- Module certification: Individual modules certified separately
- `certification_level` field tracks who certified ('topic' | 'module')
- Expert signature (Ed25519) attached to certified content

### 3. Freshness Management

**Freshness triggers MUST operate at topic level:**
```typescript
// Only refresh if:
// 1. Topic assigned to ≥1 active learner
// 2. Last refresh > 6 months ago (or manual admin trigger)
// 3. Not manually paused

async function shouldRefreshTopic(topicId: string): Promise<boolean> {
  const topic = await db.select().from(topics).where(eq(topics.id, topicId));
  
  if (!topic.active) return false;
  
  const hasActiveLearners = await db.select()
    .from(topicAssignments)
    .where(and(
      eq(topicAssignments.topicId, topicId),
      eq(topicAssignments.paused, false),
      isNull(topicAssignments.completedAt)
    ))
    .limit(1);
  
  if (hasActiveLearners.length === 0) return false;
  
  const monthsSinceRefresh = dayjs().diff(topic.lastRefreshedAt, 'month');
  return monthsSinceRefresh >= topic.refreshFrequencyMonths;
}
```

### 4. Proprietary Content

**Company-specific content MUST be segregated:**
- `topics.is_proprietary = true` for all org-specific content
- `topics.organization_id` NOT NULL for proprietary content
- Proprietary content NEVER stored in canon (public reuse store)
- Secondary sources (company context) stored separately in `topic_secondary_sources`

**Pattern:**
```typescript
// When storing in canon
function canonizeContent(topicId: string) {
  const topic = await db.select().from(topics).where(eq(topics.id, topicId));
  
  // Only canonize if NOT proprietary
  if (topic.isProprietary) {
    return; // Company-specific content stays private
  }
  
  // Store for reuse across organizations
  canonStore.set(topic.id, { ... });
}
```

### 5. Subject Assignment

**Every topic MUST belong to a subject:**
- Subjects created by admins (e.g., "Computer Science", "Finance", "Soft Skills")
- Auto-detect subject from topic title using LLM
- Allow managers to override subject assignment
- No orphaned topics (all have subject_id)

### 6. Question Structure

**Questions MUST live inside quizzes:**
- Old structure: `items` table directly under `modules`
- New structure: `questions` table under `quizzes` under `modules_v2`
- Quiz groups related questions together
- Default: 1 quiz per module (can expand to multiple quizzes)

### 7. Migration Path

**Legacy data MUST be migrated gracefully:**
- Tracks → Topics (1:1 mapping with same IDs)
- Modules → Modules_v2 (preserve provenance)
- Items → Questions (create default quizzes)
- Preserve all foreign keys in dependent tables
- See `api/drizzle/017_migrate_legacy_content.sql`

**Traceability:**
- BRD: ALL (foundation for content structure)
- FSD: §31 (Content Meta Model & Hierarchy)
- Epic: Epic-Scope-Fix (content hierarchy refactor)

---

## Changelog

### v1.2 (2025-10-13)
- **Added Content Meta Model section** - 5-tier hierarchy, mandatory patterns for generation/certification/freshness
- **Source:** User requirements refinement based on UAT feedback

### v1.1 (2025-10-13)
- **Added Production Operations Patterns (§6)** - 6 new patterns from Epic 7 (idempotency, audit logging, pagination, etc.)
- **Updated RBAC Middleware (§3)** - Added dev/test mode exception with `getSessionOrMock()` pattern
- **Updated Database Conventions** - Added environment differences pattern (staging TEXT vs production UUID)
- **Updated Feature Flag Naming** - Clarified infrastructure toggles vs user-facing features
- **Added Lazy LLM Init Pattern** - From Epic 6 (prevent startup failures if API keys missing)
- **Source:** Epic Reconciliation Process (5 agent reports analyzing Epics 6, 7, Platform v1, 8)

### v1.0 (2025-10-13)
- Initial ADR creation
- Locked all core architectural principles
- Established traceability to BRD/FSD
- Defined mandatory patterns for all future development

---

## Approval Process

**To modify this document:**
1. Create GitHub issue with proposed change
2. Justify with BRD/FSD requirements
3. Get approval from project owner
4. Update version number
5. Document change in changelog

**Status:** LOCKED - No changes without explicit approval

