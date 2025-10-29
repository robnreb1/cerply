/**
 * Catalogue Search Service for Cerply V2
 * 
 * Implements FSD v2.0 Section 5: Certified catalogue search and discovery
 * 
 * Responsibilities:
 * - Search and filter certified modules
 * - Browse by category, tags, rating
 * - Preview module structure
 * - Track usage statistics
 */

import { db } from '../db'
import { modules, moduleSections, moduleAssignments, contentLibrary } from '../../drizzle/schema_v2'
import { eq, and, sql, like, or, desc } from 'drizzle-orm'

export interface CatalogueSearchRequest {
  query?: string
  tags?: string[]
  categories?: string[]
  minRating?: number
  sortBy?: 'relevance' | 'recent' | 'popular' | 'rating'
  limit?: number
  offset?: number
}

export interface CatalogueSearchResult {
  modules: CatalogueModule[]
  totalCount: number
  facets: SearchFacets
}

export interface CatalogueModule {
  id: string
  title: string
  description: string
  tags: string[]
  goals: string[]
  certificationLevel: string
  certifiedAt: Date
  certifiedBy: string
  rating: number
  usageCount: number
  estimatedDuration: string
  lastUpdated: Date
  preview: ModulePreview
}

export interface ModulePreview {
  sectionCount: number
  itemCount: number
  sampleSections: {
    title: string
    excerpt: string
  }[]
}

export interface SearchFacets {
  availableTags: { tag: string; count: number }[]
  availableCategories: { category: string; count: number }[]
  ratingDistribution: { rating: number; count: number }[]
}

/**
 * Catalogue search service
 */
export class CatalogueSearchService {
  /**
   * Search certified modules
   */
  async searchCatalogue(request: CatalogueSearchRequest): Promise<CatalogueSearchResult> {
    try {
      const limit = request.limit || 20
      const offset = request.offset || 0

      // Build query
      let queryConditions = [eq(modules.visibility, 'certified'), eq(modules.status, 'published')]

      // Text search
      if (request.query) {
        queryConditions.push(
          or(
            like(modules.title, `%${request.query}%`),
            sql`${modules.description} ILIKE ${'%' + request.query + '%'}`,
            sql`EXISTS (SELECT 1 FROM unnest(${modules.tags}) AS tag WHERE tag ILIKE ${'%' + request.query + '%'})`
          ) as any
        )
      }

      // Tag filter
      if (request.tags && request.tags.length > 0) {
        for (const tag of request.tags) {
          queryConditions.push(sql`${tag} = ANY(${modules.tags})` as any)
        }
      }

      // Get modules
      const modulesQuery = db
        .select()
        .from(modules)
        .where(and(...queryConditions))
        .limit(limit)
        .offset(offset)

      // Apply sorting
      if (request.sortBy === 'recent') {
        modulesQuery.orderBy(desc(modules.updatedAt))
      } else if (request.sortBy === 'popular') {
        // In production, sort by usage count from analytics
        modulesQuery.orderBy(desc(modules.createdAt))
      } else {
        modulesQuery.orderBy(desc(modules.createdAt))
      }

      const catalogueModules = await modulesQuery

      // Get total count
      const countResult = await db.execute(sql`
        SELECT COUNT(*) as total
        FROM modules
        WHERE visibility = 'certified'
          AND status = 'published'
          ${request.query ? sql`AND (title ILIKE ${'%' + request.query + '%'} OR description ILIKE ${'%' + request.query + '%'})` : sql``}
      `)

      const totalCount = Number((countResult.rows[0] as any)?.total || 0)

      // Build result modules with previews
      const results: CatalogueModule[] = await Promise.all(
        catalogueModules.map(async (mod) => {
          const preview = await this.getModulePreview(mod.id)
          const usageCount = await this.getModuleUsageCount(mod.id)

          return {
            id: mod.id,
            title: mod.title,
            description: mod.description || '',
            tags: (mod.tags as string[]) || [],
            goals: (mod.goals as string[]) || [],
            certificationLevel: (mod.metadata as any)?.certificationLevel || 'core',
            certifiedAt: new Date((mod.metadata as any)?.certifiedAt || mod.createdAt),
            certifiedBy: (mod.metadata as any)?.certifiedBy || 'Unknown',
            rating: 4.5, // Placeholder - implement rating system
            usageCount,
            estimatedDuration: this.estimateDuration(preview.itemCount),
            lastUpdated: mod.updatedAt,
            preview,
          }
        })
      )

      // Get facets
      const facets = await this.getSearchFacets()

      return {
        modules: results,
        totalCount,
        facets,
      }
    } catch (error) {
      console.error('Catalogue search error:', error)
      return {
        modules: [],
        totalCount: 0,
        facets: {
          availableTags: [],
          availableCategories: [],
          ratingDistribution: [],
        },
      }
    }
  }

  /**
   * Get module preview (sections and items count)
   */
  private async getModulePreview(moduleId: string): Promise<ModulePreview> {
    const sections = await db
      .select()
      .from(moduleSections)
      .where(eq(moduleSections.moduleId, moduleId))
      .orderBy(moduleSections.orderIndex)
      .limit(3)

    const itemCount = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM module_items
      WHERE module_id = ${moduleId}
    `)

    return {
      sectionCount: sections.length,
      itemCount: Number((itemCount.rows[0] as any)?.count || 0),
      sampleSections: sections.map((s) => ({
        title: s.title,
        excerpt: this.getExcerpt(s.content as string, 100),
      })),
    }
  }

  /**
   * Get module usage count
   */
  private async getModuleUsageCount(moduleId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(moduleAssignments)
      .where(eq(moduleAssignments.moduleId, moduleId))

    return Number(result[0]?.count || 0)
  }

  /**
   * Estimate duration based on item count
   */
  private estimateDuration(itemCount: number): string {
    const minutesPerItem = 3 // Average 3 minutes per item
    const totalMinutes = itemCount * minutesPerItem

    if (totalMinutes < 60) {
      return `${totalMinutes} mins`
    }

    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }

  /**
   * Get search facets for filtering
   */
  private async getSearchFacets(): Promise<SearchFacets> {
    // Get all tags from certified modules
    const tagsResult = await db.execute(sql`
      SELECT unnest(tags) as tag, COUNT(*) as count
      FROM modules
      WHERE visibility = 'certified' AND status = 'published'
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 20
    `)

    const availableTags = (tagsResult.rows || []).map((row: any) => ({
      tag: row.tag,
      count: Number(row.count),
    }))

    // Categories (from goals)
    const categoriesResult = await db.execute(sql`
      SELECT unnest(goals) as category, COUNT(*) as count
      FROM modules
      WHERE visibility = 'certified' AND status = 'published'
      GROUP BY category
      ORDER BY count DESC
      LIMIT 15
    `)

    const availableCategories = (categoriesResult.rows || []).map((row: any) => ({
      category: row.category,
      count: Number(row.count),
    }))

    // Rating distribution (placeholder - implement rating system)
    const ratingDistribution = [
      { rating: 5, count: 45 },
      { rating: 4, count: 30 },
      { rating: 3, count: 15 },
      { rating: 2, count: 5 },
      { rating: 1, count: 5 },
    ]

    return {
      availableTags,
      availableCategories,
      ratingDistribution,
    }
  }

  /**
   * Get excerpt from text
   */
  private getExcerpt(text: string, maxLength: number): string {
    if (!text || text.length <= maxLength) {
      return text || ''
    }

    return text.substring(0, maxLength).trim() + '...'
  }

  /**
   * Get module details by ID
   */
  async getModuleById(moduleId: string): Promise<CatalogueModule | null> {
    const module = await db
      .select()
      .from(modules)
      .where(and(eq(modules.id, moduleId), eq(modules.visibility, 'certified')))
      .limit(1)

    if (module.length === 0) {
      return null
    }

    const mod = module[0]
    const preview = await this.getModulePreview(mod.id)
    const usageCount = await this.getModuleUsageCount(mod.id)

    return {
      id: mod.id,
      title: mod.title,
      description: mod.description || '',
      tags: (mod.tags as string[]) || [],
      goals: (mod.goals as string[]) || [],
      certificationLevel: (mod.metadata as any)?.certificationLevel || 'core',
      certifiedAt: new Date((mod.metadata as any)?.certifiedAt || mod.createdAt),
      certifiedBy: (mod.metadata as any)?.certifiedBy || 'Unknown',
      rating: 4.5,
      usageCount,
      estimatedDuration: this.estimateDuration(preview.itemCount),
      lastUpdated: mod.updatedAt,
      preview,
    }
  }

  /**
   * Get popular/featured modules
   */
  async getFeaturedModules(limit: number = 10): Promise<CatalogueModule[]> {
    const result = await this.searchCatalogue({
      sortBy: 'popular',
      limit,
    })

    return result.modules
  }
}

// Singleton instance
export const catalogueSearchService = new CatalogueSearchService()

// Helper functions for routes
export async function searchCertifiedCatalogue(request: CatalogueSearchRequest): Promise<CatalogueSearchResult> {
  return catalogueSearchService.searchCatalogue(request)
}

export async function getCertifiedModuleById(moduleId: string): Promise<CatalogueModule | null> {
  return catalogueSearchService.getModuleById(moduleId)
}

export async function getFeaturedCertifiedModules(limit?: number): Promise<CatalogueModule[]> {
  return catalogueSearchService.getFeaturedModules(limit)
}

