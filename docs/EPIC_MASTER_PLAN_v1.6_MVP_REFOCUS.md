# Epic Master Plan - Cerply B2B Enterprise MVP (STRATEGIC REFOCUS)
**Version:** 1.6  
**Status:** CRITICAL UPDATE - MVP Scope Refocused  
**Last Updated:** 2025-10-17  
**Owner:** Cerply Engineering

---

## 🎯 **STRATEGIC PIVOT: Core Value Proposition**

### **What Changed**
Pre-seeding a massive content library is **NOT necessary for MVP**. It creates the illusion of progress without proving the core value proposition.

### **Real Value Proposition**
1. **Consultants & Managers** build training modules
2. **Managers** refine content with proprietary information
3. **Managers** assign modules to teams (mandatory/optional)
4. **Teams** learn through adaptive micro-lessons
5. **Managers** track performance over time

### **MVP-Critical Gaps**
- ❌ Manager content creation workflow
- ❌ Manager content refinement & augmentation
- ❌ Team assignment mechanisms (based on team profiles)
- ❌ Mandatory/optional module flags
- ❌ Module delivery to learners

---

## Epic Status Matrix (UPDATED)

| Epic | Priority | Status | Core Value | Estimated Hours |
|------|----------|--------|------------|----------------|
| **0** | P0 | ✅ Complete | Platform foundation | 20h |
| **1** | P0 | ✅ Complete | Enterprise foundation | 8-10h |
| **2** | P0 | ✅ Complete | SSO & RBAC | 8-10h |
| **3** | P0 | ✅ Complete | Team management | 12-14h |
| **4** | P1 | ✅ Complete | Manager analytics | 14-16h |
| **5** | P1 | ✅ Complete | Slack integration | 12h |
| **6** | P1 | 🚧 In Progress | Content generation (verify only) | 16h |
| **6.6** | P3 | ⏸️ **Paused** | Content library seeding (NOT MVP) | 12h (deferred) |
| **7** | P1 | ✅ Complete | Gamification | 18h |
| **8** | P1 | ✅ Complete | Conversational UI | 13.5h |
| **9** | P1 | ✅ Complete | Adaptive difficulty | 13h |
| **13** | P0 | 📋 **Critical** | Agent orchestrator | 24-28h |
| **14** | P0 | 📋 **Critical** | Manager module workflows | 20-24h |
| **15** | P0 | 📋 **Critical** | Learning module delivery | 16-20h |
| **10** | P2 | 📋 Post-MVP | Enhanced certification | 10h |
| **11** | P2 | 📋 Post-MVP | Self-serve ingestion | 16h |
| **12** | P2 | 📋 Post-MVP | Enterprise analytics | 20h |

**Legend:**
- ✅ Complete: Deployed
- 🚧 In Progress: Active development
- 📋 Critical: MVP-blocking, urgent priority
- ⏸️ Paused: Deprioritized, verify-only
- 📋 Post-MVP: Deferred

---

## NEW MVP ROADMAP (LOCKED)

### **Phase 5: MVP-Critical Manager & Learner Workflows** 🚨

**Goal:** Prove core value proposition - Manager → Team → Learn → Track

#### **Stream 1: Complete Content Generation Infrastructure**
1. ✅ **Epic 6:** Verify ensemble content generation works (Python test running)
   - **Outcome:** Confirm GPT-5 → Claude → GPT-4o pipeline produces quality content
   - **NOT building:** 400-topic library (unnecessary distraction)
   - **Status:** Testing now

#### **Stream 2: Agent Orchestrator** (PARALLEL)
2. 📋 **Epic 13:** Agent Orchestrator Architecture
   - **Why Critical:** Powers intelligent conversational refinement
   - **Deliverables:**
     - Tool-calling agent with full conversation context
     - Existing workflows converted to tools
     - Natural language routing
   - **Status:** Ready to start
   - **Effort:** 24-28h

#### **Stream 3: Manager Module Workflows** (NEW - CRITICAL)
3. 📋 **Epic 14:** Manager Module Creation & Management
   - **Why Critical:** Core value proposition
   - **Deliverables:**
     - `/curator/create` - Generate module from topic
     - `/curator/modules` - List & manage modules
     - `/curator/modules/:id/edit` - Refine content
     - `/curator/modules/:id/augment` - Add proprietary information
     - `/curator/modules/:id/assign` - Assign to teams
     - Module metadata: mandatory/optional, target roles, prerequisites
     - Team selection based on profiles (manager's team members)
   - **Status:** NEW - Urgent
   - **Effort:** 20-24h

#### **Stream 4: Learning Module Delivery** (NEW - CRITICAL)
4. 📋 **Epic 15:** Adaptive Learning Module Delivery
   - **Why Critical:** Learner experience & engagement
   - **Deliverables:**
     - `/learn/modules` - View assigned modules
     - `/learn/modules/:id/start` - Begin learning
     - `/learn/modules/:id/question` - Adaptive question delivery
     - Spaced repetition scheduling
     - Progress tracking
     - Completion certification
   - **Status:** NEW - Urgent
   - **Effort:** 16-20h

---

## NEW Epic 14: Manager Module Workflows

### **Scope**

#### **1. Module Creation (from Content Generation)**
- Manager generates topic via conversational UI
- System creates module from generated content
- Manager reviews & accepts

#### **2. Content Refinement**
- Manager edits module content
- Manager adds/removes questions
- Manager adjusts difficulty levels
- Manager adds guidance text

#### **3. Proprietary Content Augmentation**
- Manager uploads company-specific documents
- Manager adds internal case studies
- Manager adds company policies/procedures
- System integrates proprietary content with research content

#### **4. Team Assignment**
- Manager selects team members from their teams
- Assignment based on:
  - Team membership (from team profiles)
  - Role/title filters
  - Individual selection
- Module metadata:
  - Mandatory vs optional
  - Due date (for mandatory)
  - Prerequisites (other modules)
  - Target roles

#### **5. Module Tracking**
- Manager views team progress
- Manager identifies struggling learners
- Manager adjusts content based on performance

### **Database Schema**

```typescript
// modules table
export const modules = pgTable('modules', {
  id: uuid('id').primaryKey(),
  topicId: uuid('topic_id').references(() => topics.id),
  createdBy: text('created_by').references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status'), // 'draft' | 'active' | 'archived'
  isMandatory: boolean('is_mandatory').default(false),
  targetRoles: jsonb('target_roles'), // ['manager', 'engineer', etc.]
  prerequisites: jsonb('prerequisites'), // [moduleId1, moduleId2]
  estimatedMinutes: integer('estimated_minutes'),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

// module_assignments table
export const moduleAssignments = pgTable('module_assignments', {
  id: uuid('id').primaryKey(),
  moduleId: uuid('module_id').references(() => modules.id),
  userId: text('user_id').references(() => users.id),
  assignedBy: text('assigned_by').references(() => users.id),
  assignedAt: timestamp('assigned_at'),
  dueDate: timestamp('due_date'),
  status: text('status'), // 'assigned' | 'in_progress' | 'completed'
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
});

// module_proprietary_content table
export const moduleProprietaryContent = pgTable('module_proprietary_content', {
  id: uuid('id').primaryKey(),
  moduleId: uuid('module_id').references(() => modules.id),
  contentType: text('content_type'), // 'document' | 'case_study' | 'policy'
  title: text('title'),
  content: text('content'),
  sourceUrl: text('source_url'),
  uploadedBy: text('uploaded_by').references(() => users.id),
  createdAt: timestamp('created_at'),
});
```

### **API Routes**

```typescript
// Module creation
POST /api/curator/modules/create
  Body: { topicId, title, description, isMandatory, targetRoles }
  Returns: { moduleId, status }

// List modules
GET /api/curator/modules
  Returns: { modules: [...] }

// Edit module content
PUT /api/curator/modules/:id/content
  Body: { sections, questions, guidance }

// Add proprietary content
POST /api/curator/modules/:id/proprietary
  Body: { contentType, title, content, sourceUrl }

// Assign to team
POST /api/curator/modules/:id/assign
  Body: { 
    userIds: [...],
    teamIds: [...], // assign to all team members
    roleFilters: [...], // assign to users with these roles
    isMandatory,
    dueDate,
    prerequisites
  }

// View module progress
GET /api/curator/modules/:id/progress
  Returns: { 
    assigned: 50,
    inProgress: 20,
    completed: 15,
    struggling: 5,
    details: [...]
  }
```

### **UI Components**

```
/curator/modules/new
  └─ Generate module from topic (conversational)
  └─ Select existing topic
  └─ Import from file

/curator/modules
  └─ List all modules (draft, active, archived)
  └─ Filter by status, team, topic
  └─ Quick actions (edit, assign, archive)

/curator/modules/:id/edit
  └─ Module metadata (title, description, mandatory)
  └─ Content sections (edit, reorder, delete)
  └─ Questions (add, edit, adjust difficulty)
  └─ Guidance text (edit, add context)
  └─ Proprietary content (upload, integrate)

/curator/modules/:id/assign
  └─ Team selection (all teams managed by user)
  └─ Member selection (individual or role-based)
  └─ Assignment settings (mandatory, due date, prerequisites)
  └─ Preview (who will receive, estimated time)

/curator/modules/:id/analytics
  └─ Progress overview (assigned, in-progress, completed)
  └─ Performance metrics (avg score, completion rate, time)
  └─ Struggling learners (identify, reach out)
  └─ Content quality (question difficulty, drop-off points)
```

---

## NEW Epic 15: Learning Module Delivery

### **Scope**

#### **1. Module Discovery**
- Learner views assigned modules
- Modules organized by:
  - Mandatory (with due dates)
  - Recommended
  - Optional
- Progress indicators

#### **2. Adaptive Learning**
- Start module → Adaptive question delivery
- Spaced repetition scheduling
- Difficulty adjustment based on performance
- Contextual guidance on wrong answers
- Real-time progress tracking

#### **3. Module Completion**
- Completion criteria (all questions, mastery threshold)
- Certification generation
- Badge/points award
- Manager notification

### **API Routes**

```typescript
// List assigned modules
GET /api/learn/modules
  Returns: { 
    mandatory: [...],
    recommended: [...],
    optional: [...],
    completed: [...]
  }

// Get module details
GET /api/learn/modules/:id
  Returns: { 
    title, description, estimatedMinutes,
    progress: { questionsCompleted, totalQuestions, masteryScore },
    status: 'not_started' | 'in_progress' | 'completed'
  }

// Start/resume module
POST /api/learn/modules/:id/start
  Returns: { sessionId, nextQuestion }

// Answer question (adaptive difficulty)
POST /api/learn/modules/:id/answer
  Body: { questionId, answer, timeSpent }
  Returns: { 
    correct, explanation, nextQuestion,
    progress, adaptiveAdjustment
  }

// Complete module
POST /api/learn/modules/:id/complete
  Returns: { 
    certificateId, badgeAwarded, pointsEarned,
    masteryScore, completionTime
  }
```

### **UI Components**

```
/learn
  └─ My modules (mandatory, recommended, optional)
  └─ Progress overview
  └─ Upcoming due dates
  └─ Continue where you left off

/learn/modules/:id
  └─ Module overview (description, progress, estimated time)
  └─ Start button (or continue button)
  └─ Prerequisites (if any)
  └─ Proprietary content (company-specific context)

/learn/modules/:id/session
  └─ Adaptive question delivery
  └─ Progress indicator
  └─ Guidance on wrong answers
  └─ Skip/save for later
  └─ Real-time feedback

/learn/modules/:id/complete
  └─ Completion summary (score, time, mastery)
  └─ Certificate download
  └─ Badge/points awarded
  └─ Related modules (recommendations)
```

---

## UPDATED Implementation Order

### **Phase 5: MVP-Critical (URGENT - 60-72h total)**

#### **Week 1: Core Infrastructure**
1. ✅ Verify content generation (Python test - RUNNING NOW)
2. 📋 **Epic 13:** Agent Orchestrator (24-28h) - **START IMMEDIATELY**

#### **Week 2: Manager Workflows**
3. 📋 **Epic 14:** Manager Module Workflows (20-24h)
   - Module creation from topics
   - Content refinement & augmentation
   - Team assignment mechanics
   - Progress tracking

#### **Week 3: Learner Experience**
4. 📋 **Epic 15:** Learning Module Delivery (16-20h)
   - Module discovery & progress
   - Adaptive question delivery
   - Completion & certification

---

## What's NOT in MVP

### **Deferred to Post-MVP:**
- ❌ Epic 6.6: Content Library Seeding (400 topics) - **NOT NECESSARY**
  - Reason: Managers create content on-demand
  - Fallback: Start with 5-10 seed topics if needed
- ❌ Epic 10: Enhanced Certification Workflow
- ❌ Epic 11: Self-Serve Ingestion
- ❌ Epic 12: Advanced Enterprise Analytics

### **Why These Don't Matter for MVP:**
- Content library: Managers generate what they need
- Self-serve: Consultants can handle initial setup
- Advanced analytics: Basic tracking in Epic 14 is sufficient

---

## MVP Success Criteria (UPDATED)

### **Manager Workflow:**
1. ✅ Manager generates module from conversational topic request
2. ✅ Manager refines content (edit, add proprietary info)
3. ✅ Manager assigns to team members (mandatory/optional, due dates)
4. ✅ Manager tracks team progress and performance

### **Learner Workflow:**
1. ✅ Learner views assigned modules (mandatory vs optional)
2. ✅ Learner completes adaptive micro-lessons
3. ✅ Learner receives certification on completion
4. ✅ System adapts difficulty based on performance

### **System Quality:**
1. ✅ Content generation produces high-quality, cited content
2. ✅ Adaptive engine adjusts difficulty appropriately
3. ✅ Conversational UI feels natural and intelligent
4. ✅ Manager analytics show actionable insights

---

## Dependency Graph (UPDATED)

```
CRITICAL PATH (MVP-BLOCKING):

Epic 6 (Content Generation - VERIFY)
  └─ Outcome: Confirm quality content can be generated
      └─ Epic 14 (Manager Module Workflows)
          ├─ Create modules from generated topics
          ├─ Refine & augment content
          ├─ Assign to teams
          └─ Track progress
              └─ Epic 15 (Learning Module Delivery)
                  ├─ View assigned modules
                  ├─ Adaptive learning experience
                  └─ Completion & certification

Epic 13 (Agent Orchestrator) [PARALLEL]
  └─ Powers intelligent conversational refinement
      └─ Used by: Epic 14 (module creation), Epic 15 (learning guidance)
```

---

## Next Steps (IMMEDIATE)

1. ✅ **Verify content generation works** (Python test running - ~10-15 min)
2. 📋 **START Epic 13:** Agent Orchestrator (24-28h)
3. 📋 **START Epic 14:** Manager Module Workflows (20-24h)
4. 📋 **START Epic 15:** Learning Module Delivery (16-20h)

**Total MVP completion: 60-72 hours of focused work**

---

## Changelog

### v1.6 (2025-10-17) - STRATEGIC REFOCUS
- **CRITICAL:** Deprioritized Epic 6.6 (Content Library Seeding) to post-MVP
- **ADDED:** Epic 14 (Manager Module Workflows) - P0 Critical
- **ADDED:** Epic 15 (Learning Module Delivery) - P0 Critical
- **REFOCUSED:** MVP scope on manager → team → learn → track workflow
- **RATIONALE:** Pre-seeding content library doesn't prove core value proposition
- **OUTCOME:** Clear 60-72h path to MVP with all critical workflows

### v1.5 (2025-10-16)
- Added Epic 13 (Agent Orchestrator)
- Added Epic 6.6 (Content Library Seeding) - NOW DEPRIORITIZED

### v1.4 (2025-10-15)
- Marked Epic 9 complete
- Moved Epic 10 to Post-MVP

### v1.3 (2025-10-14)
- Marked Epic 8 complete

