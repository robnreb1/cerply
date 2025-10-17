# Epic 6 Testing Summary

**Date:** 2025-10-13  
**Status:** Ready for 3-topic quality validation  
**Updated Quality Bar:** >0.90 score, >95% citation accuracy

---

## 📋 What Changed

### 1. Epic 10 Moved to Post-MVP
**Rationale:** Focus on content seeding before expert certification workflow

**Changes:**
- ✅ Updated `EPIC_MASTER_PLAN.md` v1.3 → v1.4
- ✅ Epic 10 moved from P1 to P2 (Post-MVP)
- ✅ Rollout timeline updated: Epic 6.6 (Batch Seeding) is **NEXT PRIORITY**
- ✅ MVP will use hardcoded `is_certified` flags on select topics

### 2. Quality Criteria Raised
**Previous bar (Epic 6 delivery):**
- Quality score: >0.80
- Citation accuracy: >80%
- Cost per topic: <$0.50

**New bar (Epic 6.6 batch):**
- ✅ Quality score: **>0.90** (+12.5% improvement)
- ✅ Citation accuracy: **>95%** (+18.75% improvement)
- ✅ Cost per topic: **<$0.30** (-40% cost reduction)
- ✅ No ethical flags
- ✅ 4-6 modules per topic

---

## 🎯 Testing Plan

### Phase 1: Manual Validation (3 Topics)
**Goal:** Verify Epic 6 can consistently meet new quality bar

**Test Topics:**
1. **Effective Delegation** (Soft Skills - Management)
2. **Active Listening** (Soft Skills - Communication)
3. **Risk Management Basics** (Financial Services - Technical)

**Success Criteria:**
- ✅ All 3 topics PASS automated checks
- ✅ All 3 topics PASS manual review
- ✅ Average quality score ≥0.92
- ✅ Average citation accuracy ≥96%
- ✅ Average cost ≤$0.25/topic

**Timeline:** ~30-45 minutes for all 3 topics  
**Cost:** ~$0.60-0.90 total

### Phase 2: Batch Seeding (100 Topics) - EPIC 6.6
**Only if Phase 1 passes**

**Goal:** Seed Cerply with 100 high-quality topics (50 soft skills, 50 financial services)

**Timeline:** ~8-10 hours (Epic 6.6)  
**Cost:** ~$20-30 total (at $0.25/topic average)

---

## 📄 Documentation Created

### 1. `EPIC6_QUALITY_TEST_GUIDE.md` (Comprehensive)
**1,000+ lines** with:
- ✅ Detailed test procedures (8 steps per topic)
- ✅ Manual review checklists (pedagogical, factual, brand)
- ✅ Automated checks (quality, citations, cost, ethical flags)
- ✅ Failure modes & debugging commands
- ✅ Database inspection queries
- ✅ Go/No-Go decision framework
- ✅ Test report template

**Use this for:** Full understanding of testing process, debugging, reference

### 2. `EPIC6_TESTING_QUICK_START.md` (Fast Reference)
**~200 lines** with:
- ✅ 5-minute setup commands
- ✅ 3 curl commands (copy-paste ready)
- ✅ Quick result checks
- ✅ Summary script generator
- ✅ Next steps (GO vs NO-GO)

**Use this for:** Actual test execution, fast iteration

### 3. `EPIC_MASTER_PLAN.md` v1.4 (Updated)
**Changes:**
- ✅ Epic 10 marked as "Post-MVP"
- ✅ Rollout timeline updated (Epic 6.6 next)
- ✅ Quality criteria documented in changelog
- ✅ MVP certification strategy: hardcoded flags

---

## 🚀 How to Test (Quick)

### Step 1: Environment Setup (5 min)
```bash
export DATABASE_URL="postgresql://cerply_app:ZTv6yzkW3EaO7Hf3n4y12VrdRGtikO8T@dpg-d324843uibrs739hldp0-a.frankfurt-postgres.render.com/cerply"
export OPENAI_API_KEY="your-key-here"
export ANTHROPIC_API_KEY="your-key-here"
export GOOGLE_GENERATIVE_AI_API_KEY="your-key-here"
export FF_ENSEMBLE_GENERATION_V1=true
export FF_CONTENT_CANON_V1=true
export ADMIN_TOKEN="your-admin-token-here"
export ORG_ID="00000000-0000-0000-0000-000000000001"
export SUBJECT_ID="00000000-0000-0000-0000-000000000001"
```

### Step 2: Generate Topic 1 (10-15 min)
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

### Step 3: Check Results (1 min)
```bash
# Quality score (expect >0.90)
cat test_topic_1_effective_delegation.json | jq '.meta.qualityScore'

# Citation accuracy (expect >95%)
TOTAL=$(cat test_topic_1_effective_delegation.json | jq '.citations | length')
VERIFIED=$(cat test_topic_1_effective_delegation.json | jq '[.citations[] | select(.validationStatus == "verified")] | length')
echo "Citation Accuracy: $(echo "scale=1; $VERIFIED * 100 / $TOTAL" | bc)%"

# Cost (expect <$0.30)
cat test_topic_1_effective_delegation.json | jq '.meta.costUsd'
```

### Step 4: Repeat for Topics 2 & 3 (20-30 min)
See `EPIC6_TESTING_QUICK_START.md` for Topic 2 (Active Listening) and Topic 3 (Risk Management)

---

## ✅ Success = GO to Epic 6.6

**If all 3 topics pass:**
1. Document baseline metrics
2. Create Epic 6.6 batch seeding prompt
3. Prepare 100-topic CSV (50 soft skills, 50 financial services)
4. Set up batch queue system
5. Allocate budget (~$25-30)

**Next step:** Tell me "3-topic test passed, ready for Epic 6.6"

---

## 🚨 Failure = Fix & Re-Test

**If any topic fails:**
1. Review failure mode in comprehensive guide
2. Debug using provided commands
3. Adjust prompts/models/thresholds
4. Re-test failed topic
5. When fixed, continue remaining topics

**Next step:** Tell me what failed + error details

---

## 📊 Expected Results

### Baseline (Epic 6 Delivery)
- Quality: 0.82-0.88 (good)
- Citations: 80-90% (acceptable)
- Cost: $0.35-0.50 (high)

### Target (Epic 6.6 Batch)
- Quality: >0.90 (excellent) ← **+5-10% improvement needed**
- Citations: >95% (excellent) ← **+5-15% improvement needed**
- Cost: <$0.30 (efficient) ← **-30-40% cost reduction needed**

### Risks
**If targets are too high:**
- May require LLM model upgrades
- May need prompt engineering iteration
- May increase cost to achieve quality

**Mitigation:**
- Test 3 topics first to validate feasibility
- Adjust bar if needed (e.g., 0.88 quality acceptable)
- Trade-off cost vs quality (willing to pay $0.35 for 0.95 quality?)

---

## 🎯 Strategic Context

### Why test 3 topics first?
1. **Validate feasibility** - Can Epic 6 meet new bar?
2. **Calibrate expectations** - Are targets realistic?
3. **Debug before scale** - Fix issues on 3, not 100
4. **Cost estimation** - Actual $/topic for budget planning
5. **Quality baseline** - Document "good enough" threshold

### Why raise the bar?
1. **MVP requires excellence** - B2B clients expect high quality
2. **Certification readiness** - Content must be audit-ready
3. **Reuse efficiency** - High-quality content can be reused more
4. **Brand reputation** - Poor content damages Cerply brand
5. **Regulatory compliance** - Financial services requires accuracy

### Why defer Epic 10?
1. **Content is more urgent** - Need library before expert review
2. **Hardcoded flags work for MVP** - Mark 10-20 topics as certified
3. **Expert panel not ready** - No experts onboarded yet
4. **Workflow complexity** - Epic 10 is 10h of additional work
5. **Post-MVP enhancement** - Can add formal certification later

---

## 📚 Reference Files

### Test Execution
- `EPIC6_TESTING_QUICK_START.md` - Fast commands
- `EPIC6_QUALITY_TEST_GUIDE.md` - Full procedures

### Governance
- `docs/EPIC_MASTER_PLAN.md` v1.4 - Updated priorities
- `docs/functional-spec.md` §26 - Epic 6 spec
- `docs/functional-spec.md` §27 - Epic 6.5 research mode

### Code
- `api/src/services/llm-orchestrator.ts` - Generation logic
- `api/src/routes/content.ts` - API endpoints
- `api/src/services/canon.ts` - Quality scoring

### Database
- `content_generations` table - Generation metadata
- `citations` table - Citation tracking
- `topics` table - Topic storage (P0 hierarchy)

---

## ✅ Checklist

- [x] Epic 10 moved to Post-MVP in master plan
- [x] Quality criteria raised (>0.90, >95%, <$0.30)
- [x] Comprehensive test guide created (1,000+ lines)
- [x] Quick start guide created (200 lines)
- [x] Test topics selected (3: 2 soft skills, 1 financial)
- [x] Success criteria documented
- [x] Failure modes documented
- [x] Go/No-Go framework created
- [ ] **USER ACTION: Run 3-topic test**
- [ ] **USER ACTION: Report results (pass/fail)**

---

## 🚀 Next Steps

**1. Run the test (30-45 min)**
- Use `EPIC6_TESTING_QUICK_START.md`
- Generate 3 topics
- Check automated results
- Perform manual review

**2. Report results**
- If **PASS**: "3-topic test passed, ready for Epic 6.6"
- If **FAIL**: "Topic X failed: [quality/citations/cost] - [details]"

**3. Based on results:**
- **GO:** I'll create Epic 6.6 batch seeding prompt
- **NO-GO:** I'll help debug and adjust

---

**Status:** Ready for testing!  
**Docs:** 2 guides created  
**Estimated Time:** 30-45 minutes  
**Estimated Cost:** $0.60-0.90

**Questions?** Check the comprehensive guide or ask me!

