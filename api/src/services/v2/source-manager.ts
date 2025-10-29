/**
 * Source Manager for Cerply V2
 * 
 * Implements FSD v2.0 Section 1.3: Sources the agent may use
 * 
 * Manages allowed sources per client:
 * - Certified Core (read-only from Cerply catalogue)
 * - Cerply Building Blocks (structure templates, no domain facts)
 * - Client private library (client's content and team details)
 * - Industry sources (if allowed by org rules - open web)
 */

import { db } from '../../db'
import { contentLibrary, modules, moduleSections } from '../../../drizzle/schema_v2'
import { eq, and } from 'drizzle-orm'

export enum SourceType {
  CERTIFIED_CORE = 'Certified Core',
  CERPLY_TEMPLATES = 'Cerply templates',
  CLIENT_INTERNAL = 'Internal',
  INDUSTRY_SOURCE = 'Industry source',
}

export interface Source {
  type: SourceType
  id?: string
  name: string
  url?: string
  content?: string
  excerpt?: string
}

export interface SourcePermissions {
  allowCertified: boolean
  allowCerplyTemplates: boolean
  allowClientLibrary: boolean
  allowIndustryWeb: boolean
  blockedDomains: string[]
  allowedDomains: string[]
}

/**
 * Get source permissions for an organization
 */
export async function getSourcePermissions(organizationId: string): Promise<SourcePermissions> {
  // TODO: Fetch from organization settings table
  // For now, return defaults matching FSD: industry sources ON by default
  return {
    allowCertified: true,
    allowCerplyTemplates: true,
    allowClientLibrary: true,
    allowIndustryWeb: true, // Default ON, controlled by client content rules
    blockedDomains: [],
    allowedDomains: [], // Empty = all allowed (subject to blocklist)
  }
}

/**
 * Fetch Certified Core modules (read-only)
 */
export async function fetchCertifiedSources(searchQuery?: string): Promise<Source[]> {
  try {
    // Query modules with visibility = 'certified'
    const certifiedModules = await db
      .select({
        id: modules.id,
        title: modules.title,
        goals: modules.goals,
        tags: modules.tags,
        sector: modules.sector,
      })
      .from(modules)
      .where(eq(modules.visibility, 'certified'))
      .limit(50)

    return certifiedModules.map((mod: any) => ({
      type: SourceType.CERTIFIED_CORE,
      id: mod.id,
      name: mod.title,
      excerpt: `Certified module: ${(mod.goals as any[])?.[0] || 'No description'}`,
    }))
  } catch (error) {
    console.error('Failed to fetch Certified sources:', error)
    return []
  }
}

/**
 * Fetch client's private library content
 */
export async function fetchClientLibrarySources(organizationId: string): Promise<Source[]> {
  try {
    const clientModules = await db
      .select({
        id: modules.id,
        title: modules.title,
        goals: modules.goals,
      })
      .from(modules)
      .innerJoin(contentLibrary, eq(modules.id, contentLibrary.moduleId))
      .where(eq(contentLibrary.organizationId, organizationId))
      .limit(50)

    return clientModules.map((mod: any) => ({
      type: SourceType.CLIENT_INTERNAL,
      id: mod.id,
      name: mod.title,
      excerpt: `Client module: ${(mod.goals as any[])?.[0] || 'No description'}`,
    }))
  } catch (error) {
    console.error('Failed to fetch client library sources:', error)
    return []
  }
}

/**
 * Fetch Cerply Building Blocks (structure templates, no domain facts)
 */
export async function fetchCerplyTemplates(): Promise<Source[]> {
  // These are meta-instructions and patterns, not factual content
  const templates: Source[] = [
    {
      type: SourceType.CERPLY_TEMPLATES,
      name: 'Micro-lesson structure',
      content: `Structure: Title (5-7 words), Core concept (60-120 words), Key points (3-5 bullets), Example (concrete, relatable), Practice prompt. Tone: plain English, active voice, short sentences.`,
    },
    {
      type: SourceType.CERPLY_TEMPLATES,
      name: 'Quick check structure',
      content: `Structure: Setup (1-2 sentences), Question (clear, single focus), Choices (4 options, one correct), Explanation (why correct, why others wrong, 40-80 words). Difficulty signals: vocabulary, abstraction level, number of steps.`,
    },
    {
      type: SourceType.CERPLY_TEMPLATES,
      name: 'Quiz structure',
      content: `Bundle of 3-5 quick checks on related goals. Start easy, ramp difficulty. Mix recall, application, and case-based. End with reflection prompt.`,
    },
    {
      type: SourceType.CERPLY_TEMPLATES,
      name: 'Guidance note structure',
      content: `Practical procedure or checklist. Steps (numbered, actionable), Common mistakes (bullets), When to escalate (clear triggers). Keep under 200 words.`,
    },
    {
      type: SourceType.CERPLY_TEMPLATES,
      name: 'Difficulty calibration',
      content: `0-3 Beginner: recall, definitions, single-step. 4-6 Intermediate: application, multi-step, simple cases. 7-9 Advanced: synthesis, edge cases, judgment calls. 10 Expert: novel situations, strategic decisions.`,
    },
    {
      type: SourceType.CERPLY_TEMPLATES,
      name: 'Feedback patterns',
      content: `Correct: affirm, explain why, link to next concept. Incorrect: no punishment, show correct answer, explain reasoning, offer hint or recap. Partial: acknowledge progress, guide to full answer.`,
    },
  ]

  return templates
}

/**
 * Check if a URL is allowed per organization rules
 */
export function isUrlAllowed(url: string, permissions: SourcePermissions): boolean {
  if (!permissions.allowIndustryWeb) return false

  try {
    const parsedUrl = new URL(url)
    const domain = parsedUrl.hostname

    // Check blocklist first
    if (permissions.blockedDomains.some((blocked) => domain.includes(blocked))) {
      return false
    }

    // If allowlist is empty, all non-blocked domains are allowed
    if (permissions.allowedDomains.length === 0) return true

    // Otherwise, domain must be in allowlist
    return permissions.allowedDomains.some((allowed) => domain.includes(allowed))
  } catch (error) {
    console.error('Invalid URL:', url, error)
    return false
  }
}

/**
 * Fetch content from an external URL (industry source)
 * This is a placeholder - in production would use a proper web scraper
 */
export async function fetchIndustrySource(url: string, permissions: SourcePermissions): Promise<Source | null> {
  if (!isUrlAllowed(url, permissions)) {
    throw new Error(`URL not allowed: ${url}`)
  }

  try {
    // Placeholder: in production, use a web scraper service
    // For now, return a mock source
    return {
      type: SourceType.INDUSTRY_SOURCE,
      name: `External: ${url}`,
      url,
      excerpt: 'Content from external source (scraping not implemented in initial version)',
    }
  } catch (error) {
    console.error('Failed to fetch industry source:', url, error)
    return null
  }
}

/**
 * Get detailed content from a Certified module
 */
export async function getCertifiedModuleContent(moduleId: string): Promise<{
  module: any
  sections: any[]
} | null> {
  try {
    const [module] = await db
      .select()
      .from(modules)
      .where(and(eq(modules.id, moduleId), eq(modules.visibility, 'certified')))

    if (!module) return null

    const sections = await db
      .select()
      .from(moduleSections)
      .where(eq(moduleSections.moduleId, moduleId))
      .orderBy(moduleSections.order)

    return { module, sections }
  } catch (error) {
    console.error('Failed to get Certified module content:', error)
    return null
  }
}

/**
 * Get detailed content from a client library module
 */
export async function getClientModuleContent(
  moduleId: string,
  organizationId: string
): Promise<{
  module: any
  sections: any[]
} | null> {
  try {
    // Verify the module belongs to this organization
    const [libEntry] = await db
      .select()
      .from(contentLibrary)
      .where(and(eq(contentLibrary.moduleId, moduleId), eq(contentLibrary.organizationId, organizationId)))

    if (!libEntry) return null

    const [module] = await db.select().from(modules).where(eq(modules.id, moduleId))

    if (!module) return null

    const sections = await db
      .select()
      .from(moduleSections)
      .where(eq(moduleSections.moduleId, moduleId))
      .orderBy(moduleSections.order)

    return { module, sections }
  } catch (error) {
    console.error('Failed to get client module content:', error)
    return null
  }
}

