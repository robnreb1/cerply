# Epic 14: Manager Module Workflows - Implementation Prompt

**Version:** 1.0  
**Epic Priority:** P0 (MVP-CRITICAL)  
**Estimated Effort:** 20-24 hours  
**Dependencies:** Epic 6 (content generation verified), Epic 13 (agent orchestrator)  
**Status:** Ready to implement

---

## Context & Rationale

### **Problem Statement**
The core value proposition of Cerply is:
1. **Managers create** training modules (with consultant help)
2. **Managers refine** content with proprietary information
3. **Managers assign** modules to their teams
4. **Managers track** performance over time

Currently, we have content generation and learner workflows, but **no manager workflows**. This is the critical missing piece for MVP.

### **Why This is Critical**
- Without manager workflows, there's no way to create/assign modules
- Managers need to augment research content with company-specific information
- Team assignment must be based on team profiles and manager relationships
- Progress tracking is essential for demonstrating ROI

---

## Scope

### **In Scope**
1. Module creation from generated topics
2. Content refinement (edit sections, questions, guidance)
3. Proprietary content augmentation (upload documents, add case studies)
4. Team assignment (based on team membership, roles, mandatory/optional)
5. Progress tracking dashboard

###

 **Out of Scope (Post-MVP)**
- Bulk module operations
- Advanced content versioning
- Module templates library
- Collaborative editing
- Module marketplace

---

## Deliverables

### **1. Database Schema**

#### **New Tables:**

```sql
-- migration: 024_manager_module_workflows.sql

-- Modules: Manager-created learning modules
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'active' | 'archived'
  is_mandatory BOOLEAN DEFAULT false,
  target_roles JSONB, -- ['manager', 'engineer', 'analyst']
  prerequisites JSONB, -- [moduleId1, moduleId2]
  estimated_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_modules_created_by ON modules(created_by);
CREATE INDEX idx_modules_status ON modules(status);
CREATE INDEX idx_modules_topic ON modules(topic_id);

-- Module Assignments: Which users have which modules
CREATE TABLE IF NOT EXISTS module_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'assigned', -- 'assigned' | 'in_progress' | 'completed'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  mastery_score NUMERIC(3, 2), -- 0.00 to 1.00
  time_spent_seconds INTEGER DEFAULT 0,
  UNIQUE(module_id, user_id)
);

CREATE INDEX idx_module_assignments_user ON module_assignments(user_id);
CREATE INDEX idx_module_assignments_module ON module_assignments(module_id);
CREATE INDEX idx_module_assignments_status ON module_assignments(status);

-- Module Proprietary Content: Company-specific augmentations
CREATE TABLE IF NOT EXISTS module_proprietary_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, -- 'document' | 'case_study' | 'policy' | 'video'
  title TEXT NOT NULL,
  content TEXT,
  source_url TEXT,
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_module_proprietary_content_module ON module_proprietary_content(module_id);

-- Module Content Edits: Track manager refinements
CREATE TABLE IF NOT EXISTS module_content_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  edited_by TEXT NOT NULL REFERENCES users(id),
  edit_type TEXT NOT NULL, -- 'section_edit' | 'question_add' | 'question_edit' | 'guidance_edit'
  section_id UUID, -- References content_corpus or questions
  before_content JSONB,
  after_content JSONB,
  edit_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_module_content_edits_module ON module_content_edits(module_id);
```

---

### **2. API Routes**

#### **Module Creation:**

```typescript
// POST /api/curator/modules/create
// Create a new module from a topic
app.post('/api/curator/modules/create', requireManager, async (req, reply) => {
  const { topicId, title, description, isMandatory, targetRoles, estimatedMinutes } = req.body;
  const userId = req.user.id;

  // Verify topic exists
  const topic = await db.select().from(topics).where(eq(topics.id, topicId)).limit(1);
  if (!topic.length) {
    return reply.status(404).send({ error: { code: 'TOPIC_NOT_FOUND' } });
  }

  // Create module
  const module = await db.insert(modules).values({
    topicId,
    createdBy: userId,
    title,
    description,
    status: 'draft',
    isMandatory,
    targetRoles,
    estimatedMinutes,
  }).returning();

  return reply.send({
    moduleId: module[0].id,
    status: 'draft',
    message: 'Module created successfully',
  });
});

// GET /api/curator/modules
// List all modules created by or accessible to manager
app.get('/api/curator/modules', requireManager, async (req, reply) => {
  const userId = req.user.id;
  const { status, teamId } = req.query;

  // Get modules created by this manager
  let query = db.select({
    module: modules,
    topic: topics,
    assignmentCount: sql<number>`COUNT(DISTINCT ${moduleAssignments.userId})`,
    completionCount: sql<number>`COUNT(DISTINCT CASE WHEN ${moduleAssignments.status} = 'completed' THEN ${moduleAssignments.userId} END)`,
  })
    .from(modules)
    .leftJoin(topics, eq(modules.topicId, topics.id))
    .leftJoin(moduleAssignments, eq(modules.id, moduleAssignments.moduleId))
    .where(eq(modules.createdBy, userId))
    .groupBy(modules.id, topics.id);

  if (status) {
    query = query.where(eq(modules.status, status));
  }

  const results = await query;

  return reply.send({ modules: results });
});

// GET /api/curator/modules/:id
// Get module details
app.get('/api/curator/modules/:id', requireManager, async (req, reply) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Verify manager owns this module
  const module = await db.select()
    .from(modules)
    .where(and(eq(modules.id, id), eq(modules.createdBy, userId)))
    .limit(1);

  if (!module.length) {
    return reply.status(404).send({ error: { code: 'MODULE_NOT_FOUND' } });
  }

  // Get topic content
  const content = await db.select()
    .from(contentCorpus)
    .where(eq(contentCorpus.topicId, module[0].topicId));

  // Get questions
  const moduleQuestions = await db.select()
    .from(questions)
    .where(eq(questions.moduleId, id));

  // Get proprietary content
  const proprietaryContent = await db.select()
    .from(moduleProprietaryContent)
    .where(eq(moduleProprietaryContent.moduleId, id));

  return reply.send({
    module: module[0],
    content,
    questions: moduleQuestions,
    proprietaryContent,
  });
});
```

#### **Content Refinement:**

```typescript
// PUT /api/curator/modules/:id/content
// Edit module content (sections, questions, guidance)
app.put('/api/curator/modules/:id/content', requireManager, async (req, reply) => {
  const { id } = req.params;
  const { sections, questions, guidance } = req.body;
  const userId = req.user.id;

  // Verify ownership
  const module = await db.select()
    .from(modules)
    .where(and(eq(modules.id, id), eq(modules.createdBy, userId)))
    .limit(1);

  if (!module.length) {
    return reply.status(403).send({ error: { code: 'FORBIDDEN' } });
  }

  // Update sections (if edited)
  if (sections) {
    for (const section of sections) {
      if (section.id) {
        // Existing section - track edit
        const before = await db.select()
          .from(contentCorpus)
          .where(eq(contentCorpus.id, section.id))
          .limit(1);

        await db.update(contentCorpus)
          .set({ content: section.content, updatedAt: new Date() })
          .where(eq(contentCorpus.id, section.id));

        // Log edit
        await db.insert(moduleContentEdits).values({
          moduleId: id,
          editedBy: userId,
          editType: 'section_edit',
          sectionId: section.id,
          beforeContent: before[0],
          afterContent: section,
        });
      }
    }
  }

  // Update questions (similar pattern)
  // Update guidance (similar pattern)

  await db.update(modules)
    .set({ updatedAt: new Date() })
    .where(eq(modules.id, id));

  return reply.send({ success: true });
});

// POST /api/curator/modules/:id/proprietary
// Add proprietary content to module
app.post('/api/curator/modules/:id/proprietary', requireManager, async (req, reply) => {
  const { id } = req.params;
  const { contentType, title, content, sourceUrl } = req.body;
  const userId = req.user.id;

  // Verify ownership
  const module = await db.select()
    .from(modules)
    .where(and(eq(modules.id, id), eq(modules.createdBy, userId)))
    .limit(1);

  if (!module.length) {
    return reply.status(403).send({ error: { code: 'FORBIDDEN' } });
  }

  const proprietaryContent = await db.insert(moduleProprietaryContent).values({
    moduleId: id,
    contentType,
    title,
    content,
    sourceUrl,
    uploadedBy: userId,
  }).returning();

  return reply.send({ proprietaryContent: proprietaryContent[0] });
});
```

#### **Team Assignment:**

```typescript
// POST /api/curator/modules/:id/assign
// Assign module to team members
app.post('/api/curator/modules/:id/assign', requireManager, async (req, reply) => {
  const { id } = req.params;
  const { userIds, teamIds, roleFilters, isMandatory, dueDate } = req.body;
  const userId = req.user.id;

  // Verify ownership
  const module = await db.select()
    .from(modules)
    .where(and(eq(modules.id, id), eq(modules.createdBy, userId)))
    .limit(1);

  if (!module.length) {
    return reply.status(403).send({ error: { code: 'FORBIDDEN' } });
  }

  // Resolve target users
  let targetUserIds: string[] = userIds || [];

  // Add users from teams
  if (teamIds && teamIds.length > 0) {
    const teamMembers = await db.select({ userId: teamMembers.userId })
      .from(teamMembers)
      .where(inArray(teamMembers.teamId, teamIds));
    targetUserIds.push(...teamMembers.map(tm => tm.userId));
  }

  // Filter by role if specified
  if (roleFilters && roleFilters.length > 0) {
    const filteredUsers = await db.select({ id: users.id })
      .from(users)
      .where(inArray(users.id, targetUserIds))
      .where(inArray(users.role, roleFilters));
    targetUserIds = filteredUsers.map(u => u.id);
  }

  // Deduplicate
  targetUserIds = [...new Set(targetUserIds)];

  // Create assignments
  const assignments = await Promise.all(
    targetUserIds.map(targetUserId =>
      db.insert(moduleAssignments).values({
        moduleId: id,
        userId: targetUserId,
        assignedBy: userId,
        dueDate,
        status: 'assigned',
      }).onConflictDoNothing().returning()
    )
  );

  // Update module status to 'active' if it was draft
  if (module[0].status === 'draft') {
    await db.update(modules)
      .set({ status: 'active', isMandatory, updatedAt: new Date() })
      .where(eq(modules.id, id));
  }

  return reply.send({
    assigned: assignments.filter(a => a.length > 0).length,
    total: targetUserIds.length,
    userIds: targetUserIds,
  });
});
```

#### **Progress Tracking:**

```typescript
// GET /api/curator/modules/:id/progress
// View module progress for assigned team members
app.get('/api/curator/modules/:id/progress', requireManager, async (req, reply) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Verify ownership
  const module = await db.select()
    .from(modules)
    .where(and(eq(modules.id, id), eq(modules.createdBy, userId)))
    .limit(1);

  if (!module.length) {
    return reply.status(403).send({ error: { code: 'FORBIDDEN' } });
  }

  // Get all assignments with user details
  const assignments = await db.select({
    assignment: moduleAssignments,
    user: {
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
    },
  })
    .from(moduleAssignments)
    .innerJoin(users, eq(moduleAssignments.userId, users.id))
    .where(eq(moduleAssignments.moduleId, id));

  // Calculate aggregate stats
  const stats = {
    assigned: assignments.length,
    inProgress: assignments.filter(a => a.assignment.status === 'in_progress').length,
    completed: assignments.filter(a => a.assignment.status === 'completed').length,
    overdue: assignments.filter(a => 
      a.assignment.dueDate && 
      new Date(a.assignment.dueDate) < new Date() &&
      a.assignment.status !== 'completed'
    ).length,
    avgMasteryScore: assignments
      .filter(a => a.assignment.masteryScore)
      .reduce((sum, a) => sum + Number(a.assignment.masteryScore), 0) / 
      assignments.filter(a => a.assignment.masteryScore).length || 0,
    avgTimeSpent: assignments
      .reduce((sum, a) => sum + (a.assignment.timeSpentSeconds || 0), 0) / assignments.length || 0,
  };

  return reply.send({ stats, assignments });
});
```

---

### **3. UI Components**

#### **Module List Page: `/curator/modules`**

```tsx
// web/app/curator/modules/page.tsx
import { useState, useEffect } from 'react';

export default function ModulesPage() {
  const [modules, setModules] = useState([]);
  const [filter, setFilter] = useState<'all' | 'draft' | 'active' | 'archived'>('all');

  useEffect(() => {
    fetchModules();
  }, [filter]);

  const fetchModules = async () => {
    const res = await fetch(`/api/curator/modules?status=${filter}`, {
      headers: { 'x-admin-token': 'test-admin-token' },
    });
    const data = await res.json();
    setModules(data.modules);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Modules</h1>
        <a href="/curator/modules/new" className="btn btn-primary">
          Create Module
        </a>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {['all', 'draft', 'active', 'archived'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded ${filter === status ? 'bg-brand-primary text-white' : 'bg-gray-200'}`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Module grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map(module => (
          <ModuleCard key={module.module.id} module={module} />
        ))}
      </div>
    </div>
  );
}

function ModuleCard({ module }) {
  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition">
      <h3 className="font-semibold mb-2">{module.module.title}</h3>
      <p className="text-sm text-gray-600 mb-4">{module.module.description}</p>
      
      <div className="flex justify-between text-sm mb-4">
        <span>{module.assignmentCount} assigned</span>
        <span>{module.completionCount} completed</span>
      </div>

      <div className="flex gap-2">
        <a href={`/curator/modules/${module.module.id}/edit`} className="btn btn-sm">
          Edit
        </a>
        <a href={`/curator/modules/${module.module.id}/assign`} className="btn btn-sm">
          Assign
        </a>
        <a href={`/curator/modules/${module.module.id}/analytics`} className="btn btn-sm">
          Analytics
        </a>
      </div>
    </div>
  );
}
```

#### **Module Creation Page: `/curator/modules/new`**

```tsx
// web/app/curator/modules/new/page.tsx
import { useState } from 'react';

export default function NewModulePage() {
  const [step, setStep] = useState<'topic' | 'review' | 'refine'>('topic');
  const [topicInput, setTopicInput] = useState('');
  const [generatedTopic, setGeneratedTopic] = useState(null);

  const handleGenerateTopic = async () => {
    // Use conversational UI to generate topic
    // (This integrates with Epic 13 Agent Orchestrator)
    const res = await fetch('/api/conversation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': 'test-admin-token' },
      body: JSON.stringify({ userInput: topicInput, context: 'manager_module_creation' }),
    });
    const data = await res.json();
    // Handle conversation flow...
  };

  const handleCreateModule = async () => {
    const res = await fetch('/api/curator/modules/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': 'test-admin-token' },
      body: JSON.stringify({
        topicId: generatedTopic.id,
        title: generatedTopic.title,
        description: generatedTopic.description,
        isMandatory: false,
        estimatedMinutes: 30,
      }),
    });
    const data = await res.json();
    window.location.href = `/curator/modules/${data.moduleId}/edit`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create New Module</h1>

      {step === 'topic' && (
        <div>
          <label className="block mb-2 font-semibold">What topic would you like to create a module for?</label>
          <textarea
            value={topicInput}
            onChange={e => setTopicInput(e.target.value)}
            placeholder="e.g., Effective delegation for managers, Python data analysis, Sales negotiation techniques"
            className="w-full border rounded p-3 min-h-[100px]"
          />
          <button onClick={handleGenerateTopic} className="btn btn-primary mt-4">
            Generate Topic
          </button>
        </div>
      )}

      {step === 'review' && generatedTopic && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Review Generated Topic</h2>
          {/* Show topic details */}
          <button onClick={handleCreateModule} className="btn btn-primary">
            Create Module
          </button>
        </div>
      )}
    </div>
  );
}
```

#### **Module Edit Page: `/curator/modules/:id/edit`**

(Full UI for editing sections, adding proprietary content, managing questions)

#### **Module Assignment Page: `/curator/modules/:id/assign`**

(UI for selecting teams, roles, setting mandatory/optional, due dates)

#### **Module Analytics Page: `/curator/modules/:id/analytics`**

(Progress dashboard, struggling learners, content quality metrics)

---

## Acceptance Criteria

### **Module Creation:**
- [ ] Manager can generate module from conversational topic request
- [ ] Manager can select existing topic to create module
- [ ] Module is created in 'draft' status

### **Content Refinement:**
- [ ] Manager can edit section content
- [ ] Manager can add/edit/delete questions
- [ ] Manager can add/edit guidance text
- [ ] All edits are tracked in `module_content_edits`

### **Proprietary Content:**
- [ ] Manager can upload company-specific documents
- [ ] Manager can add case studies
- [ ] Proprietary content is displayed alongside research content

### **Team Assignment:**
- [ ] Manager can assign to individual users
- [ ] Manager can assign to entire teams
- [ ] Manager can filter by role
- [ ] Manager can set mandatory/optional
- [ ] Manager can set due dates
- [ ] Module status changes to 'active' on first assignment

### **Progress Tracking:**
- [ ] Manager sees assigned count, in-progress, completed
- [ ] Manager sees overdue assignments
- [ ] Manager sees average mastery score and time spent
- [ ] Manager can identify struggling learners
- [ ] Manager can drill down to individual progress

---

## Testing Strategy

### **Unit Tests:**
- Module CRUD operations
- Assignment logic (team resolution, role filtering)
- Progress calculation

### **Integration Tests:**
- End-to-end module creation flow
- Content refinement workflow
- Team assignment with complex filters
- Progress tracking queries

### **Manual Testing:**
- Create module from new topic
- Edit content and verify changes tracked
- Add proprietary content (document, case study)
- Assign to team with role filter
- View progress dashboard

---

## Implementation Notes

### **Phase 1: Database & Core API (8-10h)**
1. Create database migration
2. Implement module CRUD routes
3. Implement assignment routes
4. Implement progress tracking routes

### **Phase 2: Content Refinement (6-8h)**
1. Implement content editing routes
2. Implement proprietary content routes
3. Implement edit tracking

### **Phase 3: UI Components (6-8h)**
1. Module list page
2. Module creation page (integrate with Agent Orchestrator)
3. Module edit page
4. Module assignment page
5. Module analytics page

---

## Dependencies

- ✅ **Epic 6:** Content generation (to create topics)
- 🚧 **Epic 13:** Agent Orchestrator (for conversational module creation)
- ✅ **Epic 3:** Team management (for team assignment)
- ✅ **Epic 2:** RBAC (for manager permissions)

---

## Success Metrics

- Manager can create a module in < 5 minutes
- Manager can assign to team in < 2 minutes
- Manager can view progress dashboard in < 1 second
- 100% of module operations are tracked for audit

---

**Ready to implement! Start with Phase 1 (database & core API), then Phase 2 (refinement), then Phase 3 (UI).**

