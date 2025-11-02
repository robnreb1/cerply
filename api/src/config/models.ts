/**
 * Model Configuration for Cerply V2
 * 
 * Defines which LLM models to use for different job types
 * Implements FSD v2.0 §9: Model Orchestration
 */

export type ModelJobType = 'drafting' | 'quality' | 'chat' | 'orchestration' | 'quality_check'

export interface ModelConfig {
  provider: 'openai' | 'anthropic'
  model: string
  costPer1kTokens: number
}

export interface ModelsConfig {
  topModel: ModelConfig
  qualityModel: ModelConfig
  fastModel: ModelConfig
  orchestrationModel: ModelConfig
  qualityCheckModel: ModelConfig
}

/**
 * Default model configuration
 * Environment variables can override these defaults
 * 
 * FSD v2.0 §14 Model Strategy:
 * - Top model: Haiku 4.5 for drafting (fast, economical, reasoning)
 * - Quality model: Haiku 4.5 for content generation (fast, economical)
 * - Quality check model: GPT-5 for cross-model validation (best quality)
 * - Orchestration model: Haiku 4.5 for agent tool calling
 * - Fast model: Haiku 4.5 for simple chat
 * 
 * Note: Override with TOP_MODEL, QUALITY_MODEL, QUALITY_CHECK_MODEL, ORCHESTRATION_MODEL, FAST_MODEL in .env
 */
export const modelConfig: ModelsConfig = {
  topModel: {
    provider: 'anthropic',
    model: process.env.TOP_MODEL || 'claude-haiku-4-5-20251001', // Claude Haiku 4.5 - fast, economical, reasoning model
    costPer1kTokens: 0.25,
  },
  qualityModel: {
    provider: 'anthropic',
    model: process.env.QUALITY_MODEL || 'claude-haiku-4-5-20251001', // Haiku 4.5 (fast, economical)
    costPer1kTokens: 0.25,
  },
  qualityCheckModel: {
    provider: 'openai',
    model: process.env.QUALITY_CHECK_MODEL || 'gpt-5-mini-2025-08-07', // GPT-5 Mini for cross-model validation
    costPer1kTokens: 0.40,
  },
  orchestrationModel: {
    provider: 'anthropic',
    model: process.env.ORCHESTRATION_MODEL || 'claude-haiku-4-5-20251001', // Haiku 4.5 (fast, supports tool calling)
    costPer1kTokens: 0.25,
  },
  fastModel: {
    provider: 'anthropic',
    model: process.env.FAST_MODEL || 'claude-haiku-4-5-20251001', // Haiku 4.5 (fastest)
    costPer1kTokens: 0.25,
  },
}

/**
 * Get the model config for a specific job type
 */
export function getModelForJob(jobType: ModelJobType): ModelConfig {
  switch (jobType) {
    case 'drafting':
      return modelConfig.topModel
    case 'quality':
      return modelConfig.qualityModel
    case 'quality_check':
      return modelConfig.qualityCheckModel
    case 'orchestration':
      return modelConfig.orchestrationModel
    case 'chat':
      return modelConfig.fastModel
    default:
      return modelConfig.fastModel
  }
}

/**
 * Failover configuration
 */
export const FAILOVER_CONFIG = {
  allowFastFallback: true,
  criticalJobs: ['quality', 'quality_check'] as ModelJobType[], // Don't fallback for quality checks
}

/**
 * Cost guardrail configuration (in cents)
 */
export const COST_CONFIG = {
  dailyOrgCapCents: parseInt(process.env.DAILY_ORG_CAP_CENTS || '10000', 10), // $100 default
  dailyUserCapCents: parseInt(process.env.DAILY_USER_CAP_CENTS || '1000', 10), // $10 default
}
