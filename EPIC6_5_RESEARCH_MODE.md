# Epic 6.5: Research-Driven Content Generation

## Problem Statement

**Current System (Epic 6):** Transforms existing source material into learning content.
- Input: Fire safety document
- Output: Learning modules based on that document

**User Need:** Generate learning content from just a topic request.
- Input: "Teach me complex numbers"
- Output: Comprehensive learning path with research, citations, and curated lessons

---

## Proposed Architecture

### 1. Topic Extraction & Research Planning

**Understanding Model (GPT-4o):**
```typescript
Input: "Teach me complex numbers"
Output: {
  topic: "Complex Numbers",
  domain: "Mathematics",
  difficulty: "Intermediate",
  learnerContext: "General audience",
  researchAreas: [
    "Definition and basic concepts",
    "Imaginary unit (i)",
    "Arithmetic operations",
    "Geometric representation",
    "Applications in engineering/physics"
  ]
}
```

### 2. Research & Content Generation

**Generator A (Claude 4.5) - Technical/Academic:**
```typescript
Task: Research and write comprehensive technical content on complex numbers
Output: {
  modules: [
    {
      title: "Understanding the Imaginary Unit",
      technicalContent: "...",
      mathematicalProofs: "...",
      examples: "..."
    }
  ],
  sourceReferences: [
    "Stewart, Calculus 8th Edition, Chapter 3",
    "MIT OpenCourseWare: 18.03 Differential Equations"
  ]
}
```

**Generator B (GPT-4o) - Contextual/Application:**
```typescript
Task: Research practical applications and intuitive explanations
Output: {
  modules: [
    {
      title: "Why Complex Numbers Matter",
      realWorldApplications: "...",
      intuitiveExplanations: "...",
      visualizations: "..."
    }
  ],
  sourceReferences: [
    "3Blue1Brown: Essence of Complex Analysis",
    "Khan Academy: Complex Numbers"
  ]
}
```

### 3. Fact-Checking & Citation

**Fact-Checker (o3) - Deep Validation:**
```typescript
Task: 
1. Validate mathematical accuracy
2. Cross-reference citations
3. Add credible source annotations
4. Flag unsupported claims

Output: {
  validatedModules: [...],
  citations: [
    {
      claim: "i² = -1",
      sources: ["Stewart Calculus p.234", "MIT 18.03 notes"],
      confidence: "verified"
    }
  ],
  flags: [
    {
      section: "module-2",
      issue: "Needs citation for historical claim",
      suggestion: "Add reference to Cardano's work"
    }
  ]
}
```

### 4. Lesson Curation

**Understanding Model (GPT-4o) - Pedagogical Structuring:**
```typescript
Task: Organize validated content into optimal learning sequence
Output: {
  learningPath: [
    {
      lesson: 1,
      title: "What are Complex Numbers?",
      prerequisites: [],
      objectives: [...],
      content: [...],
      assessments: [...],
      citations: [...]
    }
  ],
  estimatedTime: "4 hours",
  difficulty: "Intermediate"
}
```

---

## Implementation Phases

### Phase 1: Enhanced Prompts (Quick Win)

Update existing prompts to work in "research mode":

```typescript
// New prompt for topic-based input
const RESEARCH_PROMPTS = {
  understanding: {
    system: "You are a research planner. Extract the core topic and create a research plan.",
    user: `The user wants to learn about: "{{TOPIC}}"
    
    Identify:
    1. Core topic and domain
    2. Key concepts to cover
    3. Appropriate depth level
    4. Research areas needed
    
    Output as JSON.`
  },
  
  generatorA: {
    system: "You are an academic researcher creating technical learning content.",
    user: `Research and create comprehensive technical content on: {{TOPIC}}
    
    Include:
    - Rigorous definitions
    - Mathematical/technical details
    - Proofs and derivations
    - Cite credible sources (textbooks, papers, courses)
    
    Format as learning modules with citations.`
  },
  
  factChecker: {
    system: "You are a fact-checker validating educational content.",
    user: `Validate this content on {{TOPIC}}:
    
    Generator A: {{GEN_A}}
    Generator B: {{GEN_B}}
    
    Tasks:
    1. Verify factual accuracy
    2. Check citations are credible
    3. Add missing source references
    4. Flag unsupported claims
    5. Synthesize best content
    
    Output validated modules with full citations.`
  }
};
```

### Phase 2: Detection & Routing

```typescript
// Detect if input is source material vs topic request
function detectInputType(input: string): 'source' | 'topic' {
  // Heuristics:
  // - Short requests (< 100 chars) = likely topic
  // - Contains "teach me", "learn about", "explain" = topic
  // - Long detailed text = source material
  
  if (input.length < 100 && 
      /teach|learn|explain|what is|how does/i.test(input)) {
    return 'topic';
  }
  return 'source';
}

// Route to appropriate workflow
if (detectInputType(artefact) === 'topic') {
  return await researchBasedGeneration(artefact);
} else {
  return await sourceBasedGeneration(artefact);
}
```

### Phase 3: Citation System

```typescript
interface Citation {
  id: string;
  type: 'textbook' | 'paper' | 'course' | 'video' | 'website';
  title: string;
  author?: string;
  year?: number;
  url?: string;
  page?: string;
  relevance: string;
}

interface ModuleWithCitations {
  content: string;
  citations: Citation[];
  citationMap: {
    [textRef: string]: string; // "According to Stewart[1]" -> citation ID
  };
}
```

### Phase 4: External Knowledge APIs (Optional)

Integrate with:
- **Wolfram Alpha API** - Mathematical facts
- **arXiv API** - Research papers
- **Wikipedia API** - General knowledge
- **Khan Academy API** - Learning resources
- **Google Scholar API** - Academic citations

---

## Example: "Teach me complex numbers"

### Step 1: Understanding Response
```json
{
  "topic": "Complex Numbers",
  "domain": "Mathematics",
  "difficulty": "Intermediate (Algebra 2 / Pre-Calculus)",
  "researchPlan": {
    "fundamentals": ["Definition", "Imaginary unit i", "Real and imaginary parts"],
    "operations": ["Addition", "Subtraction", "Multiplication", "Division"],
    "representations": ["Cartesian form", "Polar form", "Euler's formula"],
    "applications": ["Electrical engineering", "Quantum mechanics", "Signal processing"]
  },
  "estimatedModules": 4-6,
  "needsPrerequisites": ["Algebra", "Basic trigonometry"]
}
```

### Step 2: Generated Content (Simplified)
```json
{
  "modules": [
    {
      "id": "module-1",
      "title": "Introduction to Complex Numbers",
      "content": "A complex number is a number of the form a + bi, where a and b are real numbers and i is the imaginary unit defined by i² = -1.[1]",
      "citations": [
        {
          "id": "1",
          "type": "textbook",
          "title": "Calculus: Early Transcendentals",
          "author": "James Stewart",
          "edition": "8th",
          "page": "Appendix H",
          "relevance": "Standard textbook definition"
        }
      ]
    }
  ]
}
```

---

## Comparison: Current vs Enhanced

| Feature | Epic 6 (Current) | Epic 6.5 (Proposed) |
|---------|------------------|---------------------|
| **Input** | Source document | Topic name |
| **Understanding** | Summarize source | Extract topic + research plan |
| **Generation** | Transform source content | Research and create new content |
| **Citations** | N/A (source is the citation) | External credible sources |
| **Fact-Checking** | Validate vs source | Validate vs external knowledge |
| **Output** | Learning modules from source | Comprehensive lesson plan |
| **Use Case** | "Turn this document into training" | "Teach me about X" |

---

## Implementation Estimate

**Phase 1 (Enhanced Prompts):** 2-3 days
- Update prompt templates
- Add topic detection logic
- Test with various topics

**Phase 2 (Citation System):** 3-5 days
- Design citation data structure
- Implement citation extraction from LLM outputs
- Add citation rendering in modules

**Phase 3 (External APIs):** 5-7 days (optional)
- Integrate knowledge APIs
- Add fact-checking against external sources
- Handle API rate limits

**Total: 1-2 weeks for full implementation**

---

## Quick Test (Using Current System)

We can test the current system's limitations:

```bash
# This will show what happens with a topic vs source material
curl -X POST http://localhost:8080/api/content/understand \
  -H 'Content-Type: application/json' \
  -d '{"artefact": "Teach me complex numbers"}'
```

**Expected:** System will try to "understand" the phrase itself, not research the topic.

**Needed:** Topic extraction and research-based content generation.

---

## Recommendation

1. **Test current system** with "Teach me complex numbers" to see the gap
2. **Start with Phase 1** (enhanced prompts) - can be done quickly
3. **Add feature flag** `FF_RESEARCH_MODE_V1`
4. **Iterate based on quality** of generated research content

This is a valuable enhancement that transforms the system from **"content transformer"** to **"intelligent tutor"**!

---

**Next Step:** Once you restart the API, let's test with your example and I'll show you the current limitations, then we can decide if you want me to implement Research Mode.

