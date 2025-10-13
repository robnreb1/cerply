# Epic 6: Content Quality Testing Guide

**Date:** 2025-10-13  
**Purpose:** Test 3 topics manually before Epic 6.6 batch seeding  
**Quality Criteria:** >0.90 score, >95% citation accuracy, <$0.30/topic

---

## 🎯 Testing Goals

**Before batching 100 topics, we need to validate:**
1. Content quality meets raised threshold (>0.90 vs previous 0.80)
2. Citation accuracy is excellent (>95% vs previous 80%)
3. Cost per topic is acceptable (<$0.30)
4. Module count is correct (4-6 per topic)
5. No ethical flags triggered

---

## 📋 Test Topics (3 Selected)

### Soft Skills (2 topics)
1. **"Effective Delegation"** - Management skill
2. **"Active Listening"** - Communication skill

### Financial Services (1 topic)
3. **"Risk Management Basics"** - Technical content

**Why these topics:**
- Represent both major domains (soft skills + financial services)
- Mix of management, communication, and technical content
- Commonly requested by B2B clients
- Good variety to test LLM versatility

---

## 🔧 Prerequisites

### 1. Environment Setup

**Staging Environment:**
```bash
export DATABASE_URL="postgresql://cerply_app:ZTv6yzkW3EaO7Hf3n4y12VrdRGtikO8T@dpg-d324843uibrs739hldp0-a.frankfurt-postgres.render.com/cerply"
export OPENAI_API_KEY="your-key-here"
export ANTHROPIC_API_KEY="your-key-here"
export GOOGLE_GENERATIVE_AI_API_KEY="your-key-here"
```

**Feature Flags:**
```bash
export FF_ENSEMBLE_GENERATION_V1=true
export FF_CONTENT_CANON_V1=true
```

**Admin Token:**
```bash
export ADMIN_TOKEN="your-admin-token-here"
```

### 2. Verify Epic 6 is Running

```bash
# Check API health
curl http://localhost:8080/api/health

# Verify ensemble endpoint exists
curl -X OPTIONS http://localhost:8080/api/content/generate \
  -H "x-admin-token: $ADMIN_TOKEN"
```

### 3. Create Test Organization & Subject

```bash
# Get or create organization
ORG_ID="00000000-0000-0000-0000-000000000001"  # Default test org

# Get or create default subject (from P0 migration)
SUBJECT_ID="00000000-0000-0000-0000-000000000001"  # General Knowledge
```

---

## 🧪 Test Procedure (Per Topic)

### Step 1: Generate Topic Content

**Request:**
```bash
curl -X POST http://localhost:8080/api/content/generate \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -d '{
    "input": "Teach me Effective Delegation",
    "organizationId": "'$ORG_ID'",
    "subjectId": "'$SUBJECT_ID'",
    "mode": "research"
  }' | jq > test_topic_1_response.json
```

**Expected Response:**
```json
{
  "generationId": "uuid-here",
  "status": "success",
  "inputType": "topic",
  "understanding": "Core Topic: Effective Delegation. Domain: Management...",
  "topic": {
    "title": "Effective Delegation",
    "modules": [
      {
        "title": "Understanding Delegation",
        "content": "...",
        "citations": [...]
      },
      {
        "title": "Choosing What to Delegate",
        "content": "...",
        "citations": [...]
      },
      // ... 4-6 modules total
    ]
  },
  "meta": {
    "qualityScore": 0.92,
    "generatorA": "gpt-4o",
    "generatorB": "claude-sonnet-4.5-20250514",
    "factChecker": "o3-mini-2025-01-31",
    "tokensUsed": 12500,
    "costUsd": 0.25,
    "generationTimeMs": 180000
  },
  "citations": [
    {
      "title": "The Art of Delegation",
      "author": "Harvard Business Review",
      "sourceType": "article",
      "validationStatus": "verified",
      "confidence": 0.98
    },
    // ... 6-12 citations total
  ]
}
```

### Step 2: Quality Assessment

**2.1 Module Count Check**
```bash
# Count modules
cat test_topic_1_response.json | jq '.topic.modules | length'
# Expected: 4-6 modules
# PASS if: >= 4 and <= 6
# FAIL if: < 4 or > 6
```

**2.2 Quality Score Check**
```bash
# Extract quality score
cat test_topic_1_response.json | jq '.meta.qualityScore'
# Expected: > 0.90
# PASS if: >= 0.90
# FAIL if: < 0.90
```

**2.3 Citation Accuracy Check**
```bash
# Count verified citations
TOTAL_CITATIONS=$(cat test_topic_1_response.json | jq '.citations | length')
VERIFIED_CITATIONS=$(cat test_topic_1_response.json | jq '[.citations[] | select(.validationStatus == "verified")] | length')

# Calculate accuracy
echo "scale=2; $VERIFIED_CITATIONS / $TOTAL_CITATIONS * 100" | bc
# Expected: > 95%
# PASS if: >= 95%
# FAIL if: < 95%
```

**2.4 Cost Check**
```bash
# Extract cost
cat test_topic_1_response.json | jq '.meta.costUsd'
# Expected: < 0.30
# PASS if: < 0.30
# FAIL if: >= 0.30
```

**2.5 Ethical Flags Check**
```bash
# Check for ethical flags
cat test_topic_1_response.json | jq '.meta.ethicalFlags // []'
# Expected: [] (empty array)
# PASS if: empty array
# FAIL if: any flags present
```

### Step 3: Manual Content Review

**3.1 Pedagogical Quality**
- [ ] Content flows logically (basic → advanced)
- [ ] Clear explanations (ELI12 style)
- [ ] Examples are relevant and practical
- [ ] No confusing jargon without definitions
- [ ] Appropriate depth for corporate learning

**3.2 Factual Accuracy**
- [ ] Claims are backed by citations
- [ ] Citations are from credible sources (HBR, textbooks, journals)
- [ ] No contradictions between modules
- [ ] Information is current (check citation dates)
- [ ] Technical terms used correctly

**3.3 Brand Alignment**
- [ ] Tone is professional
- [ ] Language is inclusive
- [ ] No controversial content
- [ ] Appropriate for workplace learning
- [ ] Aligns with B2B enterprise expectations

### Step 4: Record Results

**Create test report:**
```bash
cat > test_topic_1_report.md << EOF
# Test Topic 1: Effective Delegation

## Automated Checks
- Module Count: PASS/FAIL (X modules)
- Quality Score: PASS/FAIL (0.XX)
- Citation Accuracy: PASS/FAIL (XX%)
- Cost: PASS/FAIL ($0.XX)
- Ethical Flags: PASS/FAIL (X flags)

## Manual Review
- Pedagogical Quality: PASS/FAIL
- Factual Accuracy: PASS/FAIL
- Brand Alignment: PASS/FAIL

## Overall: PASS/FAIL

## Notes:
- [Any observations]
- [Potential improvements]
- [Concerns]

## Sample Content (First Module):
\`\`\`
[Paste first module here for reference]
\`\`\`

## Citations Sample:
\`\`\`json
[Paste 2-3 citations here]
\`\`\`
EOF
```

---

## 📊 Test Matrix (All 3 Topics)

| Topic | Modules | Quality | Citations | Cost | Ethical | Manual | Overall |
|-------|---------|---------|-----------|------|---------|--------|---------|
| **1. Effective Delegation** | ? / 4-6 | ? / >0.90 | ? / >95% | ? / <$0.30 | ✅ / None | ? | ? |
| **2. Active Listening** | ? / 4-6 | ? / >0.90 | ? / >95% | ? / <$0.30 | ✅ / None | ? | ? |
| **3. Risk Management Basics** | ? / 4-6 | ? / >0.90 | ? / >95% | ? / <$0.30 | ✅ / None | ? | ? |

**Success Criteria:**
- **ALL 3 topics PASS** automated checks
- **ALL 3 topics PASS** manual review
- **Average quality score** ≥ 0.92
- **Average citation accuracy** ≥ 96%
- **Average cost** ≤ $0.25/topic

---

## 🚨 Failure Modes & Actions

### If Quality Score < 0.90
**Possible Causes:**
- LLM model underperforming
- Input prompt not specific enough
- Fact-checker too strict

**Actions:**
1. Check `content_generations` table for detailed scores
2. Review generator prompts in `llm-orchestrator.ts`
3. Adjust quality threshold or retry with better prompt
4. Consider tuning LLM temperature settings

### If Citation Accuracy < 95%
**Possible Causes:**
- Fact-checker not finding sources
- Generators citing unreliable sources
- Research mode not using credible knowledge bases

**Actions:**
1. Review `citations` table for validation failures
2. Check fact-checker prompts
3. Verify LLM access to knowledge cutoff dates
4. Consider adding explicit "cite only peer-reviewed sources" instruction

### If Cost > $0.30/topic
**Possible Causes:**
- Too many tokens used
- o3-mini expensive for fact-checking
- Multiple regeneration rounds

**Actions:**
1. Review token usage in `meta.tokensUsed`
2. Check if iterative refinement ran multiple times
3. Consider shorter content or cheaper models
4. Verify cost tracking is accurate

### If Ethical Flags Triggered
**Possible Causes:**
- Controversial topic detected
- Bias in content
- Policy violation flagged

**Actions:**
1. Review `content_generations.ethical_flags` column
2. Read full content to understand flag reason
3. Determine if flag is false positive
4. Adjust content or topic if legitimate concern

### If Modules < 4 or > 6
**Possible Causes:**
- Topic too narrow (generates <4 modules)
- Topic too broad (generates >6 modules)
- LLM not following structure prompt

**Actions:**
1. For <4: Broaden topic scope or combine similar modules
2. For >6: Narrow topic scope or split into sub-topics
3. Check generator prompts for module count instructions

---

## 🔍 Debugging Commands

### Check Database for Generated Content
```bash
psql $DATABASE_URL -c "
SELECT 
  id, 
  title, 
  input_type, 
  quality_score, 
  tokens_used, 
  cost_usd,
  created_at
FROM content_generations
ORDER BY created_at DESC
LIMIT 5;
"
```

### Check Citations Table
```bash
psql $DATABASE_URL -c "
SELECT 
  title, 
  author, 
  source_type, 
  validation_status, 
  confidence
FROM citations
WHERE generation_id = 'your-generation-id-here';
"
```

### Check Quality Metrics
```bash
psql $DATABASE_URL -c "
SELECT 
  AVG(quality_score) as avg_quality,
  AVG(cost_usd) as avg_cost,
  COUNT(*) as total_generations
FROM content_generations
WHERE input_type = 'topic'
  AND created_at > NOW() - INTERVAL '1 hour';
"
```

---

## ✅ Go/No-Go Decision

### GO Criteria (Proceed to Epic 6.6 Batch)
- ✅ All 3 topics PASS automated checks
- ✅ All 3 topics PASS manual review
- ✅ Average quality ≥ 0.92
- ✅ Average citation accuracy ≥ 96%
- ✅ Average cost ≤ $0.25/topic
- ✅ No unresolved ethical flags
- ✅ Consistent performance (no outliers)

**Next Step:** Create Epic 6.6 prompt for 100-topic batch

### NO-GO Criteria (Fix Issues First)
- ❌ Any topic FAILS automated checks
- ❌ Quality score consistently <0.90
- ❌ Citation accuracy consistently <95%
- ❌ Cost consistently >$0.30/topic
- ❌ Ethical flags need review
- ❌ Inconsistent performance (1 topic great, 2 bad)

**Next Step:** Debug issues, adjust prompts/models, re-test

---

## 📝 Test Report Template

Once all 3 topics tested, create summary:

```markdown
# Epic 6 Quality Test Summary

**Date:** 2025-10-13  
**Tester:** [Your Name]  
**Environment:** Staging

## Results Overview

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Topics Tested | 3 | 3 | ✅ |
| Quality Score (avg) | >0.90 | 0.XX | ✅/❌ |
| Citation Accuracy (avg) | >95% | XX% | ✅/❌ |
| Cost per Topic (avg) | <$0.30 | $0.XX | ✅/❌ |
| Ethical Flags | 0 | X | ✅/❌ |
| Manual Review Pass | 3/3 | X/3 | ✅/❌ |

## Individual Topic Results

### Topic 1: Effective Delegation
- Modules: X (✅/❌)
- Quality: 0.XX (✅/❌)
- Citations: XX% (✅/❌)
- Cost: $0.XX (✅/❌)
- Manual: ✅/❌
- **Overall:** ✅/❌

### Topic 2: Active Listening
[Same format]

### Topic 3: Risk Management Basics
[Same format]

## Decision: GO / NO-GO

**Rationale:**
[Explain decision based on results]

## Next Steps:
- [ ] If GO: Create Epic 6.6 prompt for batch seeding
- [ ] If NO-GO: [List specific fixes needed]

## Notes & Observations:
- [Any insights from testing]
- [Recommendations for batch]
- [Concerns to address]
```

---

## 🚀 After Testing (If GO)

### 1. Document Baseline Metrics
```bash
echo "Epic 6 Baseline Metrics (3-topic test)" >> baseline_metrics.txt
echo "Average Quality Score: 0.XX" >> baseline_metrics.txt
echo "Average Citation Accuracy: XX%" >> baseline_metrics.txt
echo "Average Cost: $0.XX" >> baseline_metrics.txt
echo "Date: $(date)" >> baseline_metrics.txt
```

### 2. Prepare for Epic 6.6
- Create 100-topic CSV
- Set up batch queue system
- Configure progress tracking
- Allocate budget (~$30 for 100 topics)

### 3. Request Epic 6.6 Prompt
Tell governance agent: "3-topic test passed, ready for Epic 6.6 batch seeding prompt"

---

## 📚 Reference Files

**Code:**
- `api/src/services/llm-orchestrator.ts` - Generation logic
- `api/src/routes/content.ts` - API endpoints
- `api/src/services/canon.ts` - Quality scoring

**Database:**
- `content_generations` table - Generation metadata
- `citations` table - Citation tracking
- `topics` table - Topic storage (P0 hierarchy)

**Documentation:**
- `docs/functional-spec.md` §26 - Epic 6 spec
- `docs/functional-spec.md` §27 - Epic 6.5 research mode
- `EPIC6_IMPLEMENTATION_PROMPT.md` - Original prompt

---

**Status:** Ready for testing!  
**Next:** Run test for Topic 1 (Effective Delegation)

**Questions?** Check debugging commands or review Epic 6 delivery docs.

