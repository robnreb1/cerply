/**
 * Model Configuration for Cerply V2
 * 
 * Defines which LLM models to use for different job types
 * Implements FSD v2.0 §9: Model Orchestration
 */

export type ModelJobType = 'drafting' | 'quality' | 'chat'

export interface ModelConfig {
  provider: 'openai' | 'anthropic'
  model: string
  costPer1kTokens: number
}

export interface ModelsConfig {
  topModel: ModelConfig
  qualityModel: ModelConfig
  fastModel: ModelConfig
}

/**
 * Default model configuration
 * Environment variables can override these defaults
 */
export const modelConfig: ModelsConfig = {
  topModel: {
    provider: 'openai',
    model: process.env.TOP_MODEL || 'gpt-4o',
    costPer1kTokens: 3.0,
  },
  qualityModel: {
    provider: 'anthropic',
    model: process.env.QUALITY_MODEL || 'claude-3-5-sonnet-20241022',
    costPer1kTokens: 2.5,
  },
  fastModel: {
    provider: 'openai',
    model: process.env.FAST_MODEL || 'gpt-4o-mini',
    costPer1kTokens: 0.3,
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
  criticalJobs: ['quality'] as ModelJobType[], // Don't fallback for quality checks
}

/**
 * Cost guardrail configuration (in cents)
 */
export const COST_CONFIG = {
  dailyOrgCapCents: parseInt(process.env.DAILY_ORG_CAP_CENTS || '10000', 10), // $100 default
  dailyUserCapCents: parseInt(process.env.DAILY_USER_CAP_CENTS || '1000', 10), // $10 default
}
