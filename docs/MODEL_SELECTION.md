# LLM Model Selection for Ensemble Generation

**Philosophy:** Always use the BEST available models for maximum content quality.

---

## Current Configuration (as of Oct 2025)

| Role | Model | Why This Model |
|------|-------|----------------|
| **Generator A** | `o3` | OpenAI's latest reasoning model. Better than GPT-5 for deep thinking and complex analysis. Best for understanding source material and creating structured content. |
| **Generator B** | `claude-sonnet-4-5` | Anthropic's Claude 4.5 Sonnet. Excellent at creative writing and alternative perspectives. Balances GPT's analytical approach. |
| **Fact-Checker** | `gemini-2.5-pro` | Google's Gemini 2.5 Pro. Strong at cross-validation, fact-checking, and synthesizing multiple inputs into coherent JSON output. |

---

## Selection Criteria

When choosing models, prioritize:

1. **Reasoning Ability** (Generator A) - Deep analysis, structured thinking
2. **Creative Diversity** (Generator B) - Different perspective from Generator A
3. **Synthesis & Validation** (Fact-Checker) - Cross-validation, JSON formatting

---

## How to Update Models

### When a New Model is Released

1. **Test availability:**
   ```bash
   cd api
   npx tsx scripts/find-best-models.ts
   ```

2. **Update `api/src/services/llm-orchestrator.ts`:**
   ```typescript
   const GENERATOR_1 = process.env.LLM_GENERATOR_1 || 'new-best-model';
   ```

3. **Update cost calculations in same file:**
   ```typescript
   function calculateOpenAICost(model: string, tokens: number): number {
     const rates: Record<string, { input: number; output: number }> = {
       'new-best-model': { input: 0.XX / 1000, output: 0.XX / 1000 },
       // ... existing models
     };
   }
   ```

4. **Test the ensemble:**
   ```bash
   bash api/scripts/test-ensemble-api.sh
   ```

5. **Update this document** with the new model and reasoning.

---

## Model Testing Tools

- `api/scripts/find-best-models.ts` - Auto-discovers best available models from each provider
- `api/scripts/test-requested-models.ts` - Tests specific model names
- `api/scripts/test-ensemble-api.sh` - Full end-to-end ensemble test

---

## Alternative Models (Tested & Working)

If you need to switch for cost/speed/availability:

### OpenAI Alternatives
- `gpt-5` - Still excellent, slightly behind o3
- `o1` - Good reasoning, less advanced than o3
- `gpt-4o` - Fast, affordable, proven

### Anthropic Alternatives
- `claude-3-7-sonnet-20250219` - Between 3.5 and 4.5
- `claude-3-5-sonnet-20241022` - Proven, reliable
- `claude-3-haiku-20240307` - Fast, cheap (tested working)

### Google Alternatives
- `gemini-2.0-pro-exp` - Experimental but capable
- `gemini-exp-1206` - Good quality

---

## Cost Considerations

Current estimated costs per generation (2-4 modules):

| Configuration | Est. Cost | Speed |
|---------------|-----------|-------|
| **Current (o3 + Claude 4.5 + Gemini 2.5)** | $0.05-0.10 | 90-120s |
| GPT-4o + Claude 3.5 + Gemini 2.5 | $0.03-0.05 | 60-90s |
| GPT-4o + Claude Haiku + Gemini 2.0 | $0.02-0.03 | 45-60s |

**Recommendation:** Use the best models. The cost difference ($0.05 extra per generation) is negligible compared to the value of higher-quality content.

---

## Quality vs Cost Trade-offs

### When to Use Premium Models (Current Config)
- ✅ Production content for clients
- ✅ High-stakes learning materials
- ✅ Content that will be widely used
- ✅ When content quality is critical

### When Cheaper Models Might Be OK
- Development/testing
- Internal drafts
- High-volume, low-stakes content
- Cost-sensitive deployments

**Current Philosophy:** Always default to the best. Let clients experience premium quality.

---

## Future Considerations

As models evolve, watch for:
- **Multimodal capabilities** - Process images, diagrams in artefacts
- **Longer context windows** - Handle larger source materials
- **Faster inference** - Reduce generation time
- **Specialized models** - Domain-specific (medical, legal, etc.)

---

**Last Updated:** October 2025
**Next Review:** When major models are announced (GPT-6, Claude 5, Gemini 3, etc.)

