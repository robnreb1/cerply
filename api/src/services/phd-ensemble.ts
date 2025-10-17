/**
 * PhD-Level Ensemble Service
 * Generates comprehensive, research-grade content with accessible language
 * 
 * Pipeline: GPT-5 (Lead) → Claude Opus 4 (Critique) → GPT-4o (Verify)
 * 
 * Key Principles:
 * - Encyclopedia-level depth WITHOUT academic jargon
 * - Every claim must be cited from authoritative sources
 * - Content organized for learning, not just reference
 * - Assessment designed for engagement, NOT multiple choice
 */

import { callOpenAI, callAnthropic } from './llm-orchestrator';

// Model configuration
const LEAD_MODEL = process.env.LLM_PHD_LEAD || 'gpt-5';
const LEAD_FALLBACK = process.env.LLM_PHD_LEAD_FALLBACK || 'o3';
const CRITIQUE_MODEL = process.env.LLM_PHD_CRITIQUE || 'claude-opus-4';
const VERIFY_MODEL = process.env.LLM_PHD_VERIFY || 'gpt-4o';

export interface PHDEnsembleResult {
  leadOutput: LeadResearcherOutput;
  critiqueOutput: CritiqueOutput;
  verificationOutput: VerificationOutput;
  finalSections: ContentSection[];
  suggestedModules: SuggestedModule[];
  citations: Citation[];
  verificationFlags: VerificationFlag[];
  totalCost: number;
  totalTime: number;
}

export interface LeadResearcherOutput {
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

export interface CritiqueOutput {
  overallAssessment: 'accept' | 'minor_revisions' | 'major_revisions';
  scores: {
    logicalCoherence: number; // 0-10
    factualRigor: number; // 0-10
    pedagogicalQuality: number; // 0-10
    accessibility: number; // 0-10
  };
  critiques: string[];
  recommendations: string[];
  revisedModules?: SuggestedModule[];
  costUsd: number;
  tokens: number;
  timeMs: number;
}

export interface VerificationOutput {
  totalClaims: number;
  verifiedClaims: number;
  accuracy: number; // 0-1
  flaggedClaims: VerificationFlag[];
  hallucinations: string[];
  missingCitations: string[];
  publicationReady: boolean;
  costUsd: number;
  tokens: number;
  timeMs: number;
}

export interface VerificationFlag {
  claimText: string;
  issueType: 'citation_not_found' | 'fact_incorrect' | 'unsupported' | 'outdated';
  severity: 'critical' | 'moderate' | 'minor';
  recommendation: string;
  citationId?: number;
}

/**
 * Generate comprehensive, research-grade content using PhD-level ensemble
 */
export async function generateWithPHDEnsemble(
  topicTitle: string,
  subject: string,
  category?: 'python_coding' | 'enterprise_architecture' | 'tech_startup_uk' | 'general'
): Promise<PHDEnsembleResult> {
  const startTime = Date.now();

  console.log(`[PHD-Ensemble] Starting generation for: ${topicTitle} (${subject})`);

  // Step 1: Lead Researcher (GPT-5) - Comprehensive content generation
  const leadOutput = await generateLeadResearch(topicTitle, subject, category);

  // Step 2: Academic Critique (Claude Opus 4) - Review quality and pedagogy
  const critiqueOutput = await generateCritique(leadOutput, topicTitle);

  // Step 3: Factual Verification (GPT-4o) - Verify every claim
  const verificationOutput = await verifyFacts(leadOutput, topicTitle);

  const totalTime = Date.now() - startTime;
  const totalCost = leadOutput.costUsd + critiqueOutput.costUsd + verificationOutput.costUsd;

  console.log(`[PHD-Ensemble] Completed in ${(totalTime / 1000).toFixed(1)}s for $${totalCost.toFixed(2)}`);
  console.log(`[PHD-Ensemble] Verification: ${verificationOutput.accuracy.toFixed(2)} accuracy, ${verificationOutput.flaggedClaims.length} flags`);

  return {
    leadOutput,
    critiqueOutput,
    verificationOutput,
    finalSections: leadOutput.sections,
    suggestedModules: critiqueOutput.revisedModules || leadOutput.suggestedModules,
    citations: leadOutput.citations,
    verificationFlags: verificationOutput.flaggedClaims,
    totalCost,
    totalTime,
  };
}

/**
 * Step 1: Lead Researcher (GPT-5) - Generate comprehensive, accessible content
 */
async function generateLeadResearch(
  topicTitle: string,
  subject: string,
  category?: string
): Promise<LeadResearcherOutput> {
  const startTime = Date.now();

  const systemPrompt = `You are a leading researcher writing a comprehensive encyclopedia article. Your output must be:

- COMPREHENSIVE: Cover everything important about this topic
- ACCESSIBLE: Clear language that educated non-experts can understand (NO academic jargon)
- RIGOROUS: Every claim cited from authoritative sources
- PRACTICAL: Real-world examples, code, and applications
- ENGAGING: Written to teach, not just inform

Write as if creating the definitive guide that will become THE standard reference.`;

  const categoryGuidance = getCategoryGuidance(category);

  const userPrompt = `Write a comprehensive article on: "${topicTitle}" (Subject: ${subject})

${categoryGuidance}

STRUCTURE YOUR ARTICLE IN THESE SECTIONS:

## 1. HISTORICAL CONTEXT
- Where did this come from? Who invented/discovered it?
- Key milestones and breakthroughs
- Why does it matter today?
Write naturally - NO word count requirements. Cover what's important.
CITE: Historical sources, foundational papers, key figures

## 2. CORE CONCEPTS
- What IS this? (clear definitions)
- Fundamental principles explained simply
- Key terminology (defined clearly, not assumed)
- Mental models and frameworks
Write for understanding, not showing off knowledge.
CITE: Textbooks, standards, authoritative definitions

## 3. HOW IT WORKS (Technical Deep Dive)
${category === 'python_coding' ? `
- Language mechanics and design decisions
- Core data structures and their use cases
- Best practices with code examples (10+ real examples)
- Common patterns and idioms
- Performance considerations` : ''}
${category === 'enterprise_architecture' ? `
- Architectural patterns explained with diagrams
- Integration strategies and protocols
- Scalability and performance patterns
- Security architecture principles
- Governance frameworks (TOGAF, Zachman, etc.)` : ''}
${category === 'tech_startup_uk' ? `
- UK legal structures (Ltd, LLP, etc.) - pros/cons
- Tax landscape (Corporation Tax, R&D credits, EIS/SEIS)
- Fundraising ecosystem (angels, VCs, government grants)
- Regulatory compliance (GDPR, FCA, Companies House)
- Market positioning and go-to-market` : ''}
${!category ? '- Technical mechanisms and processes\n- Step-by-step explanations\n- Examples and use cases' : ''}
Use clear explanations. Add code/diagrams where helpful.
CITE: Technical documentation, research papers, standards

## 4. PRACTICAL APPLICATIONS
- Real-world use cases (specific examples)
- Industry applications with results
- Best practices and patterns
- Common mistakes and how to avoid them
- Decision frameworks (when to use X vs Y)
CITE: Case studies, industry reports, practitioner guides

## 5. CURRENT STATE & FUTURE
- What's happening now in this field?
- Emerging trends and developments
- Open challenges and opportunities
- Where is this heading?
CITE: Recent papers, industry analysis, expert predictions

## 6. LEARNING MODULES (Suggested Breakdown)
Based on the content above, propose 6-8 learning modules that:
- Progress from foundational → advanced
- Each module = 1 focused skill/concept
- Include specific learning objectives
- Specify assessment method (NOT multiple choice)
  → code_review, design_critique, case_analysis, essay, presentation, project

## 7. CITATIONS
Every factual claim must have a citation [1], [2], etc.
Minimum 30 authoritative sources:
- Academic papers (peer-reviewed)
- Technical specifications and standards
- Industry reports and case studies
- Authoritative textbooks

CRITICAL: Use clear, accessible language. NO academic jargon. Write to teach.

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

  console.log(`[PHD-Lead] Generating with ${LEAD_MODEL}...`);
  // Use 16000 tokens for comprehensive content (GPT-5/o3 max is 16384)
  let result;
  try {
    result = await callOpenAI(LEAD_MODEL, userPrompt, systemPrompt, 3, 0.7, 16000);
  } catch (error: any) {
    console.error(`[PHD-Lead] ${LEAD_MODEL} failed: ${error.message}`);
    console.log(`[PHD-Lead] Retrying with fallback model ${LEAD_FALLBACK}...`);
    result = await callOpenAI(LEAD_FALLBACK, userPrompt, systemPrompt, 3, 0.7, 16000);
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
    console.error('[PHD-Lead] JSON parse error:', error.message);
    throw new Error(`Lead researcher returned invalid JSON: ${error.message}`);
  }

  const wordCount = parsedOutput.sections.reduce((sum: number, s: ContentSection) => 
    sum + (s.content?.split(/\s+/).length || 0), 0
  );

  return {
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
 * Step 2: Academic Critique (Claude Opus 4) - Review quality
 */
async function generateCritique(
  leadOutput: LeadResearcherOutput,
  topicTitle: string
): Promise<CritiqueOutput> {
  const startTime = Date.now();

  const systemPrompt = `You are a senior academic editor reviewing content for publication. Evaluate:

- LOGICAL COHERENCE: Arguments flow logically and build on each other
- FACTUAL RIGOR: Claims supported by authoritative citations
- PEDAGOGICAL QUALITY: Content structured for learning and understanding
- ACCESSIBILITY: Clear language without unnecessary jargon

Be constructive and specific in your feedback.`;

  const userPrompt = `Review this article on "${topicTitle}":

CONTENT:
${JSON.stringify(leadOutput.sections, null, 2)}

CITATIONS:
${JSON.stringify(leadOutput.citations, null, 2)}

SUGGESTED MODULES:
${JSON.stringify(leadOutput.suggestedModules, null, 2)}

CRITIQUE FRAMEWORK:

1. LOGICAL COHERENCE (Score 0-10)
   - Do sections build on each other naturally?
   - Are explanations clear and well-structured?
   - Any logical gaps or jumps?

2. FACTUAL RIGOR (Score 0-10)
   - Are claims adequately cited?
   - Are sources authoritative and current?
   - Any unsupported assertions?

3. PEDAGOGICAL QUALITY (Score 0-10)
   - Is content organized for learning?
   - Are examples helpful and relevant?
   - Do modules progress logically?

4. ACCESSIBILITY (Score 0-10)
   - Is language clear and jargon-free?
   - Can educated non-experts understand it?
   - Are technical concepts explained well?

5. RECOMMENDATIONS
   - Specific improvements needed
   - Missing content or citations
   - Module refinements

Output as JSON:
{
  "overallAssessment": "accept|minor_revisions|major_revisions",
  "scores": {
    "logicalCoherence": 8,
    "factualRigor": 9,
    "pedagogicalQuality": 7,
    "accessibility": 9
  },
  "critiques": [
    "Specific critique 1",
    "Specific critique 2"
  ],
  "recommendations": [
    "Specific recommendation 1",
    "Specific recommendation 2"
  ],
  "revisedModules": [
    {
      "title": "Revised Module Title",
      "orderIndex": 0,
      "learningObjectives": ["Objective 1"],
      "keyConcepts": ["Concept 1"],
      "estimatedHours": 4,
      "prerequisites": ["Prerequisite 1"],
      "assessmentType": "code_review",
      "assessmentDescription": "Task description"
    }
  ]
}`;

  console.log(`[PHD-Critique] Reviewing with ${CRITIQUE_MODEL}...`);
  const result = await callAnthropic(CRITIQUE_MODEL, userPrompt, systemPrompt);

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
    console.error('[PHD-Critique] JSON parse error:', error.message);
    throw new Error(`Critique returned invalid JSON: ${error.message}`);
  }

  return {
    overallAssessment: parsedOutput.overallAssessment,
    scores: parsedOutput.scores,
    critiques: parsedOutput.critiques,
    recommendations: parsedOutput.recommendations,
    revisedModules: parsedOutput.revisedModules,
    costUsd: result.costUsd,
    tokens: result.tokens,
    timeMs: Date.now() - startTime,
  };
}

/**
 * Step 3: Factual Verification (GPT-4o) - Verify every claim
 */
async function verifyFacts(
  leadOutput: LeadResearcherOutput,
  topicTitle: string
): Promise<VerificationOutput> {
  const startTime = Date.now();

  const systemPrompt = `You are a fact-checking expert. Your ONLY task is to verify factual claims.

- CHECK: Every statistic, date, name, technical detail
- VERIFY: Each citation supports its associated claim
- FLAG: Hallucinations, incorrect facts, or unsupported claims

Be ruthlessly accurate. If you can't verify a claim, flag it.`;

  const userPrompt = `Verify every factual claim in this article on "${topicTitle}":

CONTENT:
${JSON.stringify(leadOutput.sections, null, 2)}

CITATIONS:
${JSON.stringify(leadOutput.citations, null, 2)}

For each claim marked with [1], [2], etc.:
1. Is the fact stated correctly?
2. Does the citation actually support this claim?
3. Is the citation real and authoritative?
4. Is the information current?

Flag any issues:
- citation_not_found: Citation doesn't exist
- fact_incorrect: The fact stated is wrong
- unsupported: Citation doesn't support the claim
- outdated: Information is no longer current

Output as JSON:
{
  "totalClaims": 150,
  "verifiedClaims": 145,
  "accuracy": 0.97,
  "flaggedClaims": [
    {
      "claimText": "Excerpt of problematic claim...",
      "issueType": "citation_not_found|fact_incorrect|unsupported|outdated",
      "severity": "critical|moderate|minor",
      "recommendation": "Specific fix needed",
      "citationId": 12
    }
  ],
  "hallucinations": ["Hallucination 1"],
  "missingCitations": ["Claim needing citation"],
  "publicationReady": true
}`;

  console.log(`[PHD-Verify] Fact-checking with ${VERIFY_MODEL}...`);
  // Use 8000 tokens for detailed verification results
  const result = await callOpenAI(VERIFY_MODEL, userPrompt, systemPrompt, 3, 0.1, 8000);

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
    console.error('[PHD-Verify] JSON parse error:', error.message);
    throw new Error(`Verification returned invalid JSON: ${error.message}`);
  }

  return {
    totalClaims: parsedOutput.totalClaims,
    verifiedClaims: parsedOutput.verifiedClaims,
    accuracy: parsedOutput.accuracy,
    flaggedClaims: parsedOutput.flaggedClaims || [],
    hallucinations: parsedOutput.hallucinations || [],
    missingCitations: parsedOutput.missingCitations || [],
    publicationReady: parsedOutput.publicationReady,
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

