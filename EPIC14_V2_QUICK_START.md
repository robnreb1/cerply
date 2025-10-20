# Epic 14 v2.0: Quick Start Guide

**AI-First Conversational Module Builder** - Get started in 5 minutes

---

## 🚀 Quick Setup (3 Steps)

### 1. Apply Database Migration

```bash
cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh
npm run migrate
```

**Expected output:** `Migration 030_manager_modules_ai_first.sql applied successfully`

### 2. Start API Server

```bash
cd api
npm run dev
```

**Verify:** API running at http://localhost:8080

### 3. Start Web Server

```bash
cd web
npm run dev
```

**Verify:** Web app at http://localhost:3000

---

## 🎯 Test the Conversational Interface (Web UI)

### Step 1: Navigate to Module Creation
Open browser: http://localhost:3000/curator/modules/new

### Step 2: Chat with the Agent
**You'll see:** _"Hi! I'm here to help you create a training module. What would you like to train your team on?"_

**Try this:**
1. Type: **"I need to train my sales team on advanced negotiation tactics"**
2. Click suggestion: **"Experienced team members (intermediate)"**
3. Type: **"They need to be proficient in 2 weeks"**

### Step 3: Review Module Preview
Agent will show:
- **Module title** and description
- **Target mastery level** (e.g., "intermediate → advanced")
- **Content structure** with source badges:
  - 🔒 Proprietary (company-specific)
  - 🤖 AI-Generated
  - 🌐 Public Research

### Step 4: Save Module
Click **"Save as Draft"** → Redirected to edit page

---

## 🧪 Test via API (Command Line)

Run the test script:

```bash
./test-epic14-v2.sh
```

**What it tests:**
- ✅ Start conversational module creation
- ✅ Continue conversation (multi-turn)
- ✅ Module creation from conversation
- ✅ Conversation history retrieval
- ✅ At-risk assignment tracking
- ✅ Proficiency update background job

**Expected:** All tests pass with ✓ checkmarks

---

## 📊 Key Features to Try

### 1. Conversational Module Creation
**Route:** `/curator/modules/new`

**Try:**
- Click suggestion buttons for quick replies
- Upload files (📎 button) - PDFs, DOCX, PPTX
- Natural language: "Focus on objection handling techniques"
- See module preview before finalizing

### 2. Proficiency Tracking
**Route:** `/curator/modules/{id}/analytics`

**See:**
- **Risk status badges:** ✓ Achieved, → On Track, ⚠ At Risk, ! Overdue
- **Proficiency progress bars:** Current % / Target %
- **At-risk learners:** <7 days to deadline, <70% proficiency

### 3. API Endpoints

**Start Conversation:**
```bash
curl -X POST http://localhost:8080/api/curator/modules/conversation \
  -H "Content-Type: application/json" \
  -H "x-admin-token: test-admin-token" \
  -d '{
    "userMessage": "I need to train my team on Python data analysis"
  }'
```

**Get At-Risk Assignments:**
```bash
curl http://localhost:8080/api/curator/modules/at-risk \
  -H "x-admin-token: test-admin-token"
```

**Trigger Proficiency Update:**
```bash
curl -X POST http://localhost:8080/api/curator/modules/proficiency/update-all \
  -H "x-admin-token: test-admin-token"
```

---

## 🎨 UI Highlights

### Conversational Interface
- **Chat bubbles:** Manager messages (coral), Agent messages (white)
- **Typing indicator:** Animated dots while agent thinks
- **Suggestion buttons:** Quick replies for common actions
- **File upload:** Inline with preview chips
- **Auto-scroll:** Always shows latest message

### Module Preview Card
- **Stats grid:** Target level, estimated time, proficiency target, deadline
- **Content blocks:** Numbered list with source badges
- **Color-coded badges:**
  - Yellow: 🔒 Proprietary
  - Blue: 🤖 AI-Generated
  - Green: 🌐 Public Research

### Analytics Dashboard
- **5 stat cards:** Assigned, In Progress, Completed, At Risk, Overdue
- **Proficiency table:** Current/target % with color-coded progress bars
- **Risk indicators:** Visual badges for each learner

---

## 🔧 Background Job Setup (Optional)

### Option A: Auto-schedule with node-cron

```bash
cd api
npm install node-cron
# Job will auto-start on API boot (runs every hour)
```

### Option B: Manual trigger (testing)

```bash
node api/src/jobs/proficiency-update-job.ts
```

### Option C: External cron (production)

```bash
# Add to crontab
crontab -e

# Run every hour at :00
0 * * * * curl -X POST http://localhost:8080/api/curator/modules/proficiency/update-all -H "x-admin-token: YOUR_TOKEN"
```

---

## 📖 Key Concepts

### Proficiency (NOT Completion)
**Old way:** "Did the learner finish the module?" (binary)  
**New way:** "Can the learner operate at X difficulty level?" (percentage)

**Calculation:** Success rate at target difficulty over last 20 attempts

**Example:**
- Target: Advanced (80% proficiency)
- Current: 65% (13 correct out of 20 advanced questions)
- Status: At Risk (only 5 days until deadline)

### Risk Status
- **Achieved:** Current ≥ Target (e.g., 85% / 80%)
- **On Track:** Making good progress, >7 days to deadline
- **At Risk:** <7 days to deadline, <70% of target
- **Overdue:** Past deadline, not achieved

### Proprietary Content Ring-Fencing
**Problem:** Company secrets in training content must stay private

**Solution:**
- Tag content as `source: 'proprietary'`, `is_ring_fenced: true`
- Filter by `organization_id` on all queries
- Visual badge 🔒 in UI

**Access Control:**
- Org A learner sees Org A proprietary content ✓
- Org B learner cannot see Org A proprietary content ✗

---

## 🎯 Sample User Flow

### Manager Creates Module
1. Visit `/curator/modules/new`
2. Chat: "I need to train engineers on Kubernetes"
3. Agent asks: "What's their current level?"
4. Manager: "Beginner, no prior experience"
5. Agent asks: "When do they need to be proficient?"
6. Manager: "1 month"
7. Agent generates preview with 5 sections
8. Manager uploads company K8s deployment guide (PDF)
9. Agent adds proprietary section
10. Manager clicks "Assign to Team"

### Learner Completes Module
1. Learner assigned module with 80% proficiency target, deadline in 30 days
2. Learner starts learning, answers questions
3. Background job runs hourly, calculates proficiency from attempts
4. After 23 days: Proficiency = 65%, Status = At Risk
5. Manager notified: "Alice is at risk for Kubernetes module"
6. Learner notified: "You have 7 days to reach 80% proficiency"
7. Learner continues, reaches 82% proficiency
8. Status changes to Achieved
9. Manager sees completion in analytics dashboard

---

## 🐛 Troubleshooting

### Issue: "Conversation not found"
**Cause:** Invalid conversation ID or session expired  
**Fix:** Start new conversation (refresh `/curator/modules/new`)

### Issue: Module not created after conversation
**Cause:** Agent needs more info (topic, audience, deadline)  
**Fix:** Answer agent's clarifying questions

### Issue: Proficiency shows 0%
**Cause:** Learner hasn't attempted questions yet  
**Fix:** Need at least 5 attempts at target difficulty level

### Issue: Background job not running
**Cause:** node-cron not installed  
**Fix:** `npm install node-cron` OR trigger manually via API

---

## 📚 Files Reference

### Phase 1: Conversational Infrastructure
- `api/migrations/030_manager_modules_ai_first.sql` - DB schema
- `api/src/services/module-creation-agent.ts` - AI agent logic
- `api/src/routes/manager-modules.ts` - Conversation API

### Phase 2: Proficiency Tracking
- `api/src/services/proficiency-tracking.ts` - Proficiency calculation
- `api/src/jobs/proficiency-update-job.ts` - Background job

### Phase 3: UI
- `web/app/curator/modules/new/page.tsx` - Conversational UI
- `web/app/curator/modules/[id]/analytics/page.tsx` - Analytics with proficiency

### Documentation
- `EPIC14_V2_DELIVERY_SUMMARY.md` - Full implementation details
- `EPIC14_V2_QUICK_START.md` - This file
- `docs/EPIC14_V2_AI_FIRST_CONVERSATIONAL_MODULES.md` - Original spec

---

## ✨ What's Different from v1.0?

| v1.0 (Form-Based) | v2.0 (AI-First Conversational) |
|-------------------|--------------------------------|
| Fill out title, description fields | Chat with AI agent |
| Choose from dropdown: beginner/intermediate/advanced | Agent asks clarifying questions |
| "Estimated time: 30 minutes" (static) | "Achieve 80% proficiency by Oct 30" (dynamic) |
| Module status: Draft/Active/Archived | Risk status: On Track/At Risk/Overdue/Achieved |
| No proprietary content handling | Ring-fenced proprietary content with access control |
| Track completion (binary) | Track proficiency (percentage at target difficulty) |

**Result:** Feels like working with an expert consultant, not filling out database forms.

---

## 🎉 Ready to Go!

**You've successfully set up Epic 14 v2.0!**

**Next:**
1. Create a module via conversation
2. Assign it with a deadline
3. Watch proficiency tracking in real-time

**Need help?** Check `EPIC14_V2_DELIVERY_SUMMARY.md` for detailed docs.

---

**Version:** Epic 14 v2.0  
**Last Updated:** October 20, 2025

