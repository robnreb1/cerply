# Epic 14: Manager Module Workflows - Manual Testing Guide

## 🎯 Testing Objective

Validate that managers can create training modules from topics, refine content, assign to teams, and track progress.

---

## ✅ Pre-Testing Setup Complete

1. **Staging Database:** ✅ Migrated to UUID schema
2. **Epic 14 Tables:** ✅ Created (manager_modules, module_assignments, module_proprietary_content, module_content_edits)
3. **API Server:** Ready to start locally or use staging

---

## 🧪 Manual Test Scenarios

### **Test 1: Module Creation from Topic**

**Goal:** Manager creates a module from an existing topic

**Setup:**
```bash
# Start local API server
cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/api
bash start-local.sh

# In another terminal, get test user token
export TEST_USER_ID="00000000-0000-0000-0000-000000000001"
export ADMIN_TOKEN="your-admin-token-here"
```

**Test Steps:**

1. **Find a topic to use:**
```bash
curl http://localhost:8080/api/topics \
  -H "x-admin-token: ${ADMIN_TOKEN}" | jq '.[:5]'
```
*Expected: List of topics with IDs*

2. **Create a module:**
```bash
curl -X POST http://localhost:8080/api/manager-modules \
  -H "Content-Type: application/json" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  -d '{
    "topicId": "<TOPIC_ID_FROM_STEP_1>",
    "title": "Python Fundamentals for Engineers",
    "description": "Core Python concepts for backend development",
    "isMandatory": true,
    "targetRoles": ["engineer", "analyst"],
    "estimatedMinutes": 180
  }' | jq
```

**Expected Response:**
```json
{
  "id": "uuid-here",
  "topicId": "uuid-here",
  "createdBy": "00000000-0000-0000-0000-000000000001",
  "title": "Python Fundamentals for Engineers",
  "status": "draft",
  "isMandatory": true,
  "createdAt": "2025-10-17T...",
  "updatedAt": "2025-10-17T..."
}
```

**Save the module ID for next tests:** `export MODULE_ID="<id-from-response>"`

---

### **Test 2: View Module Details**

**Test Steps:**

```bash
curl http://localhost:8080/api/manager-modules/${MODULE_ID} \
  -H "x-admin-token: ${ADMIN_TOKEN}" | jq
```

**Expected Response:**
```json
{
  "id": "uuid",
  "topicId": "uuid",
  "title": "Python Fundamentals for Engineers",
  "description": "Core Python concepts for backend development",
  "status": "draft",
  "isMandatory": true,
  "targetRoles": ["engineer", "analyst"],
  "estimatedMinutes": 180,
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

### **Test 3: Add Proprietary Content**

**Goal:** Manager uploads company-specific content to the module

**Test Steps:**

```bash
curl -X POST http://localhost:8080/api/manager-modules/${MODULE_ID}/content \
  -H "Content-Type: application/json" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  -d '{
    "contentType": "case_study",
    "title": "Our Python Microservices Architecture",
    "content": "At our company, we use Python for all backend services. Key patterns:\n1. FastAPI for REST APIs\n2. Celery for async tasks\n3. PostgreSQL with SQLAlchemy\n\nInternal best practices:\n- Always use type hints\n- Write tests with pytest\n- Follow our internal style guide"
  }' | jq
```

**Expected Response:**
```json
{
  "id": "uuid",
  "moduleId": "uuid",
  "contentType": "case_study",
  "title": "Our Python Microservices Architecture",
  "uploadedBy": "00000000-0000-0000-0000-000000000001",
  "createdAt": "2025-10-17T..."
}
```

---

### **Test 4: Update Module Status**

**Goal:** Activate module for assignment

**Test Steps:**

```bash
curl -X PATCH http://localhost:8080/api/manager-modules/${MODULE_ID} \
  -H "Content-Type: application/json" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  -d '{
    "status": "active"
  }' | jq
```

**Expected Response:**
```json
{
  "id": "uuid",
  "status": "active",
  "updatedAt": "2025-10-17T..."
}
```

---

### **Test 5: Assign Module to Teams**

**Goal:** Manager assigns active module to team members

**Setup - Create test team:**
```bash
# First, check if teams exist
curl http://localhost:8080/api/teams \
  -H "x-admin-token: ${ADMIN_TOKEN}" | jq

# If no teams, you'll need to create one first (or use existing team ID)
export TEAM_ID="<team-id-here>"
```

**Test Steps:**

```bash
curl -X POST http://localhost:8080/api/manager-modules/${MODULE_ID}/assign \
  -H "Content-Type: application/json" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  -d '{
    "teamIds": ["'${TEAM_ID}'"],
    "dueDate": "2025-11-15T23:59:59Z"
  }' | jq
```

**Expected Response:**
```json
{
  "moduleId": "uuid",
  "assignedCount": 5,
  "assignments": [
    {
      "id": "uuid",
      "userId": "uuid",
      "status": "assigned",
      "assignedAt": "2025-10-17T..."
    }
  ]
}
```

---

### **Test 6: View Module Assignments**

**Test Steps:**

```bash
curl http://localhost:8080/api/manager-modules/${MODULE_ID}/assignments \
  -H "x-admin-token: ${ADMIN_TOKEN}" | jq
```

**Expected Response:**
```json
[
  {
    "id": "uuid",
    "moduleId": "uuid",
    "userId": "uuid",
    "status": "assigned",
    "assignedAt": "2025-10-17T...",
    "dueDate": "2025-11-15T23:59:59Z",
    "masteryScore": null,
    "timeSpentSeconds": 0
  }
]
```

---

### **Test 7: Update Assignment Progress**

**Goal:** Simulate learner completing module

**Test Steps:**

```bash
# Get an assignment ID
export ASSIGNMENT_ID="<id-from-test-6>"

curl -X PATCH http://localhost:8080/api/manager-modules/${MODULE_ID}/assignments/${ASSIGNMENT_ID} \
  -H "Content-Type: application/json" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  -d '{
    "status": "completed",
    "masteryScore": 0.85,
    "timeSpentSeconds": 3600
  }' | jq
```

**Expected Response:**
```json
{
  "id": "uuid",
  "status": "completed",
  "completedAt": "2025-10-17T...",
  "masteryScore": 0.85,
  "timeSpentSeconds": 3600
}
```

---

### **Test 8: View Module Analytics**

**Goal:** Manager reviews team progress

**Test Steps:**

```bash
curl http://localhost:8080/api/manager-modules/${MODULE_ID}/analytics \
  -H "x-admin-token: ${ADMIN_TOKEN}" | jq
```

**Expected Response:**
```json
{
  "moduleId": "uuid",
  "totalAssignments": 5,
  "completedCount": 1,
  "inProgressCount": 2,
  "notStartedCount": 2,
  "averageMasteryScore": 0.85,
  "averageTimeSpentMinutes": 60,
  "strugglingLearners": [],
  "completionRate": 0.20
}
```

---

### **Test 9: List All Manager's Modules**

**Test Steps:**

```bash
curl "http://localhost:8080/api/manager-modules?status=active" \
  -H "x-admin-token: ${ADMIN_TOKEN}" | jq
```

**Expected Response:**
```json
[
  {
    "id": "uuid",
    "title": "Python Fundamentals for Engineers",
    "status": "active",
    "totalAssignments": 5,
    "completedCount": 1,
    "createdAt": "2025-10-17T..."
  }
]
```

---

### **Test 10: Archive Module**

**Goal:** Manager deactivates module

**Test Steps:**

```bash
curl -X DELETE http://localhost:8080/api/manager-modules/${MODULE_ID} \
  -H "x-admin-token: ${ADMIN_TOKEN}" | jq
```

**Expected Response:**
```json
{
  "id": "uuid",
  "status": "archived",
  "archivedAt": "2025-10-17T..."
}
```

---

## 🌐 Web UI Testing (Optional)

If web server is running:

1. **Start web server:**
```bash
cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/web
npm run dev
```

2. **Open browser:**
```
http://localhost:3000/curator/modules
```

3. **Test UI:**
   - View module list
   - Click "Create Module"
   - Fill wizard form
   - View module details
   - Add proprietary content
   - Assign to teams
   - View analytics dashboard

---

## ✅ Success Criteria

- [ ] Can create module from topic
- [ ] Can add proprietary content
- [ ] Can update module status
- [ ] Can assign to teams
- [ ] Can track assignment progress
- [ ] Can view analytics
- [ ] Can list all modules
- [ ] Can archive module
- [ ] All API responses follow error envelope format
- [ ] Audit trail captured in module_content_edits

---

## 🐛 Known Issues to Watch For

1. **Type Mismatches:** `teamIds` string array vs UUID in database
2. **Missing Topics:** If no topics exist, create one first
3. **Missing Teams:** If no teams exist, create one first
4. **Auth:** Must use `x-admin-token` header for all requests

---

## 📝 Testing Notes

**Record any issues here:**

- Issue 1:
- Issue 2:
- Issue 3:

---

**Ready to start? Run Test 1 above!** 🚀

