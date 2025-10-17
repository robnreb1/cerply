# Simple Setup Instructions - Epic 6.6 & Epic 13

**You have a Drizzle migration prompt waiting for input. Follow these steps:**

---

## 🔧 Step 1: Answer Drizzle Prompts (in your terminal)

Drizzle is asking about schema changes. **Answer these prompts:**

### Prompt: "Is icon column in badges table created or renamed?"
**Answer:** Press **↓** (down arrow) then **Enter** to select:
```
+ icon            create column
```

### Continue answering prompts:
- For **any other prompts**: Choose **"create column"** for new columns
- If asked **"Do you want to continue?"**: Type **`y`** and press **Enter**

**Wait for:** "✅ Changes applied successfully!" or similar

---

## 🚀 Step 2: Restart API Server with Feature Flags

### 2a. Kill Current API Server

In your terminal, run:
```bash
lsof -ti:8080 | xargs kill -9
```

**Expected:** No output (silent success)

### 2b. Start API with New Feature Flags

```bash
cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/api
bash start-local.sh
```

**Expected output (look for these lines):**
```
🚀 Starting API server...
[Agent] Registered tool: searchTopics
[Agent] Registered tool: detectGranularity
[Agent] Registered tool: getUserProgress
[Agent] Registered tool: generateContent
[Agent] Registered tool: confirmWithUser
[Agent] Registered tool: storeDecision
[AgentTools] Registered 6 default tools
Server listening at http://0.0.0.0:8080
```

**✅ Success indicator:** See "Registered 6 default tools"

**Leave this terminal window open** - server must keep running.

---

## ✅ Step 3: Test Feature Flags

Open a **NEW terminal window** and run:

```bash
# Test Epic 13 (Agent Orchestrator)
curl -X POST http://localhost:8080/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: test-admin-token" \
  -d '{"userId":"00000000-0000-0000-0000-000000000001","message":"quantum physics","conversationHistory":[]}' \
  | jq

# Test Epic 6.6 (Batch Generation)
curl -X POST http://localhost:8080/api/content/batch/upload \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: test-admin-token" \
  -d '{"csvData":"title,category,difficulty\nTest Topic,Soft Skills,beginner","phase":"uat"}' \
  | jq
```

### ✅ Expected Results:

**Epic 13 should return:**
```json
{
  "message": "Right, quantum physics. We'll explore...",
  "conversationId": "...",
  "toolCalls": [...]
}
```

**Epic 6.6 should return:**
```json
{
  "batchId": "abc-123-...",
  "status": "queued",
  "totalTopics": 1,
  "message": "Batch created successfully"
}
```

### ❌ If you see errors:

**"FEATURE_NOT_ENABLED"** → Feature flags not loaded. Restart API server (Step 2).

**"NOT_FOUND"** → Same as above.

**"FORBIDDEN"** or "Authentication required" → Check `X-Admin-Token` header.

---

## 📢 Step 4: Tell Me the Results

Once you've completed Steps 1-3, **tell me one of these:**

✅ **"Both tests passed"** → I'll run automated tests

⚠️ **"Epic 13 failed"** → Paste the error, I'll fix

⚠️ **"Epic 6.6 failed"** → Paste the error, I'll fix

⚠️ **"Both failed"** → Paste both errors, I'll debug

---

## 🎯 After Tests Pass

I'll automatically run:

1. **Epic 13 Edge Cases** (~2 min, $0.05)
   - Meta requests ("learn something new")
   - Subject refinement ("physics" → narrowing)
   - Affirmative detection
   - Performance measurement

2. **Epic 6.6 Validation** (~30 sec, no cost)
   - Invalid CSV handling
   - Progress monitoring
   - Pause/resume

3. **Mini UAT** (with your approval: 3 topics, 20 min, $0.90)
   - Full content generation test
   - Quality validation

---

## 📊 Total Time

- **Step 1 (Drizzle):** 2 minutes
- **Step 2 (Restart):** 1 minute
- **Step 3 (Test):** 30 seconds
- **Tell me results:** Instant
- **I run automated tests:** 3 minutes
- **TOTAL:** ~7 minutes to full validation (excluding Mini UAT)

---

## 🚨 Troubleshooting

### Drizzle hangs or shows errors
```bash
# Press Ctrl+C to cancel
# Try force push:
cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/api
DATABASE_URL="postgresql://cerply_app:ZTv6yzkW3EaO7Hf3n4y12VrdRGtikO8T@dpg-d324843uibrs739hldp0-a.frankfurt-postgres.render.com/cerply?sslmode=require" npx drizzle-kit push --force
```

### Port 8080 already in use
```bash
# Kill all node processes
pkill -9 node

# Try starting API again
cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/api
bash start-local.sh
```

### Can't find `jq` command
```bash
# Install jq (if needed)
brew install jq

# Or run without jq:
curl -X POST http://localhost:8080/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: test-admin-token" \
  -d '{"userId":"00000000-0000-0000-0000-000000000001","message":"quantum physics","conversationHistory":[]}'
```

---

**Ready? Start with Step 1 (answer the Drizzle prompt in your terminal), then continue to Steps 2-3!** 🚀

