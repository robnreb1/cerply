/**
 * Modules API Routes for Cerply V2
 * 
 * Implements FSD v2.0: Module management endpoints
 * 
 * Routes:
 * - GET /api/modules - List modules by org
 * - GET /api/modules/:id - Fetch full module with sections
 * - PATCH /api/modules/:id - Edit module
 * - DELETE /api/modules/:id - Delete module
 * - POST /api/modules/:id/clone - Fork module
 */

import { FastifyInstance } from 'fastify'
import { db } from '../../db'
import { modules, moduleSections, moduleItems, contentLibrary, auditEvents } from '../../../drizzle/schema_v2'
import { eq, and } from 'drizzle-orm'

export default async function modulesRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/modules
   * List modules by organization
   */
  fastify.get('/modules', async (request, reply) => {
    const { organizationId, visibility } = request.query as any

    if (!organizationId) {
      return reply.code(400).send({
        error: {
          code: 'MISSING_ORGANIZATION_ID',
          message: 'organizationId query parameter is required',
        },
      })
    }

    try {
      let query = db.select().from(modules).where(eq(modules.organizationId, organizationId))

      // Filter by visibility if provided
      if (visibility) {
        query = query.where(and(eq(modules.organizationId, organizationId), eq(modules.visibility, visibility)))
      }

      const modulesList = await query.orderBy(modules.updatedAt)

      return reply.code(200).send({ modules: modulesList })
    } catch (error: any) {
      console.error('List modules error:', error)
      return reply.code(500).send({
        error: {
          code: 'LIST_MODULES_FAILED',
          message: error.message || 'Failed to list modules',
        },
      })
    }
  })

  /**
   * GET /api/modules/:id
   * Fetch full module with sections and items
   */
  fastify.get('/modules/:id', async (request, reply) => {
    const { id } = request.params as any

    try {
      const [module] = await db.select().from(modules).where(eq(modules.id, id))

      if (!module) {
        return reply.code(404).send({
          error: {
            code: 'MODULE_NOT_FOUND',
            message: 'Module not found',
          },
        })
      }

      // Get sections
      const sections = await db.select().from(moduleSections).where(eq(moduleSections.moduleId, id)).orderBy(moduleSections.order)

      // Get items (optional, can be large)
      const items = await db.select().from(moduleItems).where(eq(moduleItems.moduleId, id)).limit(50)

      // Get content library entry if exists
      const [libEntry] = await db.select().from(contentLibrary).where(eq(contentLibrary.moduleId, id))

      return reply.code(200).send({
        module,
        sections,
        items,
        libraryEntry: libEntry || null,
      })
    } catch (error: any) {
      console.error('Get module error:', error)
      return reply.code(500).send({
        error: {
          code: 'GET_MODULE_FAILED',
          message: error.message || 'Failed to get module',
        },
      })
    }
  })

  /**
   * PATCH /api/modules/:id
   * Edit module (only if not locked)
   */
  fastify.patch('/modules/:id', async (request, reply) => {
    const { id } = request.params as any
    const { userId, title, goals, targetRoles, tags, sector } = request.body as any

    try {
      // Check if module is locked
      const [module] = await db.select().from(modules).where(eq(modules.id, id))

      if (!module) {
        return reply.code(404).send({
          error: {
            code: 'MODULE_NOT_FOUND',
            message: 'Module not found',
          },
        })
      }

      if (module.lockedAt) {
        return reply.code(400).send({
          error: {
            code: 'MODULE_LOCKED',
            message: 'Cannot edit locked module. Clone it to make changes.',
          },
        })
      }

      // Update module
      const updates: any = {
        updatedAt: new Date().toISOString(),
      }

      if (title) updates.title = title
      if (goals) updates.goals = goals
      if (targetRoles) updates.targetRoles = targetRoles
      if (tags) updates.tags = tags
      if (sector !== undefined) updates.sector = sector

      const [updated] = await db.update(modules).set(updates).where(eq(modules.id, id)).returning()

      // Log audit event
      await db.insert(auditEvents).values({
        userId,
        organizationId: module.organizationId,
        eventType: 'module_edit',
        entityType: 'module',
        entityId: id,
        metadata: { changes: Object.keys(updates) },
      })

      return reply.code(200).send({ module: updated })
    } catch (error: any) {
      console.error('Update module error:', error)
      return reply.code(500).send({
        error: {
          code: 'UPDATE_MODULE_FAILED',
          message: error.message || 'Failed to update module',
        },
      })
    }
  })

  /**
   * DELETE /api/modules/:id
   * Delete module (only if not locked and owned by user)
   */
  fastify.delete('/modules/:id', async (request, reply) => {
    const { id } = request.params as any
    const { userId } = request.query as any

    if (!userId) {
      return reply.code(400).send({
        error: {
          code: 'MISSING_USER_ID',
          message: 'userId query parameter is required',
        },
      })
    }

    try {
      const [module] = await db.select().from(modules).where(eq(modules.id, id))

      if (!module) {
        return reply.code(404).send({
          error: {
            code: 'MODULE_NOT_FOUND',
            message: 'Module not found',
          },
        })
      }

      if (module.lockedAt) {
        return reply.code(400).send({
          error: {
            code: 'MODULE_LOCKED',
            message: 'Cannot delete locked module',
          },
        })
      }

      if (module.ownerId !== userId) {
        return reply.code(403).send({
          error: {
            code: 'NOT_AUTHORIZED',
            message: 'Only module owner can delete',
          },
        })
      }

      // Delete module (cascade will delete sections and items)
      await db.delete(modules).where(eq(modules.id, id))

      // Log audit event
      await db.insert(auditEvents).values({
        userId,
        organizationId: module.organizationId,
        eventType: 'module_delete',
        entityType: 'module',
        entityId: id,
        metadata: { title: module.title },
      })

      return reply.code(200).send({ message: 'Module deleted successfully' })
    } catch (error: any) {
      console.error('Delete module error:', error)
      return reply.code(500).send({
        error: {
          code: 'DELETE_MODULE_FAILED',
          message: error.message || 'Failed to delete module',
        },
      })
    }
  })

  /**
   * POST /api/modules/:id/clone
   * Fork module (create editable copy with lineage)
   */
  fastify.post('/modules/:id/clone', async (request, reply) => {
    const { id } = request.params as any
    const { userId, organizationId } = request.body as any

    if (!userId || !organizationId) {
      return reply.code(400).send({
        error: {
          code: 'MISSING_FIELDS',
          message: 'userId and organizationId are required',
        },
      })
    }

    try {
      // Get source module
      const [source] = await db.select().from(modules).where(eq(modules.id, id))

      if (!source) {
        return reply.code(404).send({
          error: {
            code: 'MODULE_NOT_FOUND',
            message: 'Source module not found',
          },
        })
      }

      // Create cloned module (unlocked)
      const [cloned] = await db
        .insert(modules)
        .values({
          title: `${source.title} (Copy)`,
          goals: source.goals,
          targetRoles: source.targetRoles,
          tags: source.tags,
          sector: source.sector,
          version: 1, // Reset version for clone
          ownerId: userId,
          organizationId,
          visibility: 'private', // Clone starts as private
          complianceCritical: source.complianceCritical,
          lockedAt: null, // Clones are unlocked
        })
        .returning()

      // Clone sections
      const sourceSections = await db.select().from(moduleSections).where(eq(moduleSections.moduleId, id)).orderBy(moduleSections.order)

      for (const section of sourceSections) {
        await db.insert(moduleSections).values({
          moduleId: cloned.id,
          title: section.title,
          content: section.content,
          order: section.order,
          sourceMap: section.sourceMap,
          provenanceBadges: section.provenanceBadges,
        })
      }

      // Log audit event
      await db.insert(auditEvents).values({
        userId,
        organizationId,
        eventType: 'module_clone',
        entityType: 'module',
        entityId: cloned.id,
        metadata: { sourceModuleId: id, sourceTitle: source.title },
      })

      return reply.code(201).send({ module: cloned })
    } catch (error: any) {
      console.error('Clone module error:', error)
      return reply.code(500).send({
        error: {
          code: 'CLONE_MODULE_FAILED',
          message: error.message || 'Failed to clone module',
        },
      })
    }
  })
}

