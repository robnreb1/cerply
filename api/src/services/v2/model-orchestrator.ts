/**
 * Model Orchestrator for Cerply V2
 * 
 * Implements FSD v2.0 Section 14: Models & orchestration
 * 
 * Routes jobs to the right model:
 * - Top model (GPT-5 Pro) for outline/core drafting
 * - Quality check model (Claude Sonnet 4.5) for hallucination detection  
 * - Fast model (GPT-5-mini) for chat and small edits
 * 
 * Logs all jobs to model_logs table for cost/performance monitoring
 */

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { db } from '../../db'
import { modelLogs } from '../../../drizzle/schema_v2'
import {
  modelConfig,
  getModelForJob,
  FAILOVER_CONFIG,
  COST_CONFIG,
  type ModelConfig,
  type ModelJobType,
} from '../../config/models'

// Re-export ModelJobType for other services
export type { ModelJobType } from '../../config/models'

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface ModelRequest {
  jobType: ModelJobType
  prompt: string
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
  metadata?: Record<string, any> // e.g., { module_id, user_id }
}

export interface ModelResponse {
  content: string
  modelLabel: string
  tokens: number
  costCents: number
  durationMs: number
}

/**
 * Main orchestration function - routes to the right model based on job type
 */
export async function callModel(request: ModelRequest): Promise<ModelResponse> {
  const model = getModelForJob(request.jobType)
  const startTime = Date.now()

  let response: ModelResponse

  try {
    if (model.provider === 'openai') {
      response = await callOpenAI(model, request)
    } else if (model.provider === 'anthropic') {
      response = await callAnthropic(model, request)
    } else {
      throw new Error(`Unknown provider: ${model.provider}`)
    }

    response.durationMs = Date.now() - startTime

    // Log to database
    await logModelUsage({
      jobType: request.jobType,
      modelLabel: response.modelLabel,
      tokens: response.tokens,
      costCents: response.costCents,
      durationMs: response.durationMs,
      metadata: request.metadata || {},
    })

    return response
  } catch (error) {
    // Handle errors with failover logic
    if (shouldRetry(error) && !FAILOVER_CONFIG.criticalJobs.includes(request.jobType)) {
      console.warn(`Model call failed for ${request.jobType}, attempting fallback`, error)
      // Fallback to fast model if allowed
      if (FAILOVER_CONFIG.allowFastFallback) {
        return callModelWithFallback(request)
      }
    }
    throw error
  }
}

/**
 * Call OpenAI models (GPT-4o, GPT-4o-mini, etc.)
 */
async function callOpenAI(model: ModelConfig, request: ModelRequest): Promise<ModelResponse> {
  const completion = await openai.chat.completions.create({
    model: model.model,
    messages: [
      ...(request.systemPrompt ? [{ role: 'system' as const, content: request.systemPrompt }] : []),
      { role: 'user' as const, content: request.prompt },
    ],
    max_tokens: request.maxTokens || model.maxTokens,
    temperature: request.temperature ?? model.temperature,
  })

  const content = completion.choices[0]?.message?.content || ''
  const tokens = completion.usage?.total_tokens || 0
  const costCents = estimateCost(tokens, model.costPerMToken || 0)

  return {
    content,
    modelLabel: model.label,
    tokens,
    costCents,
    durationMs: 0, // Set by caller
  }
}

/**
 * Call Anthropic models (Claude Sonnet, etc.)
 */
async function callAnthropic(model: ModelConfig, request: ModelRequest): Promise<ModelResponse> {
  const message = await anthropic.messages.create({
    model: model.model,
    max_tokens: request.maxTokens || model.maxTokens || 4096,
    temperature: request.temperature ?? model.temperature,
    system: request.systemPrompt,
    messages: [
      { role: 'user', content: request.prompt },
    ],
  })

  const content = message.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as any).text)
    .join('\n')

  const tokens = message.usage.input_tokens + message.usage.output_tokens
  const costCents = estimateCost(tokens, model.costPerMToken || 0)

  return {
    content,
    modelLabel: model.label,
    tokens,
    costCents,
    durationMs: 0, // Set by caller
  }
}

/**
 * Fallback to fast model if top model fails
 */
async function callModelWithFallback(request: ModelRequest): Promise<ModelResponse> {
  const fastModel = getModelForJob(ModelJobType.CHAT) // Use fast model
  const startTime = Date.now()

  let response: ModelResponse

  if (fastModel.provider === 'openai') {
    response = await callOpenAI(fastModel, request)
  } else {
    response = await callAnthropic(fastModel, request)
  }

  response.durationMs = Date.now() - startTime

  await logModelUsage({
    jobType: request.jobType,
    modelLabel: `${response.modelLabel}-fallback`,
    tokens: response.tokens,
    costCents: response.costCents,
    durationMs: response.durationMs,
    metadata: { ...request.metadata, fallback: true },
  })

  return response
}

/**
 * Estimate cost in cents from tokens
 */
function estimateCost(tokens: number, costPerMToken: number): number {
  return Math.ceil((tokens / 1_000_000) * costPerMToken)
}

/**
 * Log model usage to database
 */
async function logModelUsage(data: {
  jobType: ModelJobType
  modelLabel: string
  tokens: number
  costCents: number
  durationMs: number
  metadata: Record<string, any>
}) {
  try {
    await db.insert(modelLogs).values({
      jobType: data.jobType,
      modelLabel: data.modelLabel,
      tokens: data.tokens,
      costCents: data.costCents,
      durationMs: data.durationMs,
      metadata: data.metadata,
    })
  } catch (error) {
    console.error('Failed to log model usage:', error)
    // Don't throw - logging should not block the main flow
  }
}

/**
 * Check if an error is retryable
 */
function shouldRetry(error: any): boolean {
  // Retry on rate limits and temporary failures
  if (error?.status === 429) return true // Rate limit
  if (error?.status === 503) return true // Service unavailable
  if (error?.status === 504) return true // Gateway timeout
  if (error?.code === 'ECONNRESET') return true // Connection reset
  return false
}

/**
 * Check cost limits before allowing a model call
 */
export async function checkCostLimits(organizationId: string, userId: string): Promise<boolean> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  try {
    // Query today's costs (simplified - in production would use aggregation)
    const orgCosts = await db
      .select()
      .from(modelLogs)
      .where(sql`metadata->>'organization_id' = ${organizationId} AND created_at >= ${today.toISOString()}`)

    const userCosts = await db
      .select()
      .from(modelLogs)
      .where(sql`metadata->>'user_id' = ${userId} AND created_at >= ${today.toISOString()}`)

    const totalOrgCost = orgCosts.reduce((sum: number, log: any) => sum + (log.costCents || 0), 0)
    const totalUserCost = userCosts.reduce((sum: number, log: any) => sum + (log.costCents || 0), 0)

    if (totalOrgCost >= COST_CONFIG.dailyOrgCapCents) {
      console.warn(`Organization ${organizationId} exceeded daily cost cap`)
      return false
    }

    if (totalUserCost >= COST_CONFIG.dailyUserCapCents) {
      console.warn(`User ${userId} exceeded daily cost cap`)
      return false
    }

    return true
  } catch (error) {
    console.error('Failed to check cost limits:', error)
    // Allow the call on error (fail open for now)
    return true
  }
}

// Import sql for cost limit checks
import { sql } from 'drizzle-orm'

