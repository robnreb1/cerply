# Epic 6.5: Research-Driven Content Generation

**Status:** Proposed (Not Yet Started)  
**Depends On:** Epic 6 (Complete)  
**Feature Flag:** `FF_RESEARCH_MODE_V1`

---

## Problem Statement

**Current Limitation (Epic 6):**
System transforms **existing source material** into learning content.
- ✅ Works great: "Here's a fire safety document, turn it into training"
- ❌ Doesn't work: "Teach me complex numbers" (no source material provided)

**User Need:**
Generate comprehensive learning content from just a **topic name**, including:
- Research and knowledge generation (not just transformation)
- Citations to credible external sources
- Pedagogically structured lessons
- Prerequisite identification

---

## Use Cases

### Current (Epic 6): Source Transformation
```
Manager: "Turn this fire safety document into training modules"
System: ✅ Analyzes document → Creates 3-4 modules based on that content
```

### Proposed (Epic 6.5): Topic Research
```
Manager: "Teach employees about complex numbers"
System: ✅ Researches topic → Generates comprehensive course with citations
```

```
Manager: "Create training on Scrum methodology"
System: ✅ Researches Scrum → Generates lessons with references to Scrum Guide, case studies
```

---

## User Stories

**As a manager,**
I want to **request learning content on a topic**  
So that I can **quickly create training without having source materials**

**As a learner,**
I want to **see citations for claims in learning content**  
So that I can **verify information and learn from authoritative sources**

**As a content creator,**
I want the system to **identify prerequisites**  
So that I can **ensure learners have the right foundation**

---

## Proposed Solution

### Architecture: 4-Stage Pipeline

```
Stage 1: TOPIC EXTRACTION (GPT-4o)
Input: "Teach me complex numbers"
Output: {
  topic: "Complex Numbers",
  domain: "Mathematics",
  concepts: ["imaginary unit", "operations", "polar form"],
  prerequisites: ["Algebra 2", "Basic trigonometry"],
  difficulty: "Intermediate"
}

↓

Stage 2: RESEARCH & GENERATION (Claude 4.5 + GPT-4o)
Generator A (Claude): Technical/academic content with citations
Generator B (GPT-4o): Practical applications and intuitive explanations

↓

Stage 3: FACT-CHECKING & CITATION (o3)
- Validates mathematical/factual accuracy
- Verifies citations are credible
- Adds missing source references
- Flags unsupported claims

↓

Stage 4: LESSON CURATION (GPT-4o)
- Organizes content into optimal learning sequence
- Creates assessments
- Estimates learning time
- Adds prerequisite recommendations
```

---

## Key Features

### 1. Topic Detection
```typescript
// Auto-detect input type
function detectInputType(input: string): 'source' | 'topic' {
  const topicIndicators = /^(teach me|learn about|explain|what is)/i;
  return input.length < 150 && topicIndicators.test(input) 
    ? 'topic' 
    : 'source';
}
```

### 2. Research-Oriented Prompts
```typescript
RESEARCH_PROMPTS = {
  understanding: "Extract core topic, domain, key concepts, and create research plan",
  generatorA: "Research and create comprehensive technical content with citations",
  generatorB: "Research practical applications and intuitive explanations",
  factChecker: "Validate facts, verify citations, add source references"
}
```

### 3. Citation System
```typescript
interface Citation {
  id: string;
  type: 'textbook' | 'paper' | 'course' | 'video' | 'website';
  title: string;
  author?: string;
  year?: number;
  url?: string;
  relevance: string;
}

interface Module {
  content: string;
  citations: Citation[];
  // "According to Stewart[1], i² = -1"
}
```

### 4. Prerequisite Detection
```typescript
interface LearningPath {
  topic: string;
  prerequisites: string[];
  modules: Module[];
  estimatedTime: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}
```

---

## Example: "Teach me complex numbers"

### Stage 1: Topic Extraction
```json
{
  "topic": "Complex Numbers",
  "domain": "Mathematics",
  "coreConcepts": [
    "Imaginary unit (i)",
    "Real and imaginary parts",
    "Complex plane",
    "Operations (addition, multiplication)",
    "Polar form and Euler's formula"
  ],
  "prerequisites": ["Algebra 2", "Basic trigonometry"],
  "difficulty": "Intermediate",
  "estimatedModules": 4-5
}
```

### Stage 2: Generated Content (Sample Module)
```json
{
  "id": "module-1",
  "title": "Introduction to Complex Numbers",
  "content": "A complex number is a number of the form a + bi, where a and b are real numbers and i is the imaginary unit satisfying i² = -1.[1] The real part is a, and the imaginary part is b.[2]",
  "examples": [
    "3 + 4i has real part 3 and imaginary part 4",
    "2 - 5i has real part 2 and imaginary part -5"
  ],
  "citations": [
    {
      "id": "1",
      "type": "textbook",
      "title": "Calculus: Early Transcendentals",
      "author": "James Stewart",
      "edition": "8th",
      "relevance": "Standard definition from widely-used calculus textbook"
    },
    {
      "id": "2",
      "type": "course",
      "title": "MIT 18.03: Differential Equations",
      "url": "https://ocw.mit.edu/...",
      "relevance": "MIT OpenCourseWare lecture notes"
    }
  ]
}
```

---

## Technical Implementation

### Database Changes
```sql
-- New table for research-based content
CREATE TABLE research_content (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  topic TEXT NOT NULL,
  domain TEXT,
  difficulty TEXT,
  prerequisites TEXT[],
  citations JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### API Routes
```typescript
POST /api/content/research
  Body: { topic: "Complex numbers" }
  Response: { researchId, topicPlan, estimatedTime }

GET /api/content/research/:id
  Response: { modules, citations, prerequisites }
```

---

## Acceptance Criteria

- [ ] System detects topic requests vs source material
- [ ] Generates comprehensive content from topic name alone
- [ ] Includes 3+ credible citations per module
- [ ] Identifies prerequisites when applicable
- [ ] Creates 4-6 learning modules
- [ ] Estimates learning time
- [ ] Fact-checker validates all claims
- [ ] UI shows "Research Mode" vs "Source Mode"
- [ ] Feature flag controls research mode
- [ ] Documentation updated

---

## Implementation Estimate

### Phase 1: Core Research Mode (3-5 days)
- Topic detection logic
- Research-oriented prompts
- Citation extraction from LLM outputs
- Basic validation

### Phase 2: Citation System (2-3 days)
- Citation data structure
- Citation rendering in UI
- Source credibility scoring

### Phase 3: Prerequisites & Learning Paths (2-3 days)
- Prerequisite detection
- Learning sequence optimization
- Time estimation

### Phase 4: External Knowledge APIs (Optional, 5-7 days)
- Wolfram Alpha integration (math facts)
- Wikipedia/Wikidata (general knowledge)
- arXiv (research papers)
- Khan Academy (learning resources)

**Total: 1-2 weeks for core functionality**

---

## Dependencies

- ✅ Epic 6 (3-LLM ensemble) complete
- Database migration for citations
- UI updates for research mode
- New feature flag

---

## Risks & Mitigations

### Risk: LLMs "hallucinate" citations
**Mitigation:** 
- o3 fact-checker validates citations
- Add external API verification (optional)
- Show confidence scores

### Risk: Generated content lacks depth
**Mitigation:**
- Research-specific prompts emphasize comprehensiveness
- Claude 4.5 + GPT-4o provide diverse perspectives
- o3 validation ensures quality

### Risk: Copyright/attribution issues
**Mitigation:**
- Always cite sources
- Link to original materials
- Focus on educational fair use

---

## Priority Assessment

### High Priority If:
- ✅ Managers frequently request "teach X" without source materials
- ✅ Creating source materials is time-consuming bottleneck
- ✅ Users want cited, authoritative content
- ✅ Competitors offer topic-based content generation

### Lower Priority If:
- Managers usually have source documents to transform
- Current source-based mode meets 80%+ of needs
- Other features (analytics, integrations) more urgent

---

## Cost Implications

**Research mode will be CHEAPER than source mode:**

| Mode | Cost | Reason |
|------|------|--------|
| Source (Epic 6) | $0.07 | Transform existing content |
| Research (Epic 6.5) | $0.05-0.07 | Same pipeline, but topic input is shorter than full documents |

Research mode may actually be more cost-effective since topic inputs ("teach X") are much shorter than full source documents, reducing token counts in early stages.

---

## Success Metrics

- **Adoption:** % of generations using research mode vs source mode
- **Quality:** User ratings of research-generated content
- **Citation Accuracy:** % of citations that are valid/accessible
- **Time Savings:** Hours saved vs manual content creation
- **Coverage:** % of topic requests successfully handled

---

## Open Questions

1. **Scope:** Should we support all domains (math, science, history, skills) or start with a few?
2. **Depth:** How detailed should generated content be (overview vs deep dive)?
3. **External APIs:** Worth the complexity for citation validation?
4. **UI:** Separate "Research" tab or unified interface?

---

## Recommendation

**Proposed Priority: High (Next Epic)**

**Reasoning:**
1. Natural extension of Epic 6
2. Unlocks new use case (topic-based requests)
3. Relatively quick to implement (1-2 weeks)
4. High user value (teach anything, not just transform documents)
5. Cost-effective (same or cheaper than source mode)

**Alternative:** Tackle if user feedback from Epic 6 shows demand for topic-based generation.

---

**Status:** Ready for prioritization decision after Epic 6 testing complete.

