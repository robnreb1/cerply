/**
 * Model Configuration for Cerply V2
 * 
 * Implements FSD v2.0 Section 14: Models & Orchestration
 * 
 * Routing rules:
 * - Build (outline, core drafting) → top model with citations
 * - Quality check (facts, citations) → different top model; flags block lock until fixed
 * - Chat and small edits → small fast model
 * - Push and Learn runtime decisions → small fast model with back-off if load is high
 */

export interface ModelConfig {
  label: string
  provider: 'openai' | 'anthropic'
  model: string
  maxTokens?: number
  temperature?: number
  costPerMToken?: number // Cost per million tokens (input + output average)
}

export interface ModelTier {
  top: ModelConfig
  qualityCheck: ModelConfig
  fast: ModelConfig
}

/**
 * Default model tier configuration
 * Can be overridden via environment variables
 */
export const DEFAULT_MODEL_TIER: ModelTier = {
  // Top model for outline and Module core drafting
  top: {
    label: process.env.MODEL_TOP_LABEL || 'gpt-4o',
    provider: 'openai',
    model: process.env.MODEL_TOP || 'gpt-4o',
    maxTokens: 16000,
    temperature: 0.7,
    costPerMToken: 5000, // $5 per million tokens (estimated)
  },

  // Quality check model (different from top to catch hallucinations)
  qualityCheck: {
    label: process.env.MODEL_QUALITY_LABEL || 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    model: process.env.MODEL_QUALITY || 'claude-3-5-sonnet-20241022',
    maxTokens: 8000,
    temperature: 0.3,
    costPerMToken: 3000, // $3 per million tokens (estimated)
  },

  // Fast model for chat, small edits, runtime decisions
  fast: {
    label: process.env.MODEL_FAST_LABEL || 'gpt-4o-mini',
    provider: 'openai',
    model: process.env.MODEL_FAST || 'gpt-4o-mini',
    maxTokens: 4000,
    temperature: 0.7,
    costPerMToken: 150, // $0.15 per million tokens (estimated)
  },
}

/**
 * Job types for model routing
 */
export enum ModelJobType {
  // Build workspace
  DRAFT_OUTLINE = 'draft_outline',
  DRAFT_CORE = 'draft_core',
  GENERATE_ITEMS = 'generate_items',
  QUALITY_CHECK = 'quality_check',
  CHAT = 'chat',
  
  // Calibration
  GENERATE_CALIBRATION = 'generate_calibration',
  
  // Push & Learn
  VARIATION_GENERATE = 'variation_generate',
  FEEDBACK_GENERATE = 'feedback_generate',
  PROGRESS_CARD = 'progress_card',
  
  // Track
  ANALYTICS_INSIGHT = 'analytics_insight',
}

/**
 * Model routing rules based on job type
 */
export const MODEL_ROUTING: Record<ModelJobType, keyof ModelTier> = {
  // Top model jobs
  [ModelJobType.DRAFT_OUTLINE]: 'top',
  [ModelJobType.DRAFT_CORE]: 'top',
  [ModelJobType.GENERATE_ITEMS]: 'top',
  [ModelJobType.GENERATE_CALIBRATION]: 'top',
  
  // Quality check model (must be different from top)
  [ModelJobType.QUALITY_CHECK]: 'qualityCheck',
  
  // Fast model jobs
  [ModelJobType.CHAT]: 'fast',
  [ModelJobType.VARIATION_GENERATE]: 'fast',
  [ModelJobType.FEEDBACK_GENERATE]: 'fast',
  [ModelJobType.PROGRESS_CARD]: 'fast',
  [ModelJobType.ANALYTICS_INSIGHT]: 'fast',
}

/**
 * Get model config for a job type
 */
export function getModelForJob(jobType: ModelJobType): ModelConfig {
  const tier = MODEL_ROUTING[jobType]
  return DEFAULT_MODEL_TIER[tier]
}

/**
 * Failover configuration
 */
export const FAILOVER_CONFIG = {
  maxRetries: 3,
  retryDelayMs: 1000,
  backoffMultiplier: 2,
  
  // If top model is down, can fall back to fast model for non-critical jobs
  allowFastFallback: true,
  
  // Job types that MUST use their designated model (no fallback)
  criticalJobs: [
    ModelJobType.DRAFT_CORE,
    ModelJobType.QUALITY_CHECK,
  ],
}

/**
 * Cost caps and alerts
 */
export const COST_CONFIG = {
  // Alert if daily cost exceeds this (in cents)
  dailyAlertThresholdCents: Number(process.env.COST_ALERT_DAILY_CENTS) || 50000, // $500
  
  // Hard cap per organization per day (in cents)
  dailyOrgCapCents: Number(process.env.COST_CAP_ORG_DAILY_CENTS) || 100000, // $1000
  
  // Hard cap per user per day (in cents)
  dailyUserCapCents: Number(process.env.COST_CAP_USER_DAILY_CENTS) || 10000, // $100
}

