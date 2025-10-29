/**
 * Learn Routes for Cerply V2
 * 
 * Implements FSD v2.0 Section 3: Learner interactions
 * 
 * Routes:
 * - POST /api/v2/learn/respond - Submit answer
 * - GET /api/v2/learn/next - Get next item
 * - POST /api/v2/learn/help - Request help
 * - POST /api/v2/learn/challenge - Request challenge
 * - GET /api/v2/learn/progress - Get progress summary
 * - POST /api/v2/learn/command - Parse natural language command
 */

import { FastifyInstance } from 'fastify'
import {
  submitLearnerAnswer,
  requestHelp,
  requestChallenge,
  parseNaturalLanguageCommand,
  type AnswerSubmission,
  type HelpRequest,
  type ChallengeRequest,
} from '../services/v2/learn-interactions'
import { planNextSession } from '../services/v2/adaptive-engine-v2'
import { getProgressCard } from '../services/v2/delivery-engine'

export default async function learnRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/v2/learn/respond
   * Submit an answer to a learning item
   */
  fastify.post('/api/v2/learn/respond', async (request, reply) => {
    const { userId, organizationId } = request.user as any
    const body = request.body as AnswerSubmission

    // Validate required fields
    if (!body.assignmentId || !body.itemId || body.answer === undefined) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required fields: assignmentId, itemId, answer',
        },
      })
    }

    try {
      const result = await submitLearnerAnswer({
        ...body,
        userId,
        organizationId,
      })

      return reply.send(result)
    } catch (error) {
      console.error('Answer submission error:', error)
      return reply.code(500).send({
        error: {
          code: 'SUBMISSION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to submit answer',
        },
      })
    }
  })

  /**
   * GET /api/v2/learn/next
   * Get the next item for learner
   */
  fastify.get('/api/v2/learn/next', async (request, reply) => {
    const { userId } = request.user as any
    const { assignmentId } = request.query as any

    if (!assignmentId) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required query param: assignmentId',
        },
      })
    }

    try {
      const nextSession = await planNextSession(userId, assignmentId)

      return reply.send({
        item: nextSession.items[0] || null,
        rationale: nextSession.rationale,
        dueDate: nextSession.dueDate,
      })
    } catch (error) {
      console.error('Next item error:', error)
      return reply.code(500).send({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch next item',
        },
      })
    }
  })

  /**
   * POST /api/v2/learn/help
   * Request help on a learning item
   */
  fastify.post('/api/v2/learn/help', async (request, reply) => {
    const { userId, organizationId } = request.user as any
    const body = request.body as HelpRequest

    if (!body.itemId) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required field: itemId',
        },
      })
    }

    try {
      const helpText = await requestHelp({
        ...body,
        userId,
        organizationId,
        helpType: body.helpType || 'hint',
      })

      return reply.send({ help: helpText })
    } catch (error) {
      console.error('Help request error:', error)
      return reply.code(500).send({
        error: {
          code: 'HELP_FAILED',
          message: 'Failed to provide help',
        },
      })
    }
  })

  /**
   * POST /api/v2/learn/challenge
   * Request a challenge item
   */
  fastify.post('/api/v2/learn/challenge', async (request, reply) => {
    const { userId, organizationId } = request.user as any
    const body = request.body as ChallengeRequest

    if (!body.assignmentId) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required field: assignmentId',
        },
      })
    }

    try {
      const challenge = await requestChallenge({
        ...body,
        userId,
        organizationId,
        challengeType: body.challengeType || 'harder',
      })

      return reply.send(challenge)
    } catch (error) {
      console.error('Challenge request error:', error)
      return reply.code(500).send({
        error: {
          code: 'CHALLENGE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to provide challenge',
        },
      })
    }
  })

  /**
   * GET /api/v2/learn/progress
   * Get progress summary for learner
   */
  fastify.get('/api/v2/learn/progress', async (request, reply) => {
    const { userId } = request.user as any
    const { assignmentId } = request.query as any

    if (!assignmentId) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required query param: assignmentId',
        },
      })
    }

    try {
      const progressCard = await getProgressCard(userId, assignmentId)

      return reply.send(progressCard)
    } catch (error) {
      console.error('Progress fetch error:', error)
      return reply.code(500).send({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch progress',
        },
      })
    }
  })

  /**
   * POST /api/v2/learn/command
   * Parse and execute natural language command
   */
  fastify.post('/api/v2/learn/command', async (request, reply) => {
    const { userId, organizationId } = request.user as any
    const { assignmentId, currentItemId, message } = request.body as any

    if (!assignmentId || !message) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required fields: assignmentId, message',
        },
      })
    }

    try {
      const result = await parseNaturalLanguageCommand(userId, organizationId, assignmentId, currentItemId || '', message)

      return reply.send(result)
    } catch (error) {
      console.error('Command parsing error:', error)
      return reply.code(500).send({
        error: {
          code: 'COMMAND_FAILED',
          message: 'Failed to parse command',
        },
      })
    }
  })
}

