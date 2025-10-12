# Ensemble Content Generation - Troubleshooting Guide

**Epic 6: 3-LLM Ensemble Pipeline**  
**Last Updated:** 2025-10-10  
**Owner:** Engineering Team

---

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Common Issues](#common-issues)
3. [LLM API Errors](#llm-api-errors)
4. [Cost & Performance](#cost--performance)
5. [Canon Storage](#canon-storage)
6. [Database Issues](#database-issues)
7. [Debugging Tools](#debugging-tools)
8. [Escalation](#escalation)

---

## Quick Diagnostics

### Health Check

```bash
# Check if ensemble generation is enabled
curl http://localhost:8080/api/flags | jq '.FF_ENSEMBLE_GENERATION_V1'
# Should return: true

# Check if API keys are configured
curl http://localhost:8080/api/health | jq '.llm_configured'
# Should return: {"openai": true, "anthropic": true}

# Test understanding endpoint
curl -X POST http://localhost:8080/api/content/understand \
  -H "x-admin-token: dev-admin-token-12345" \
  -H "content-type: application/json" \
  -d '{"artefact":"test"}' | jq
```

### Common Symptoms

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| 404 on `/api/content/*` | Feature flag disabled | Set `FF_ENSEMBLE_GENERATION_V1=true` |
| 503 LLM_UNAVAILABLE | API keys missing/invalid | Check `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` |
| Generation stuck at 50% | LLM timeout/rate limit | Check LLM API status, retry |
| Empty modules returned | JSON parsing error | Check LLM response format |
| High costs | No canon reuse | Enable `FF_CONTENT_CANON_V1=true` |

---

## Common Issues

### Issue 1: "Feature not enabled" (404)

**Symptom:** All `/api/content/*` routes return 404 with `{ error: { code: 'NOT_FOUND', message: 'Feature not enabled' } }`

**Cause:** Feature flag `FF_ENSEMBLE_GENERATION_V1` is not set to `true`

**Solution:**
```bash
# Development
export FF_ENSEMBLE_GENERATION_V1=true

# Production (Render/Vercel)
# Add environment variable in dashboard:
FF_ENSEMBLE_GENERATION_V1=true
```

**Verification:**
```bash
curl http://localhost:8080/api/flags | jq '.FF_ENSEMBLE_GENERATION_V1'
```

---

### Issue 2: "LLM_UNAVAILABLE" (503)

**Symptom:** Understanding or generation fails with `{ error: { code: 'LLM_UNAVAILABLE', message: '...' } }`

**Cause:** Missing or invalid API keys for OpenAI, Anthropic, or Google

**Solution:**
```bash
# Check if keys are set
echo $OPENAI_API_KEY
echo $ANTHROPIC_API_KEY
echo $GOOGLE_API_KEY

# Test OpenAI GPT-5 connection
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" | jq '.data[] | select(.id | contains("gpt"))'

# Test Anthropic Claude 4.5 connection
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4.5-20250514","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}' \
  | jq '.content[0].text'

# Test Google Gemini 2.5 Pro connection
# Note: Use Google AI SDK or test via REST API
```

**Get API Keys:**
- OpenAI: https://platform.openai.com/api-keys (for GPT-5)
- Anthropic: https://console.anthropic.com/ (for Claude 4.5 Sonnet)
- Google: https://makersuite.google.com/app/apikey (for Gemini 2.5 Pro)

---

### Issue 3: Generation Stuck in "generating" Status

**Symptom:** `/api/content/generations/:id` shows `status: "generating"` for >2 minutes

**Cause:** 
- LLM API timeout
- Rate limit exceeded
- Background job crashed

**Solution:**

1. **Check logs:**
```bash
# API logs
docker logs cerply-api | grep "Generation error"

# Or in production
render logs tail --service api | grep "Generation error"
```

2. **Check generation in database:**
```sql
SELECT id, status, created_at, updated_at 
FROM content_generations 
WHERE status = 'generating' 
  AND created_at < NOW() - INTERVAL '5 minutes';
```

3. **Manual retry:**
```bash
# Get generation ID from stuck request
GEN_ID="uuid-here"

# Trigger new generation with same artefact
curl -X POST http://localhost:8080/api/content/generate \
  -H "x-admin-token: dev-admin-token-12345" \
  -H "content-type: application/json" \
  -d "{\"generationId\":\"$GEN_ID\",\"contentType\":\"generic\"}"
```

---

### Issue 4: Empty or Invalid Modules

**Symptom:** Generation completes but `modules` array is empty or malformed

**Cause:** 
- LLM returned invalid JSON
- Fact-checker failed to parse Generator A/B outputs

**Solution:**

1. **Check raw LLM outputs:**
```sql
SELECT 
  id,
  generator_a_output,
  generator_b_output,
  fact_checker_output
FROM content_generations
WHERE id = 'generation-uuid';
```

2. **Validate JSON:**
```bash
# Extract and validate
echo '{"modules": [...]}' | jq '.modules | length'
```

3. **Common fixes:**
```typescript
// In llm-orchestrator.ts, add more robust parsing:
try {
  const factCheckerData = JSON.parse(factChecker.content);
} catch (error) {
  console.error('Failed to parse fact-checker output:', factChecker.content);
  throw new Error('Fact-checker returned invalid JSON');
}
```

---

## LLM API Errors

### Rate Limiting

**OpenAI:**
- Free tier: 3 req/min
- Tier 1: 60 req/min
- Tier 5: 10,000 req/min

**Anthropic:**
- Free tier: 5 req/min
- Paid: 1,000+ req/min

**Solution:**
- Implement request queuing
- Add exponential backoff (already implemented)
- Upgrade API tier

### Cost Overruns

**Budget Exceeded:**
```bash
# Check cost of recent generations
curl http://localhost:8080/api/content/generations \
  -H "x-admin-token: dev-admin-token-12345" | jq '[.[] | .totalCost] | add'

# Set budget alerts
export MAX_GENERATION_COST_USD=5.00
export WARN_GENERATION_COST_USD=2.00
```

**Cost Optimization:**
- Enable canon reuse: `FF_CONTENT_CANON_V1=true`
- Use cheaper models for non-critical generations
- Reduce max_tokens in prompts

---

## Cost & Performance

### High Generation Costs

**Expected Costs:**
- Generator A (GPT-5): TBD (to be measured in production)
- Generator B (Claude 4.5): TBD (to be measured in production)
- Fact-Checker (Gemini 2.5 Pro): TBD (to be measured in production)
- **Total per generation: TBD**

**Note:** These models are used ONLY for content building, not standard chat interactions.

**Cost tracking is enabled.** Monitor actual costs via:
```sql
SELECT 
  AVG(total_cost_usd::numeric) as avg_cost_per_generation,
  MIN(total_cost_usd::numeric) as min_cost,
  MAX(total_cost_usd::numeric) as max_cost,
  COUNT(*) as total_generations
FROM content_generations
WHERE status = 'completed'
  AND created_at > NOW() - INTERVAL '7 days';
```

**If costs are higher than expected:**

1. **Check token usage patterns:**
```sql
SELECT 
  AVG(total_tokens) as avg_tokens,
  AVG(total_cost_usd::numeric) as avg_cost,
  AVG(generation_time_ms) as avg_time_ms
FROM content_generations
WHERE status = 'completed';
```

2. **Analyze cost by model:**
```sql
-- Review individual model outputs to identify cost drivers
SELECT 
  id,
  total_cost_usd,
  total_tokens,
  generator_a_output->>'model' as gen_a_model,
  generator_b_output->>'model' as gen_b_model
FROM content_generations
WHERE status = 'completed'
ORDER BY total_cost_usd::numeric DESC
LIMIT 10;
```

3. **Optimize prompts if needed:**
```typescript
// Reduce max_tokens in llm-orchestrator.ts
max_tokens: 2000, // instead of 4000
```

3. **Enable canon reuse:**
```bash
export FF_CONTENT_CANON_V1=true
```

### Slow Generation Times

**Expected Time:** 30-60 seconds end-to-end

**If slower:**

1. **Check LLM latency:**
```bash
curl -w "%{time_total}\n" -X POST http://localhost:8080/api/content/understand \
  -H "x-admin-token: dev-admin-token-12345" \
  -d '{"artefact":"test"}' -o /dev/null
```

2. **Parallel generation:**
```typescript
// In generateWithEnsemble, run A and B in parallel:
const [generatorA, generatorB] = await Promise.all([
  callOpenAI(GENERATOR_1, promptA, systemA),
  callAnthropic(GENERATOR_2, promptB, systemB),
]);
```

---

## Canon Storage

### Canon Not Reusing Content

**Symptom:** All generations treated as unique, no cost savings

**Cause:**
- `FF_CONTENT_CANON_V1` not enabled
- Content not detected as generic
- Similarity threshold too high (>90%)

**Solution:**

1. **Enable canon:**
```bash
export FF_CONTENT_CANON_V1=true
```

2. **Check generic detection:**
```typescript
import { isGenericContent } from './services/canon';

const artefact = "Fire safety procedures...";
console.log(isGenericContent(artefact)); // Should be true
```

3. **Lower similarity threshold (in canon.ts):**
```typescript
if (similarity > 0.85) { // instead of 0.9
  return content.factCheckerOutput;
}
```

### False Generic Detection

**Symptom:** Proprietary content marked as generic and reused incorrectly

**Solution:**

1. **Review generic keywords (in canon.ts):**
```typescript
const GENERIC_KEYWORDS = [
  'fire safety',
  'gdpr',
  // ... add/remove as needed
];
```

2. **Increase keyword threshold:**
```typescript
// Require 3+ keywords instead of 2
return matchCount >= 3;
```

---

## Database Issues

### Migration Failures

**Error:** `table content_generations already exists`

**Solution:**
```bash
# Check current migration version
cd api
npx drizzle-kit check

# Roll back and re-apply
npx drizzle-kit drop --table content_generations
npm run db:migrate
```

### Orphaned Records

**Issue:** Generations stuck in "pending" or "generating" forever

**Cleanup:**
```sql
-- Find stuck generations (>1 hour old)
SELECT id, status, created_at 
FROM content_generations 
WHERE status IN ('pending', 'generating') 
  AND created_at < NOW() - INTERVAL '1 hour';

-- Mark as failed
UPDATE content_generations 
SET status = 'failed', updated_at = NOW()
WHERE status IN ('pending', 'generating') 
  AND created_at < NOW() - INTERVAL '1 hour';
```

---

## Debugging Tools

### Enable Debug Logging

```bash
# In api/.env
LOG_LEVEL=debug

# Restart API
npm run dev
```

### Inspect LLM Responses

```typescript
// In llm-orchestrator.ts, add logging:
console.log('Generator A output:', generatorA.content);
console.log('Generator B output:', generatorB.content);
console.log('Fact-Checker output:', factChecker.content);
```

### Test Individual Components

```bash
# Test understanding only
curl -X POST http://localhost:8080/api/content/understand \
  -H "x-admin-token: dev-admin-token-12345" \
  -d '{"artefact":"Fire safety: evacuate, call 999, meet at assembly point"}' | jq

# Test refinement only
curl -X POST http://localhost:8080/api/content/refine \
  -H "x-admin-token: dev-admin-token-12345" \
  -d '{"generationId":"uuid","feedback":"Focus on evacuation routes"}' | jq

# Test canon detection
node -e "const {isGenericContent} = require('./dist/services/canon'); console.log(isGenericContent('Fire safety and emergency procedures'));"
```

---

## Escalation

### When to Escalate

Escalate to engineering if:
- LLM API consistently returns errors after retry
- Generation costs exceed $2.00 per request
- Database migration fails repeatedly
- Generation time exceeds 5 minutes consistently
- Data loss or corruption in `content_generations` table

### What to Include

1. **Error details:**
   - Full error message and stack trace
   - Generation ID and timestamp
   - API route and request body

2. **Environment:**
   - Feature flag settings (`FF_ENSEMBLE_GENERATION_V1`, `FF_CONTENT_CANON_V1`)
   - LLM model configuration (`LLM_GENERATOR_1`, `LLM_GENERATOR_2`, `LLM_FACT_CHECKER`)
   - API version (from `/api/health`)

3. **Reproduction steps:**
   - Exact curl command or UI steps
   - Input artefact text
   - Expected vs. actual behavior

4. **Impact:**
   - Number of users affected
   - Time duration
   - Business impact (blocked workflow, cost overrun, etc.)

---

## Contact

- **Slack:** #eng-ensemble-generation
- **Email:** engineering@cerply.com
- **On-call:** PagerDuty (for production incidents)

---

**Last Updated:** 2025-10-10  
**Version:** 1.0  
**Epic:** Epic 6 - Ensemble Content Generation

