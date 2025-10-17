# 🔄 PhD Test Run - Single Topic (Python)

## **Status: GENERATING NOW** ⏳

**Started:** Just now  
**Expected Duration:** 10-15 minutes  
**Expected Cost:** $2.50-$4.00  

---

## **What's Happening**

### **Phase 1: Lead Research (GPT-5)** [CURRENT]
- Generating 5 comprehensive sections
- Adding 15+ code examples
- Citing 30+ authoritative sources
- Creating 6-8 learning modules
- **Time:** 8-12 minutes
- **Output:** ~15,000 words

### **Phase 2: Academic Critique (Claude Opus 4)** [PENDING]
- Scoring quality, rigor, pedagogy, accessibility
- **Time:** 2-3 minutes

### **Phase 3: Factual Verification (GPT-4o)** [PENDING]
- Verifying every cited claim
- **Time:** 3-4 minutes

---

## **Monitor Progress**

### **Check if still running:**
```bash
ps aux | grep "curl.*phd-topic" | grep -v grep
```

### **View output (updates in real-time):**
```bash
tail -f phd-test-python.log
```

### **Quick status:**
```bash
# If file is growing, it's still running
ls -lh phd-test-python.log

# Check server logs
tail -20 api/events.ndjson
```

---

## **What to Expect**

The response will be JSON with:

```json
{
  "topicId": "uuid-here",
  "title": "Python Programming Language",
  "wordCount": 15000,
  "citationCount": 30,
  "moduleCount": 8,
  "totalCost": 3.50,
  "totalTime": 720000,
  "sections": [...],
  "citations": [...],
  "suggestedModules": [...],
  "provenance": {
    "leadModel": "gpt-5",
    "critiqueModel": "claude-opus-4",
    "verifyModel": "gpt-4o",
    "verificationAccuracy": 0.98
  }
}
```

---

## **If It Fails**

1. **Check the error:**
```bash
cat phd-test-python.log | jq
```

2. **Check server logs:**
```bash
tail -50 api/events.ndjson | grep -i error
```

3. **Common issues:**
- Token limit exceeded (already fixed to 16K)
- API key invalid (GPT-5 confirmed available)
- Model not available (will fall back to o3)
- Claude API key missing (check ANTHROPIC_API_KEY)

---

## **Next Steps (After Success)**

1. **View the generated content:**
```bash
# Get topic ID from response
TOPIC_ID=$(cat phd-test-python.log | jq -r '.topicId')

# View full content
curl -s http://localhost:8080/api/content/phd-topic/$TOPIC_ID \
  -H "X-Admin-Token: test-admin-token" | jq > python_full.json

# Check sections
jq '.sections[] | {type, title, wordCount}' python_full.json

# View code examples
jq '.sections[] | select(.type=="technical") | .codeExamples[0:3]' python_full.json

# Check citations
jq '.citations | length' python_full.json
```

2. **Validate quality:**
```bash
jq '{
  wordCount: .sections | map(.wordCount) | add,
  citations: .citations | length,
  modules: .suggestedModules | length,
  accuracy: .provenance.verificationAccuracy,
  cost: .provenance.totalCostUsd
}' python_full.json
```

3. **If successful, run all 3 topics:**
```bash
bash run-phd-pilot-overnight.sh
```

---

**Expected completion: ~15 minutes from now**

Use `tail -f phd-test-python.log` to watch progress in real-time!

