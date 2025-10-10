# Epic 6: Ensemble Content Generation - QUICK START

## ✅ Status: WORKING & TESTED

Generated **3 learning modules** in **96 seconds** for **$0.033** 🎉

---

## 🚀 Quick Test

```bash
# Start the API (if not running)
cd api && npm run dev

# In another terminal, test the ensemble
bash api/scripts/test-ensemble-api.sh
```

**Expected Result:** 3 modules with questions + provenance in ~90-120 seconds

---

## 🔑 Required Setup

### 1. Environment Variables (`api/.env`)
```bash
FF_ENSEMBLE_GENERATION_V1=true
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
DATABASE_URL=postgresql://cerply:cerply@localhost:5432/cerply
```

### 2. Database Migration
```bash
docker-compose up -d postgres
docker exec -i cerply-pg psql -U cerply -d cerply < api/drizzle/009_ensemble_generation.sql
```

### 3. Verify Setup
```bash
curl http://localhost:8080/api/content/debug | jq
```

Should show:
```json
{
  "featureFlag": true,
  "apiKeys": {
    "openai": true,
    "anthropic": true,
    "google": true
  }
}
```

---

## 🎯 API Usage

### 1. Submit Artefact & Get Understanding
```bash
curl -X POST http://localhost:8080/api/content/understand \
  -H 'Content-Type: application/json' \
  -H 'x-admin-token: dev-admin-token-12345' \
  -d '{
    "artefact": "Fire safety: Exit via stairs, not lifts. Call 999. Meet at assembly point."
  }'
```

**Response:**
```json
{
  "generationId": "abc-123",
  "understanding": "This covers fire evacuation procedures...",
  "cost": 0.002,
  "tokens": 250
}
```

### 2. (Optional) Refine Understanding
```bash
curl -X POST http://localhost:8080/api/content/refine \
  -H 'Content-Type: application/json' \
  -H 'x-admin-token: dev-admin-token-12345' \
  -d '{
    "generationId": "abc-123",
    "feedback": "Focus more on assembly point procedures"
  }'
```

### 3. Generate Content with 3-LLM Ensemble
```bash
curl -X POST http://localhost:8080/api/content/generate \
  -H 'Content-Type: application/json' \
  -H 'x-admin-token: dev-admin-token-12345' \
  -d '{
    "generationId": "abc-123"
  }'
```

**Response:**
```json
{
  "status": "generating",
  "estimatedTimeSeconds": 45,
  "pollUrl": "/api/content/generations/abc-123"
}
```

### 4. Poll for Results
```bash
curl http://localhost:8080/api/content/generations/abc-123 \
  -H 'x-admin-token: dev-admin-token-12345'
```

**Response (when complete):**
```json
{
  "status": "completed",
  "modules": [
    {
      "id": "module-1",
      "title": "Understanding Evacuation Routes",
      "content": "...",
      "questions": [...],
      "provenance": {
        "content_source": "generator-a",
        "questions_source": ["generator-b-q1", "generator-a-q2"]
      }
    }
  ],
  "provenance": [...],
  "totalCost": 0.033,
  "totalTokens": 10307,
  "generationTimeMs": 96281
}
```

---

## 🤖 Current LLM Models

| Role | Model | Purpose |
|------|-------|---------|
| Understanding | **GPT-4o** | Analyzes source material |
| Generator A | **GPT-4o** | First draft |
| Generator B | **Claude 3 Haiku** | Alternative perspective |
| Fact-Checker | **Gemini 2.5 Pro** ✅ | Final selection + provenance |

---

## 💰 Typical Costs

| Operation | Cost | Time |
|-----------|------|------|
| Understanding | $0.002 | 3s |
| Refinement | $0.002 | 3s |
| Full Generation | $0.03-0.05 | 90-120s |

**Total per artefact:** ~$0.04 (4 cents)

---

## 🎨 UI Pages

1. **/curator/understand** - Submit artefacts
2. **/curator/refine/[id]** - Iterative feedback
3. **/curator/generate/[id]** - View results + provenance

---

## 🐛 Troubleshooting

### "Feature not enabled"
```bash
# Check .env file has:
FF_ENSEMBLE_GENERATION_V1=true

# Restart API
cd api && npm run dev
```

### "LLM_UNAVAILABLE"
```bash
# Check API keys are set
echo $OPENAI_API_KEY
echo $ANTHROPIC_API_KEY  
echo $GOOGLE_API_KEY

# Or add to api/.env
```

### "Database error"
```bash
# Ensure PostgreSQL is running
docker-compose up -d postgres

# Run migration
docker exec -i cerply-pg psql -U cerply -d cerply < api/drizzle/009_ensemble_generation.sql
```

### Generation stuck at "generating"
- Normal! Takes 90-120 seconds for 3 LLM calls
- Check API logs: `npm run dev` output shows progress
- If > 3 minutes, check API logs for errors

---

## 📚 Full Documentation

- **Delivery Summary:** `EPIC6_FINAL_DELIVERY.md`
- **Functional Spec:** `docs/functional-spec.md` §26
- **Troubleshooting:** `docs/runbooks/ensemble-troubleshooting.md`
- **Feature Flags:** `docs/spec/flags.md`

---

## ✅ Verification

Run this to verify everything works:
```bash
bash api/scripts/test-ensemble-api.sh
```

Should complete in ~90-120 seconds with 3 modules generated! 🚀

