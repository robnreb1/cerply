# Model Configuration Summary

## ✅ Updated Model Strategy (FSD §14)

### Current Configuration

| Job Type | Model | Provider | Cost | Use Case |
|----------|-------|----------|------|----------|
| **Drafting** | GPT-5 (chatgpt-5-latest) | OpenAI | ~$5/1M tokens | Creating module outlines, structured content |
| **Quality** | Claude Sonnet 4.5 | Anthropic | ~$3/1M tokens | Hallucination detection, citation validation |
| **Chat** | Claude Haiku 3.5 | Anthropic | $0.25/1M tokens | Conversational refinements, quick edits |

### Why This Combination?

**GPT-5 for Drafting:**
- Latest flagship model from OpenAI
- Superior reasoning and instruction following
- Best at structured JSON generation
- Excellent for educational content design
- Worth the higher cost for quality module creation

**Claude Sonnet 4.5 for Quality:**
- **Latest and most capable Claude model** (released Sept 2025)
- Superior analytical capabilities
- Best hallucination detection in the industry
- Strong at fact-checking and source validation
- Enhanced computer use and agentic capabilities

**Claude Haiku 3.5 for Chat:**
- **~200ms latency** (vs 800ms+ for GPT-4o-mini)
- **5x cheaper** than GPT-4o-mini
- Perfect for real-time conversation
- Good enough for refinements

### Performance Expectations

- **Module creation**: 3-4 seconds (GPT-5 - slower but smarter)
- **Chat responses**: <500ms (Haiku) 🚀
- **Quality checks**: 3-5 seconds (Sonnet)

### Cost Estimates

**Typical module build session:**
- Initial draft: ~1,500 tokens × $5 = **$0.0075**
- 10 chat refinements: ~500 tokens × $0.25 = **$0.001**
- Quality lock: ~2,000 tokens × $3 = **$0.006**
- **Total: ~$0.015 per module** 💰

### Environment Variables

Override defaults in `api/.env`:
```bash
# Use GPT-4o instead (faster, cheaper, but less capable)
TOP_MODEL=gpt-4o

# Use GPT-4o for everything (OpenAI-only stack)
FAST_MODEL=gpt-4o-mini
QUALITY_MODEL=gpt-4o

# Use Claude Opus for maximum quality (expensive)
QUALITY_MODEL=claude-3-opus-20240229
```

## Model Details

### GPT-5 (chatgpt-5-latest)
- **Access**: Via OpenAI API key
- **Model ID**: `chatgpt-5-latest` (auto-updates to latest GPT-5 version)
- **Strengths**: Reasoning, structured output, instruction following
- **Best for**: Module outlines, learning objectives, content structure

### Claude Haiku 3.5
- **Access**: Via Anthropic API key
- **Model ID**: `claude-3-5-haiku-20241022`
- **Strengths**: Speed, cost-efficiency, good reasoning
- **Best for**: Real-time chat, quick refinements

### Claude Sonnet 4.5
- **Access**: Via Anthropic API key
- **Model ID**: `claude-sonnet-4.5-20250514`
- **Released**: September 30, 2025
- **Strengths**: Best-in-class analysis, coding, agentic capabilities, fact-checking
- **Best for**: Quality gates, hallucination detection, complex validation

## Next Steps

1. Add both API keys to `api/.env`
2. Restart API server
3. Chat will use **Haiku** (fast!)
4. Module creation will use **GPT-5** (smartest!)


