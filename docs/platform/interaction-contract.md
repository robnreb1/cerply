# Interaction Contract

This document defines the UX rules for natural, conversational interactions in Cerply. All user-facing interfaces must follow these patterns to ensure intelligent, intuitive experiences.

## Core Rules

### 1. Natural Language First
- **Primary Interface:** Conversational input accepts natural language for all actions
- **Intent Routing:** Lightweight parser routes user input to appropriate handlers
- **Fallback Forms:** Traditional forms are fallbacks only, never primary interaction
- **Examples:** "Make this shorter", "I only have 15 minutes", "Explain like I'm 12"

### 2. Single Intro Only
- **Allowed Static String:** Only `INTRO_COPY` can be hardcoded (defined in `web/lib/copy.ts`)
- **Dynamic Microcopy:** All other learner-facing copy must be generated or parameterized
- **Brand Voice:** Microcopy generator seeded with brand voice and context
- **Never Identical:** Generated copy must vary across sessions and contexts

### 3. No Dead Ends
- **Progress Indication:** Long-running tasks (>1s) show meaningful progress
- **Engagement Options:** Provide relevant alternatives during processing
- **Profile Questions:** Use waiting time for learner profile building
- **Related Topics:** Suggest related content or activities
- **ETA Communication:** Provide time estimates when possible

### 4. Contextual Follow-ups
- **Stateful Context:** Maintain short-term session and long-term profile context
- **Adaptive Responses:** Follow-up questions adapt to learner responses
- **Memory Integration:** Use telemetry and MVP use cases for personalization
- **Natural Flow:** Conversations feel organic, not scripted

## Accepted Natural Language Commands

### Content Modification
- **"shorter"** → Reduce content length, maintain key points
- **"bullets"** → Convert to bullet point format
- **"explain like I'm 12"** → Simplify language and concepts
- **"give me examples"** → Add concrete examples
- **"more detail"** → Expand on specific points

### Time Management
- **"I only have 15 mins"** → Adapt content length and complexity
- **"I have an hour"** → Provide comprehensive coverage
- **"quick review"** → Focus on key points and retention

### Learning Preferences
- **"I don't get it"** → Provide alternative explanation approach
- **"skip this"** → Move to next topic with appropriate context
- **"repeat that"** → Re-explain with different phrasing
- **"test me"** → Generate quiz questions on current topic

### Navigation
- **"go back"** → Return to previous content
- **"what's next"** → Show upcoming content
- **"show progress"** → Display learning progress and stats

## Implementation Guidelines

### Adding New Intents

1. **Define Intent Pattern:** Add regex or keyword pattern to router
2. **Create Handler:** Implement intent-specific logic
3. **Add Tests:** Include E2E test for new command
4. **Update Documentation:** Add to this contract

### Microcopy Generation

```typescript
// Example implementation
interface MicrocopyContext {
  learnerLevel: 'beginner' | 'intermediate' | 'advanced';
  topic: string;
  sessionProgress: number;
  brandVoice: 'friendly' | 'professional' | 'encouraging';
}

function generateMicrocopy(context: MicrocopyContext, intent: string): string {
  // Use small model to generate contextual copy
  // Ensure variation across calls
  // Maintain brand voice consistency
}
```

### Error Handling

- **Unclear Intent:** Ask clarifying questions rather than showing error
- **Failed Generation:** Provide fallback with explanation
- **Timeout:** Show progress and offer alternatives
- **Rate Limits:** Explain delay and suggest alternatives

## Quality Gates

### CI Enforcement
- **UX Lint:** Scans for large hardcoded strings outside whitelist
- **Variance Test:** Ensures generated content varies across runs
- **NL Command Test:** Validates all accepted commands work correctly
- **No Dead Ends Test:** Confirms meaningful engagement during processing

### Manual Review
- **Conversation Flow:** Natural, not templated feeling
- **Context Awareness:** Responses reflect learner state
- **Brand Consistency:** Voice remains consistent across interactions
- **Accessibility:** All interactions work with screen readers

## Examples

### Good Interaction
```
User: "I want to learn about machine learning but I only have 20 minutes"
System: "Perfect! I'll create a focused ML overview that fits your timeframe. Let me build a quick module covering the essentials..."
[Shows progress: "Building your 20-minute ML overview..."]
[Offers engagement: "While that's processing, would you like to tell me about your current ML experience?"]
```

### Poor Interaction (Avoid)
```
User: "I want to learn about machine learning but I only have 20 minutes"
System: "Please select from the following options:
1. Beginner ML Course (45 mins)
2. Intermediate ML Course (90 mins)
3. Advanced ML Course (120 mins)
Please note: All courses require the full duration."
```

## Cross-References

- [Platform Principles](principles.md) - Core engineering principles
- [Quality-First Pipeline](quality-first-pipeline.md) - Content generation patterns
- [Cost Orchestration](cost-orchestration.md) - Model usage for microcopy
- [CI Guardrails](ci-guardrails.md) - Automated enforcement
