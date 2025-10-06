# CI Guardrails

This document describes the automated enforcement mechanisms that ensure adherence to platform principles through continuous integration, testing, and quality gates.

## Overview

CI guardrails prevent regression from platform principles by:
1. Automatically testing all principles on every PR
2. Blocking merges that violate quality standards
3. Providing immediate feedback on issues
4. Generating drift audit reports
5. Enforcing cost and quality thresholds

## Guardrail Categories

### 1. Conversational UX Lint

**Purpose:** Ensure natural, non-templated interactions
**Trigger:** Every PR to main branch
**Scope:** All UI components and user-facing strings

**Checks:**
- Large hardcoded strings outside `web/lib/copy.ts`
- Only `INTRO_COPY` allowed as static string
- Components must use dynamic microcopy generator
- Natural language router integration required

**Implementation:**
```typescript
// scripts/lint-conversational-copy.ts
function checkStaticStrings(filePath: string): LintResult {
  const content = readFile(filePath);
  const staticStrings = findLargeStrings(content);
  
  for (const str of staticStrings) {
    if (!isWhitelisted(str, ['INTRO_COPY'])) {
      return {
        error: `Large static string found: "${str.substring(0, 50)}..."`,
        file: filePath,
        line: getLineNumber(content, str)
      };
    }
  }
  
  return { success: true };
}
```

**Failure Criteria:**
- Any hardcoded string >50 characters outside whitelist
- Components without microcopy generator integration
- Missing natural language router for user actions

### 2. No Templates Test

**Purpose:** Prevent templated responses that appear natural
**Trigger:** Every PR to main branch
**Scope:** Content generation endpoints

**Test Process:**
1. Generate same prompt 3 times with varied seed/user context
2. Measure lexical diversity and structure variance
3. Fail if outputs are too similar (beyond intro)

**Implementation:**
```typescript
// web/e2e/variance.spec.ts
test('content generation variance', async () => {
  const prompt = "Explain machine learning basics";
  const results = await Promise.all([
    generateContent(prompt, { seed: 1, context: 'beginner' }),
    generateContent(prompt, { seed: 2, context: 'intermediate' }),
    generateContent(prompt, { seed: 3, context: 'advanced' })
  ]);
  
  const diversity = calculateDiversity(results);
  expect(diversity.lexical).toBeGreaterThan(0.3);
  expect(diversity.structural).toBeGreaterThan(0.2);
});
```

**Failure Criteria:**
- Lexical diversity < 0.3
- Structural variance < 0.2
- Identical outputs beyond intro string

### 3. Natural Language Command Acceptance

**Purpose:** Ensure all accepted NL commands work correctly
**Trigger:** Every PR to main branch
**Scope:** Interaction engine and learn page

**Test Commands:**
- "shorter" → Reduce content length
- "bullets" → Convert to bullet format
- "I only have 15 mins" → Adapt to time constraint
- "explain like I'm 12" → Simplify language
- "give me examples" → Add concrete examples
- "skip this" → Move to next topic
- "I don't get it" → Provide alternative explanation

**Implementation:**
```typescript
// web/e2e/natural-interactions.spec.ts
test('natural language commands', async () => {
  const commands = [
    'shorter', 'bullets', 'I only have 15 mins',
    'explain like I\'m 12', 'give me examples', 'skip this', 'I don\'t get it'
  ];
  
  for (const command of commands) {
    const response = await sendCommand(command);
    expect(response.adapted).toBe(true);
    expect(response.content).toBeDefined();
  }
});
```

**Failure Criteria:**
- Any command fails to adapt appropriately
- Commands return generic responses
- No contextual adaptation based on command

### 4. Adaptive Telemetry Tests

**Purpose:** Verify adaptive behavior based on performance
**Trigger:** Every PR to main branch
**Scope:** Learning algorithms and progress tracking

**Test Scenarios:**
- Wrong/slow responses → easier content next
- Correct/fast responses → harder content or paraphrase
- Spaced repetition with struggle-based weighting
- Auto-assessment without manual grading

**Implementation:**
```typescript
// api/tests/adaptive.test.ts
test('adaptive difficulty adjustment', async () => {
  // Simulate poor performance
  await submitAnswers(sessionId, wrongAnswers);
  const nextItem = await getNextItem(sessionId);
  expect(nextItem.difficulty).toBeLessThan(previousDifficulty);
  
  // Simulate good performance
  await submitAnswers(sessionId, correctAnswers);
  const nextItem2 = await getNextItem(sessionId);
  expect(nextItem2.difficulty).toBeGreaterThan(nextItem.difficulty);
});
```

**Failure Criteria:**
- No difficulty adjustment based on performance
- Manual grading required for assessment
- Spaced repetition not working correctly

### 5. Quality Floor Evaluation

**Purpose:** Maintain minimum quality standards
**Trigger:** Every PR to main branch
**Scope:** Content generation and canon store

**Quality Metrics:**
- Coherence score ≥ 0.8
- Coverage completeness ≥ 0.85
- Factual accuracy validation
- Pedagogical soundness check

**Implementation:**
```typescript
// api/tests/quality-floor.test.ts
test('quality floor enforcement', async () => {
  const goldenPrompts = loadGoldenPrompts();
  
  for (const prompt of goldenPrompts) {
    const response = await generateContent(prompt);
    
    if (response.source === 'canon') {
      // Canon content skips quality check
      continue;
    }
    
    const quality = evaluateQuality(response);
    expect(quality.coherence).toBeGreaterThanOrEqual(0.8);
    expect(quality.coverage).toBeGreaterThanOrEqual(0.85);
  }
});
```

**Failure Criteria:**
- Quality scores below threshold for fresh content
- No quality evaluation for generated content
- Canon content not properly identified

### 6. Cost Graph Tests

**Purpose:** Verify efficient model usage
**Trigger:** Every PR to main branch
**Scope:** Orchestration and model selection

**Test Scenarios:**
- Cheap models used for intent parsing and microcopy
- Expensive models only for first-time quality content
- Cache hits reduce model tier usage
- Budget limits enforced correctly

**Implementation:**
```typescript
// api/tests/cost-graph.test.ts
test('model tier selection', async () => {
  // Intent parsing should use cheap model
  const intent = await parseIntent("make this shorter");
  expect(intent.modelTier).toBe(1);
  
  // Microcopy generation should use cheap model
  const microcopy = await generateMicrocopy(context);
  expect(microcopy.modelTier).toBe(2);
  
  // First-time generation should use expensive model
  const content = await generateContent(topic, { cacheHit: false });
  expect(content.modelTier).toBe(4);
  
  // Cache hit should use cheap model
  const cachedContent = await generateContent(topic, { cacheHit: true });
  expect(cachedContent.modelTier).toBe(2);
});
```

**Failure Criteria:**
- Expensive models used for simple tasks
- No cache hit optimization
- Budget limits not enforced

## CI Workflow

### GitHub Actions Configuration

```yaml
# .github/workflows/ci-quality-floor.yml
name: Quality Floor CI
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  ux-no-templates-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Lint conversational copy
        run: npm run lint:conversational-copy
        
  nl-commands-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Test natural language commands
        run: npm run test:e2e:natural-interactions
        
  conv-variance-eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Test content variance
        run: npm run test:e2e:variance
        
  adaptive-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Test adaptive behavior
        run: npm run test:adaptive
        
  quality-floor-eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Evaluate quality floor
        run: npm run test:quality-floor
        
  cost-graph-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Test cost optimization
        run: npm run test:cost-graph
```

### Test Execution

**Parallel Execution:** All guardrail tests run in parallel for speed
**Failure Handling:** Any failure blocks merge to main
**Retry Logic:** Transient failures get one retry attempt
**Notification:** Failures trigger immediate team notification

### Reporting

**PR Comments:** Automatic comments with test results
**Dashboard:** Centralized view of all guardrail status
**Drift Audit:** Weekly report of failures and near-misses
**Trends:** Historical analysis of guardrail performance

## Drift Prevention

### Automated Monitoring

**Daily Checks:**
- Quality score trends
- Cost optimization effectiveness
- Natural language command success rates
- Adaptive behavior accuracy

**Weekly Reports:**
- Guardrail failure summary
- Near-miss analysis
- Performance trend analysis
- Recommendation for improvements

### Manual Reviews

**Code Review Requirements:**
- All PRs must pass guardrail tests
- Manual review of guardrail bypasses
- Documentation updates for new patterns
- Training on guardrail principles

**Escalation Process:**
- Guardrail failures require explanation
- Multiple failures trigger architecture review
- Persistent issues require principle refinement
- Emergency bypasses require post-mortem

## Implementation Status

### Completed
- [ ] Conversational UX lint script
- [ ] Natural language command tests
- [ ] Content variance evaluation
- [ ] Adaptive telemetry tests
- [ ] Quality floor evaluation
- [ ] Cost graph tests
- [ ] CI workflow configuration

### In Progress
- [ ] Drift audit reporting
- [ ] Dashboard implementation
- [ ] Performance optimization
- [ ] Documentation updates

### Planned
- [ ] Advanced quality metrics
- [ ] Machine learning-based drift detection
- [ ] Automated principle refinement
- [ ] Cross-team training materials

## Cross-References

- [Platform Principles](principles.md) - Principles being enforced
- [Interaction Contract](interaction-contract.md) - UX rules being tested
- [Quality-First Pipeline](quality-first-pipeline.md) - Quality standards
- [Cost Orchestration](cost-orchestration.md) - Cost optimization rules
