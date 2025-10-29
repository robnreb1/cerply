/**
 * Certified Service for Cerply V2
 * 
 * Implements FSD v2.0 Section 5: Certified catalogue
 * 
 * Responsibilities:
 * - Submit modules for certification review
 * - Review and stamp modules as Certified Core
 * - Publish to Certified catalogue
 * - Takedown certified modules
 * - Manage reviewer checklist
 */

import { db } from '../../db'
import { modules, certifiedSubmissions, auditEvents, contentLibrary } from '../../../drizzle/schema_v2'
import { eq, and, sql } from 'drizzle-orm'

export interface SubmitForCertificationRequest {
  userId: string
  organizationId: string
  moduleId: string
  submitterNotes?: string
}

export interface ReviewChecklistItem {
  id: string
  category: 'content' | 'quality' | 'compliance' | 'accessibility'
  requirement: string
  status: 'pending' | 'passed' | 'failed'
  reviewerNotes?: string
}

export interface ReviewSubmissionRequest {
  reviewerId: string
  submissionId: string
  decision: 'approve' | 'reject' | 'request_changes'
  checklist: ReviewChecklistItem[]
  reviewerComments: string
}

export interface StampModuleRequest {
  reviewerId: string
  moduleId: string
  submissionId: string
  certificationLevel: 'core' | 'verified' | 'community'
  expiryDate?: Date
}

export interface TakedownRequest {
  adminId: string
  moduleId: string
  reason: string
}

/**
 * Certified service class
 */
export class CertifiedService {
  /**
   * Submit a module for certification
   */
  async submitForCertification(request: SubmitForCertificationRequest): Promise<{
    success: boolean
    submissionId?: string
    error?: string
  }> {
    try {
      // 1. Validate module exists and is locked
      const module = await db
        .select()
        .from(modules)
        .where(eq(modules.id, request.moduleId))
        .limit(1)

      if (module.length === 0) {
        return {
          success: false,
          error: 'Module not found',
        }
      }

      if (module[0].status !== 'locked') {
        return {
          success: false,
          error: 'Module must be locked before submitting for certification',
        }
      }

      // 2. Check if already submitted
      const existingSubmission = await db
        .select()
        .from(certifiedSubmissions)
        .where(
          and(
            eq(certifiedSubmissions.moduleId, request.moduleId),
            sql`status IN ('pending', 'under_review')`
          )
        )
        .limit(1)

      if (existingSubmission.length > 0) {
        return {
          success: false,
          error: 'Module already has a pending certification submission',
        }
      }

      // 3. Create submission
      const submissionId = `cert_sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      await db.insert(certifiedSubmissions).values({
        id: submissionId,
        moduleId: request.moduleId,
        submitterId: request.userId,
        organizationId: request.organizationId,
        status: 'pending',
        submitterNotes: request.submitterNotes,
        metadata: {
          moduleVersion: module[0].version,
          submittedAt: new Date().toISOString(),
        },
      })

      // 4. Log submission
      await db.insert(auditEvents).values({
        eventType: 'certification_submitted',
        userId: request.userId,
        metadata: {
          submissionId,
          moduleId: request.moduleId,
          moduleTitle: module[0].title,
        },
      })

      return {
        success: true,
        submissionId,
      }
    } catch (error) {
      console.error('Certification submission error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit for certification',
      }
    }
  }

  /**
   * Get default reviewer checklist
   */
  getReviewerChecklist(): ReviewChecklistItem[] {
    return [
      // Content checks
      {
        id: 'content_1',
        category: 'content',
        requirement: 'All citations are present and valid',
        status: 'pending',
      },
      {
        id: 'content_2',
        category: 'content',
        requirement: 'Content is factually accurate and up-to-date',
        status: 'pending',
      },
      {
        id: 'content_3',
        category: 'content',
        requirement: 'Learning goals are clear and measurable',
        status: 'pending',
      },
      {
        id: 'content_4',
        category: 'content',
        requirement: 'Content is comprehensive and well-structured',
        status: 'pending',
      },

      // Quality checks
      {
        id: 'quality_1',
        category: 'quality',
        requirement: 'Language is clear, concise, and professional',
        status: 'pending',
      },
      {
        id: 'quality_2',
        category: 'quality',
        requirement: 'No spelling or grammatical errors',
        status: 'pending',
      },
      {
        id: 'quality_3',
        category: 'quality',
        requirement: 'Examples are relevant and helpful',
        status: 'pending',
      },
      {
        id: 'quality_4',
        category: 'quality',
        requirement: 'Items vary in difficulty appropriately',
        status: 'pending',
      },

      // Compliance checks
      {
        id: 'compliance_1',
        category: 'compliance',
        requirement: 'No proprietary or confidential information',
        status: 'pending',
      },
      {
        id: 'compliance_2',
        category: 'compliance',
        requirement: 'No copyright violations',
        status: 'pending',
      },
      {
        id: 'compliance_3',
        category: 'compliance',
        requirement: 'Follows Cerply content guidelines',
        status: 'pending',
      },

      // Accessibility checks
      {
        id: 'accessibility_1',
        category: 'accessibility',
        requirement: 'Language is appropriate for target audience',
        status: 'pending',
      },
      {
        id: 'accessibility_2',
        category: 'accessibility',
        requirement: 'Content is inclusive and unbiased',
        status: 'pending',
      },
      {
        id: 'accessibility_3',
        category: 'accessibility',
        requirement: 'No unnecessarily complex jargon',
        status: 'pending',
      },
    ]
  }

  /**
   * Review a certification submission
   */
  async reviewSubmission(request: ReviewSubmissionRequest): Promise<{
    success: boolean
    newStatus?: string
    error?: string
  }> {
    try {
      // 1. Fetch submission
      const submission = await db
        .select()
        .from(certifiedSubmissions)
        .where(eq(certifiedSubmissions.id, request.submissionId))
        .limit(1)

      if (submission.length === 0) {
        return {
          success: false,
          error: 'Submission not found',
        }
      }

      // 2. Validate checklist
      const allPassed = request.checklist.every((item) => item.status === 'passed')
      const anyFailed = request.checklist.some((item) => item.status === 'failed')

      // 3. Determine new status
      let newStatus: 'approved' | 'rejected' | 'changes_requested' = 'approved'

      if (request.decision === 'reject' || anyFailed) {
        newStatus = 'rejected'
      } else if (request.decision === 'request_changes') {
        newStatus = 'changes_requested'
      } else if (request.decision === 'approve' && allPassed) {
        newStatus = 'approved'
      } else {
        return {
          success: false,
          error: 'Review decision does not match checklist results',
        }
      }

      // 4. Update submission
      await db
        .update(certifiedSubmissions)
        .set({
          status: newStatus,
          reviewerId: request.reviewerId,
          reviewedAt: new Date(),
          reviewerComments: request.reviewerComments,
          metadata: {
            ...((submission[0].metadata as any) || {}),
            checklist: request.checklist,
            reviewedAt: new Date().toISOString(),
          },
        })
        .where(eq(certifiedSubmissions.id, request.submissionId))

      // 5. Log review
      await db.insert(auditEvents).values({
        eventType: 'certification_reviewed',
        userId: request.reviewerId,
        metadata: {
          submissionId: request.submissionId,
          moduleId: submission[0].moduleId,
          decision: newStatus,
          checklistPassed: allPassed,
        },
      })

      return {
        success: true,
        newStatus,
      }
    } catch (error) {
      console.error('Review submission error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to review submission',
      }
    }
  }

  /**
   * Stamp a module as Certified Core
   */
  async stampModule(request: StampModuleRequest): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      // 1. Verify submission is approved
      const submission = await db
        .select()
        .from(certifiedSubmissions)
        .where(eq(certifiedSubmissions.id, request.submissionId))
        .limit(1)

      if (submission.length === 0) {
        return {
          success: false,
          error: 'Submission not found',
        }
      }

      if (submission[0].status !== 'approved') {
        return {
          success: false,
          error: 'Module must be approved before stamping',
        }
      }

      // 2. Update module visibility to certified
      await db
        .update(modules)
        .set({
          visibility: 'certified',
          status: 'published',
          updatedAt: new Date(),
          metadata: {
            certificationLevel: request.certificationLevel,
            certifiedBy: request.reviewerId,
            certifiedAt: new Date().toISOString(),
            expiryDate: request.expiryDate?.toISOString(),
            submissionId: request.submissionId,
          },
        })
        .where(eq(modules.id, request.moduleId))

      // 3. Update submission status
      await db
        .update(certifiedSubmissions)
        .set({
          status: 'stamped',
          metadata: {
            ...((submission[0].metadata as any) || {}),
            stampedAt: new Date().toISOString(),
            stampedBy: request.reviewerId,
            certificationLevel: request.certificationLevel,
          },
        })
        .where(eq(certifiedSubmissions.id, request.submissionId))

      // 4. Log stamp
      await db.insert(auditEvents).values({
        eventType: 'module_certified',
        userId: request.reviewerId,
        metadata: {
          moduleId: request.moduleId,
          submissionId: request.submissionId,
          certificationLevel: request.certificationLevel,
        },
      })

      return {
        success: true,
      }
    } catch (error) {
      console.error('Stamp module error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stamp module',
      }
    }
  }

  /**
   * Publish certified module to catalogue
   */
  async publishToCatalogue(moduleId: string, publisherId: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      // Verify module is certified
      const module = await db
        .select()
        .from(modules)
        .where(eq(modules.id, moduleId))
        .limit(1)

      if (module.length === 0) {
        return {
          success: false,
          error: 'Module not found',
        }
      }

      if (module[0].visibility !== 'certified') {
        return {
          success: false,
          error: 'Only certified modules can be published to catalogue',
        }
      }

      // Update status to published
      await db
        .update(modules)
        .set({
          status: 'published',
          updatedAt: new Date(),
        })
        .where(eq(modules.id, moduleId))

      // Log publication
      await db.insert(auditEvents).values({
        eventType: 'module_published',
        userId: publisherId,
        metadata: {
          moduleId,
          visibility: 'certified',
          publishedAt: new Date().toISOString(),
        },
      })

      return {
        success: true,
      }
    } catch (error) {
      console.error('Publish to catalogue error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish to catalogue',
      }
    }
  }

  /**
   * Takedown a certified module from catalogue
   */
  async takedownModule(request: TakedownRequest): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      // Update module status
      await db
        .update(modules)
        .set({
          status: 'archived',
          visibility: 'private',
          updatedAt: new Date(),
          metadata: {
            takenDownAt: new Date().toISOString(),
            takenDownBy: request.adminId,
            takedownReason: request.reason,
          },
        })
        .where(eq(modules.id, request.moduleId))

      // Log takedown
      await db.insert(auditEvents).values({
        eventType: 'module_taken_down',
        userId: request.adminId,
        metadata: {
          moduleId: request.moduleId,
          reason: request.reason,
          takenDownAt: new Date().toISOString(),
        },
      })

      return {
        success: true,
      }
    } catch (error) {
      console.error('Takedown module error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to takedown module',
      }
    }
  }

  /**
   * Get all submissions (for reviewers/admins)
   */
  async getAllSubmissions(status?: string): Promise<any[]> {
    const query = status
      ? db
          .select()
          .from(certifiedSubmissions)
          .where(eq(certifiedSubmissions.status, status))
          .orderBy(certifiedSubmissions.createdAt)
      : db.select().from(certifiedSubmissions).orderBy(certifiedSubmissions.createdAt)

    return await query
  }

  /**
   * Get submission by ID
   */
  async getSubmissionById(submissionId: string): Promise<any | null> {
    const submission = await db
      .select()
      .from(certifiedSubmissions)
      .where(eq(certifiedSubmissions.id, submissionId))
      .limit(1)

    return submission.length > 0 ? submission[0] : null
  }
}

// Singleton instance
export const certifiedService = new CertifiedService()

// Helper functions for routes
export async function submitModuleForCertification(request: SubmitForCertificationRequest) {
  return certifiedService.submitForCertification(request)
}

export async function reviewCertificationSubmission(request: ReviewSubmissionRequest) {
  return certifiedService.reviewSubmission(request)
}

export async function stampModuleAsCertified(request: StampModuleRequest) {
  return certifiedService.stampModule(request)
}

export async function publishModuleToCatalogue(moduleId: string, publisherId: string) {
  return certifiedService.publishToCatalogue(moduleId, publisherId)
}

export async function takedownCertifiedModule(request: TakedownRequest) {
  return certifiedService.takedownModule(request)
}

export function getReviewChecklist(): ReviewChecklistItem[] {
  return certifiedService.getReviewerChecklist()
}

export async function getAllCertificationSubmissions(status?: string) {
  return certifiedService.getAllSubmissions(status)
}

export async function getCertificationSubmission(submissionId: string) {
  return certifiedService.getSubmissionById(submissionId)
}

