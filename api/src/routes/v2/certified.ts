/**
 * Certified Routes for Cerply V2
 * 
 * Implements FSD v2.0 Section 5: Certified catalogue
 * 
 * Routes:
 * - POST /api/v2/certified/submit - Submit module for certification
 * - POST /api/v2/certified/review - Review submission (Certifier only)
 * - POST /api/v2/certified/stamp - Stamp as Certified Core (Certifier only)
 * - POST /api/v2/certified/publish - Publish to catalogue
 * - POST /api/v2/certified/takedown - Remove from catalogue (Admin only)
 * - GET /api/v2/certified/submissions - List submissions (Certifier/Admin)
 * - GET /api/v2/certified/catalogue - Search certified catalogue
 * - GET /api/v2/certified/:moduleId - Get certified module details
 * - POST /api/v2/certified/:moduleId/wrap - Add client wrap
 * - PATCH /api/v2/certified/wrap/:wrappedId - Update wrap
 * - DELETE /api/v2/certified/wrap/:wrappedId - Remove wrap
 */

import { FastifyInstance } from 'fastify'
import {
  submitModuleForCertification,
  reviewCertificationSubmission,
  stampModuleAsCertified,
  publishModuleToCatalogue,
  takedownCertifiedModule,
  getReviewChecklist,
  getAllCertificationSubmissions,
  getCertificationSubmission,
} from '../../services/v2/certified-service'
import {
  searchCertifiedCatalogue,
  getCertifiedModuleById,
  getFeaturedCertifiedModules,
} from '../../services/v2/catalogue-search'
import {
  createModuleWrap,
  updateModuleWrap,
  removeModuleWrap,
  getWrapInfo,
} from '../../services/v2/wrap-service'

export default async function certifiedRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/v2/certified/submit
   * Submit a module for certification
   */
  fastify.post('/api/v2/certified/submit', async (request, reply) => {
    const { userId, organizationId, role } = request.user as any
    const { moduleId, submitterNotes } = request.body as any

    // Check permission (Manager/Admin can submit)
    if (role !== 'manager' && role !== 'admin') {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Only managers and admins can submit modules for certification',
        },
      })
    }

    if (!moduleId) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required field: moduleId',
        },
      })
    }

    try {
      const result = await submitModuleForCertification({
        userId,
        organizationId,
        moduleId,
        submitterNotes,
      })

      if (!result.success) {
        return reply.code(400).send({
          error: {
            code: 'SUBMISSION_FAILED',
            message: result.error || 'Failed to submit for certification',
          },
        })
      }

      return reply.code(201).send(result)
    } catch (error) {
      console.error('Certification submission error:', error)
      return reply.code(500).send({
        error: {
          code: 'SUBMISSION_FAILED',
          message: 'Failed to submit for certification',
        },
      })
    }
  })

  /**
   * POST /api/v2/certified/review
   * Review a certification submission (Certifier only)
   */
  fastify.post('/api/v2/certified/review', async (request, reply) => {
    const { userId, role } = request.user as any
    const { submissionId, decision, checklist, reviewerComments } = request.body as any

    // Check permission (Certifier/Admin only)
    if (role !== 'certifier' && role !== 'admin') {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Only certifiers and admins can review submissions',
        },
      })
    }

    if (!submissionId || !decision || !checklist) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required fields: submissionId, decision, checklist',
        },
      })
    }

    try {
      const result = await reviewCertificationSubmission({
        reviewerId: userId,
        submissionId,
        decision,
        checklist,
        reviewerComments: reviewerComments || '',
      })

      if (!result.success) {
        return reply.code(400).send({
          error: {
            code: 'REVIEW_FAILED',
            message: result.error || 'Failed to review submission',
          },
        })
      }

      return reply.send(result)
    } catch (error) {
      console.error('Review error:', error)
      return reply.code(500).send({
        error: {
          code: 'REVIEW_FAILED',
          message: 'Failed to review submission',
        },
      })
    }
  })

  /**
   * POST /api/v2/certified/stamp
   * Stamp a module as Certified Core (Certifier only)
   */
  fastify.post('/api/v2/certified/stamp', async (request, reply) => {
    const { userId, role } = request.user as any
    const { moduleId, submissionId, certificationLevel, expiryDate } = request.body as any

    // Check permission (Certifier/Admin only)
    if (role !== 'certifier' && role !== 'admin') {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Only certifiers and admins can stamp modules',
        },
      })
    }

    if (!moduleId || !submissionId) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required fields: moduleId, submissionId',
        },
      })
    }

    try {
      const result = await stampModuleAsCertified({
        reviewerId: userId,
        moduleId,
        submissionId,
        certificationLevel: certificationLevel || 'core',
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      })

      if (!result.success) {
        return reply.code(400).send({
          error: {
            code: 'STAMP_FAILED',
            message: result.error || 'Failed to stamp module',
          },
        })
      }

      return reply.send(result)
    } catch (error) {
      console.error('Stamp error:', error)
      return reply.code(500).send({
        error: {
          code: 'STAMP_FAILED',
          message: 'Failed to stamp module',
        },
      })
    }
  })

  /**
   * POST /api/v2/certified/publish
   * Publish certified module to catalogue
   */
  fastify.post('/api/v2/certified/publish', async (request, reply) => {
    const { userId, role } = request.user as any
    const { moduleId } = request.body as any

    // Check permission (Certifier/Admin only)
    if (role !== 'certifier' && role !== 'admin') {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Only certifiers and admins can publish modules',
        },
      })
    }

    if (!moduleId) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required field: moduleId',
        },
      })
    }

    try {
      const result = await publishModuleToCatalogue(moduleId, userId)

      if (!result.success) {
        return reply.code(400).send({
          error: {
            code: 'PUBLISH_FAILED',
            message: result.error || 'Failed to publish module',
          },
        })
      }

      return reply.send(result)
    } catch (error) {
      console.error('Publish error:', error)
      return reply.code(500).send({
        error: {
          code: 'PUBLISH_FAILED',
          message: 'Failed to publish module',
        },
      })
    }
  })

  /**
   * POST /api/v2/certified/takedown
   * Remove certified module from catalogue (Admin only)
   */
  fastify.post('/api/v2/certified/takedown', async (request, reply) => {
    const { userId, role } = request.user as any
    const { moduleId, reason } = request.body as any

    // Check permission (Admin only)
    if (role !== 'admin') {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Only admins can takedown modules',
        },
      })
    }

    if (!moduleId || !reason) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required fields: moduleId, reason',
        },
      })
    }

    try {
      const result = await takedownCertifiedModule({
        adminId: userId,
        moduleId,
        reason,
      })

      if (!result.success) {
        return reply.code(400).send({
          error: {
            code: 'TAKEDOWN_FAILED',
            message: result.error || 'Failed to takedown module',
          },
        })
      }

      return reply.send(result)
    } catch (error) {
      console.error('Takedown error:', error)
      return reply.code(500).send({
        error: {
          code: 'TAKEDOWN_FAILED',
          message: 'Failed to takedown module',
        },
      })
    }
  })

  /**
   * GET /api/v2/certified/submissions
   * List certification submissions (Certifier/Admin only)
   */
  fastify.get('/api/v2/certified/submissions', async (request, reply) => {
    const { role } = request.user as any
    const { status } = request.query as any

    // Check permission
    if (role !== 'certifier' && role !== 'admin') {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Only certifiers and admins can view submissions',
        },
      })
    }

    try {
      const submissions = await getAllCertificationSubmissions(status)
      return reply.send({ submissions })
    } catch (error) {
      console.error('Fetch submissions error:', error)
      return reply.code(500).send({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch submissions',
        },
      })
    }
  })

  /**
   * GET /api/v2/certified/submissions/:id
   * Get certification submission details
   */
  fastify.get('/api/v2/certified/submissions/:id', async (request, reply) => {
    const { role } = request.user as any
    const { id } = request.params as any

    // Check permission
    if (role !== 'certifier' && role !== 'admin') {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Only certifiers and admins can view submissions',
        },
      })
    }

    try {
      const submission = await getCertificationSubmission(id)

      if (!submission) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Submission not found',
          },
        })
      }

      return reply.send(submission)
    } catch (error) {
      console.error('Fetch submission error:', error)
      return reply.code(500).send({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch submission',
        },
      })
    }
  })

  /**
   * GET /api/v2/certified/checklist
   * Get reviewer checklist template
   */
  fastify.get('/api/v2/certified/checklist', async (request, reply) => {
    const { role } = request.user as any

    // Check permission
    if (role !== 'certifier' && role !== 'admin') {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Only certifiers and admins can access the checklist',
        },
      })
    }

    const checklist = getReviewChecklist()
    return reply.send({ checklist })
  })

  /**
   * GET /api/v2/certified/catalogue
   * Search certified catalogue
   */
  fastify.get('/api/v2/certified/catalogue', async (request, reply) => {
    const { query, tags, sortBy, limit, offset } = request.query as any

    try {
      const result = await searchCertifiedCatalogue({
        query,
        tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
        sortBy: sortBy || 'recent',
        limit: limit ? Number(limit) : 20,
        offset: offset ? Number(offset) : 0,
      })

      return reply.send(result)
    } catch (error) {
      console.error('Catalogue search error:', error)
      return reply.code(500).send({
        error: {
          code: 'SEARCH_FAILED',
          message: 'Failed to search catalogue',
        },
      })
    }
  })

  /**
   * GET /api/v2/certified/featured
   * Get featured certified modules
   */
  fastify.get('/api/v2/certified/featured', async (request, reply) => {
    const { limit } = request.query as any

    try {
      const modules = await getFeaturedCertifiedModules(limit ? Number(limit) : 10)
      return reply.send({ modules })
    } catch (error) {
      console.error('Fetch featured error:', error)
      return reply.code(500).send({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch featured modules',
        },
      })
    }
  })

  /**
   * GET /api/v2/certified/:moduleId
   * Get certified module details
   */
  fastify.get('/api/v2/certified/:moduleId', async (request, reply) => {
    const { moduleId } = request.params as any

    try {
      const module = await getCertifiedModuleById(moduleId)

      if (!module) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Certified module not found',
          },
        })
      }

      return reply.send(module)
    } catch (error) {
      console.error('Fetch module error:', error)
      return reply.code(500).send({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch module',
        },
      })
    }
  })

  /**
   * POST /api/v2/certified/:moduleId/wrap
   * Add client wrap to certified module
   */
  fastify.post('/api/v2/certified/:moduleId/wrap', async (request, reply) => {
    const { userId, organizationId, role } = request.user as any
    const { moduleId } = request.params as any
    const { wrapContent } = request.body as any

    // Check permission (Manager/Admin only)
    if (role !== 'manager' && role !== 'admin') {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Only managers and admins can create wraps',
        },
      })
    }

    if (!wrapContent) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required field: wrapContent',
        },
      })
    }

    try {
      const result = await createModuleWrap({
        userId,
        organizationId,
        certifiedModuleId: moduleId,
        wrapContent,
      })

      if (!result.success) {
        return reply.code(400).send({
          error: {
            code: 'WRAP_FAILED',
            message: result.error || 'Failed to create wrap',
          },
        })
      }

      return reply.code(201).send(result)
    } catch (error) {
      console.error('Create wrap error:', error)
      return reply.code(500).send({
        error: {
          code: 'WRAP_FAILED',
          message: 'Failed to create wrap',
        },
      })
    }
  })

  /**
   * PATCH /api/v2/certified/wrap/:wrappedId
   * Update wrap content
   */
  fastify.patch('/api/v2/certified/wrap/:wrappedId', async (request, reply) => {
    const { userId, role } = request.user as any
    const { wrappedId } = request.params as any
    const { wrapContent } = request.body as any

    // Check permission (Manager/Admin only)
    if (role !== 'manager' && role !== 'admin') {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Only managers and admins can update wraps',
        },
      })
    }

    if (!wrapContent) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required field: wrapContent',
        },
      })
    }

    try {
      const result = await updateModuleWrap({
        userId,
        wrappedModuleId: wrappedId,
        wrapContent,
      })

      if (!result.success) {
        return reply.code(400).send({
          error: {
            code: 'UPDATE_FAILED',
            message: result.error || 'Failed to update wrap',
          },
        })
      }

      return reply.send(result)
    } catch (error) {
      console.error('Update wrap error:', error)
      return reply.code(500).send({
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update wrap',
        },
      })
    }
  })

  /**
   * DELETE /api/v2/certified/wrap/:wrappedId
   * Remove wrap
   */
  fastify.delete('/api/v2/certified/wrap/:wrappedId', async (request, reply) => {
    const { userId, role } = request.user as any
    const { wrappedId } = request.params as any

    // Check permission (Manager/Admin only)
    if (role !== 'manager' && role !== 'admin') {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Only managers and admins can remove wraps',
        },
      })
    }

    try {
      const result = await removeModuleWrap(wrappedId, userId)

      if (!result.success) {
        return reply.code(400).send({
          error: {
            code: 'REMOVE_FAILED',
            message: result.error || 'Failed to remove wrap',
          },
        })
      }

      return reply.send(result)
    } catch (error) {
      console.error('Remove wrap error:', error)
      return reply.code(500).send({
        error: {
          code: 'REMOVE_FAILED',
          message: 'Failed to remove wrap',
        },
      })
    }
  })

  /**
   * GET /api/v2/certified/wrap/:wrappedId
   * Get wrap metadata
   */
  fastify.get('/api/v2/certified/wrap/:wrappedId', async (request, reply) => {
    const { wrappedId } = request.params as any

    try {
      const wrapInfo = await getWrapInfo(wrappedId)

      if (!wrapInfo) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Wrap not found',
          },
        })
      }

      return reply.send(wrapInfo)
    } catch (error) {
      console.error('Fetch wrap error:', error)
      return reply.code(500).send({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch wrap',
        },
      })
    }
  })
}

