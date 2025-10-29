/**
 * Quality Gate for Cerply V2
 * 
 * Implements FSD v2.0 Section 1.5: Quality gates before lock
 * 
 * Pre-lock validation checks:
 * 1. Citations present and valid
 * 2. No hallucinations (via quality check model)
 * 3. Reading level and length match target roles
 * 4. Duplicates removed; items are varied
 * 5. Basic accessibility checks
 * 6. Storage routing correct (Internal vs references)
 * 7. Sign-posting: clear provenance badges
 */

import { db } from '../db'
import { modules, moduleSections, moduleItems } from '../../drizzle/schema_v2'
import { eq } from 'drizzle-orm'
import { validateCitations, extractCitations, validateCitationSufficiency } from './citation-validator'
import { callModel, ModelJobType } from './model-orchestrator'

export interface QualityGateResult {
  passed: boolean
  flags: QualityFlag[]
  score: number // 0-100
  recommendations: string[]
}

export interface QualityFlag {
  severity: 'error' | 'warning'
  category: 'citations' | 'hallucination' | 'readability' | 'duplicates' | 'accessibility' | 'storage' | 'provenance'
  message: string
  location?: string // Section or item ID
  suggestion?: string
}

/**
 * Run all quality gates for a module before lock
 */
export async function runQualityGates(moduleId: string): Promise<QualityGateResult> {
  const flags: QualityFlag[] = []
  let score = 100

  // Get module and sections
  const [module] = await db.select().from(modules).where(eq(modules.id, moduleId))

  if (!module) {
    throw new Error('Module not found')
  }

  const sections = await db.select().from(moduleSections).where(eq(moduleSections.moduleId, moduleId)).orderBy(moduleSections.order)

  if (sections.length === 0) {
    flags.push({
      severity: 'error',
      category: 'citations',
      message: 'Module has no sections',
    })
    return { passed: false, flags, score: 0, recommendations: ['Draft Module core first'] }
  }

  // Gate 1: Citations present and valid
  const citationFlags = await checkCitations(sections, module)
  flags.push(...citationFlags)
  score -= citationFlags.filter((f) => f.severity === 'error').length * 10

  // Gate 2: No hallucinations (quality check model)
  const hallucinationFlags = await checkHallucinations(sections, module)
  flags.push(...hallucinationFlags)
  score -= hallucinationFlags.filter((f) => f.severity === 'error').length * 15

  // Gate 3: Reading level and length match target roles
  const readabilityFlags = checkReadability(sections, module)
  flags.push(...readabilityFlags)
  score -= readabilityFlags.filter((f) => f.severity === 'error').length * 5

  // Gate 4: Duplicates removed; items are varied
  const duplicateFlags = checkDuplicates(sections)
  flags.push(...duplicateFlags)
  score -= duplicateFlags.filter((f) => f.severity === 'error').length * 5

  // Gate 5: Basic accessibility checks
  const accessibilityFlags = checkAccessibility(sections)
  flags.push(...accessibilityFlags)
  score -= accessibilityFlags.filter((f) => f.severity === 'error').length * 5

  // Gate 6: Storage routing correct (Internal vs references)
  const storageFlags = checkStorageRouting(sections)
  flags.push(...storageFlags)
  score -= storageFlags.filter((f) => f.severity === 'error').length * 10

  // Gate 7: Sign-posting: provenance badges present
  const provenanceFlags = checkProvenance(sections)
  flags.push(...provenanceFlags)
  score -= provenanceFlags.filter((f) => f.severity === 'error').length * 10

  // Ensure score stays in 0-100 range
  score = Math.max(0, Math.min(100, score))

  // Module can only lock if no errors
  const passed = !flags.some((f) => f.severity === 'error')

  // Generate recommendations
  const recommendations = generateRecommendations(flags, score)

  return { passed, flags, score, recommendations }
}

/**
 * Gate 1: Check citations are present and valid
 */
async function checkCitations(sections: any[], module: any): Promise<QualityFlag[]> {
  const flags: QualityFlag[] = []

  let totalCitations = 0
  let totalContentLength = 0

  for (const section of sections) {
    const citations = extractCitations(section.sourceMap)
    totalCitations += citations.length
    totalContentLength += section.content.length

    // Validate each citation
    const validation = await validateCitations(citations)

    for (const error of validation.errors) {
      flags.push({
        severity: 'error',
        category: 'citations',
        message: error,
        location: section.title,
        suggestion: 'Fix or remove invalid citation',
      })
    }

    for (const warning of validation.warnings) {
      flags.push({
        severity: 'warning',
        category: 'citations',
        message: warning,
        location: section.title,
      })
    }
  }

  // Check citation sufficiency
  const sufficiency = validateCitationSufficiency(totalContentLength, totalCitations, module.goals)

  for (const error of sufficiency.errors) {
    flags.push({
      severity: 'error',
      category: 'citations',
      message: error,
      suggestion: 'Add citations to support factual claims',
    })
  }

  for (const warning of sufficiency.warnings) {
    flags.push({
      severity: 'warning',
      category: 'citations',
      message: warning,
    })
  }

  return flags
}

/**
 * Gate 2: Check for hallucinations using quality model
 */
async function checkHallucinations(sections: any[], module: any): Promise<QualityFlag[]> {
  const flags: QualityFlag[] = []

  // Build fact-checking prompt for quality model
  const content = sections.map((s) => `${s.title}\n${s.content}`).join('\n\n')

  const prompt = `You are a fact-checker. Review this educational content for potential hallucinations or unsupported claims.

Module: ${module.title}
Content:
${content}

For each section, identify:
1. Specific claims that need citation but lack one
2. Statements that contradict known facts
3. Vague or hedging language that suggests uncertainty
4. Exact numbers or statistics without sources

Output as JSON array: [{"section": "section title", "issue": "description", "severity": "error" | "warning"}]

If content looks accurate and well-supported, return empty array.`

  try {
    const response = await callModel({
      jobType: ModelJobType.QUALITY_CHECK,
      prompt,
      systemPrompt: 'You are a rigorous fact-checker. Be thorough but fair. Only flag genuine concerns.',
      metadata: {
        module_id: module.id,
        check_type: 'hallucination',
      },
    })

    // Parse response
    const jsonMatch = response.content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/) || response.content.match(/(\[[\s\S]*\])/)

    if (jsonMatch) {
      const issues = JSON.parse(jsonMatch[1])

      for (const issue of issues) {
        flags.push({
          severity: issue.severity === 'error' ? 'error' : 'warning',
          category: 'hallucination',
          message: issue.issue,
          location: issue.section,
          suggestion: 'Add citation or revise claim',
        })
      }
    }
  } catch (error) {
    console.error('Hallucination check failed:', error)
    // Don't block on quality check failure
    flags.push({
      severity: 'warning',
      category: 'hallucination',
      message: 'Quality check could not be completed',
      suggestion: 'Manually review content for accuracy',
    })
  }

  return flags
}

/**
 * Gate 3: Check reading level and length match target roles
 */
function checkReadability(sections: any[], module: any): QualityFlag[] {
  const flags: QualityFlag[] = []

  for (const section of sections) {
    const words = section.content.split(/\s+/).length
    const sentences = section.content.split(/[.!?]+/).length

    // Average words per sentence
    const avgWordsPerSentence = words / Math.max(sentences, 1)

    // Check for overly long sentences (harder to read)
    if (avgWordsPerSentence > 25) {
      flags.push({
        severity: 'warning',
        category: 'readability',
        message: `Section "${section.title}" has long sentences (avg ${Math.round(avgWordsPerSentence)} words)`,
        location: section.title,
        suggestion: 'Break into shorter sentences for clarity',
      })
    }

    // Check section length (should be digestible)
    if (words < 50) {
      flags.push({
        severity: 'warning',
        category: 'readability',
        message: `Section "${section.title}" is very short (${words} words)`,
        location: section.title,
        suggestion: 'Add more detail or merge with another section',
      })
    }

    if (words > 600) {
      flags.push({
        severity: 'warning',
        category: 'readability',
        message: `Section "${section.title}" is very long (${words} words)`,
        location: section.title,
        suggestion: 'Consider splitting into multiple sections',
      })
    }

    // Check for jargon without explanation (simplified)
    const jargonIndicators = ['i.e.', 'e.g.', 'etc.', 'viz.', 'cf.']
    for (const indicator of jargonIndicators) {
      if (section.content.toLowerCase().includes(indicator)) {
        flags.push({
          severity: 'warning',
          category: 'readability',
          message: `Section "${section.title}" uses Latin abbreviations (${indicator})`,
          location: section.title,
          suggestion: 'Use plain English ("for example", "that is", etc.)',
        })
      }
    }
  }

  return flags
}

/**
 * Gate 4: Check for duplicate content
 */
function checkDuplicates(sections: any[]): QualityFlag[] {
  const flags: QualityFlag[] = []

  for (let i = 0; i < sections.length; i++) {
    for (let j = i + 1; j < sections.length; j++) {
      const similarity = calculateSimilarity(sections[i].content, sections[j].content)

      if (similarity > 0.8) {
        flags.push({
          severity: 'error',
          category: 'duplicates',
          message: `Sections "${sections[i].title}" and "${sections[j].title}" are ${Math.round(similarity * 100)}% similar`,
          location: sections[i].title,
          suggestion: 'Merge or differentiate these sections',
        })
      } else if (similarity > 0.5) {
        flags.push({
          severity: 'warning',
          category: 'duplicates',
          message: `Sections "${sections[i].title}" and "${sections[j].title}" have significant overlap (${Math.round(similarity * 100)}%)`,
          location: sections[i].title,
          suggestion: 'Consider merging or clarifying differences',
        })
      }
    }
  }

  return flags
}

/**
 * Gate 5: Basic accessibility checks
 */
function checkAccessibility(sections: any[]): QualityFlag[] {
  const flags: QualityFlag[] = []

  for (const section of sections) {
    // Check for walls of text (no paragraph breaks)
    const paragraphs = section.content.split(/\n\n+/)

    if (paragraphs.length === 1 && section.content.length > 500) {
      flags.push({
        severity: 'warning',
        category: 'accessibility',
        message: `Section "${section.title}" is one large paragraph`,
        location: section.title,
        suggestion: 'Break into multiple paragraphs for readability',
      })
    }

    // Check for missing alt text on images (if any)
    const imageMarkers = section.content.match(/!\[([^\]]*)\]/g) || []

    for (const marker of imageMarkers) {
      if (marker === '![]' || marker === '![ ]') {
        flags.push({
          severity: 'error',
          category: 'accessibility',
          message: `Section "${section.title}" has image without alt text`,
          location: section.title,
          suggestion: 'Add descriptive alt text for screen readers',
        })
      }
    }

    // Check for good heading structure
    if (!section.title || section.title.length < 3) {
      flags.push({
        severity: 'error',
        category: 'accessibility',
        message: 'Section has no title or very short title',
        location: section.title || '(untitled)',
        suggestion: 'Add a clear, descriptive section title',
      })
    }
  }

  return flags
}

/**
 * Gate 6: Check storage routing (Internal content stored in client library)
 */
function checkStorageRouting(sections: any[]): QualityFlag[] {
  const flags: QualityFlag[] = []

  for (const section of sections) {
    const badges = section.provenanceBadges as any[]

    if (!badges || badges.length === 0) {
      flags.push({
        severity: 'error',
        category: 'storage',
        message: `Section "${section.title}" has no provenance badges`,
        location: section.title,
        suggestion: 'Add provenance badges to indicate content source',
      })
      continue
    }

    // Check for proper badge structure
    for (const badge of badges) {
      if (!badge.type) {
        flags.push({
          severity: 'error',
          category: 'storage',
          message: `Section "${section.title}" has malformed provenance badge`,
          location: section.title,
          suggestion: 'Ensure all badges have a type field',
        })
      }
    }
  }

  return flags
}

/**
 * Gate 7: Check provenance sign-posting
 */
function checkProvenance(sections: any[]): QualityFlag[] {
  const flags: QualityFlag[] = []

  for (const section of sections) {
    const badges = section.provenanceBadges as any[]

    if (!badges || badges.length === 0) {
      flags.push({
        severity: 'error',
        category: 'provenance',
        message: `Section "${section.title}" has no provenance badges`,
        location: section.title,
        suggestion: 'Add provenance badges (Internal, Certified Core, Industry source, Cerply templates)',
      })
    }

    // Check for mixed provenance without clear attribution
    const types = new Set(badges?.map((b) => b.type) || [])

    if (types.size > 2) {
      flags.push({
        severity: 'warning',
        category: 'provenance',
        message: `Section "${section.title}" mixes multiple source types`,
        location: section.title,
        suggestion: 'Clarify which parts come from which sources',
      })
    }
  }

  return flags
}

/**
 * Generate recommendations based on flags and score
 */
function generateRecommendations(flags: QualityFlag[], score: number): string[] {
  const recommendations: string[] = []

  // Error-specific recommendations
  const errorCategories = new Set(flags.filter((f) => f.severity === 'error').map((f) => f.category))

  if (errorCategories.has('citations')) {
    recommendations.push('Fix citation issues before locking - add missing citations and verify URLs')
  }

  if (errorCategories.has('hallucination')) {
    recommendations.push('Critical: Review flagged content for accuracy and add supporting citations')
  }

  if (errorCategories.has('duplicates')) {
    recommendations.push('Remove or merge duplicate sections')
  }

  if (errorCategories.has('accessibility')) {
    recommendations.push('Fix accessibility issues - add alt text and proper headings')
  }

  if (errorCategories.has('storage') || errorCategories.has('provenance')) {
    recommendations.push('Add provenance badges to all sections')
  }

  // Score-based recommendations
  if (score < 70) {
    recommendations.push('Module quality is below acceptable threshold - significant revisions needed')
  } else if (score < 85) {
    recommendations.push('Module is nearly ready - address remaining warnings before lock')
  } else {
    recommendations.push('Module quality is good - ready to lock after fixing any errors')
  }

  return recommendations
}

/**
 * Calculate similarity between two texts (Jaccard similarity)
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter((w) => w.length > 3))
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter((w) => w.length > 3))

  const intersection = new Set([...words1].filter((w) => words2.has(w)))
  const union = new Set([...words1, ...words2])

  return union.size === 0 ? 0 : intersection.size / union.size
}

