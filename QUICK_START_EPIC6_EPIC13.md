# Quick Start: Epic 6.6 & Epic 13 Testing

**5-Minute Setup → Automated Testing → Manual Validation**

---

## 📋 Step 1: Apply Database Migrations (2 minutes)

Copy and paste into your terminal:

```bash
cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/api
npm run migrate
```

**Expected Output:**
```
Migration 020_agent_conversations.sql applied ✓
Migration 021_agent_tool_calls.sql applied ✓
Migration 022_batch_generation.sql applied ✓
```

**If you see "already applied":** ✅ Great! Migrations are already done.

---

## 🚀 Step 2: Restart API Server with Feature Flags (1 minute)

### 2a. Kill existing API server

```bash
lsof -ti:8080 | xargs kill -9
```

**Expected:** No output (server killed silently)

### 2b. Start API with new flags

```bash
cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/api
bash start-local.sh
```

**Expected Output:**
```
🚀 Starting API server...
   OPENAI_API_KEY: sk-proj-L_...
   ADMIN_TOKEN: test-admin-token

[Agent] Registered tool: searchTopics
[Agent] Registered tool: detectGranularity
[Agent] Registered tool: getUserProgress
[Agent] Registered tool: generateContent
[Agent] Registered tool: confirmWithUser
[Agent] Registered tool: storeDecision
[AgentTools] Registered 6 default tools
Server listening at http://0.0.0.0:8080
```

**✅ If you see "Registered 6 default tools":** Epic 13 is active!

**Keep this terminal open** - the server needs to keep running.

---

## ✅ Step 3: Validate Feature Flags (30 seconds)

Open a **new terminal window** and run:

```bash
# Test Epic 13: Agent Orchestrator
curl -X POST http://localhost:8080/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: test-admin-token" \
  -d '{"userId":"00000000-0000-0000-0000-000000000001","message":"test","conversationHistory":[]}' \
  | jq

# Test Epic 6.6: Batch Generation
curl -X POST http://localhost:8080/api/content/batch/upload \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: test-admin-token" \
  -d '{"csvData":"title,category,difficulty\nTest,Soft Skills,beginner","phase":"uat"}' \
  | jq
```

**Expected for Epic 13:**
```json
{
  "message": "I'm not sure I understood that. Could you tell me what you'd like to learn...",
  "toolCalls": [...],
  "conversationId": "..."
}
```
✅ **If you see this:** Epic 13 is working!

**Expected for Epic 6.6:**
```json
{
  "batchId": "...",
  "status": "queued",
  "totalTopics": 1,
  "message": "Batch created successfully"
}
```
✅ **If you see this:** Epic 6.6 is working!

**If you see `"FEATURE_NOT_ENABLED"` or `"NOT_FOUND"`:** 
❌ Feature flags didn't apply - restart API server (Step 2b)

---

## 🧪 Step 4: I'll Run Automated Tests

Once you confirm Step 3 passed, **tell me** and I'll automatically run:

### Epic 13 Tests (~2 minutes, $0.05 cost)

1. Meta-request handling ("learn something new")
2. Specific topic request ("quantum physics")
3. Subject refinement ("physics" → clarification)
4. Affirmative detection ("yes", "it is")
5. Tool execution audit
6. Conversation memory
7. Performance measurement

### Epic 6.6 Tests (~30 seconds, no cost)

1. Invalid CSV validation
2. Empty batch handling
3. Progress API
4. Pause/resume endpoints

---

## 💰 Step 5: Mini UAT ($0.90, 20 minutes)

**After automated tests pass**, we'll run a small content generation test:

```bash
curl -X POST http://localhost:8080/api/content/batch/upload \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: test-admin-token" \
  -d '{
    "csvData": "title,category,difficulty\nActive Listening,Soft Skills,beginner\nTime Management,Soft Skills,beginner\nRisk Management,Financial Services,advanced",
    "phase": "uat"
  }'
```

**Save the `batchId` from the response**, then monitor progress:

```bash
# Replace BATCH_ID_HERE with the actual ID
BATCH_ID="BATCH_ID_HERE"

# Monitor every 30 seconds
watch -n 30 "curl -s http://localhost:8080/api/content/batch/$BATCH_ID/progress \
  -H 'X-Admin-Token: test-admin-token' | jq"
```

**Expected:** 3 topics generated in 15-20 minutes, total cost ~$0.90

**Quality Gates:**
- ✅ Avg quality score: >0.90
- ✅ Avg citation accuracy: >0.95
- ✅ Cost per topic: <$0.40
- ✅ All topics: status "completed"

---

## 🎯 Step 6: Manual Browser Testing

### Test Epic 13 in Browser

1. Open **new terminal window** for web server:
   ```bash
   cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/web
   
   # Enable agent in frontend
   echo "NEXT_PUBLIC_FF_AGENT_ORCHESTRATOR_V1=true" >> .env.local
   
   npm run dev
   ```

2. Open browser: `http://localhost:3000`

3. Hard refresh: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows/Linux)

4. **Test Scenarios:**

   **Test A: Meta Request**
   - Type: "learn something new"
   - ✅ **Expected:** "Perfect. What would you like to learn?"
   
   **Test B: Specific Topic**
   - Type: "quantum physics"
   - ✅ **Expected:** "Right, quantum physics. We'll explore..." with confirmation
   
   **Test C: Affirmative**
   - Type: "yes"
   - ✅ **Expected:** "Thank you. While we wait, would you like to..."
   
   **Test D: Subject Refinement**
   - Type: "physics"
   - ✅ **Expected:** "Physics is quite broad. Would you like to explore Astrophysics, Quantum Physics..."

5. **Check Browser Console** (F12 → Console tab)
   - ✅ No errors
   - ✅ See agent tool calls logged

---

## 📊 What I Need From You

### Right Now:
1. ✅ Run **Step 1** (migrations)
2. ✅ Run **Step 2** (restart API)
3. ✅ Run **Step 3** (validate flags)
4. ✅ **Tell me:** "Flags validated" or paste any errors

### After I Run Automated Tests:
5. ✅ Approve **Step 5** (Mini UAT - $0.90)
6. ✅ Run **Step 6** (browser testing) and report results

### Final Decision:
7. ✅ Approve **Full UAT** (20 topics, $6.00) OR
8. ✅ Approve **Production** (400 topics, $100) OR
9. ✅ Request changes

---

## 🚨 Troubleshooting

### "Migration already applied" error
✅ **This is fine!** It means migrations ran before. Proceed to Step 2.

### "Port 8080 already in use"
```bash
# Kill all processes on port 8080
lsof -ti:8080 | xargs kill -9

# Try Step 2b again
cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/api
bash start-local.sh
```

### "FEATURE_NOT_ENABLED" in Step 3
```bash
# Check if feature flags are in environment
env | grep FF_

# If empty, manually export:
export FF_BATCH_GENERATION_V1=true
export FF_AGENT_ORCHESTRATOR_V1=true

# Restart API
cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/api
bash start-local.sh
```

### "Cannot connect to database"
✅ **This is expected** - your `start-local.sh` already has the correct `DATABASE_URL`. If migrations fail, check your internet connection (database is in Frankfurt).

---

## ⏱️ Time Estimates

| Step | Time | Cost |
|------|------|------|
| Migrations | 2 min | $0 |
| API Restart | 1 min | $0 |
| Flag Validation | 30 sec | $0 |
| Automated Tests | 3 min | $0.05 |
| Mini UAT | 20 min | $0.90 |
| Browser Testing | 5 min | $0 |
| **TOTAL** | **~32 min** | **$0.95** |

After this, you'll have **validated both epics** and can decide on full UAT or production.

---

## ✅ Success Criteria

**Epic 13 (Agent Orchestrator):**
- ✅ All 6 tools registered
- ✅ Agent responds intelligently to edge cases
- ✅ Performance <500ms p95
- ✅ Cost per conversation <$0.01

**Epic 6.6 (Content Seeding):**
- ✅ Batch job created successfully
- ✅ Quality score >0.90
- ✅ Citation accuracy >95%
- ✅ Cost per topic <$0.40
- ✅ Budget ceiling enforced ($100 max)

---

**Ready? Start with Step 1 and let me know when you've validated Step 3!** 🚀

