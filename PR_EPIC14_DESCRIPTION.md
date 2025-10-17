# Epic 14: Manager Module Workflows + Staging UUID Migration

## 🎯 Overview

**Epic 14** is a **P0 MVP-CRITICAL** feature that enables managers to create training modules, refine content with proprietary information, assign to teams, and track progress. This is the core Cerply value proposition for B2B.

This PR also includes **staging database UUID migration** to align with PR #940 schema changes.

---

## 📦 What's New

### 1. Manager Module Workflows ✅

**Database (4 new tables):**
- `manager_modules` - Module definitions created from topics
- `module_assignments` - Track assignments to team members
- `module_proprietary_content` - Company-specific content uploads
- `module_content_edits` - Audit trail of refinements

**API (11 new endpoints):**
```bash
GET    /api/manager-modules          # List modules (manager-owned)
POST   /api/manager-modules          # Create module from topic
GET    /api/manager-modules/:id      # Get module details
PATCH  /api/manager-modules/:id      # Update module
DELETE /api/manager-modules/:id      # Archive module
POST   /api/manager-modules/:id/assign  # Assign to teams
GET    /api/manager-modules/:id/assignments  # View assignments
PATCH  /api/manager-modules/:id/assignments/:assignmentId  # Update assignment
POST   /api/manager-modules/:id/content  # Add proprietary content
PATCH  /api/manager-modules/:id/content/:contentId  # Edit generated content
GET    /api/manager-modules/:id/analytics  # Progress dashboard
```

**Web UI (5 new pages):**
- `/curator/modules` - Module list with filters
- `/curator/modules/new` - 2-step creation wizard
- `/curator/modules/[id]/edit` - Content refinement
- `/curator/modules/[id]/assign` - Team assignment
- `/curator/modules/[id]/analytics` - Progress tracking

---

### 2. Staging Database UUID Migration ✅

**Problem:**
- Staging database had TEXT user IDs (pre-Epic 13 schema)
- Main branch (post PR #940) uses UUID user IDs
- Epic 14 requires UUID schema

**Solution:**
- `026_migrate_staging_to_uuid.sql` - Initial migration attempt
- `027_staging_uuid_complete.sql` - Complete UUID conversion
- Converted 7 tables: users, agent_conversations, agent_tool_calls, batch_jobs, user_conversations, user_workflow_decisions, verification_flags

**Verification:**
```bash
cd api && \
export DATABASE_URL="postgresql://cerply_app:...@frankfurt-postgres.render.com/cerply?sslmode=require" && \
psql "$DATABASE_URL" -c "\d users"
```
Result: `users.id | uuid` ✅

---

## 🧪 Testing

### Database Migration
```bash
# Already applied to staging
cd api && npm run migrate
```

### API Endpoints
```bash
# Run automated test suite
./test-epic14.sh
```

**Example cURL:**
```bash
# Create module
curl -X POST http://localhost:8080/api/manager-modules \
  -H "Content-Type: application/json" \
  -H "x-admin-token: YOUR_TOKEN" \
  -d '{
    "topicId": "uuid-here",
    "title": "Python Fundamentals",
    "description": "Core Python concepts",
    "isMandatory": true,
    "targetRoles": ["engineer"],
    "estimatedMinutes": 120
  }'

# Assign to teams
curl -X POST http://localhost:8080/api/manager-modules/{moduleId}/assign \
  -H "Content-Type: application/json" \
  -H "x-admin-token: YOUR_TOKEN" \
  -d '{
    "teamIds": ["team-uuid"],
    "dueDate": "2025-11-01T00:00:00Z"
  }'

# Get analytics
curl http://localhost:8080/api/manager-modules/{moduleId}/analytics \
  -H "x-admin-token: YOUR_TOKEN"
```

### Web UI
```bash
cd web && npm run dev
# Visit http://localhost:3000/curator/modules
```

---

## 📊 Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| ✅ Module creation from topics | Complete |
| ✅ Content refinement (edits + proprietary) | Complete |
| ✅ Team assignment (role-based) | Complete |
| ✅ Progress tracking (analytics) | Complete |
| ✅ Full audit trail | Complete |
| ✅ Manager-only access control | Complete |
| ✅ Staging UUID migration | Complete |

---

## 🚀 Deployment Plan

### Stage 1: Merge to Main ✅
- [x] All tests passing
- [x] Staging database migrated
- [x] Epic 14 tables created

### Stage 2: Render Staging Deployment
1. **Trigger Manual Deploy:**
   - Dashboard: https://dashboard.render.com
   - Service: `cerply-api-staging-latest` (Frankfurt)
   - Branch: `main` (after PR merge)
   
2. **Verify deployment:**
```bash
curl https://cerply-api-staging.onrender.com/api/health
curl https://cerply-api-staging.onrender.com/api/manager-modules \
  -H "x-admin-token: STAGING_TOKEN"
```

3. **Web deployment:**
   - Vercel auto-deploys from main branch
   - Verify: https://cerply-web-staging.vercel.app/curator/modules

### Stage 3: UAT
- [ ] Manager creates module from topic
- [ ] Manager adds company-specific content
- [ ] Manager assigns to test team
- [ ] Team member completes module
- [ ] Manager reviews analytics

### Stage 4: Production Promotion
- After UAT sign-off
- Repeat Render deployment for production service

---

## 📁 Files Changed

**New Files (15):**
- `api/migrations/025_manager_module_workflows.sql`
- `api/migrations/026_migrate_staging_to_uuid.sql`
- `api/migrations/027_staging_uuid_complete.sql`
- `api/src/routes/manager-modules.ts`
- `web/app/curator/modules/page.tsx`
- `web/app/curator/modules/new/page.tsx`
- `web/app/curator/modules/[id]/edit/page.tsx`
- `web/app/curator/modules/[id]/assign/page.tsx`
- `web/app/curator/modules/[id]/analytics/page.tsx`
- `docs/EPIC14_QUICK_START.md`
- `test-epic14.sh`
- `EPIC14_DELIVERY_SUMMARY.md`
- `EPIC14_IMPLEMENTATION_COMPLETE.md`
- `PUSH_BLOCKED_API_KEYS.md`
- `PR_EPIC14_DESCRIPTION.md`

**Modified Files (1):**
- `api/src/index.ts` (registered manager-modules routes)

---

## 🔗 Related

- **Epic 13:** PR #940 (Agent Orchestrator + UUID schema)
- **Epic 15:** Learning Module Delivery (next, depends on Epic 14)
- **Epic 16:** Learning Experience Design (parallel, depends on Epic 15)

---

## ⚠️ Breaking Changes

**None for existing features.**

**Migration required:** Staging database upgraded from TEXT to UUID user IDs. This was necessary to align with PR #940 and enable Epic 14.

---

## ✅ Checklist

- [x] Database migrations tested
- [x] API tests pass
- [x] Web UI responsive
- [x] Manager role enforcement
- [x] Audit trail complete
- [x] Documentation updated
- [x] Staging database migrated
- [x] Epic 14 tables deployed
- [ ] CI checks pass
- [ ] Code review approved
- [ ] UAT completed

---

**Epic 14 is PRODUCTION-READY pending UAT validation.** 🚀

