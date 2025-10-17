# 🌙 PhD Ensemble Pilot - Overnight Run

## **Status: RUNNING** ✅

Started: **Thu Oct 16 21:58:46 BST 2025**

---

## **Configuration**

### **Model Pipeline:**
```
GPT-5 (Lead Researcher)
  ↓ Fallback: o3
Claude Opus 4 (Academic Critique)
  ↓
GPT-4o (Factual Verification)
```

### **Topics (3):**
1. **Python Programming Language** [IN PROGRESS]
   - Category: python_coding
   - Expected: 15,000 words, $3.00, 10-15 min

2. **Enterprise Architecture** [QUEUED]
   - Category: enterprise_architecture
   - Expected: 15,000 words, $3.00, 10-15 min

3. **Starting a Tech Business in the UK** [QUEUED]
   - Category: tech_startup_uk
   - Expected: 12,000 words, $2.50, 10-15 min

**Total Expected:**
- Duration: 30-45 minutes
- Cost: $7.50-$9.00
- Words: ~42,000

---

## **Monitor Progress**

### **Real-time Log:**
```bash
tail -f /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/phd-pilot-overnight.log
```

### **Check Current Status:**
```bash
cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh

# Quick status
tail -30 phd-pilot-overnight.log

# Check results file (updates after each topic)
cat phd-pilot-logs/pilot_20251016_215846_results.json | jq
```

### **Topic-specific Logs:**
```bash
# Detailed log with API responses
cat phd-pilot-logs/pilot_20251016_215846.log
```

---

## **What's Happening**

### **Phase 1: Lead Research (GPT-5)**
- Generating 5 comprehensive sections
- Adding 15+ code examples
- Citing 30+ authoritative sources
- Creating 6-8 learning modules
- **Time:** 8-12 minutes
- **Output:** ~16,000 tokens (15,000 words)

### **Phase 2: Academic Critique (Claude Opus 4)**
- Scoring logical coherence, rigor, pedagogy, accessibility
- Identifying gaps and issues
- Refining module suggestions
- **Time:** 2-3 minutes
- **Output:** ~2,000 tokens

### **Phase 3: Factual Verification (GPT-4o)**
- Verifying every cited claim
- Flagging hallucinations and errors
- Checking citation accuracy
- **Time:** 3-4 minutes
- **Output:** ~4,000 tokens

### **Phase 4: Database Storage**
- Storing content sections
- Storing citations with full metadata
- Storing suggested modules
- Storing verification flags
- **Time:** <1 minute

---

## **Expected Timeline**

| Time | Event |
|------|-------|
| 21:58 | Started - Python begins |
| 22:13 | Python complete (~15 min) |
| 22:13 | 30 second pause |
| 22:14 | Enterprise Architecture begins |
| 22:29 | Enterprise Architecture complete (~15 min) |
| 22:29 | 30 second pause |
| 22:30 | Tech Startup UK begins |
| 22:45 | Tech Startup UK complete (~15 min) |
| **22:45** | **ALL COMPLETE** ✅ |

---

## **Retrieve Results (After Completion)**

### **View Summary:**
```bash
cat phd-pilot-logs/pilot_20251016_215846_results.json | jq
```

### **View Python Topic:**
```bash
# Get topic ID from results
PYTHON_ID=$(cat phd-pilot-logs/pilot_20251016_215846_results.json | jq -r '.topics[0].topicId')

# View full content
curl -s http://localhost:8080/api/content/phd-topic/$PYTHON_ID \
  -H "X-Admin-Token: test-admin-token" | jq > python_content.json

# View sections
jq '.sections[] | {type, title, wordCount}' python_content.json

# View code examples
jq '.sections[] | select(.type=="technical") | .codeExamples[]' python_content.json

# View citations
jq '.citations | length' python_content.json

# View verification flags
jq '.verificationFlags' python_content.json

# View suggested modules
jq '.suggestedModules[] | {title, assessmentType}' python_content.json
```

### **Quality Metrics:**
```bash
# For each topic
curl -s http://localhost:8080/api/content/phd-topic/$TOPIC_ID \
  -H "X-Admin-Token: test-admin-token" | jq '{
    title: .topic.title,
    wordCount: .sections | map(.wordCount) | add,
    citationCount: .citations | length,
    verificationAccuracy: .provenance.verificationAccuracy,
    totalCost: .provenance.totalCostUsd,
    critiqueScores: .provenance | {
      coherence: .critiqueOutput.scores.logicalCoherence,
      rigor: .critiqueOutput.scores.factualRigor,
      pedagogy: .critiqueOutput.scores.pedagogicalQuality,
      accessibility: .critiqueOutput.scores.accessibility
    }
  }'
```

---

## **Success Criteria**

### ✅ **Content Quality:**
- [ ] Comprehensive coverage (no major gaps)
- [ ] Accessible language (no unnecessary jargon)
- [ ] Well-structured sections (logical progression)
- [ ] Rich examples (code/diagrams where appropriate)

### ✅ **Citations:**
- [ ] Minimum 30 authoritative sources per topic
- [ ] Mix of academic papers, specs, and industry reports
- [ ] All claims properly cited

### ✅ **Verification:**
- [ ] Accuracy > 0.95 (95%+)
- [ ] < 5 critical flags per topic
- [ ] All hallucinations caught

### ✅ **Pedagogy:**
- [ ] 6-8 learning modules per topic
- [ ] Clear learning objectives
- [ ] Non-MCQ assessments (code review, case analysis, design critique, essay, project)
- [ ] Logical progression (foundational → advanced)

### ✅ **Performance:**
- [ ] < 15 minutes per topic
- [ ] < $4.00 per topic
- [ ] No crashes or JSON parse errors

---

## **If Something Goes Wrong**

### **Check Server Status:**
```bash
curl -s http://localhost:8080/api/health | jq
```

### **Check Process:**
```bash
ps aux | grep "run-phd-pilot-overnight"
```

### **View Errors:**
```bash
tail -100 phd-pilot-overnight.log | grep -i error
```

### **Restart:**
```bash
# Kill existing run
pkill -f "run-phd-pilot-overnight"

# Restart
cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh
nohup bash run-phd-pilot-overnight.sh > phd-pilot-overnight.log 2>&1 &
```

---

## **Files Created**

1. `/Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/run-phd-pilot-overnight.sh` - Batch script
2. `/Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/phd-pilot-overnight.log` - Main log
3. `/Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/phd-pilot-logs/pilot_20251016_215846.log` - Detailed log
4. `/Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/phd-pilot-logs/pilot_20251016_215846_results.json` - Results

---

**Expected completion: ~10:45 PM BST (45 minutes from start)**
**Check back in the morning for full results!** 🌙

