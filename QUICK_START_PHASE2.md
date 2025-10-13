# Quick Start: Epic 8 Phase 2 Testing

## Prerequisites

You'll need:
1. ✅ PostgreSQL running (for database)
2. ⚠️ **OpenAI API key** (get from https://platform.openai.com/api-keys)
3. ✅ A question ID from your database

---

## Step 1: Set Environment Variables

```bash
# Required
export FF_CONVERSATIONAL_UI_V1=true
export ADMIN_TOKEN=test-admin-token-12345
export OPENAI_API_KEY=sk-your-actual-key-here

# Optional (defaults are fine)
export CHAT_LLM_MODEL=gpt-4o-mini
export EXPLANATION_CACHE_TTL=3600
```

**Or** create an `.env` file in the `api/` directory:

```bash
# api/.env
FF_CONVERSATIONAL_UI_V1=true
ADMIN_TOKEN=test-admin-token-12345
OPENAI_API_KEY=sk-your-actual-key-here
CHAT_LLM_MODEL=gpt-4o-mini
EXPLANATION_CACHE_TTL=3600
```

---

## Step 2: Start the API

```bash
cd api
npm run dev
```

You should see:
```
🚀 API listening on http://localhost:8080
✅ Health check: http://localhost:8080/api/health
```

---

## Step 3: Get a Question ID

You need a real question ID from your database. If you've run the demo seed:

```bash
# Connect to your database
psql -d cerply_dev

# Get a question ID
SELECT id, stem FROM items LIMIT 1;

# Copy the UUID, e.g., "550e8400-e29b-41d4-a716-446655440000"
```

---

## Step 4: Test the Explanation Endpoint

Replace `YOUR_QUESTION_ID` with a real UUID from your database:

```bash
curl -X POST http://localhost:8080/api/chat/explanation \
  -H "Content-Type: application/json" \
  -H "x-admin-token: test-admin-token-12345" \
  -d '{
    "questionId": "YOUR_QUESTION_ID",
    "query": "Why is this the correct answer?"
  }'
```

**Expected Response:**
```json
{
  "explanation": "Here's why option B is correct...",
  "model": "gpt-4o-mini",
  "tokensUsed": 245,
  "cost": 0.000098,
  "cached": false,
  "confusionLogId": "uuid"
}
```

---

## Step 5: Test Caching

Run the **same** curl command again. You should see:

```json
{
  "explanation": "Here's why option B is correct...",
  "model": "gpt-4o-mini",
  "tokensUsed": 0,
  "cost": 0,
  "cached": true
}
```

Notice:
- ✅ `cached: true`
- ✅ `tokensUsed: 0`
- ✅ `cost: 0`
- ✅ **Much faster response** (<10ms vs 1-2 seconds)

---

## Troubleshooting

### Error: "Feature not enabled"
```json
{"error":{"code":"NOT_FOUND","message":"Feature not enabled"}}
```

**Fix:** Set the feature flag:
```bash
export FF_CONVERSATIONAL_UI_V1=true
```

---

### Error: "OPENAI_API_KEY environment variable is required"
```json
{"error":{"code":"INTERNAL_ERROR","message":"OPENAI_API_KEY environment variable is required"}}
```

**Fix:** Set your OpenAI API key:
```bash
export OPENAI_API_KEY=sk-your-key-here
```

Get a key from: https://platform.openai.com/api-keys

---

### Error: "Question not found"
```json
{"error":{"code":"INTERNAL_ERROR","message":"Question not found"}}
```

**Fix:** Use a real question ID from your database:
```bash
psql -d cerply_dev -c "SELECT id FROM items LIMIT 1;"
```

---

## Running Tests

### Skip tests if no API key:

```bash
cd api
npm run test tests/explanation-engine.test.ts
```

The tests will skip if `OPENAI_API_KEY` is not set.

### Run tests with API key:

```bash
export OPENAI_API_KEY=sk-your-key-here
cd api
npm run test tests/explanation-engine.test.ts
```

---

## What to Look For

### ✅ Success Indicators

1. **First call:**
   - Takes 1-2 seconds
   - Returns explanation text
   - `cached: false`
   - `cost > 0` (around $0.0001)
   - `tokensUsed > 0` (around 200-300)

2. **Second call (same question/query):**
   - Takes <10ms
   - Returns same explanation
   - `cached: true`
   - `cost: 0`
   - `tokensUsed: 0`

3. **Confusion log:**
   - Check database: `SELECT * FROM confusion_log;`
   - Should see entry with your query

---

## Cost Monitoring

Watch your OpenAI costs:

```bash
# Each explanation costs ~$0.0001 (gpt-4o-mini)
# Cached explanations cost $0

# Example: 1000 explanations per day
# - Without caching: $0.10/day
# - With 60% cache hit rate: $0.04/day
```

---

## Next Steps

Once Phase 2 is working:
- ✅ Commit the changes
- 🚀 Continue to Phase 3 (Free-Text Validation)
- 📊 Monitor costs in OpenAI dashboard

---

## Quick Reference

| Endpoint | Method | Headers | Body |
|----------|--------|---------|------|
| `/api/chat/explanation` | POST | `x-admin-token: test-admin-token-12345` | `{"questionId":"uuid","query":"text"}` |

| Environment Variable | Required | Default | Description |
|---------------------|----------|---------|-------------|
| `FF_CONVERSATIONAL_UI_V1` | ✅ Yes | `false` | Enable feature |
| `OPENAI_API_KEY` | ✅ Yes | - | OpenAI API key |
| `CHAT_LLM_MODEL` | No | `gpt-4o-mini` | LLM model |
| `EXPLANATION_CACHE_TTL` | No | `3600` | Cache seconds |

---

**Need help?** Check:
- `EPIC8_PHASE2_DELIVERY.md` - Full technical details
- `EPIC8_STATUS.md` - Current status
- `docs/functional-spec.md` §29 - Feature documentation

