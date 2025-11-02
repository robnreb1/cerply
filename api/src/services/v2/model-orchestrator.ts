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
  timeout: 120000, // 120 second timeout for long requests
  maxRetries: 2,
})

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 180000, // 3 minutes for long content generation
  maxRetries: 3,
})

export interface ModelRequest {
  jobType: ModelJobType
  prompt: string
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
  tools?: any[] // OpenAI tool definitions
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } }
  metadata?: Record<string, any> // e.g., { module_id, user_id }
}

export interface ModelResponse {
  content: string
  modelLabel: string
  tokens: number
  costCents: number
  durationMs: number
  tool_calls?: any[] // OpenAI tool calls if present
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
    try {
      await logModelUsage({
        jobType: request.jobType,
        modelLabel: response.modelLabel,
        tokens: response.tokens,
        costCents: response.costCents,
        durationMs: response.durationMs,
        metadata: request.metadata || {},
      })
    } catch (logError) {
      // Don't fail the request if logging fails
      console.error('Model logging error (non-fatal):', logError)
    }

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
 * Call OpenAI models (GPT-4o, GPT-5, etc.)
 */
async function callOpenAI(model: ModelConfig, request: ModelRequest): Promise<ModelResponse> {
  console.log('🟢 Calling OpenAI model:', model.model)
  console.log('  Job type:', request.jobType)
  
  // o1 series models have special requirements
  const isO1 = model.model.startsWith('o1')
  const isGPT5 = model.model.startsWith('gpt-5')
  
  const maxTokensParam = (isGPT5 || isO1) ? 'max_completion_tokens' : 'max_tokens'
  console.log('  Max tokens param:', maxTokensParam)
  console.log('  Max tokens value:', request.maxTokens || 4096)
  console.log('  Prompt length:', request.prompt?.length || 0)
  console.log('  System prompt length:', request.systemPrompt?.length || 0)
  
  const params: any = {
    model: model.model,
    messages: [],
    [maxTokensParam]: request.maxTokens || 4096,
  }
  
  // o1 models don't support system prompts - merge into user message
  if (isO1) {
    const combinedPrompt = request.systemPrompt 
      ? `${request.systemPrompt}\n\n---\n\n${request.prompt}`
      : request.prompt
    params.messages.push({ role: 'user' as const, content: combinedPrompt })
  } else {
    // Regular models support system prompts
    if (request.systemPrompt) {
      params.messages.push({ role: 'system' as const, content: request.systemPrompt })
    }
    params.messages.push({ role: 'user' as const, content: request.prompt })
  }
  
  // o1 and GPT-5 don't support temperature parameter
  if (!isO1 && !isGPT5) {
    params.temperature = request.temperature ?? 0.7
  }
  
  // o1 models don't support tools
  if (!isO1 && request.tools && request.tools.length > 0) {
    params.tools = request.tools
    if (request.tool_choice) {
      params.tool_choice = request.tool_choice
    }
  }
  
  console.log('📞 Making OpenAI API call...')
  const completion = await openai.chat.completions.create(params)
  console.log('✅ OpenAI response received')
  console.log('  Choices:', completion.choices?.length || 0)
  console.log('  Content length:', completion.choices[0]?.message?.content?.length || 0)
  console.log('  Finish reason:', completion.choices[0]?.finish_reason)
  console.log('  Refusal:', completion.choices[0]?.message?.refusal || 'none')

  const content = completion.choices[0]?.message?.content || ''
  const tool_calls = completion.choices[0]?.message?.tool_calls
  const tokens = completion.usage?.total_tokens || 0
  const costCents = Math.round((tokens / 1000) * model.costPer1kTokens)
  
  console.log('📊 Usage:', { tokens, costCents })

  return {
    content,
    modelLabel: model.model,
    tokens,
    costCents,
    durationMs: 0, // Set by caller
    tool_calls,
  }
}

/**
 * Call Anthropic models (Claude Sonnet, Haiku, etc.)
 */
async function callAnthropic(model: ModelConfig, request: ModelRequest): Promise<ModelResponse> {
  console.log('🔵 Calling Anthropic model:', model.model)
  console.log('  Max tokens:', request.maxTokens || 4096)
  console.log('  Temperature:', request.temperature ?? 0.7)
  console.log('  Tools:', request.tools?.length || 0)
  
  const params: any = {
    model: model.model,
    max_tokens: request.maxTokens || 4096,
    temperature: request.temperature ?? 0.7,
    system: request.systemPrompt,
    messages: [
      { role: 'user', content: request.prompt },
    ],
  }
  
  // Add tools if provided (Anthropic format is different from OpenAI)
  if (request.tools && request.tools.length > 0) {
    console.log('🔧 Converting OpenAI tools to Anthropic format')
    // Convert OpenAI tool format to Anthropic format
    params.tools = request.tools.map((tool: any) => ({
      name: tool.function.name,
      description: tool.function.description,
      input_schema: tool.function.parameters,
    }))
    console.log('  Converted tools:', params.tools.map((t: any) => t.name).join(', '))
  }
  
  const message = await anthropic.messages.create(params)
  
  console.log('✅ Anthropic response received')
  console.log('  Stop reason:', message.stop_reason)
  console.log('  Content blocks:', message.content.length)

  // Extract text content
  const content = message.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as any).text)
    .join('\n')

  // Extract tool calls if present
  const tool_calls = message.content
    .filter((block) => block.type === 'tool_use')
    .map((block: any) => ({
      id: block.id,
      type: 'function',
      function: {
        name: block.name,
        arguments: JSON.stringify(block.input),
      },
    }))
    
  if (tool_calls.length > 0) {
    console.log('🔧 Tool calls extracted:', tool_calls.map((tc: any) => tc.function.name).join(', '))
  }

  const tokens = message.usage.input_tokens + message.usage.output_tokens
  const costCents = Math.round((tokens / 1000) * model.costPer1kTokens)
  
  console.log('📊 Usage:', { tokens, costCents })

  return {
    content,
    modelLabel: model.model,
    tokens,
    costCents,
    durationMs: 0, // Set by caller
    tool_calls: tool_calls.length > 0 ? tool_calls : undefined,
  }
}

/**
 * Fallback to GPT-5-mini if primary model fails
 */
async function callModelWithFallback(request: ModelRequest): Promise<ModelResponse> {
  const startTime = Date.now()
  
  // Use GPT-5-mini as fallback
  const fallbackModel: ModelConfig = {
    provider: 'openai',
    model: 'gpt-5-mini-2025-08-07',
    costPer1kTokens: 0.5, // Estimated
  }

  let response: ModelResponse
  response = await callOpenAI(fallbackModel, request)
  response.durationMs = Date.now() - startTime

  try {
    await logModelUsage({
      jobType: request.jobType,
      modelLabel: `${response.modelLabel}-fallback`,
      tokens: response.tokens,
      costCents: response.costCents,
      durationMs: response.durationMs,
      metadata: { ...request.metadata, fallback: true },
    })
  } catch (logError) {
    console.error('Fallback model logging error (non-fatal):', logError)
  }

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
 * Check if an error is retryable/fallback-worthy
 */
function shouldRetry(error: any): boolean {
  // Retry on rate limits and temporary failures
  if (error?.status === 429) return true // Rate limit
  if (error?.status === 503) return true // Service unavailable
  if (error?.status === 504) return true // Gateway timeout
  if (error?.code === 'ECONNRESET') return true // Connection reset
  
  // Fallback on Anthropic credit/billing errors
  if (error?.status === 400 && error?.message?.includes('credit balance')) return true
  if (error?.error?.type === 'invalid_request_error' && error?.error?.message?.includes('credit')) return true
  
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

