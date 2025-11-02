/**
 * SSE (Server-Sent Events) endpoint for real-time build updates
 * Provides granular status updates during content generation
 */

import { FastifyInstance } from 'fastify'
import { orchestrateAgent } from '../../services/v2/agent-orchestrator'
import { db } from '../../db'
import { buildSessions } from '../../../drizzle/schema_v2'
import { eq } from 'drizzle-orm'

export default async function buildSSERoutes(fastify: FastifyInstance) {
  /**
   * POST /api/v2/build/chat-sse
   * Chat endpoint with SSE for real-time status updates
   */
  fastify.post('/build/chat-sse', async (request, reply) => {
    const { userId, moduleId, message, uploads } = request.body as any

    if (!userId || !moduleId || !message) {
      return reply.code(400).send({
        error: {
          code: 'MISSING_FIELDS',
          message: 'userId, moduleId, and message are required',
        },
      })
    }

    // Set up SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    })

    // Helper to send SSE messages
    const sendSSE = (event: string, data: any) => {
      reply.raw.write(`event: ${event}\n`)
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    try {
      // Send initial status
      sendSSE('status', { stage: 'thinking', message: 'Thinking...' })

      // Get build session for conversation history
      const [session] = await db.select().from(buildSessions).where(eq(buildSessions.moduleId, moduleId))

      if (!session) {
        sendSSE('error', { message: 'Build session not found' })
        reply.raw.end()
        return
      }

      // Build full conversation history
      const fullHistory = [
        ...(session.chatHistory as any[]) || [],
        { role: 'user', content: message, timestamp: new Date().toISOString() }
      ]

      // Orchestrate with progress callbacks
      const agentResponse = await orchestrateAgent(message, {
        userId,
        organizationId: session.organizationId,
        moduleId,
        conversationHistory: fullHistory,
        uploads,
        onProgress: (stage: string, message: string, details?: any) => {
          sendSSE('status', { stage, message, details })
        },
      })

      // Update session
      const newHistory = [
        ...(session.chatHistory as any[]),
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'assistant', content: agentResponse.message, timestamp: new Date().toISOString() },
      ]

      await db.update(buildSessions)
        .set({ chatHistory: newHistory, updatedAt: new Date().toISOString() })
        .where(eq(buildSessions.moduleId, moduleId))

      // Send completion
      sendSSE('complete', {
        message: agentResponse.message,
        moduleId: agentResponse.moduleId,
        actions: agentResponse.actions,
        contentGenerated: agentResponse.contentGenerated,
      })

      reply.raw.end()
    } catch (error: any) {
      console.error('SSE Error:', error)
      sendSSE('error', { message: 'Internal server error' })
      reply.raw.end()
    }
  })
}

