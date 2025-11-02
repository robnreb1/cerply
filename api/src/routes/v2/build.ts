/**
 * Build API Routes for Cerply V2
 * 
 * Intelligence-First Implementation using AI Agent Orchestrator
 * 
 * Routes:
 * - POST /api/build/start - Start conversation (agent decides next steps)
 * - POST /api/build/chat - Continue conversation (agent orchestrates)
 * - POST /api/build/lock - Role-based lock with quality gates
 * - GET /api/build/calibration - Generate example items at varied difficulty
 */

import { FastifyInstance } from 'fastify'
import { generateCalibrationItems } from '../../services/v2/build-agent'
import { runQualityGates } from '../../services/v2/quality-gate'
import { orchestrateAgent } from '../../services/v2/agent-orchestrator'
import { db } from '../../db'
import { modules, contentLibrary, auditEvents, buildSessions, calibrationItems } from '../../../drizzle/schema_v2'
import { eq, asc } from 'drizzle-orm'

export default async function buildRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/build/start
   * Start intelligent conversation - agent decides what to ask/do
   */
  fastify.post('/build/start', async (request, reply) => {
    console.log('\n┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓')
    console.log('┃  🚀 BUILD START ENDPOINT                              ┃')
    console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛')
    
    const { userId, organizationId, prompt, uploads } = request.body as any
    console.log('📥 Request body:', { userId, organizationId, promptLength: prompt?.length, uploadsCount: uploads?.length })

    if (!userId || !organizationId || !prompt) {
      console.error('❌ Missing required fields')
      return reply.code(400).send({
        error: {
          code: 'MISSING_FIELDS',
          message: 'userId, organizationId, and prompt are required',
        },
      })
    }

    try {
      // Generate UUIDs for dev mode
      const validUserId = userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
        ? userId
        : '00000000-0000-0000-0000-000000000001'
      const validOrgId = organizationId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
        ? organizationId
        : '00000000-0000-0000-0000-000000000002'

      console.log('✅ Valid UUIDs:', { validUserId, validOrgId })
      console.log('🎯 Calling agent orchestrator...')

      // Use intelligent agent orchestrator
      const agentResponse = await orchestrateAgent(prompt, {
        userId: validUserId,
        organizationId: validOrgId,
        conversationHistory: [
          { role: 'user', content: prompt, timestamp: new Date().toISOString() }
        ],
        uploads,
      })

      console.log('✅ Agent orchestration complete')
      console.log('📊 Agent response summary:', {
        messageLength: agentResponse.message?.length,
        moduleId: agentResponse.moduleId,
        actionsCount: agentResponse.actions?.length,
        contentGenerated: agentResponse.contentGenerated,
      })

      // Create or update build session with conversation history
      if (agentResponse.moduleId) {
        console.log('💾 Creating/updating build session for module:', agentResponse.moduleId)
        
        // Check if session already exists
        const [existingSession] = await db.select().from(buildSessions)
          .where(eq(buildSessions.moduleId, agentResponse.moduleId))
        
        if (existingSession) {
          console.log('📝 Updating existing session')
          // Update existing session
          await db.update(buildSessions)
            .set({
              chatHistory: [
                ...(existingSession.chatHistory as any[]),
                { role: 'user', content: prompt, timestamp: new Date().toISOString() },
                { role: 'assistant', content: agentResponse.message, timestamp: new Date().toISOString() }
              ],
              updatedAt: new Date().toISOString(),
            })
            .where(eq(buildSessions.moduleId, agentResponse.moduleId))
        } else {
          console.log('✨ Creating new session')
          // Create new session
          await db.insert(buildSessions).values({
            moduleId: agentResponse.moduleId,
            userId: validUserId,
            organizationId: validOrgId,
            initialPrompt: prompt,
            chatHistory: [
              { role: 'user', content: prompt, timestamp: new Date().toISOString() },
              { role: 'assistant', content: agentResponse.message, timestamp: new Date().toISOString() }
            ],
          })
        }
        
        console.log('✅ Build session saved successfully')
      }

      // Log audit event if module was created
      if (agentResponse.moduleId) {
        await db.insert(auditEvents).values({
          userId: validUserId,
          organizationId: validOrgId,
          eventType: 'module_create',
          entityType: 'module',
          entityId: agentResponse.moduleId,
          metadata: { action: 'agent_start', prompt: prompt.substring(0, 100) },
        })
        console.log('📋 Audit event logged')
      }

      console.log('✅ Sending response to client')
      return reply.code(201).send({
        moduleId: agentResponse.moduleId,
        reply: agentResponse.message,
        actions: agentResponse.actions,
        content: agentResponse.contentGenerated ? 'generated' : undefined,
        aiGenerated: true,
      })
    } catch (error: any) {
      console.error('\n❌ BUILD START ERROR:')
      console.error('Message:', error.message)
      console.error('Stack:', error.stack)
      console.error('Full error:', error)
      return reply.code(500).send({
        error: {
          code: 'BUILD_START_FAILED',
          message: error.message || 'Failed to start build session',
          details: error.stack || error.message,
        },
      })
    }
  })

  /**
   * POST /api/build/chat
   * Continue conversation - agent orchestrates next steps
   */
  fastify.post('/build/chat', async (request, reply) => {
    console.log('\n┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓')
    console.log('┃  💬 BUILD CHAT ENDPOINT                               ┃')
    console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛')
    
    const { userId, moduleId, message, uploads } = request.body as any
    console.log('📥 Request:', { userId, moduleId, messageLength: message?.length, uploadsCount: uploads?.length })

    if (!userId || !moduleId || !message) {
      console.error('❌ Missing required fields')
      return reply.code(400).send({
        error: {
          code: 'MISSING_FIELDS',
          message: 'userId, moduleId, and message are required',
        },
      })
    }

    try {
      // Get build session for conversation history
      console.log('🔍 Looking up build session for module:', moduleId)
      const [session] = await db.select().from(buildSessions).where(eq(buildSessions.moduleId, moduleId))

      if (!session) {
        console.error('❌ Session not found for module:', moduleId)
        return reply.code(404).send({
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Build session not found',
          },
        })
      }

      console.log('✅ Session found:', {
        sessionId: session.id,
        historyLength: (session.chatHistory as any[])?.length || 0,
        organizationId: session.organizationId,
      })

      // Build full conversation history including current message
      const fullHistory = [
        ...(session.chatHistory as any[]) || [],
        { role: 'user', content: message, timestamp: new Date().toISOString() }
      ]
      
      console.log('📋 Full conversation history:', {
        totalMessages: fullHistory.length,
        last3Messages: fullHistory.slice(-3).map(m => ({
          role: m.role,
          contentPreview: m.content?.substring(0, 50) + '...'
        }))
      })

      console.log('🎯 Calling agent orchestrator...')

      // Use intelligent agent orchestrator with full context
      const agentResponse = await orchestrateAgent(message, {
        userId,
        organizationId: session.organizationId,
        moduleId,
        conversationHistory: fullHistory,
        uploads,
      })

      console.log('✅ Agent chat orchestration complete')
      console.log('📊 Agent response summary:', {
        messageLength: agentResponse.message?.length,
        actionsCount: agentResponse.actions?.length,
        contentGenerated: agentResponse.contentGenerated,
      })

      // Update chat history in build session
      const newHistory = [
        ...(session.chatHistory as any[]),
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        {
          role: 'assistant',
          content: agentResponse.message,
          timestamp: new Date().toISOString(),
        },
      ]

      console.log('💾 Updating session with new history (total messages:', newHistory.length, ')')
      await db
        .update(buildSessions)
        .set({
          chatHistory: newHistory,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(buildSessions.moduleId, moduleId))

      console.log('✅ Sending response to client')
      return reply.code(200).send({
        reply: agentResponse.message,
        actions: agentResponse.actions,
        content: agentResponse.contentGenerated ? 'generated' : undefined,
        moduleId: agentResponse.moduleId || moduleId,
        aiGenerated: true,
      })
    } catch (error: any) {
      console.error('\n❌ BUILD CHAT ERROR:')
      console.error('Message:', error.message)
      console.error('Stack:', error.stack)
      console.error('Full error:', error)
      return reply.code(500).send({
        error: {
          code: 'CHAT_FAILED',
          message: error.message || 'Failed to process chat message',
          details: error.message,
        },
      })
    }
  })

  /**
   * POST /api/build/lock
   * Lock module with role-based lock type after passing quality gates
   */
  fastify.post('/build/lock', async (request, reply) => {
    console.log('🔒 Lock request received')
    console.log('Request body:', request.body)
    console.log('Request headers:', request.headers)
    
    const { userId, organizationId, moduleId, lockType } = request.body as any

    console.log('Extracted fields:', { userId, organizationId, moduleId, lockType })

    if (!userId || !organizationId || !moduleId || !lockType) {
      console.error('❌ Missing required fields')
      return reply.code(400).send({
        error: {
          code: 'MISSING_FIELDS',
          message: 'userId, organizationId, moduleId, and lockType are required',
        },
      })
    }

    // Validate lock type
    const validLockTypes = ['company_module', 'certified_candidate']
    if (!validLockTypes.includes(lockType)) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_LOCK_TYPE',
          message: `lockType must be one of: ${validLockTypes.join(', ')}`,
        },
      })
    }

    try {
      // Run quality gates
      const qualityResult = await runQualityGates(moduleId)

      if (!qualityResult.passed) {
        return reply.code(400).send({
          error: {
            code: 'QUALITY_GATES_FAILED',
            message: 'Module did not pass quality gates',
            details: {
              score: qualityResult.score,
              flags: qualityResult.flags,
              recommendations: qualityResult.recommendations,
            },
          },
        })
      }

      // Lock the module
      const [module] = await db
        .update(modules)
        .set({
          lockedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(modules.id, moduleId))
        .returning()

      // Add to content library
      await db.insert(contentLibrary).values({
        organizationId,
        moduleId,
        locked: true,
        lockType,
        approvedBy: userId,
        approvedAt: new Date().toISOString(),
      })

      // Log audit event
      await db.insert(auditEvents).values({
        userId,
        organizationId,
        eventType: 'lock',
        entityType: 'module',
        entityId: moduleId,
        metadata: { lockType, qualityScore: qualityResult.score },
      })

      return reply.code(200).send({
        moduleId,
        lockedAt: module.lockedAt,
        lockType,
        qualityScore: qualityResult.score,
      })
    } catch (error: any) {
      console.error('Lock error:', error)
      return reply.code(500).send({
        error: {
          code: 'LOCK_FAILED',
          message: error.message || 'Failed to lock module',
        },
      })
    }
  })

  /**
   * GET /api/build/calibration/:moduleId
   * Fetch generated calibration items from the database
   */
  fastify.get('/build/calibration/:moduleId', async (request, reply) => {
    const { moduleId } = request.params as any

    if (!moduleId) {
      return reply.code(400).send({
        error: {
          code: 'MISSING_FIELDS',
          message: 'moduleId is required',
        },
      })
    }

    try {
      const items = await db
        .select()
        .from(calibrationItems)
        .where(eq(calibrationItems.moduleId, moduleId))
        .orderBy(asc(calibrationItems.order))

      return reply.code(200).send({ items })
    } catch (error: any) {
      console.error('Calibration fetch error:', error)
      return reply.code(500).send({
        error: {
          code: 'CALIBRATION_FETCH_FAILED',
          message: error.message || 'Failed to fetch calibration items',
        },
      })
    }
  })

  /**
   * GET /api/build/calibration
   * Generate calibration items (example lessons/checks at varied difficulty)
   */
  fastify.get('/build/calibration', async (request, reply) => {
    const { moduleId, difficulty, userId, organizationId } = request.query as any

    if (!moduleId || !userId || !organizationId) {
      return reply.code(400).send({
        error: {
          code: 'MISSING_FIELDS',
          message: 'moduleId, userId, and organizationId are required query parameters',
        },
      })
    }

    try {
      const items = await generateCalibrationItems(moduleId, userId, organizationId, Number(difficulty) || 5)

      return reply.code(200).send({ examples: items })
    } catch (error: any) {
      console.error('Calibration error:', error)
      return reply.code(500).send({
        error: {
          code: 'CALIBRATION_FAILED',
          message: error.message || 'Failed to generate calibration items',
        },
      })
    }
  })
}
