# Cerply V2.0 - API Reference

**Version**: 2.0  
**Base URL**: `https://api.cerply.com` (production) | `http://localhost:8080` (development)

---

## Authentication

All V2 API endpoints require authentication via one of:
- **Session Cookie**: `session_id` (web app)
- **Bearer Token**: `Authorization: Bearer <token>` (API clients, mobile)

###Response Format

All API responses follow this structure:

**Success**:
```json
{
  "data": { ... },
  "meta": { ... }
}
```

**Error**:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { ... }
  }
}
```

---

## Build Endpoints

### POST /api/v2/build/start
Start building a new module.

**Request**:
```json
{
  "prompt": "Create a module about effective team meetings"
}
```

**Response**:
```json
{
  "moduleId": "mod_abc123",
  "message": "Module created! Generating content...",
  "status": "draft"
}
```

---

### POST /api/v2/build/chat
Continue refining a module via chat.

**Request**:
```json
{
  "moduleId": "mod_abc123",
  "message": "Add a section on virtual meeting best practices"
}
```

**Response**:
```json
{
  "response": "Added section on virtual meetings with 3 learning items.",
  "updated": true
}
```

---

### POST /api/v2/build/lock
Lock a module after quality validation.

**Request**:
```json
{
  "moduleId": "mod_abc123"
}
```

**Response**:
```json
{
  "success": true,
  "issues": [],
  "lockedAt": "2025-10-29T12:00:00Z"
}
```

Or if validation fails:
```json
{
  "success": false,
  "issues": [
    "Missing citations in section 2",
    "Reading level too high (grade 14, target 12)"
  ]
}
```

---

### GET /api/v2/build/calibration
Get example items at specific difficulty level.

**Query Parameters**:
- `moduleId` (required): Module ID
- `difficulty` (required): 0-10

**Response**:
```json
{
  "examples": [
    {
      "difficulty": 5,
      "itemType": "multiple_choice",
      "question": "What is the primary benefit of...",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."]
    }
  ]
}
```

---

## Module Management

### GET /api/v2/modules
List all modules for the organization.

**Query Parameters**:
- `status` (optional): `draft` | `locked` | `archived`
- `limit` (optional): default 20
- `offset` (optional): default 0

**Response**:
```json
{
  "modules": [
    {
      "id": "mod_abc123",
      "title": "Compliance Training 2025",
      "description": "Essential compliance knowledge",
      "status": "locked",
      "createdBy": "user_123",
      "createdAt": "2025-10-20T10:00:00Z",
      "updatedAt": "2025-10-25T14:30:00Z"
    }
  ],
  "total": 15,
  "limit": 20,
  "offset": 0
}
```

---

### GET /api/v2/modules/:id
Get full module details including sections and items.

**Response**:
```json
{
  "id": "mod_abc123",
  "title": "Compliance Training 2025",
  "description": "...",
  "status": "locked",
  "sections": [
    {
      "id": "sec_1",
      "heading": "Introduction to Compliance",
      "content": "...",
      "provenance": "certified_core",
      "orderIndex": 0
    }
  ],
  "items": [
    {
      "id": "item_1",
      "sectionId": "sec_1",
      "itemType": "multiple_choice",
      "questionText": "...",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "c",
      "difficultyLevel": 5
    }
  ]
}
```

---

### PATCH /api/v2/modules/:id
Update module metadata.

**Request**:
```json
{
  "title": "Updated Title",
  "description": "Updated description"
}
```

**Response**:
```json
{
  "success": true,
  "module": { ... }
}
```

---

### DELETE /api/v2/modules/:id
Archive a module.

**Response**:
```json
{
  "success": true,
  "archivedAt": "2025-10-29T12:00:00Z"
}
```

---

### POST /api/v2/modules/:id/clone
Clone a module (used for Certified modules).

**Request**:
```json
{
  "wrapIntro": "Company-specific introduction",
  "wrapValues": ["Our company values..."]
}
```

**Response**:
```json
{
  "newModuleId": "mod_xyz789",
  "clonedFrom": "mod_abc123",
  "provenance": "certified_core+internal"
}
```

---

## Push (Assignment) Endpoints

### POST /api/v2/push/assign
Create a new module assignment.

**Request**:
```json
{
  "moduleId": "mod_abc123",
  "targetUserIds": ["user_1", "user_2"],
  "isMandatory": true,
  "startDate": "2025-11-01T00:00:00Z",
  "endDate": "2025-12-31T23:59:59Z",
  "quietHoursStart": "21:00",
  "quietHoursEnd": "07:00",
  "dailyCap": 5,
  "deliveryChannels": ["slack", "web"]
}
```

**Response**:
```json
{
  "assignmentId": "assign_123",
  "status": "active",
  "createdAt": "2025-10-29T12:00:00Z"
}
```

---

### PATCH /api/v2/push/assign/:id
Update an assignment.

**Request**:
```json
{
  "dailyCap": 10,
  "endDate": "2026-01-31T23:59:59Z"
}
```

**Response**:
```json
{
  "success": true,
  "assignment": { ... }
}
```

---

### GET /api/v2/push/assignments
List all assignments.

**Query Parameters**:
- `status` (optional): `active` | `paused` | `completed`
- `moduleId` (optional): Filter by module

**Response**:
```json
{
  "assignments": [
    {
      "id": "assign_123",
      "moduleId": "mod_abc123",
      "targetUserIds": ["user_1", "user_2"],
      "isMandatory": true,
      "status": "active",
      "createdAt": "2025-10-29T12:00:00Z"
    }
  ]
}
```

---

## Learn Endpoints

### POST /api/v2/learn/answer
Submit a learner's answer to an item.

**Request**:
```json
{
  "itemId": "item_123",
  "moduleId": "mod_abc123",
  "assignmentId": "assign_123",
  "answer": "c",
  "timeSpentSeconds": 25
}
```

**Response**:
```json
{
  "isCorrect": true,
  "feedback": "Correct! The primary benefit is...",
  "nextItemId": "item_124",
  "progressUpdate": {
    "itemsCompleted": 5,
    "itemsCorrect": 4,
    "currentLevel": 6
  }
}
```

---

### POST /api/v2/learn/command
Process natural language command.

**Request**:
```json
{
  "command": "show my progress",
  "moduleId": "mod_abc123"
}
```

**Response**:
```json
{
  "action": "progress_card",
  "data": {
    "itemsCompleted": 10,
    "itemsCorrect": 8,
    "currentStreak": 3,
    "currentLevel": 6
  }
}
```

---

### GET /api/v2/learn/progress
Get learner's progress for a module.

**Query Parameters**:
- `moduleId` (required)
- `userId` (optional, defaults to current user)

**Response**:
```json
{
  "userId": "user_123",
  "moduleId": "mod_abc123",
  "currentLevel": 6,
  "itemsCompleted": 10,
  "itemsCorrect": 8,
  "currentStreak": 3,
  "lastSessionAt": "2025-10-29T10:30:00Z"
}
```

---

## Track (Analytics) Endpoints

### GET /api/v2/track/team
Get team-level analytics.

**Query Parameters**:
- `startDate` (required): ISO 8601
- `endDate` (required): ISO 8601

**Response**:
```json
{
  "masteryBySkill": [
    {
      "skillName": "Compliance",
      "totalLearners": 50,
      "proficientCount": 35,
      "proficiencyRate": 0.7
    }
  ],
  "activeUsers": [
    {
      "userName": "Alice Smith",
      "sessionsThisWeek": 5,
      "itemsCompleted": 20,
      "currentStreak": 7
    }
  ],
  "atRiskUsers": [
    {
      "userName": "Bob Jones",
      "riskFactors": ["No activity in 14 days", "Low completion rate"],
      "daysInactive": 14
    }
  ]
}
```

---

### GET /api/v2/track/person/:id
Get individual learner analytics.

**Response**:
```json
{
  "userId": "user_123",
  "currentLevel": 6,
  "completionRate": 0.75,
  "streaks": {
    "currentStreak": 5,
    "longestStreak": 12
  },
  "pace": {
    "itemsPerWeek": 15,
    "minutesPerWeek": 45
  },
  "weakAreas": [
    {
      "goalName": "Data Protection",
      "successRate": 0.5,
      "attemptsCount": 6
    }
  ]
}
```

---

### GET /api/v2/track/module/:id
Get module-level analytics.

**Response**:
```json
{
  "moduleId": "mod_abc123",
  "coreFreshness": {
    "freshnessScore": 85,
    "staleSections": 2,
    "totalSections": 10
  },
  "reach": {
    "totalTargeted": 100,
    "started": 75,
    "completed": 50,
    "startRate": 0.75,
    "completionRate": 0.5
  },
  "answerRates": {
    "averageScore": 0.78
  },
  "confusingItems": [
    {
      "itemId": "item_456",
      "itemContent": "What is the primary...",
      "successRate": 0.3,
      "attemptsCount": 40
    }
  ]
}
```

---

## Certified Endpoints

### GET /api/v2/certified/catalogue
Search certified modules.

**Query Parameters**:
- `q` (optional): Search query
- `industry` (optional): Industry category
- `limit` (optional): default 20

**Response**:
```json
{
  "modules": [
    {
      "id": "mod_cert_123",
      "title": "Leadership Essentials",
      "description": "...",
      "industryCategory": "management",
      "provenance": "certified_core",
      "stampedBy": "certifier_admin",
      "stampedAt": "2025-09-15T12:00:00Z"
    }
  ]
}
```

---

### POST /api/v2/certified/submit
Submit a module for certification review.

**Request**:
```json
{
  "moduleId": "mod_abc123",
  "submissionNotes": "Ready for review. All quality checks passed."
}
```

**Response**:
```json
{
  "submissionId": "sub_123",
  "status": "submitted",
  "submittedAt": "2025-10-29T12:00:00Z"
}
```

---

### PATCH /api/v2/certified/review/:id
Review a submitted module (Certifier only).

**Request**:
```json
{
  "checklistPassed": {
    "citations": true,
    "readingLevel": true,
    "accessibility": true
  },
  "reviewNotes": "Excellent content. Approved for stamp."
}
```

**Response**:
```json
{
  "submissionId": "sub_123",
  "status": "reviewed",
  "reviewedAt": "2025-10-30T10:00:00Z"
}
```

---

### POST /api/v2/certified/stamp/:id
Stamp a reviewed module (Certifier only).

**Response**:
```json
{
  "moduleId": "mod_abc123",
  "stamped": true,
  "stampedBy": "certifier_admin",
  "stampedAt": "2025-10-30T10:30:00Z"
}
```

---

### POST /api/v2/certified/publish/:id
Publish a stamped module to catalogue.

**Response**:
```json
{
  "moduleId": "mod_abc123",
  "published": true,
  "publishedAt": "2025-10-30T11:00:00Z"
}
```

---

## Delivery Endpoints

### POST /api/v2/delivery/send
Send an item to a learner via specific channel.

**Request**:
```json
{
  "userId": "user_123",
  "itemId": "item_456",
  "channel": "slack"
}
```

**Response**:
```json
{
  "deliveryId": "del_789",
  "messageId": "slack_msg_abc",
  "deliveredAt": "2025-10-29T12:00:00Z"
}
```

---

### POST /api/v2/delivery/nudge
Send a reminder nudge to a learner.

**Request**:
```json
{
  "userId": "user_123",
  "moduleId": "mod_abc123",
  "channel": "slack",
  "message": "You have 5 items remaining. Keep up the momentum!"
}
```

**Response**:
```json
{
  "nudgeId": "nudge_456",
  "sentAt": "2025-10-29T12:00:00Z"
}
```

---

## Rate Limits

- **Standard Tier**: 100 requests/minute
- **Enterprise Tier**: 1000 requests/minute

Rate limit headers included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1698854400
```

---

## Webhooks

Configure webhooks to receive real-time events:

**Events**:
- `module.locked`
- `module.submitted`
- `module.stamped`
- `assignment.created`
- `learner.completed_module`
- `learner.at_risk`

**Webhook Payload**:
```json
{
  "event": "learner.completed_module",
  "timestamp": "2025-10-29T12:00:00Z",
  "data": {
    "userId": "user_123",
    "moduleId": "mod_abc123",
    "completionRate": 1.0,
    "finalScore": 0.92
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `QUALITY_GATE_FAILED` | 422 | Module failed quality validation |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## SDKs

Official SDKs available:
- **JavaScript/TypeScript**: `npm install @cerply/sdk`
- **Python**: `pip install cerply-sdk`
- **Go**: `go get github.com/cerply/cerply-go`

---

For more details, see the [full API documentation](https://docs.cerply.com/api).

