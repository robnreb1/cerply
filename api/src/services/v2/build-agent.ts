/**
 * Build Agent for Cerply V2
 * 
 * Implements FSD v2.0 Section 1: Build workspace draft loop
 * 
 * Core responsibilities:
 * - Prompt-to-Module outline generation
 * - Module core drafting (sections, key points, citations)
 * - Generate lessons/checks from core
 * - Merge multiple sources (prompts + uploads + Certified + industry)
 * - Apply provenance badges
 * - Flag duplicates and conflicts
 */

import { callModel, ModelJobType, type ModelRequest } from './model-orchestrator'
import {
  fetchCertifiedSources,
  fetchClientLibrarySources,
  fetchCerplyTemplates,
  getSourcePermissions,
  type Source,
  SourceType,
} from './source-manager'
import { validateCitations, extractCitations } from './citation-validator'
import { db } from '../db'
import { modules, moduleSections, moduleItems, buildSessions } from '../../drizzle/schema_v2'
import { eq } from 'drizzle-orm'

export interface BuildRequest {
  userId: string
  organizationId: string
  prompt: string
  uploads?: Array<{ name: string; content: string }>
  existingModuleId?: string // For editing existing module
}

export interface BuildResponse {
  moduleId: string
  outline: ModuleOutline
  sections: ModuleSection[]
  calibrationItems?: CalibrationItem[]
  conflicts?: Conflict[]
  status: 'draft' | 'ready_for_review' | 'ready_to_lock'
}

export interface ModuleOutline {
  title: string
  goals: string[]
  targetRoles: string[]
  tags: string[]
  sector?: string
}

export interface ModuleSection {
  title: string
  content: string
  order: number
  sourceMap: {
    citations: Array<{
      url: string
      title: string
      excerpt: string
    }>
  }
  provenanceBadges: Array<{
    type: SourceType
    sourceId?: string
    sourceName?: string
  }>
}

export interface CalibrationItem {
  type: 'micro-lesson' | 'quick-check'
  content: any
  difficultyLevel: number
  rationale: string
}

export interface Conflict {
  type: 'duplicate' | 'contradiction' | 'unclear_source'
  section1: string
  section2?: string
  description: string
  suggestions: string[]
}

/**
 * Start a new Build session - generate outline from prompt
 */
export async function startBuildSession(request: BuildRequest): Promise<BuildResponse> {
  // Get source permissions for this org
  const permissions = await getSourcePermissions(request.organizationId)

  // Gather available sources
  const sources: Source[] = []

  if (permissions.allowCerplyTemplates) {
    sources.push(...(await fetchCerplyTemplates()))
  }

  if (permissions.allowCertified) {
    sources.push(...(await fetchCertifiedSources()))
  }

  if (permissions.allowClientLibrary) {
    sources.push(...(await fetchClientLibrarySources(request.organizationId)))
  }

  // Build system prompt for outline generation
  const systemPrompt = buildOutlineSystemPrompt(sources)

  // Generate outline
  const outlineResponse = await callModel({
    jobType: ModelJobType.DRAFT_OUTLINE,
    prompt: request.prompt,
    systemPrompt,
    metadata: {
      user_id: request.userId,
      organization_id: request.organizationId,
    },
  })

  const outline = parseOutlineResponse(outlineResponse.content)

  // Create module in database (draft state)
  const [module] = await db
    .insert(modules)
    .values({
      title: outline.title,
      goals: outline.goals,
      targetRoles: outline.targetRoles,
      tags: outline.tags,
      sector: outline.sector,
      ownerId: request.userId,
      organizationId: request.organizationId,
      visibility: 'private',
      complianceCritical: false,
    })
    .returning()

  // Create build session to track chat history
  await db.insert(buildSessions).values({
    userId: request.userId,
    moduleId: module.id,
    chatHistory: [
      { role: 'user', content: request.prompt, timestamp: new Date().toISOString() },
      { role: 'assistant', content: outlineResponse.content, timestamp: new Date().toISOString() },
    ],
    sourcesUsed: sources.map((s) => ({
      type: s.type,
      name: s.name,
      url: s.url,
      timestamp: new Date().toISOString(),
    })),
  })

  return {
    moduleId: module.id,
    outline,
    sections: [],
    status: 'draft',
  }
}

/**
 * Draft Module core sections from accepted outline
 */
export async function draftModuleCore(
  moduleId: string,
  userId: string,
  organizationId: string
): Promise<BuildResponse> {
  // Get module and current outline
  const [module] = await db.select().from(modules).where(eq(modules.id, moduleId))

  if (!module) {
    throw new Error('Module not found')
  }

  // Get build session for context
  const [session] = await db.select().from(buildSessions).where(eq(buildSessions.moduleId, moduleId))

  if (!session) {
    throw new Error('Build session not found')
  }

  // Get sources again
  const permissions = await getSourcePermissions(organizationId)
  const sources: Source[] = []

  if (permissions.allowCerplyTemplates) {
    sources.push(...(await fetchCerplyTemplates()))
  }

  // Build system prompt for core drafting
  const systemPrompt = buildCoreSystemPrompt(sources, module)

  const draftPrompt = `Draft detailed Module core sections for:

Title: ${module.title}
Goals: ${(module.goals as string[]).join(', ')}
Target Roles: ${(module.targetRoles as string[]).join(', ')}

For each section:
1. Provide clear, structured content (markdown supported)
2. Include citations from reliable sources
3. Mark provenance (Internal / Certified Core / Industry source / Cerply templates)
4. Focus on practical, actionable knowledge

Generate 4-6 sections covering the core concepts needed to achieve the learning goals.`

  // Call top model for core drafting
  const coreResponse = await callModel({
    jobType: ModelJobType.DRAFT_CORE,
    prompt: draftPrompt,
    systemPrompt,
    metadata: {
      user_id: userId,
      organization_id: organizationId,
      module_id: moduleId,
    },
  })

  // Parse sections from response
  const sections = parseSectionsResponse(coreResponse.content)

  // Save sections to database
  for (const section of sections) {
    await db.insert(moduleSections).values({
      moduleId,
      title: section.title,
      content: section.content,
      order: section.order,
      sourceMap: section.sourceMap,
      provenanceBadges: section.provenanceBadges,
    })
  }

  // Update build session chat history
  await db
    .update(buildSessions)
    .set({
      chatHistory: [
        ...(session.chatHistory as any[]),
        { role: 'assistant', content: coreResponse.content, timestamp: new Date().toISOString() },
      ],
      updatedAt: new Date().toISOString(),
    })
    .where(eq(buildSessions.moduleId, moduleId))

  return {
    moduleId,
    outline: {
      title: module.title,
      goals: module.goals as string[],
      targetRoles: module.targetRoles as string[],
      tags: module.tags as string[],
      sector: module.sector || undefined,
    },
    sections,
    status: 'ready_for_review',
  }
}

/**
 * Generate calibration items (example lessons/checks at varied difficulty)
 */
export async function generateCalibrationItems(
  moduleId: string,
  userId: string,
  organizationId: string
): Promise<CalibrationItem[]> {
  // Get module and sections
  const [module] = await db.select().from(modules).where(eq(modules.id, moduleId))

  if (!module) {
    throw new Error('Module not found')
  }

  const sections = await db.select().from(moduleSections).where(eq(moduleSections.moduleId, moduleId)).orderBy(moduleSections.order)

  if (sections.length === 0) {
    throw new Error('No sections found - draft Module core first')
  }

  // Build prompt for calibration generation
  const calibrationPrompt = `Generate 6 example items from this Module core:

Title: ${module.title}
Sections: ${sections.map((s) => s.title).join(', ')}

Generate:
- 3 micro-lessons at difficulty levels 2, 5, 8 (Beginner, Intermediate, Advanced)
- 3 quick-checks at difficulty levels 3, 6, 9

For each item:
1. Show the full content
2. Explain the difficulty level and why
3. Note which goal it addresses

Format as JSON array with: type, content, difficultyLevel, rationale`

  const response = await callModel({
    jobType: ModelJobType.GENERATE_CALIBRATION,
    prompt: calibrationPrompt,
    systemPrompt: 'You are a learning design expert. Generate varied, high-quality educational items.',
    metadata: {
      user_id: userId,
      organization_id: organizationId,
      module_id: moduleId,
    },
  })

  // Parse calibration items
  const items = parseCalibrationResponse(response.content)

  return items
}

/**
 * Detect conflicts and duplicates in Module sections
 */
export async function detectConflicts(moduleId: string): Promise<Conflict[]> {
  const sections = await db.select().from(moduleSections).where(eq(moduleSections.moduleId, moduleId)).orderBy(moduleSections.order)

  const conflicts: Conflict[] = []

  // Check for duplicate content
  for (let i = 0; i < sections.length; i++) {
    for (let j = i + 1; j < sections.length; j++) {
      const similarity = calculateSimilarity(sections[i].content, sections[j].content)

      if (similarity > 0.7) {
        conflicts.push({
          type: 'duplicate',
          section1: sections[i].title,
          section2: sections[j].title,
          description: `Sections "${sections[i].title}" and "${sections[j].title}" have ${Math.round(similarity * 100)}% similar content`,
          suggestions: ['Merge sections', 'Remove duplicate content', 'Differentiate focus'],
        })
      }
    }
  }

  // Check for missing citations in substantial sections
  for (const section of sections) {
    const citations = extractCitations(section.sourceMap)
    const wordCount = section.content.split(/\s+/).length

    if (wordCount > 200 && citations.length === 0) {
      conflicts.push({
        type: 'unclear_source',
        section1: section.title,
        description: `Section "${section.title}" has substantial content (${wordCount} words) but no citations`,
        suggestions: ['Add citations', 'Mark as original internal content', 'Verify facts'],
      })
    }
  }

  return conflicts
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildOutlineSystemPrompt(sources: Source[]): string {
  return `You are an expert instructional designer for Cerply, a learning platform.

Your job: Create a clear Module outline from the user's prompt.

Available sources:
${sources.map((s) => `- ${s.name} (${s.type})`).join('\n')}

Output format (JSON):
{
  "title": "Clear, specific title (5-10 words)",
  "goals": ["Specific learning outcome 1", "Specific learning outcome 2", ...],
  "targetRoles": ["role1", "role2"],
  "tags": ["skill", "sector", ...],
  "sector": "financial-services" | "healthcare" | etc.
}

Guidelines:
- Make goals specific and measurable
- Identify 2-4 target roles
- Add 3-5 relevant tags
- Keep title concise and descriptive`
}

function buildCoreSystemPrompt(sources: Source[], module: any): string {
  return `You are an expert content creator for Cerply.

Your job: Draft detailed Module core sections.

Module context:
- Title: ${module.title}
- Goals: ${(module.goals as string[]).join(', ')}

Available templates:
${sources.filter((s: Source) => s.type === SourceType.CERPLY_TEMPLATES).map((s: Source) => `- ${s.name}`).join('\n')}

For each section:
1. Structure: Title, core content (200-400 words), key points (3-5 bullets)
2. Tone: Plain English, active voice, short sentences, no jargon
3. Citations: Include [1], [2] markers and full citations at end
4. Provenance: Mark each fact/concept with its source type

Output 4-6 sections covering the Module goals comprehensively.`
}

function parseOutlineResponse(response: string): ModuleOutline {
  // Try to extract JSON from markdown code blocks
  const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || response.match(/(\{[\s\S]*\})/)

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1])
      return {
        title: parsed.title || 'Untitled Module',
        goals: parsed.goals || [],
        targetRoles: parsed.targetRoles || parsed.target_roles || [],
        tags: parsed.tags || [],
        sector: parsed.sector,
      }
    } catch (error) {
      console.error('Failed to parse outline JSON:', error)
    }
  }

  // Fallback: extract manually
  return {
    title: 'Untitled Module',
    goals: [],
    targetRoles: [],
    tags: [],
  }
}

function parseSectionsResponse(response: string): ModuleSection[] {
  // Simplified parser - in production would be more robust
  const sections: ModuleSection[] = []

  // Split by section markers (### or ## headers)
  const sectionBlocks = response.split(/(?=^##\s)/m)

  let order = 1

  for (const block of sectionBlocks) {
    if (!block.trim()) continue

    const titleMatch = block.match(/^##\s*(.+)$/m)
    if (!titleMatch) continue

    const title = titleMatch[1].trim()
    const content = block.replace(/^##\s*.+$/m, '').trim()

    // Extract citations (simplified)
    const citations: any[] = []
    const citationMatches = content.matchAll(/\[(\d+)\]\s*([^\n]+)/g)

    for (const match of citationMatches) {
      citations.push({
        url: `https://example.com/citation-${match[1]}`, // Placeholder
        title: match[2].trim(),
        excerpt: match[2].trim(),
      })
    }

    sections.push({
      title,
      content,
      order: order++,
      sourceMap: { citations },
      provenanceBadges: [{ type: SourceType.CLIENT_INTERNAL, sourceName: 'Generated content' }],
    })
  }

  return sections
}

function parseCalibrationResponse(response: string): CalibrationItem[] {
  // Try to extract JSON array
  const jsonMatch = response.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/) || response.match(/(\[[\s\S]*\])/)

  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1])
    } catch (error) {
      console.error('Failed to parse calibration JSON:', error)
    }
  }

  // Return empty array if parsing fails
  return []
}

function calculateSimilarity(text1: string, text2: string): number {
  // Simplified similarity check - in production would use proper algorithm
  const words1 = new Set(text1.toLowerCase().split(/\s+/))
  const words2 = new Set(text2.toLowerCase().split(/\s+/))

  const intersection = new Set([...words1].filter((w) => words2.has(w)))
  const union = new Set([...words1, ...words2])

  return intersection.size / union.size
}

