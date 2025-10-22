/**
 * PhD-Level Ensemble Service (TRUE PARALLEL ENSEMBLE)
 * 
 * ⚠️ CRITICAL: This is the SINGLE, UNIFIED content generation engine for Cerply.
 * 
 * ALL content generation must use this service:
 * - ✅ Manager module creation
 * - ✅ Learner content generation
 * - ✅ Content refresh/updates
 * - ✅ Any future content generation needs
 * 
 * DO NOT create separate content generators. Integration points should call this
 * service and transform the output for their specific needs.
 * 
 * 📖 See: docs/ARCHITECTURE_ENSEMBLE.md for complete documentation
 * 📖 See: api/src/services/README_ENSEMBLE.md for integration guide
 * 
 * ---
 * 
 * Generates comprehensive, research-grade content with accessible language
 * 
 * Pipeline: 
 * - Model 1 (GPT-5/o3) → Generates Paper A independently
 * - Model 2 (Claude Opus 4) → Generates Paper B independently (parallel, NOT seeing Paper A)
 * - Model 3 (GPT-4o) → Fact-checks BOTH papers, consolidates best-of-breed, structures for delivery
 * 
 * Key Principles:
 * - TWO independent models generate comprehensive content in parallel
 * - Third model consolidates the BEST parts from both (best-of-breed)
 * - Encyclopedia-level depth WITHOUT academic jargon
 * - Every claim must be cited from authoritative sources
 * - Content organized for learning, not just reference
 * - Assessment designed for engagement, NOT multiple choice
 */

import { callOpenAI, callAnthropic } from './llm-orchestrator';

// Model configuration
// Using proven reliable models for content generation
// Note: GPT-5/o3 have strict token limits that cause JSON truncation
// TEMPORARY: Using GPT-4o for Model 2 as well due to Anthropic credit limitations
const MODEL_1 = process.env.LLM_PHD_MODEL_1 || 'gpt-4o';
const MODEL_1_FALLBACK = process.env.LLM_PHD_MODEL_1_FALLBACK || 'gpt-4o-mini';
const MODEL_2 = process.env.LLM_PHD_MODEL_2 || 'gpt-4o'; // Changed from claude-opus-4-20250514
const MODEL_3_CONSOLIDATE = process.env.LLM_PHD_MODEL_3 || 'gpt-4o';

export interface PHDEnsembleResult {
  model1Output: ResearchPaperOutput;
  model2Output: ResearchPaperOutput;
  consolidationOutput: ConsolidationOutput;
  finalSections: ContentSection[];
  suggestedModules: SuggestedModule[];
  citations: Citation[];
  consolidationNotes: string[];
  totalCost: number;
  totalTime: number;
}

export interface ResearchPaperOutput {
  modelName: string;
  content: string;
  sections: ContentSection[];
  citations: Citation[];
  suggestedModules: SuggestedModule[];
  wordCount: number;
  costUsd: number;
  tokens: number;
  timeMs: number;
}

export interface ContentSection {
  type: 'historical' | 'theoretical' | 'technical' | 'practical' | 'future';
  title: string;
  content: string;
  orderIndex: number;
  codeExamples?: CodeExample[];
  diagrams?: Diagram[];
  formulas?: Formula[];
  wordCount?: number;
}

export interface CodeExample {
  language: string;
  code: string;
  explanation: string;
  fileName?: string;
}

export interface Diagram {
  type: string;
  description: string;
  mermaidCode?: string;
}

export interface Formula {
  latex: string;
  explanation: string;
  variables?: Record<string, string>;
}

export interface Citation {
  id: number;
  type: 'journal' | 'book' | 'specification' | 'report' | 'website';
  title: string;
  authors: string[];
  year?: number;
  publisher?: string;
  doi?: string;
  url?: string;
  isbn?: string;
  isPeerReviewed?: boolean;
  isPrimarySource?: boolean;
}

export interface SuggestedModule {
  title: string;
  orderIndex: number;
  learningObjectives: string[];
  keyConcepts: string[];
  estimatedHours: number;
  prerequisites?: string[];
  assessmentType: 'code_review' | 'design_critique' | 'case_analysis' | 'essay' | 'presentation' | 'project';
  assessmentDescription: string;
  corpusSectionIds?: string[];
}

export interface ConsolidationOutput {
  factCheckResults: {
    model1Accuracy: number; // 0-1
    model2Accuracy: number; // 0-1
    model1Flagged: FactCheckFlag[];
    model2Flagged: FactCheckFlag[];
  };
  bestOfBreed: {
    sectionsUsed: Array<{
      title: string;
      sourceModel: 'model1' | 'model2' | 'both';
      reason: string;
    }>;
    citationsDeduped: number;
    citationsAdded: number;
  };
  consolidationNotes: string[];
  finalWordCount: number;
  publicationReady: boolean;
  costUsd: number;
  tokens: number;
  timeMs: number;
}

export interface FactCheckFlag {
  claimText: string;
  issueType: 'citation_not_found' | 'fact_incorrect' | 'unsupported' | 'outdated' | 'hallucination';
  severity: 'critical' | 'moderate' | 'minor';
  recommendation: string;
  citationId?: number;
}

/**
 * Generate comprehensive, research-grade content using TRUE parallel ensemble
 * 
 * Architecture:
 * 1. Model 1 & Model 2 generate papers INDEPENDENTLY and IN PARALLEL
 * 2. Model 3 fact-checks BOTH papers and consolidates best-of-breed
 */
export async function generateWithPHDEnsemble(
  topicTitle: string,
  subject: string,
  category?: 'python_coding' | 'enterprise_architecture' | 'tech_startup_uk' | 'general'
): Promise<PHDEnsembleResult> {
  const startTime = Date.now();

  console.log(`[PHD-Ensemble] Starting TRUE PARALLEL generation for: ${topicTitle} (${subject})`);
  console.log(`[PHD-Ensemble] Model 1: ${MODEL_1}, Model 2: ${MODEL_2}, Model 3: ${MODEL_3_CONSOLIDATE}`);

  // Step 1 & 2: PARALLEL - Both models generate comprehensive papers independently
  console.log(`[PHD-Ensemble] Running Model 1 & Model 2 in PARALLEL...`);
  const [model1Output, model2Output] = await Promise.all([
    generateResearchPaper(topicTitle, subject, category, 'model1', MODEL_1, MODEL_1_FALLBACK),
    generateResearchPaper(topicTitle, subject, category, 'model2', MODEL_2),
  ]);

  console.log(`[PHD-Ensemble] Model 1 generated ${model1Output.sections.length} sections, ${model1Output.wordCount} words`);
  console.log(`[PHD-Ensemble] Model 2 generated ${model2Output.sections.length} sections, ${model2Output.wordCount} words`);

  // Step 3: Consolidate - Model 3 fact-checks BOTH and creates best-of-breed
  console.log(`[PHD-Ensemble] Model 3 consolidating best-of-breed...`);
  const consolidationOutput = await consolidateBestOfBreed(model1Output, model2Output, topicTitle, subject);

  const totalTime = Date.now() - startTime;
  const totalCost = model1Output.costUsd + model2Output.costUsd + consolidationOutput.costUsd;

  console.log(`[PHD-Ensemble] ✅ Completed in ${(totalTime / 1000).toFixed(1)}s for $${totalCost.toFixed(2)}`);
  console.log(`[PHD-Ensemble] Model 1 accuracy: ${consolidationOutput.factCheckResults.model1Accuracy.toFixed(2)}`);
  console.log(`[PHD-Ensemble] Model 2 accuracy: ${consolidationOutput.factCheckResults.model2Accuracy.toFixed(2)}`);
  console.log(`[PHD-Ensemble] Final: ${consolidationOutput.bestOfBreed.sectionsUsed.length} sections, ${consolidationOutput.finalWordCount} words`);

  // Extract final sections from consolidation
  // The consolidation output already contains the best-of-breed sections
  const finalSections: ContentSection[] = [];
  const finalCitations: Citation[] = [];
  const finalModules: SuggestedModule[] = [];

  // Combine sections based on what Model 3 chose
  for (const sectionChoice of consolidationOutput.bestOfBreed.sectionsUsed) {
    if (sectionChoice.sourceModel === 'model1') {
      const section = model1Output.sections.find(s => s.title === sectionChoice.title);
      if (section) finalSections.push(section);
    } else if (sectionChoice.sourceModel === 'model2') {
      const section = model2Output.sections.find(s => s.title === sectionChoice.title);
      if (section) finalSections.push(section);
    } else if (sectionChoice.sourceModel === 'both') {
      // Model 3 merged content from both - use whichever has more content as base
      const section1 = model1Output.sections.find(s => s.title === sectionChoice.title);
      const section2 = model2Output.sections.find(s => s.title === sectionChoice.title);
      if (section1 && section2) {
        finalSections.push(section1.content.length > section2.content.length ? section1 : section2);
      } else if (section1) {
        finalSections.push(section1);
      } else if (section2) {
        finalSections.push(section2);
      }
    }
  }

  // Deduplicate citations
  const citationMap = new Map<string, Citation>();
  for (const citation of [...model1Output.citations, ...model2Output.citations]) {
    const key = `${citation.title}-${citation.authors.join(',')}-${citation.year}`;
    if (!citationMap.has(key)) {
      citationMap.set(key, { ...citation, id: citationMap.size + 1 });
    }
  }
  finalCitations.push(...citationMap.values());

  // Use better modules from either model (Model 3 already evaluated them)
  finalModules.push(...(model1Output.suggestedModules.length > model2Output.suggestedModules.length 
    ? model1Output.suggestedModules 
    : model2Output.suggestedModules));

  return {
    model1Output,
    model2Output,
    consolidationOutput,
    finalSections,
    suggestedModules: finalModules,
    citations: finalCitations,
    consolidationNotes: consolidationOutput.consolidationNotes,
    totalCost,
    totalTime,
  };
}

/**
 * Generate a comprehensive research paper (used by both Model 1 and Model 2 independently)
 */
async function generateResearchPaper(
  topicTitle: string,
  subject: string,
  category: string | undefined,
  modelLabel: 'model1' | 'model2',
  modelName: string,
  fallbackModel?: string
): Promise<ResearchPaperOutput> {
  const startTime = Date.now();
  // TEMPORARY: Both models use OpenAI until Anthropic credits are restored
  const isOpenAI = true; // modelLabel === 'model1'; // Model 1 uses OpenAI, Model 2 uses Anthropic

  const systemPrompt = `You are a leading researcher writing a comprehensive encyclopedia article. Your output must be:

- COMPREHENSIVE: Cover everything important about this topic
- ACCESSIBLE: Clear language that educated non-experts can understand (NO academic jargon)
- RIGOROUS: Every claim cited from authoritative sources
- PRACTICAL: Real-world examples, code, and applications
- ENGAGING: Written to teach, not just inform

Write as if creating the definitive guide that will become THE standard reference.`;

  const categoryGuidance = getCategoryGuidance(category);

  const userPrompt = `Write a FOCUSED training article on: "${topicTitle}" (Subject: ${subject})

${categoryGuidance}

IMPORTANT: Keep this CONCISE and PRACTICAL - this is for workplace training, not an encyclopedia.
Aim for 2000-3000 words total across all sections.

STRUCTURE YOUR ARTICLE IN THESE SECTIONS:

## 1. HISTORICAL CONTEXT (300-400 words)
- Where did this come from? Who invented/discovered it?
- Key milestone
- Why does it matter today?
CITE: 2-3 key historical sources [1], [2]

## 2. CORE CONCEPTS (500-600 words)
- What IS this? (clear definition)
- Fundamental principles explained simply
- Key terminology (defined clearly)
CITE: 2-3 foundational sources [3], [4]

## 3. HOW IT WORKS (600-800 words)
${category === 'python_coding' ? `
- Language mechanics
- Core patterns with 2-3 code examples
- Best practices` : ''}
${!category ? '- Technical mechanisms\n- Step-by-step explanation\n- 1-2 concrete examples' : ''}
CITE: 2-3 technical sources [5], [6]

## 4. PRACTICAL APPLICATIONS (400-500 words)
- 2-3 real-world use cases
- Best practices
- Common mistakes to avoid
CITE: 2-3 practical sources [7], [8]

## 5. CURRENT STATE (300-400 words)
- What's happening now?
- Key trends
- Future direction
CITE: 2-3 recent sources [9], [10]

## 6. LEARNING MODULES
Propose 4-6 focused modules:
- Module title
- Learning objectives (2-3)
- Key concepts
- Assessment type: code_review, design_critique, case_analysis, essay, or project

## 7. CITATIONS
Provide 10-15 HIGH-QUALITY sources:
- Academic papers (peer-reviewed)
- Technical specifications
- Industry reports
- Authoritative textbooks

CRITICAL: 
- Use clear, accessible language
- Be CONCISE but comprehensive
- Focus on PRACTICAL learning value
- Every claim needs a citation [1], [2], etc.

Output as JSON:
{
  "topic": "${topicTitle}",
  "subject": "${subject}",
  "sections": [
    {
      "type": "historical|theoretical|technical|practical|future",
      "title": "Section Title",
      "content": "Full content with inline citations [1] [2]...",
      "orderIndex": 0,
      "codeExamples": [
        {
          "language": "python",
          "code": "# Actual code here",
          "explanation": "What this code does and why",
          "fileName": "example.py"
        }
      ],
      "diagrams": [
        {
          "type": "architecture|flow|sequence",
          "description": "What this diagram shows",
          "mermaidCode": "graph TD; A-->B;"
        }
      ],
      "formulas": [
        {
          "latex": "E = mc^2",
          "explanation": "What this formula means",
          "variables": {"E": "Energy", "m": "mass", "c": "speed of light"}
        }
      ]
    }
  ],
  "suggestedModules": [
    {
      "title": "Module Title",
      "orderIndex": 0,
      "learningObjectives": ["Objective 1", "Objective 2"],
      "keyConcepts": ["Concept 1", "Concept 2"],
      "estimatedHours": 4,
      "prerequisites": ["Prerequisite 1"],
      "assessmentType": "code_review|design_critique|case_analysis|essay|presentation|project",
      "assessmentDescription": "Specific task description"
    }
  ],
  "citations": [
    {
      "id": 1,
      "type": "journal|book|specification|report|website",
      "title": "Citation Title",
      "authors": ["Author 1", "Author 2"],
      "year": 2023,
      "publisher": "Publisher Name",
      "doi": "10.1234/example",
      "url": "https://...",
      "isPeerReviewed": true,
      "isPrimarySource": false
    }
  ]
}`;

  console.log(`[PHD-${modelLabel.toUpperCase()}] Generating with ${modelName}...`);
  
  let result;
  try {
    if (isOpenAI) {
      // Model 1: OpenAI (GPT-5/o3)
      result = await callOpenAI(modelName, userPrompt, systemPrompt, 3, 0.7, 16000);
    } else {
      // Model 2: Anthropic (Claude Opus 4) - increased max_tokens to avoid truncation
      result = await callAnthropic(modelName, userPrompt, systemPrompt, 3, 16000);
    }
  } catch (error: any) {
    if (fallbackModel) {
      console.error(`[PHD-${modelLabel.toUpperCase()}] ${modelName} failed: ${error.message}`);
      console.log(`[PHD-${modelLabel.toUpperCase()}] Retrying with fallback ${fallbackModel}...`);
      result = await callOpenAI(fallbackModel, userPrompt, systemPrompt, 3, 0.7, 16000);
    } else {
      throw error;
    }
  }

  // Parse JSON output
  let parsedOutput;
  try {
    let cleanContent = result.content.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*\n/, '').replace(/\n```\s*$/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*\n/, '').replace(/\n```\s*$/, '');
    }
    parsedOutput = JSON.parse(cleanContent);
  } catch (error: any) {
    console.error(`[PHD-${modelLabel.toUpperCase()}] JSON parse error:`, error.message);
    console.error(`[PHD-${modelLabel.toUpperCase()}] Content length:`, result.content.length);
    console.error(`[PHD-${modelLabel.toUpperCase()}] Content preview:`, result.content.substring(0, 500));
    console.error(`[PHD-${modelLabel.toUpperCase()}] Content ending:`, result.content.substring(result.content.length - 500));
    throw new Error(`${modelLabel} returned invalid JSON: ${error.message}`);
  }

  const wordCount = parsedOutput.sections.reduce((sum: number, s: ContentSection) => 
    sum + (s.content?.split(/\s+/).length || 0), 0
  );

  return {
    modelName,
    content: result.content,
    sections: parsedOutput.sections,
    citations: parsedOutput.citations,
    suggestedModules: parsedOutput.suggestedModules,
    wordCount,
    costUsd: result.costUsd,
    tokens: result.tokens,
    timeMs: Date.now() - startTime,
  };
}

/**
 * Step 3: Consolidate Best-of-Breed (Model 3 / GPT-4o)
 * Fact-checks BOTH papers and creates the best consolidated version
 */
async function consolidateBestOfBreed(
  model1Output: ResearchPaperOutput,
  model2Output: ResearchPaperOutput,
  topicTitle: string,
  subject: string
): Promise<ConsolidationOutput> {
  const startTime = Date.now();

  const systemPrompt = `You are a senior academic editor and fact-checker. Your task:

1. FACT-CHECK: Verify every claim in BOTH papers
2. COMPARE: Identify which paper has better content for each section
3. CONSOLIDATE: Create the BEST-OF-BREED paper from both sources
4. FLAG: Any hallucinations, errors, or unsupported claims

Be ruthlessly accurate. Choose the best content from each paper.`;

  const userPrompt = `You have TWO independent research papers on "${topicTitle}" (Subject: ${subject}).

Your task is to create the BEST-OF-BREED consolidated version.

====================
PAPER A (Model 1):
====================
${JSON.stringify(model1Output.sections, null, 2)}

CITATIONS FROM PAPER A:
${JSON.stringify(model1Output.citations, null, 2)}

====================
PAPER B (Model 2):
====================
${JSON.stringify(model2Output.sections, null, 2)}

CITATIONS FROM PAPER B:
${JSON.stringify(model2Output.citations, null, 2)}

YOUR TASK:

1. FACT-CHECK BOTH PAPERS
   - Verify statistical claims, dates, names, technical details
   - Check if citations support their associated claims
   - Flag any hallucinations or incorrect facts
   - Rate accuracy 0-1 for each paper

2. COMPARE SECTION BY SECTION
   For each major section (Historical Context, Core Concepts, Technical Deep Dive, etc.):
   - Which paper has better explanation?
   - Which has better examples?
   - Which is more accurate?
   - Which is more accessible?
   
3. CREATE BEST-OF-BREED
   For each section, decide:
   - Use Paper A entirely
   - Use Paper B entirely
   - Merge best parts from both
   
   Explain WHY you chose each source.

4. CONSOLIDATION NOTES
   - What improvements were made?
   - What content was merged?
   - What was the quality of each paper overall?

Output as JSON:
{
  "factCheckResults": {
    "model1Accuracy": 0.95,
    "model2Accuracy": 0.92,
    "model1Flagged": [
      {
        "claimText": "Excerpt of problematic claim...",
        "issueType": "citation_not_found|fact_incorrect|unsupported|outdated|hallucination",
        "severity": "critical|moderate|minor",
        "recommendation": "Specific fix needed",
        "citationId": 12
      }
    ],
    "model2Flagged": [ /* same structure */ ]
  },
  "bestOfBreed": {
    "sectionsUsed": [
      {
        "title": "Historical Context",
        "sourceModel": "model1|model2|both",
        "reason": "Why this source was chosen for this section"
      }
    ],
    "citationsDeduped": 45,
    "citationsAdded": 5
  },
  "consolidationNotes": [
    "Paper A had stronger technical depth",
    "Paper B had better pedagogical flow",
    "Merged examples from both papers for completeness"
  ],
  "finalWordCount": 8500,
  "publicationReady": true
}`;

  console.log(`[PHD-CONSOLIDATE] Fact-checking and consolidating with ${MODEL_3_CONSOLIDATE}...`);
  // Use 12000 tokens for detailed consolidation analysis
  const result = await callOpenAI(MODEL_3_CONSOLIDATE, userPrompt, systemPrompt, 3, 0.1, 12000);

  // Parse JSON output
  let parsedOutput;
  try {
    let cleanContent = result.content.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*\n/, '').replace(/\n```\s*$/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*\n/, '').replace(/\n```\s*$/, '');
    }
    parsedOutput = JSON.parse(cleanContent);
  } catch (error: any) {
    console.error('[PHD-CONSOLIDATE] JSON parse error:', error.message);
    throw new Error(`Consolidation returned invalid JSON: ${error.message}`);
  }

  return {
    factCheckResults: parsedOutput.factCheckResults,
    bestOfBreed: parsedOutput.bestOfBreed,
    consolidationNotes: parsedOutput.consolidationNotes || [],
    finalWordCount: parsedOutput.finalWordCount || 0,
    publicationReady: parsedOutput.publicationReady || false,
    costUsd: result.costUsd,
    tokens: result.tokens,
    timeMs: Date.now() - startTime,
  };
}

/**
 * Get category-specific guidance for content generation
 */
function getCategoryGuidance(category?: string): string {
  switch (category) {
    case 'python_coding':
      return `This is about PYTHON PROGRAMMING. Include:
- Language design and implementation details
- Core data structures (list, dict, set, etc.) with examples
- 15+ real code examples showing best practices
- Common patterns and idioms
- Performance considerations
- Standard library highlights`;

    case 'enterprise_architecture':
      return `This is about ENTERPRISE ARCHITECTURE. Include:
- Architectural patterns (microservices, event-driven, etc.)
- Integration strategies and protocols
- 8+ architecture diagrams (use Mermaid syntax)
- Scalability and performance engineering
- Security architecture principles
- Governance frameworks (TOGAF, Zachman)`;

    case 'tech_startup_uk':
      return `This is about STARTING A TECH BUSINESS IN THE UK. Include:
- UK legal structures (Ltd, LLP, etc.) - practical comparison
- Tax landscape (Corporation Tax, R&D tax credits, EIS/SEIS)
- Fundraising ecosystem (angel investors, VCs, government grants)
- Regulatory requirements (GDPR, FCA if fintech, Companies House)
- 3-5 real UK startup case studies
- Market positioning and go-to-market strategies`;

    default:
      return 'Cover all important aspects of this topic with practical examples and real-world applications.';
  }
}

