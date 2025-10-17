# Epic 14: Manager Module Workflows - Quick Start Guide

## Overview

Epic 14 enables managers to create, customize, assign, and track training modules for their teams. This is a **critical MVP feature** that delivers the core Cerply value proposition.

## Quick Links

- **API Routes:** `api/src/routes/manager-modules.ts`
- **Database Migration:** `api/migrations/025_manager_module_workflows.sql`
- **UI Pages:** `web/app/curator/modules/`
- **Test Script:** `test-epic14.sh`
- **Full Delivery Doc:** `EPIC14_DELIVERY_SUMMARY.md`

---

## 5-Minute Setup

### 1. Run Database Migration

```bash
cd api
export DATABASE_URL="your-database-url"
npm run migrate
```

### 2. Start Services

```bash
# Terminal 1 - API
cd api
npm start

# Terminal 2 - Web
cd web
export NEXT_PUBLIC_ADMIN_TOKEN="test-admin-token"
npm run dev
```

### 3. Access UI

Open: http://localhost:3000/curator/modules

---

## Manager Workflow (User Journey)

### 1️⃣ Create Module
- Navigate to `/curator/modules`
- Click "Create Module"
- Enter topic or select existing
- Configure settings (mandatory, duration)
- Click "Create"

### 2️⃣ Refine Content
- Edit module details
- Add company-specific content:
  - Documents
  - Case studies
  - Policies
  - Videos
- Update sections and questions

### 3️⃣ Assign to Team
- Click "Assign"
- Select teams
- Optional: filter by role
- Set due date (optional)
- Set mandatory flag
- Click "Assign to N Team(s)"

### 4️⃣ Track Progress
- View analytics dashboard
- Monitor:
  - Assignment counts
  - Completion rates
  - Overdue assignments
  - Average mastery scores
  - Time spent per learner
- Identify struggling learners
- Filter by status

---

## API Endpoints

### Module Management

```bash
# Create module
POST /api/curator/modules/create
{
  "topicId": "uuid",
  "title": "Module Title",
  "description": "Description",
  "isMandatory": false,
  "estimatedMinutes": 30
}

# List modules
GET /api/curator/modules?status=active

# Get module details
GET /api/curator/modules/:id

# Update module
PUT /api/curator/modules/:id
{
  "title": "Updated Title",
  "status": "active"
}

# Archive module
DELETE /api/curator/modules/:id
```

### Content Refinement

```bash
# Add proprietary content
POST /api/curator/modules/:id/proprietary
{
  "contentType": "case_study",
  "title": "Company Example",
  "content": "Content here...",
  "sourceUrl": "https://..."
}

# Delete proprietary content
DELETE /api/curator/modules/:id/proprietary/:contentId

# Edit content sections
PUT /api/curator/modules/:id/content
{
  "sections": [{"id": "uuid", "content": "updated"}],
  "questions": [{"id": "uuid", "stem": "updated"}]
}
```

### Team Assignment

```bash
# Assign to teams
POST /api/curator/modules/:id/assign
{
  "teamIds": ["uuid1", "uuid2"],
  "roleFilters": ["learner", "manager"],
  "isMandatory": true,
  "dueDate": "2025-12-31"
}

# Remove assignment
DELETE /api/curator/modules/:id/assign/:assignmentId
```

### Progress Tracking

```bash
# Get progress summary
GET /api/curator/modules/:id/progress

# Response includes:
# - stats (assigned, completed, overdue, avg mastery, avg time)
# - assignments (array of user assignments)

# Get detailed analytics
GET /api/curator/modules/:id/analytics

# Response includes:
# - progressOverTime
# - strugglingLearners
# - editMetrics
```

---

## Database Schema

### Tables Created

1. **manager_modules**
   - `id` (UUID, PK)
   - `topic_id` (UUID, FK → topics)
   - `created_by` (TEXT, FK → users)
   - `title`, `description`
   - `status` (draft/active/archived)
   - `is_mandatory`, `target_roles`, `prerequisites`
   - `estimated_minutes`
   - Timestamps

2. **module_assignments**
   - `id` (UUID, PK)
   - `module_id` (UUID, FK → manager_modules)
   - `user_id`, `assigned_by` (TEXT, FK → users)
   - `assigned_at`, `due_date`
   - `status` (assigned/in_progress/completed)
   - `started_at`, `completed_at`
   - `mastery_score`, `time_spent_seconds`
   - UNIQUE(module_id, user_id)

3. **module_proprietary_content**
   - `id` (UUID, PK)
   - `module_id` (UUID, FK → manager_modules)
   - `content_type` (document/case_study/policy/video)
   - `title`, `content`, `source_url`
   - `uploaded_by` (TEXT, FK → users)
   - `created_at`

4. **module_content_edits**
   - `id` (UUID, PK)
   - `module_id` (UUID, FK → manager_modules)
   - `edited_by` (TEXT, FK → users)
   - `edit_type` (section_edit/question_add/question_edit/guidance_edit)
   - `section_id` (UUID)
   - `before_content`, `after_content` (JSONB)
   - `edit_reason`
   - `created_at`

---

## UI Component Structure

```
web/app/curator/modules/
├── page.tsx                    # Module list (grid view)
├── new/
│   └── page.tsx               # Create module wizard
└── [id]/
    ├── edit/
    │   └── page.tsx           # Edit module & add content
    ├── assign/
    │   └── page.tsx           # Assign to teams
    └── analytics/
        └── page.tsx           # Progress dashboard
```

---

## Testing

### Run Test Script

```bash
# Make sure API is running, then:
./test-epic14.sh
```

This will test all endpoints in sequence:
1. Create module
2. Update module
3. Add proprietary content
4. Assign to team
5. View progress
6. View analytics

### Manual UI Testing

1. **Module Creation:**
   - Visit http://localhost:3000/curator/modules
   - Click "Create Module"
   - Enter "Test Module" as topic
   - Complete wizard
   - Verify redirect to edit page

2. **Content Management:**
   - Add a case study
   - Add a policy document
   - Delete proprietary content
   - Verify changes persist

3. **Team Assignment:**
   - Click "Assign"
   - Select a team
   - Set due date
   - Toggle mandatory
   - Verify assignment created

4. **Analytics:**
   - View stats cards
   - Check completion rate calculation
   - Filter assignments
   - Verify overdue highlighting

---

## Common Issues

### Database Connection Error
```
Error: getaddrinfo ENOTFOUND db
```
**Solution:** Set DATABASE_URL environment variable
```bash
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
```

### Topic Not Found
```
TOPIC_NOT_FOUND
```
**Solution:** Create a topic first using content generation endpoints

### Authorization Error
```
UNAUTHORIZED or FORBIDDEN
```
**Solution:** 
- Check x-admin-token header is set
- Verify user has manager role
- For UI, set NEXT_PUBLIC_ADMIN_TOKEN

### Module Not Found
```
MODULE_NOT_FOUND
```
**Solution:** 
- Verify module exists
- Check user owns the module
- Manager can only access their own modules

---

## Architecture Notes

### Security
- All routes require `requireManager` middleware
- Ownership verification on all operations
- Cascade deletes for referential integrity
- Parameterized queries prevent SQL injection

### Performance
- Indexes on all foreign keys
- Composite indexes for common queries
- Aggregate calculations optimized
- JOIN operations minimize N+1 queries

### Scalability
- Stateless API design
- Database-backed (no in-memory state)
- Can scale horizontally
- Pagination ready (not yet implemented)

---

## Next Steps

1. **Integration with Epic 13:** Enhanced conversational module creation
2. **Notifications:** Slack/email alerts for assignments
3. **Reports:** Export progress as PDF/CSV
4. **Bulk Operations:** Assign multiple modules at once
5. **Templates:** Reusable module templates
6. **Learning Paths:** Module dependencies and sequences

---

## Support

- **Full Documentation:** `EPIC14_DELIVERY_SUMMARY.md`
- **Test Script:** `test-epic14.sh`
- **API Source:** `api/src/routes/manager-modules.ts`
- **UI Source:** `web/app/curator/modules/`

---

**Status:** ✅ Production Ready  
**Last Updated:** October 17, 2025

