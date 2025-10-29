/**
 * Citation Validator for Cerply V2
 * 
 * Implements FSD v2.0 Section 1.5: Quality gates before lock
 * - Citations present and check out
 * - Links resolve
 * - No made-up facts (checked via quality model in quality-gate.ts)
 */

export interface Citation {
  url: string
  title: string
  excerpt: string
  accessedAt?: string
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validate citations for a module section
 */
export async function validateCitations(citations: Citation[]): Promise<ValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []

  if (!citations || citations.length === 0) {
    warnings.push('No citations provided')
    return { valid: true, errors, warnings }
  }

  for (const citation of citations) {
    // Check required fields
    if (!citation.url) {
      errors.push(`Citation missing URL: "${citation.title || 'Unknown'}"`)
      continue
    }

    if (!citation.title) {
      warnings.push(`Citation missing title: ${citation.url}`)
    }

    // Validate URL format
    if (!isValidUrl(citation.url)) {
      errors.push(`Invalid URL format: ${citation.url}`)
      continue
    }

    // Check if URL is accessible (with timeout)
    const isAccessible = await checkUrlAccessible(citation.url)
    if (!isAccessible) {
      warnings.push(`URL may not be accessible: ${citation.url}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Check if a URL is valid format
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Check if a URL is accessible (HEAD request with timeout)
 */
async function checkUrlAccessible(url: string, timeoutMs: number = 5000): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      // Follow redirects
      redirect: 'follow',
    })

    clearTimeout(timeout)

    // Consider 2xx and 3xx as accessible
    return response.ok || (response.status >= 300 && response.status < 400)
  } catch (error) {
    // Timeout or network error
    return false
  }
}

/**
 * Extract citations from source map
 */
export function extractCitations(sourceMap: any): Citation[] {
  if (!sourceMap || !sourceMap.citations) return []
  return sourceMap.citations as Citation[]
}

/**
 * Validate that content has proper attribution
 * Checks for citation markers like [1], [2] or footnotes
 */
export function validateAttribution(content: string, citationCount: number): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // If there are citations, content should reference them
  if (citationCount > 0) {
    // Look for citation markers: [1], [2], etc.
    const citationMarkers = content.match(/\[\d+\]/g) || []

    if (citationMarkers.length === 0) {
      warnings.push('Content has citations but no citation markers found in text')
    }

    // Check if all citations are referenced
    const referencedIndices = citationMarkers.map((m) => parseInt(m.replace(/[\[\]]/g, '')))
    const uniqueReferences = new Set(referencedIndices)

    if (uniqueReferences.size < citationCount) {
      warnings.push(`Not all citations are referenced in text (${uniqueReferences.size}/${citationCount})`)
    }
  }

  return {
    valid: true, // Attribution warnings don't block lock
    errors,
    warnings,
  }
}

/**
 * Check for common hallucination indicators in content
 * This is a lightweight pre-check; full hallucination detection uses quality model
 */
export function detectHallucinationIndicators(content: string): string[] {
  const indicators: string[] = []

  // Check for vague or hedge words that might indicate uncertainty
  const vaguePatterns = [
    /(?:might|may|could|possibly|perhaps|allegedly)\s+(?:be|have|indicate)/gi,
    /it is (?:believed|thought|assumed) that/gi,
    /some sources suggest/gi,
    /according to unverified/gi,
  ]

  for (const pattern of vaguePatterns) {
    if (pattern.test(content)) {
      indicators.push(`Content contains hedging language: "${content.match(pattern)?.[0]}"`)
    }
  }

  // Check for exact numbers without citations (potential fabrication)
  const numberPattern = /\b\d{4,}\b/g // 4+ digit numbers
  const numbers = content.match(numberPattern) || []

  if (numbers.length > 0) {
    indicators.push(`Content contains specific numbers (${numbers.length}) - ensure they are cited`)
  }

  return indicators
}

/**
 * Validate module has sufficient citations for its length and complexity
 */
export function validateCitationSufficiency(
  contentLength: number,
  citationCount: number,
  moduleGoals: any[]
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Rule of thumb: at least 1 citation per 500 words of content
  const words = contentLength / 5 // rough word count (avg 5 chars per word)
  const expectedCitations = Math.ceil(words / 500)

  if (citationCount === 0 && words > 100) {
    errors.push('Module has substantial content but no citations')
  } else if (citationCount < expectedCitations) {
    warnings.push(
      `Module may need more citations (has ${citationCount}, expected ~${expectedCitations} for ${Math.round(words)} words)`
    )
  }

  // Check if complex goals have sufficient backing
  if (moduleGoals && moduleGoals.length > 3 && citationCount < 3) {
    warnings.push('Module has multiple learning goals but few citations')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

