# PhD-Level Ensemble Pilot Test

## Architecture
```
GPT-5 (Lead Researcher) → Claude Opus 4 (Critique) → GPT-4o (Verify)
```

## Test 1: Python Coding (Single Topic)

Run this first to validate the pipeline:

```bash
curl -X POST http://localhost:8080/api/content/phd-topic \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: test-admin-token" \
  -d '{
    "title": "Python Programming Language",
    "subject": "Programming",
    "category": "python_coding"
  }' | jq
```

**Expected:**
- 10-15 minutes generation time
- $2.50-$4.00 cost
- 10,000-20,000 word comprehensive article
- 30+ citations
- 15+ code examples
- 6-8 suggested modules with non-MCQ assessments

---

## Test 2: Full Pilot (All 3 Topics)

Once Test 1 succeeds, run all 3:

```bash
curl -X POST http://localhost:8080/api/content/phd-pilot \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: test-admin-token" \
  -d '{
    "topics": [
      {
        "title": "Python Programming Language",
        "subject": "Programming",
        "category": "python_coding"
      },
      {
        "title": "Enterprise Architecture",
        "subject": "Software Engineering",
        "category": "enterprise_architecture"
      },
      {
        "title": "Starting a Tech Business in the UK",
        "subject": "Entrepreneurship",
        "category": "tech_startup_uk"
      }
    ]
  }' | jq
```

**Expected Total:**
- 30-45 minutes
- $7.00-$11.00 cost
- 3 comprehensive topics ready for UAT

---

## Retrieve Generated Content

```bash
# Get topic by ID
curl -s http://localhost:8080/api/content/phd-topic/{TOPIC_ID} \
  -H "X-Admin-Token: test-admin-token" | jq

# View specific sections
curl -s http://localhost:8080/api/content/phd-topic/{TOPIC_ID} \
  -H "X-Admin-Token: test-admin-token" | jq '.sections[] | select(.type=="technical") | {title, wordCount}'

# View suggested modules
curl -s http://localhost:8080/api/content/phd-topic/{TOPIC_ID} \
  -H "X-Admin-Token: test-admin-token" | jq '.suggestedModules[] | {title, assessmentType, estimatedHours}'

# Check citations
curl -s http://localhost:8080/api/content/phd-topic/{TOPIC_ID} \
  -H "X-Admin-Token: test-admin-token" | jq '.citations | length'

# View verification flags
curl -s http://localhost:8080/api/content/phd-topic/{TOPIC_ID} \
  -H "X-Admin-Token: test-admin-token" | jq '.verificationFlags'
```

---

## Success Criteria

✅ **Content Quality:**
- Comprehensive coverage (no major gaps)
- Accessible language (no unnecessary jargon)
- Well-structured sections (logical progression)
- Rich examples (code/diagrams/formulas where appropriate)

✅ **Citations:**
- Minimum 30 authoritative sources
- Mix of academic papers, specs, and industry reports
- All claims properly cited

✅ **Verification:**
- Accuracy > 0.95 (95%+)
- < 5 critical flags per topic
- All hallucinations caught

✅ **Pedagogy:**
- 6-8 learning modules per topic
- Clear learning objectives
- Non-MCQ assessments (code review, case analysis, design critique, essay, presentation, project)
- Logical progression (foundational → advanced)

✅ **Performance:**
- < 15 minutes per topic
- < $4.00 per topic
- No crashes or JSON parse errors

