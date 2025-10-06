# Cost Orchestration

This document defines the model tiers, usage patterns, and cost optimization strategies that ensure efficient AI usage while maintaining quality standards.

## Model Tiers

### Tier 1: Nano Models (Ultra-Low Cost)
**Use Cases:** Grading, classification, simple validation
**Examples:** GPT-4o-mini, Claude Haiku
**Cost:** ~$0.0001-0.0005 per request
**Quality:** Deterministic, consistent results for well-defined tasks

**Applications:**
- Answer grading and scoring
- Content classification (difficulty, topic)
- Simple intent parsing
- Basic validation and formatting
- Status updates and notifications

### Tier 2: Mini Models (Low Cost)
**Use Cases:** Conversational AI, microcopy generation, clarification
**Examples:** GPT-4o-mini, Claude Sonnet
**Cost:** ~$0.001-0.005 per request
**Quality:** Good for conversational tasks, creative writing

**Applications:**
- Natural language conversation
- Microcopy generation
- User intent clarification
- Simple content adaptation
- Progress updates and explanations

### Tier 3: Standard Models (Medium Cost)
**Use Cases:** Content generation, complex reasoning, analysis
**Examples:** GPT-4o, Claude Sonnet
**Cost:** ~$0.01-0.05 per request
**Quality:** High-quality content generation and analysis

**Applications:**
- Learning content generation
- Complex problem solving
- Detailed explanations
- Content summarization
- Analysis and insights

### Tier 4: Ensemble Models (High Cost)
**Use Cases:** Quality-first content generation, critical analysis
**Examples:** GPT-5, Claude Opus, multiple model cross-validation
**Cost:** ~$0.05-0.20 per request
**Quality:** Highest quality with cross-validation

**Applications:**
- First-time content generation
- Certified content creation
- Critical analysis and validation
- Complex multi-step reasoning
- High-stakes decision making

## Orchestration Strategy

### Request Routing Logic

```typescript
interface OrchestrationContext {
  taskType: 'intent' | 'microcopy' | 'conversation' | 'generation' | 'analysis';
  qualityRequirement: 'basic' | 'standard' | 'high' | 'critical';
  userContext: LearnerContext;
  budgetConstraints: BudgetLimits;
  cacheStatus: CacheHit | CacheMiss;
}

function selectModel(context: OrchestrationContext): ModelConfig {
  // Tier 1: Grading and classification
  if (context.taskType === 'grading' || context.taskType === 'classification') {
    return { tier: 1, model: 'gpt-4o-mini', maxTokens: 1000 };
  }
  
  // Tier 2: Intent parsing and microcopy
  if (context.taskType === 'intent' || context.taskType === 'microcopy') {
    return { tier: 2, model: 'gpt-4o-mini', maxTokens: 2000 };
  }
  
  // Tier 3: Standard content generation
  if (context.taskType === 'generation' && context.qualityRequirement === 'standard') {
    return { tier: 3, model: 'gpt-4o', maxTokens: 4000 };
  }
  
  // Tier 4: Quality-first ensemble
  if (context.taskType === 'generation' && context.qualityRequirement === 'critical') {
    return { tier: 4, model: 'ensemble', maxTokens: 8000 };
  }
  
  // Cache hit: Use lower tier for adaptation
  if (context.cacheStatus === 'hit') {
    return { tier: 2, model: 'gpt-4o-mini', maxTokens: 2000 };
  }
  
  // Default fallback
  return { tier: 2, model: 'gpt-4o-mini', maxTokens: 2000 };
}
```

### Cost Escalation Rules

**When to Escalate:**
- First-time content generation (no cache hit)
- Quality requirement is 'critical' or 'high'
- User explicitly requests premium quality
- Content will be certified or published
- Complex multi-step reasoning required

**When to Use Lower Tiers:**
- Cache hit with existing canonical content
- Simple intent parsing or classification
- Microcopy generation for UI elements
- Conversational responses and clarifications
- Basic content adaptation or summarization

### Budget Management

**Per-Organization Limits:**
- Daily token budget with rolling window
- Monthly cost caps with alerts
- Per-user limits for fair resource allocation
- Emergency budget for critical requests

**Budget Enforcement:**
```typescript
interface BudgetLimits {
  dailyTokens: number;
  monthlyCost: number;
  perUserDailyTokens: number;
  emergencyBudget: number;
}

function checkBudget(orgId: string, estimatedCost: number): BudgetStatus {
  const usage = getUsageStats(orgId);
  const limits = getBudgetLimits(orgId);
  
  if (usage.dailyTokens + estimatedCost > limits.dailyTokens) {
    return { allowed: false, reason: 'daily_budget_exceeded' };
  }
  
  if (usage.monthlyCost + estimatedCost > limits.monthlyCost) {
    return { allowed: false, reason: 'monthly_budget_exceeded' };
  }
  
  return { allowed: true };
}
```

## Caching Strategy

### Cache Hit Optimization

**Exact Matches (Hash-based):**
- Return cached content immediately
- Use Tier 1 model for simple adaptation if needed
- Cost: ~$0.0001 per request

**Semantic Matches (Similarity-based):**
- Use Tier 2 model to adapt cached content
- Maintain quality while reducing cost
- Cost: ~$0.001 per request

**Partial Matches:**
- Extract relevant sections from cache
- Use Tier 2-3 model to supplement
- Cost: ~$0.005 per request

### Cache Miss Handling

**New Content Generation:**
- Use Tier 4 ensemble for quality-first generation
- Store result in cache for future reuse
- Cost: ~$0.10 per request (one-time)

**Cache Population:**
- Pre-generate popular content during off-peak hours
- Use Tier 3 model for bulk generation
- Cost: ~$0.02 per request (amortized)

## Cost Monitoring

### Real-Time Metrics

**Per-Request Tracking:**
- Model tier used
- Token count (input/output)
- Cost per request
- Quality score achieved
- Cache hit/miss status

**Aggregate Metrics:**
- Daily cost by organization
- Cost per user session
- Model tier distribution
- Cache hit rate
- Quality vs. cost correlation

### Cost Optimization

**Automatic Optimizations:**
- Cache popular content proactively
- Use lower tiers for cached content adaptation
- Batch similar requests for efficiency
- Implement request deduplication

**Manual Optimizations:**
- Adjust model tiers based on quality feedback
- Tune cache hit rates through better indexing
- Optimize prompt engineering for token efficiency
- Implement request queuing for cost smoothing

## Quality vs. Cost Balance

### Quality Gates

**Minimum Quality Thresholds:**
- Tier 1: 0.7 coherence score
- Tier 2: 0.8 coherence score
- Tier 3: 0.85 coherence score
- Tier 4: 0.9 coherence score

**Quality Monitoring:**
- Track quality scores by model tier
- Alert on quality degradation
- Automatically escalate if quality below threshold
- User satisfaction correlation with model tier

### Cost-Performance Optimization

**Efficiency Metrics:**
- Cost per quality point
- Token efficiency (quality/tokens)
- Cache hit rate impact on cost
- User satisfaction per dollar spent

**Optimization Strategies:**
- A/B test model tiers for specific use cases
- Optimize prompts for token efficiency
- Implement smart caching strategies
- Use ensemble only when necessary

## Implementation

### API Endpoints

```typescript
// Get cost estimates before processing
GET /api/orchestration/cost-estimate
{
  taskType: string;
  qualityRequirement: string;
  estimatedTokens: number;
}

// Get usage statistics
GET /api/orchestration/usage/:orgId
{
  dailyTokens: number;
  monthlyCost: number;
  cacheHitRate: number;
  qualityScores: QualityMetrics;
}

// Set budget limits
POST /api/orchestration/budget/:orgId
{
  dailyTokens: number;
  monthlyCost: number;
  perUserDailyTokens: number;
}
```

### Monitoring Dashboard

**Key Metrics:**
- Cost trends over time
- Model tier usage distribution
- Cache hit rates and impact
- Quality score trends
- Budget utilization

**Alerts:**
- Budget threshold exceeded
- Quality degradation detected
- Cache hit rate below target
- Unusual cost spikes
- Model performance issues

## Cross-References

- [Platform Principles](principles.md) - Cost-aware principle
- [Quality-First Pipeline](quality-first-pipeline.md) - Quality vs. cost balance
- [Interaction Contract](interaction-contract.md) - Model usage for microcopy
- [CI Guardrails](ci-guardrails.md) - Cost enforcement tests
