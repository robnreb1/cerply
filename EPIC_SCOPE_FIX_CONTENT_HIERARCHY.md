# Epic-Scope-Fix: Content Hierarchy Refactor
**Date:** 2025-10-13  
**Status:** P0-P2 Prioritized  
**Affected Epics:** 5 (Slack), 6 (Ensemble), 7 (Gamification)

---

## Overview

This document specifies retroactive changes to Epics 5, 6, and 7 to align with the new 5-tier content hierarchy (Subject > Topic > Module > Quiz > Question). The old Track > Module > Item structure is being replaced.

**Migration Files:**
- `api/drizzle/016_content_hierarchy.sql` - New schema
- `api/drizzle/017_migrate_legacy_content.sql` - Data migration
- `api/src/db/schema.ts` - TypeScript schema updates

---

## Architectural Change Summary

### Old Model
```
Tracks (top level)
  └─ Plans
      └─ Modules
          └─ Items (questions)
```

###New Model
```
Subjects (e.g., Computer Science)
  └─ Topics (e.g., Machine Learning) ← Content collection level
      └─ Modules (e.g., LLM Architecture) ← Content provision level
          └─ Quizzes (e.g., Quiz 1, Quiz 2)
              └─ Questions (e.g., "What does LLM stand for?")
                  └─ Guidance (explanation text within question)
```

**Key Changes:**
- **Tracks → Topics:** Tracks are now called topics and live under subjects
- **Items → Questions:** Questions now live inside quizzes (which live inside modules)
- **team_track_subscriptions → topic_assignments:** More flexible assignment model
- **Guidance:** Moved from separate explainer items to guidance_text field on questions

---

## Priority Levels

### P0 (Blocking Epic 8/9) - MUST DO BEFORE CONTINUING
These changes are **required** before Epic 8 Phase 2-9 or Epic 9 can proceed.

- Database migration (016, 017)
- Update foreign keys in `learner_levels` and `certificates`
- Basic API routes for topics/subjects

**Estimated Effort:** 4-6 hours  
**Owner:** Infrastructure/Database team

### P1 (Before Production) - MUST DO BEFORE MVP LAUNCH
These changes are **required** before production deployment.

- Update Epic 6 generation to topic-level scope
- Update Epic 7 gamification APIs
- Update Epic 5 Slack templates

**Estimated Effort:** 8-10 hours  
**Owner:** Feature teams

### P2 (Polish) - NICE TO HAVE
These changes improve UX but are not blocking.

- Migration UI for existing users
- Admin tools for subject/topic management
- Analytics dashboard updates

**Estimated Effort:** 6-8 hours  
**Owner:** Product/UX team

---

## Epic 5: Slack Channel Integration

### Current State
Slack messages reference "tracks" and "track titles" when delivering lessons.

**Example (current):**
```
🎯 Time to learn!
Track: Fire Safety Basics
Module: Emergency Exits
```

### Required Changes (P1)

#### 5.1 Update Slack Message Templates

**File:** `api/src/services/slack-delivery.ts` (or similar)

**Change:**
```typescript
// OLD
const message = `🎯 Time to learn!\nTrack: ${track.title}\nModule: ${module.title}`;

// NEW
const message = `🎯 Time to learn!\n${topic.title} (${subject.title})\nModule: ${module.title}`;
```

**Example (new):**
```
🎯 Time to learn!
Machine Learning (Computer Science)
Module: LLM Architecture
```

#### 5.2 Update Database Queries

**Files:**
- `api/src/services/slack-delivery.ts`
- `api/src/routes/slack-webhook.ts`

**Changes:**
- Replace `tracks` table references with `topics`
- Replace `track_id` with `topic_id` in user preferences
- Update `channels` table if it stores track references

**Query Updates:**
```typescript
// OLD
const track = await db.select().from(tracks).where(eq(tracks.id, trackId));

// NEW
const topic = await db.select().from(topics).where(eq(topics.id, topicId));
const subject = await db.select().from(subjects).where(eq(subjects.id, topic.subjectId));
```

#### 5.3 Update Slack Block Kit UI

**File:** `api/src/services/slack-blocks.ts`

**Changes:**
- Update context blocks to show "Subject > Topic > Module" breadcrumb
- Update button actions to reference topic_id instead of track_id

**Example:**
```typescript
{
  type: "context",
  elements: [
    {
      type: "mrkdwn",
      text: `${subject.icon} ${subject.title} › ${topic.title}`
    }
  ]
}
```

### Acceptance Criteria (P1)
- [ ] Slack messages display "Topic (Subject)" instead of "Track"
- [ ] All database queries use `topics` table
- [ ] User preferences store `topic_id`
- [ ] Slack webhooks handle topic-based delivery
- [ ] Block Kit UI shows subject/topic breadcrumb

---

## Epic 6: Ensemble Content Generation

### Current State
Content generation creates individual modules without a clear hierarchy. Manager uploads a document and gets back modules.

### Required Changes (P1)

#### 6.1 Change Generation Scope to Topic Level

**File:** `api/src/services/llm-orchestrator.ts`

**Changes:**
- When manager prompts "Teach me X", generate **full topic** (4-6 modules)
- When manager uploads doc, analyze if it's topic-level or module-level
- Store result in `topics` table (not tracks)

**Implementation:**
```typescript
// Understanding phase: Detect scope
async function detectContentScope(input: string | File): Promise<'topic' | 'module'> {
  // Use LLM to determine: Is this a broad topic or a specific module?
  // Topic: "Machine Learning", "Fire Safety" (generates 4-6 modules)
  // Module: "LLM Architecture Basics" (generates 1 module)
  
  const prompt = `Analyze this input and determine if it's a broad TOPIC (needs 4-6 modules) or a specific MODULE (stands alone):
  Input: ${input}
  
  Respond with JSON: {scope: "topic" | "module", reasoning: "..."}`;
  
  // ... LLM call
}
```

#### 6.2 Store Topic Metadata

**File:** `api/src/routes/content.ts`

**Changes:**
- Create entry in `topics` table (not tracks)
- Assign to subject (detect automatically or ask manager)
- Store content source ('research' | 'upload' | 'url' | 'prompt')
- Mark proprietary if org-specific

**Implementation:**
```typescript
// After understanding phase
const topic = await db.insert(topics).values({
  subjectId: detectedSubjectId || await promptManagerForSubject(),
  organizationId: session.organizationId, // NULL for canonical
  title: understanding.topicTitle,
  description: understanding.topicDescription,
  contentSource: isUpload ? 'upload' : (isUrl ? 'url' : 'prompt'),
  isProprietary: !!session.organizationId,
  isCertified: false, // Not certified yet
}).returning();

// Then generate 4-6 modules under this topic
for (const moduleSpec of understanding.modules) {
  await db.insert(modulesV2).values({
    topicId: topic.id,
    title: moduleSpec.title,
    orderIndex: moduleSpec.order,
    provenance: {
      generator_a: moduleSpec.generatorAContribution,
      generator_b: moduleSpec.generatorBContribution,
      fact_checker: moduleSpec.factCheckerNotes,
    },
  });
}
```

#### 6.3 Update Manager Review UI

**File:** `web/app/content/review/[id]/page.tsx`

**Changes:**
- Show subject/topic hierarchy
- Allow manager to reassign topic to different subject
- Show certification readiness indicator

**UI Structure:**
```tsx
<ReviewHeader>
  <Breadcrumb>
    {subject.icon} {subject.title} › {topic.title}
  </Breadcrumb>
  <CertificationBadge ready={topic.isCertificationReady} />
</ReviewHeader>

<ModulesList>
  {modules.map(module => (
    <ModuleCard>
      <h3>{module.title}</h3>
      <ProvenanceIndicator provenance={module.provenance} />
      <button onClick={() => regenerateModule(module.id)}>Regenerate</button>
    </ModuleCard>
  ))}
</ModulesList>
```

#### 6.4 Update Canon Storage

**File:** `api/src/lib/canon.ts`

**Changes:**
- Store canonical content at **topic level** (not module level)
- Key by topic title + subject (not track ref)
- Check `topics.is_proprietary` before reusing

**Implementation:**
```typescript
// When storing in canon
function canonizeContent(topicId: string, modules: Module[]) {
  const topic = await db.select().from(topics).where(eq(topics.id, topicId));
  
  // Only canonize if NOT proprietary
  if (topic.isProprietary) {
    return; // Company-specific content stays private
  }
  
  // Store with topic-level key
  const canonKey = `${topic.subjectId}:${sanitize(topic.title)}`;
  canonStore.set(canonKey, {
    topicId: topic.id,
    modules: modules,
    generatedAt: new Date(),
    qualityScore: calculateQualityScore(modules),
  });
}
```

### Acceptance Criteria (P1)
- [ ] "Teach me X" generates full topic (4-6 modules)
- [ ] Content stored in `topics` table
- [ ] Subject assigned (automatically or manually)
- [ ] Proprietary content flagged correctly
- [ ] Canon storage respects proprietary flag
- [ ] Manager UI shows subject/topic hierarchy

---

## Epic 7: Gamification & Certification System

### Current State
Levels and certificates are tied to "tracks". `learner_levels` and `certificates` tables have `track_id` foreign keys.

### Required Changes (P0 + P1)

#### 7.1 Update Database Foreign Keys (P0 - BLOCKING)

**Migration:** Already handled in `017_migrate_legacy_content.sql`

**Changes:**
```sql
-- P0: These renames MUST happen before Epic 8/9
ALTER TABLE learner_levels RENAME COLUMN track_id TO topic_id;
ALTER TABLE certificates RENAME COLUMN track_id TO topic_id;
ALTER TABLE team_analytics_snapshots RENAME COLUMN track_id TO topic_id;
ALTER TABLE learner_analytics_snapshots RENAME COLUMN track_id TO topic_id;
ALTER TABLE retention_curves RENAME COLUMN track_id TO topic_id;
```

**Verification:**
```bash
# After migration, verify foreign keys
psql -d cerply -c "
SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'topic_id';
"
```

#### 7.2 Update Gamification APIs (P1)

**Files:**
- `api/src/services/gamification.ts`
- `api/src/routes/gamification.ts`

**Changes:**
```typescript
// OLD
export async function getLearnerLevel(userId: string, trackId: string) {
  return db.select().from(learnerLevels)
    .where(and(eq(learnerLevels.userId, userId), eq(learnerLevels.trackId, trackId)));
}

// NEW
export async function getLearnerLevel(userId: string, topicId: string) {
  return db.select().from(learnerLevels)
    .where(and(eq(learnerLevels.userId, userId), eq(learnerLevels.topicId, topicId)));
}
```

**API Routes:**
```typescript
// Update all route handlers
app.get('/api/gamification/levels/:topicId', async (req, reply) => {
  const { topicId } = req.params; // Changed from trackId
  const session = getSession(req);
  
  const level = await getLearnerLevel(session.userId, topicId);
  return reply.send({ level });
});
```

#### 7.3 Update Certificate Generation (P1)

**File:** `api/src/services/certificates.ts`

**Changes:**
```typescript
// OLD
export async function generateCertificate(userId: string, trackId: string) {
  const track = await db.select().from(tracks).where(eq(tracks.id, trackId));
  // ... generate PDF with track.title
}

// NEW
export async function generateCertificate(userId: string, topicId: string) {
  const topic = await db.select().from(topics).where(eq(topics.id, topicId));
  const subject = await db.select().from(subjects).where(eq(subjects.id, topic.subjectId));
  
  // Generate PDF with topic.title and subject.title
  const certificateText = `
    Certificate of Completion
    
    ${topic.title}
    ${subject.title}
    
    Issued to: ${user.name}
    Date: ${new Date().toLocaleDateString()}
  `;
  
  // ... rest of PDF generation
}
```

#### 7.4 Update Manager Notifications (P1)

**File:** `api/src/services/notifications.ts`

**Changes:**
```typescript
// OLD
const notificationText = `${learner.name} completed ${track.title}`;

// NEW
const notificationText = `${learner.name} completed ${topic.title} (${subject.title})`;
```

#### 7.5 Update Web UI (P1)

**Files:**
- `web/app/gamification/progress/page.tsx`
- `web/components/LevelProgress.tsx`
- `web/components/CertificateCard.tsx`

**Changes:**
```tsx
// OLD
<div>Track: {level.trackTitle}</div>

// NEW
<div>
  <span className="text-gray-500">{subject.title}</span>
  <span className="mx-2">›</span>
  <span className="font-semibold">{topic.title}</span>
</div>
```

### Acceptance Criteria (P0)
- [ ] Database foreign keys renamed (topic_id)
- [ ] All tables reference topics (not tracks)
- [ ] No broken foreign key constraints

### Acceptance Criteria (P1)
- [ ] Gamification APIs use topicId parameter
- [ ] Certificates show "Topic (Subject)" format
- [ ] Manager notifications reference topics
- [ ] Web UI displays subject/topic hierarchy
- [ ] Level progression works with topics

---

## Implementation Sequence

### Week 1: P0 Changes (Blocking)
**Day 1-2:**
1. ✅ Create migration files (016, 017)
2. ✅ Update schema.ts with new tables
3. Run migrations on staging
4. Verify foreign key constraints

**Day 3:**
5. Test Epic 7 APIs with topic_id
6. Test Epic 8 Phase 1 with new schema

**Acceptance:** Epic 8/9 can proceed

### Week 2: P1 Changes (Pre-Production)
**Day 1-2:**
1. Update Epic 6 to topic-level generation
2. Update Epic 6 canon storage logic
3. Update Epic 7 gamification APIs
4. Update Epic 7 certificate generation

**Day 3-4:**
5. Update Epic 5 Slack templates
6. Update Web UI for all three epics
7. End-to-end testing

**Day 5:**
8. Deploy to staging
9. UAT with real users
10. Fix bugs

**Acceptance:** Ready for production

### Week 3: P2 Changes (Polish)
1. Build migration UI
2. Build admin subject/topic management
3. Update analytics dashboards
4. Documentation updates

---

## Testing Strategy

### Unit Tests
- [ ] Test topic creation API
- [ ] Test subject assignment logic
- [ ] Test canon storage with proprietary flag
- [ ] Test level progression with topics
- [ ] Test certificate generation with new format

### Integration Tests
- [ ] Test full content generation flow (upload → topic → modules → quizzes)
- [ ] Test gamification flow (questions → level up → certificate)
- [ ] Test Slack delivery with new message format

### E2E Tests
- [ ] Manager uploads doc → reviews modules → assigns to team
- [ ] Learner completes topic → levels up → receives certificate
- [ ] Slack delivers lesson → learner responds → progress tracked

### Migration Tests (CRITICAL)
- [ ] Run migration on copy of production DB
- [ ] Verify all foreign keys intact
- [ ] Verify data integrity (no orphaned records)
- [ ] Verify rollback works
- [ ] Test with 1000+ tracks/modules/items

---

## Rollback Plan

### If P0 Migration Fails
1. Run rollback section from `017_migrate_legacy_content.sql`
2. Rename tables back (_legacy → original names)
3. Drop new tables (CASCADE)
4. Restore from backup if needed

### If P1 Changes Break Production
1. Revert code changes (git revert)
2. Keep database schema (migrations are safe)
3. Fix bugs and redeploy

---

## Communication Plan

### Internal Team
- [ ] Tech lead reviews migration plan
- [ ] DevOps reviews infrastructure impact
- [ ] QA reviews test strategy
- [ ] Product reviews UX changes

### External (Customers)
- [ ] Changelog: "Improved content organization (no action required)"
- [ ] Support docs: "Content now organized by subjects and topics"
- [ ] No breaking changes to public APIs

---

## Success Metrics

### Technical
- ✅ Zero foreign key constraint violations
- ✅ Zero data loss during migration
- ✅ <10ms query performance impact
- ✅ All tests passing

### User Experience
- ✅ Slack messages more readable (subject/topic context)
- ✅ Content library easier to browse (subject hierarchy)
- ✅ Certificates more professional (subject + topic)

---

## Dependencies

**Blocks:**
- Epic 8 Phase 2-9 (needs P0)
- Epic 9 (needs P0)
- Epic 6.8 Manager Curation Workflow (needs P1)

**Blocked By:**
- None (can start immediately)

---

## Estimated Total Effort

| Priority | Changes | Effort |
|----------|---------|--------|
| P0 | Database migration + verification | 4-6h |
| P1 | Epic 5/6/7 code changes | 8-10h |
| P2 | Polish + admin tools | 6-8h |
| **Total** | | **18-24h** |

---

## Sign-Off

- [ ] Tech Lead Approved
- [ ] Product Owner Approved
- [ ] QA Sign-Off (after staging tests)
- [ ] DevOps Ready for Production

---

**Status:** Ready for Implementation  
**Next Step:** Run P0 migrations on staging  
**Owner:** Assign to infrastructure team

---

**End of Epic-Scope-Fix Document**

