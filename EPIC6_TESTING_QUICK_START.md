# Epic 6: Quick Start Testing Guide

**Date:** 2025-10-13  
**Goal:** Test 3 topics before batch seeding

---

## 🚀 Quick Setup (5 minutes)

### 1. Environment Variables
```bash
export DATABASE_URL="postgresql://cerply_app:ZTv6yzkW3EaO7Hf3n4y12VrdRGtikO8T@dpg-d324843uibrs739hldp0-a.frankfurt-postgres.render.com/cerply"
export OPENAI_API_KEY="your-key-here"
export ANTHROPIC_API_KEY="your-key-here"
export GOOGLE_GENERATIVE_AI_API_KEY="your-key-here"
export FF_ENSEMBLE_GENERATION_V1=true
export FF_CONTENT_CANON_V1=true
export ADMIN_TOKEN="your-admin-token-here"
```

### 2. Test IDs
```bash
export ORG_ID="00000000-0000-0000-0000-000000000001"
export SUBJECT_ID="00000000-0000-0000-0000-000000000001"
```

---

## 📝 Test Topics (Run in order)

### Topic 1: Effective Delegation (Soft Skills)
```bash
curl -X POST http://localhost:8080/api/content/generate \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -d '{
    "input": "Teach me Effective Delegation",
    "organizationId": "'$ORG_ID'",
    "subjectId": "'$SUBJECT_ID'",
    "mode": "research"
  }' | jq '.' > test_topic_1_effective_delegation.json
```

**Check Results:**
```bash
# Module count (expect 4-6)
cat test_topic_1_effective_delegation.json | jq '.topic.modules | length'

# Quality score (expect >0.90)
cat test_topic_1_effective_delegation.json | jq '.meta.qualityScore'

# Citation accuracy (expect >95%)
TOTAL=$(cat test_topic_1_effective_delegation.json | jq '.citations | length')
VERIFIED=$(cat test_topic_1_effective_delegation.json | jq '[.citations[] | select(.validationStatus == "verified")] | length')
echo "Citation Accuracy: $(echo "scale=1; $VERIFIED * 100 / $TOTAL" | bc)%"

# Cost (expect <$0.30)
cat test_topic_1_effective_delegation.json | jq '.meta.costUsd'

# Ethical flags (expect empty array)
cat test_topic_1_effective_delegation.json | jq '.meta.ethicalFlags // []'
```

**Expected Output:**
- ✅ Modules: 4-6
- ✅ Quality: >0.90
- ✅ Citations: >95%
- ✅ Cost: <$0.30
- ✅ Ethical: []

---

### Topic 2: Active Listening (Soft Skills)
```bash
curl -X POST http://localhost:8080/api/content/generate \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -d '{
    "input": "Teach me Active Listening",
    "organizationId": "'$ORG_ID'",
    "subjectId": "'$SUBJECT_ID'",
    "mode": "research"
  }' | jq '.' > test_topic_2_active_listening.json
```

**Check Results:** (same commands as Topic 1, change filename)

---

### Topic 3: Risk Management Basics (Financial Services)
```bash
curl -X POST http://localhost:8080/api/content/generate \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -d '{
    "input": "Teach me Risk Management Basics",
    "organizationId": "'$ORG_ID'",
    "subjectId": "'$SUBJECT_ID'",
    "mode": "research"
  }' | jq '.' > test_topic_3_risk_management.json
```

**Check Results:** (same commands as Topic 1, change filename)

---

## ✅ Success Criteria

**ALL 3 topics must meet:**
- ✅ Module count: 4-6
- ✅ Quality score: >0.90
- ✅ Citation accuracy: >95%
- ✅ Cost: <$0.30
- ✅ Ethical flags: 0
- ✅ Manual review: PASS

**Average targets:**
- Quality: ≥0.92
- Citations: ≥96%
- Cost: ≤$0.25

---

## 📊 Quick Summary Script

```bash
cat > test_summary.sh << 'EOF'
#!/bin/bash
echo "=== Epic 6 Quality Test Summary ==="
echo ""

for topic in 1 2 3; do
  file="test_topic_${topic}_*.json"
  if [ -f $file ]; then
    echo "Topic $topic:"
    echo "  Modules: $(cat $file | jq '.topic.modules | length')"
    echo "  Quality: $(cat $file | jq '.meta.qualityScore')"
    TOTAL=$(cat $file | jq '.citations | length')
    VERIFIED=$(cat $file | jq '[.citations[] | select(.validationStatus == "verified")] | length')
    echo "  Citations: $(echo "scale=1; $VERIFIED * 100 / $TOTAL" | bc)%"
    echo "  Cost: $$(cat $file | jq '.meta.costUsd')"
    echo ""
  fi
done
EOF

chmod +x test_summary.sh
./test_summary.sh
```

---

## 🚨 If Tests Fail

**Quality < 0.90:** Check generator prompts, retry with better input  
**Citations < 95%:** Review fact-checker settings  
**Cost > $0.30:** Check token usage, consider cheaper models  
**Ethical flags:** Review content, determine if legitimate concern

---

## 📚 Full Details

See `EPIC6_QUALITY_TEST_GUIDE.md` for:
- Detailed test procedures
- Manual review checklist
- Debugging commands
- Failure mode analysis
- Complete report template

---

## ✅ After Testing

**If GO (all pass):**
1. Document baseline metrics
2. Request Epic 6.6 batch prompt
3. Prepare 100-topic CSV

**If NO-GO (any fail):**
1. Debug failing topics
2. Adjust prompts/models
3. Re-test until pass

---

**Status:** Ready to test!  
**Time:** ~30-45 minutes for all 3 topics  
**Cost:** ~$0.60-0.90 total

