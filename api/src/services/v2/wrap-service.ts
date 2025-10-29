/**
 * Wrap Service for Cerply V2
 * 
 * Implements FSD v2.0 Section 5: Client wrap management
 * 
 * Responsibilities:
 * - Add clearly labeled client wrap around Certified Core
 * - Manage wrap versions
 * - Ensure wrap doesn't modify core goals
 * - Track wrap usage and changes
 */

import { db } from '../db'
import { modules, moduleSections, contentLibrary, auditEvents } from '../../drizzle/schema_v2'
import { eq, and, sql } from 'drizzle-orm'

export interface CreateWrapRequest {
  userId: string
  organizationId: string
  certifiedModuleId: string
  wrapContent: WrapContent
}

export interface WrapContent {
  introduction?: string
  houseRules?: string[]
  localExamples?: string[]
  contextNotes?: string
  closingNotes?: string
}

export interface WrapMetadata {
  wrappedModuleId: string
  originalCertifiedModuleId: string
  wrapVersion: number
  createdBy: string
  lastModifiedBy: string
  createdAt: Date
  updatedAt: Date
  isActive: boolean
}

export interface UpdateWrapRequest {
  userId: string
  wrappedModuleId: string
  wrapContent: Partial<WrapContent>
}

/**
 * Wrap service class
 */
export class WrapService {
  /**
   * Create a wrapped version of a Certified Core module
   */
  async createWrap(request: CreateWrapRequest): Promise<{
    success: boolean
    wrappedModuleId?: string
    error?: string
  }> {
    try {
      // 1. Verify certified module exists
      const certifiedModule = await db
        .select()
        .from(modules)
        .where(and(eq(modules.id, request.certifiedModuleId), eq(modules.visibility, 'certified')))
        .limit(1)

      if (certifiedModule.length === 0) {
        return {
          success: false,
          error: 'Certified module not found',
        }
      }

      const original = certifiedModule[0]

      // 2. Check if wrap already exists for this org
      const existingWrap = await db.execute(sql`
        SELECT id FROM modules
        WHERE metadata->>'originalCertifiedModuleId' = ${request.certifiedModuleId}
          AND organization_id = ${request.organizationId}
          AND metadata->>'isWrap' = 'true'
        LIMIT 1
      `)

      if (existingWrap.rows.length > 0) {
        return {
          success: false,
          error: 'A wrap for this certified module already exists in your organization',
        }
      }

      // 3. Create wrapped module (clone with wrap label)
      const wrappedModuleId = `mod_wrap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      await db.insert(modules).values({
        id: wrappedModuleId,
        organizationId: request.organizationId,
        title: `${original.title} (with ${request.organizationId} wrap)`,
        description: original.description,
        goals: original.goals, // Goals MUST NOT change
        tags: original.tags,
        visibility: 'organization', // Wrapped module is org-private
        status: 'locked',
        version: 1,
        metadata: {
          isWrap: true,
          originalCertifiedModuleId: request.certifiedModuleId,
          originalCertificationLevel: (original.metadata as any)?.certificationLevel,
          wrapVersion: 1,
          wrapContent: request.wrapContent,
          createdBy: request.userId,
          lastModifiedBy: request.userId,
        },
      })

      // 4. Clone sections from certified module
      const sections = await db
        .select()
        .from(moduleSections)
        .where(eq(moduleSections.moduleId, request.certifiedModuleId))

      for (const section of sections) {
        await db.insert(moduleSections).values({
          moduleId: wrappedModuleId,
          title: section.title,
          content: section.content,
          orderIndex: section.orderIndex,
          metadata: {
            ...((section.metadata as any) || {}),
            isCertifiedCore: true,
            originalSectionId: section.id,
          },
        })
      }

      // 5. Add wrap content as special sections
      if (request.wrapContent.introduction) {
        await db.insert(moduleSections).values({
          moduleId: wrappedModuleId,
          title: '📌 Local Introduction',
          content: request.wrapContent.introduction,
          orderIndex: -1, // Place before core sections
          metadata: {
            isWrapSection: true,
            wrapType: 'introduction',
          },
        })
      }

      if (request.wrapContent.houseRules && request.wrapContent.houseRules.length > 0) {
        await db.insert(moduleSections).values({
          moduleId: wrappedModuleId,
          title: '📋 House Rules',
          content: request.wrapContent.houseRules.join('\n'),
          orderIndex: -0.5,
          metadata: {
            isWrapSection: true,
            wrapType: 'houseRules',
          },
        })
      }

      if (request.wrapContent.closingNotes) {
        await db.insert(moduleSections).values({
          moduleId: wrappedModuleId,
          title: '💡 Local Notes',
          content: request.wrapContent.closingNotes,
          orderIndex: 1000, // Place after core sections
          metadata: {
            isWrapSection: true,
            wrapType: 'closingNotes',
          },
        })
      }

      // 6. Add to content library
      await db.insert(contentLibrary).values({
        organizationId: request.organizationId,
        moduleId: wrappedModuleId,
        contentType: 'wrapped_module',
        metadata: {
          originalCertifiedModuleId: request.certifiedModuleId,
          wrapVersion: 1,
        },
      })

      // 7. Log wrap creation
      await db.insert(auditEvents).values({
        eventType: 'wrap_created',
        userId: request.userId,
        metadata: {
          wrappedModuleId,
          originalCertifiedModuleId: request.certifiedModuleId,
          organizationId: request.organizationId,
        },
      })

      return {
        success: true,
        wrappedModuleId,
      }
    } catch (error) {
      console.error('Create wrap error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create wrap',
      }
    }
  }

  /**
   * Update wrap content
   */
  async updateWrap(request: UpdateWrapRequest): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      // 1. Verify module is a wrap
      const module = await db
        .select()
        .from(modules)
        .where(eq(modules.id, request.wrappedModuleId))
        .limit(1)

      if (module.length === 0) {
        return {
          success: false,
          error: 'Module not found',
        }
      }

      const metadata = module[0].metadata as any
      if (!metadata?.isWrap) {
        return {
          success: false,
          error: 'This module is not a wrap',
        }
      }

      // 2. Update wrap content in metadata
      const currentWrapContent = metadata.wrapContent || {}
      const updatedWrapContent = {
        ...currentWrapContent,
        ...request.wrapContent,
      }

      await db
        .update(modules)
        .set({
          metadata: {
            ...metadata,
            wrapContent: updatedWrapContent,
            wrapVersion: (metadata.wrapVersion || 1) + 1,
            lastModifiedBy: request.userId,
            lastModifiedAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
        })
        .where(eq(modules.id, request.wrappedModuleId))

      // 3. Update wrap sections
      if (request.wrapContent.introduction !== undefined) {
        await this.updateWrapSection(request.wrappedModuleId, 'introduction', request.wrapContent.introduction)
      }

      if (request.wrapContent.closingNotes !== undefined) {
        await this.updateWrapSection(request.wrappedModuleId, 'closingNotes', request.wrapContent.closingNotes)
      }

      // 4. Log update
      await db.insert(auditEvents).values({
        eventType: 'wrap_updated',
        userId: request.userId,
        metadata: {
          wrappedModuleId: request.wrappedModuleId,
          wrapVersion: (metadata.wrapVersion || 1) + 1,
        },
      })

      return {
        success: true,
      }
    } catch (error) {
      console.error('Update wrap error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update wrap',
      }
    }
  }

  /**
   * Update a specific wrap section
   */
  private async updateWrapSection(moduleId: string, wrapType: string, content: string): Promise<void> {
    const existingSections = await db.execute(sql`
      SELECT id FROM module_sections
      WHERE module_id = ${moduleId}
        AND metadata->>'isWrapSection' = 'true'
        AND metadata->>'wrapType' = ${wrapType}
      LIMIT 1
    `)

    if (existingSections.rows.length > 0) {
      // Update existing
      const sectionId = (existingSections.rows[0] as any).id
      await db
        .update(moduleSections)
        .set({
          content,
          updatedAt: new Date(),
        })
        .where(eq(moduleSections.id, sectionId))
    } else {
      // Create new
      const title = wrapType === 'introduction' ? '📌 Local Introduction' : '💡 Local Notes'
      const orderIndex = wrapType === 'introduction' ? -1 : 1000

      await db.insert(moduleSections).values({
        moduleId,
        title,
        content,
        orderIndex,
        metadata: {
          isWrapSection: true,
          wrapType,
        },
      })
    }
  }

  /**
   * Remove wrap (revert to using Certified Core directly)
   */
  async removeWrap(wrappedModuleId: string, userId: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      // Verify it's a wrap
      const module = await db
        .select()
        .from(modules)
        .where(eq(modules.id, wrappedModuleId))
        .limit(1)

      if (module.length === 0) {
        return {
          success: false,
          error: 'Module not found',
        }
      }

      const metadata = module[0].metadata as any
      if (!metadata?.isWrap) {
        return {
          success: false,
          error: 'This module is not a wrap',
        }
      }

      // Soft delete (archive)
      await db
        .update(modules)
        .set({
          status: 'archived',
          metadata: {
            ...metadata,
            archivedAt: new Date().toISOString(),
            archivedBy: userId,
          },
        })
        .where(eq(modules.id, wrappedModuleId))

      // Log removal
      await db.insert(auditEvents).values({
        eventType: 'wrap_removed',
        userId,
        metadata: {
          wrappedModuleId,
          originalCertifiedModuleId: metadata.originalCertifiedModuleId,
        },
      })

      return {
        success: true,
      }
    } catch (error) {
      console.error('Remove wrap error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove wrap',
      }
    }
  }

  /**
   * Get wrap metadata
   */
  async getWrapMetadata(wrappedModuleId: string): Promise<WrapMetadata | null> {
    const module = await db
      .select()
      .from(modules)
      .where(eq(modules.id, wrappedModuleId))
      .limit(1)

    if (module.length === 0) {
      return null
    }

    const metadata = module[0].metadata as any
    if (!metadata?.isWrap) {
      return null
    }

    return {
      wrappedModuleId,
      originalCertifiedModuleId: metadata.originalCertifiedModuleId,
      wrapVersion: metadata.wrapVersion || 1,
      createdBy: metadata.createdBy,
      lastModifiedBy: metadata.lastModifiedBy,
      createdAt: module[0].createdAt,
      updatedAt: module[0].updatedAt,
      isActive: module[0].status !== 'archived',
    }
  }
}

// Singleton instance
export const wrapService = new WrapService()

// Helper functions for routes
export async function createModuleWrap(request: CreateWrapRequest) {
  return wrapService.createWrap(request)
}

export async function updateModuleWrap(request: UpdateWrapRequest) {
  return wrapService.updateWrap(request)
}

export async function removeModuleWrap(wrappedModuleId: string, userId: string) {
  return wrapService.removeWrap(wrappedModuleId, userId)
}

export async function getWrapInfo(wrappedModuleId: string): Promise<WrapMetadata | null> {
  return wrapService.getWrapMetadata(wrappedModuleId)
}

