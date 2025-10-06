# Static String Migration Guide

This guide explains how to migrate static strings to dynamic microcopy throughout the Cerply application, following the platform principles of intelligent, natural interactions.

## Migration Status

### ✅ Completed
- INTRO_COPY constant defined as the only allowed static string
- Dynamic microcopy generator implemented
- Microcopy service created for centralized access
- Interaction engine integrated with microcopy

### 🔄 In Progress
- Migrating UI components to use dynamic microcopy
- Updating copy.ts to use microcopy service
- Replacing static strings in learn page

### ⏳ Pending
- Full migration of all static strings
- Testing and validation of dynamic microcopy
- Performance optimization

## Migration Rules

### 1. Only INTRO_COPY is Allowed as Static String
```typescript
// ✅ ALLOWED - Only this one static string
export const INTRO_COPY = "Learn anything. Remember everything.";

// ❌ NOT ALLOWED - All other static strings must be dynamic
const staticHeading = "What would you like to learn?"; // This should be dynamic
```

### 2. Use Microcopy Service for All User-Facing Text
```typescript
// ❌ OLD WAY - Static string
const heading = "What would you like to master?";

// ✅ NEW WAY - Dynamic microcopy
const heading = await getTopicInputPrompt({
  learnerLevel: 'beginner',
  currentPhase: 'input',
  brandVoice: 'encouraging'
});
```

### 3. Provide Appropriate Fallbacks
```typescript
// ✅ GOOD - Always provide fallback
const message = await microcopyService.getMicrocopy('confirmation.processing', context, {
  fallback: 'Building your learning experience...',
  maxLength: 50
});
```

## Migration Examples

### Example 1: Topic Input Heading
```typescript
// Before
const heading = copy.topic.heading; // "What would you like to master?"

// After
const [heading, setHeading] = useState('');
useEffect(() => {
  getTopicInputPrompt({
    learnerLevel: level,
    currentPhase: 'input',
    brandVoice: 'encouraging'
  }).then(setHeading);
}, [level]);
```

### Example 2: Confirmation Messages
```typescript
// Before
const confirmText = copy.preview.confirmYes; // "Looks great — Start"

// After
const [confirmText, setConfirmText] = useState('');
useEffect(() => {
  getConfirmationMessage({
    learnerLevel: level,
    currentPhase: 'preview',
    topic: topic,
    brandVoice: 'encouraging'
  }).then(setConfirmText);
}, [level, topic]);
```

### Example 3: Error Messages
```typescript
// Before
const errorMessage = copy.error.network; // "Connection issue — please check your internet"

// After
const [errorMessage, setErrorMessage] = useState('');
useEffect(() => {
  getErrorMessage('network', {
    learnerLevel: level,
    currentPhase: currentPhase,
    brandVoice: 'encouraging'
  }).then(setErrorMessage);
}, [level, currentPhase]);
```

## Component Migration Pattern

### Step 1: Import Microcopy Service
```typescript
import { 
  microcopyService, 
  getTopicInputPrompt, 
  getConfirmationMessage,
  type AppContext 
} from '@/lib/microcopy-service';
```

### Step 2: Define Context
```typescript
const getAppContext = (): AppContext => ({
  learnerLevel: level === 'worldClass' ? 'advanced' : 
                level === 'expert' ? 'advanced' : 
                level === 'advanced' ? 'advanced' :
                level === 'intermediate' ? 'intermediate' : 'beginner',
  currentPhase: state.phase,
  topic: state.phase === 'preview' ? state.data.summary : input,
  sessionProgress: state.phase === 'session' ? state.currentIdx / state.items.length : 0,
  brandVoice: 'encouraging'
});
```

### Step 3: Replace Static Strings
```typescript
// Replace static strings with dynamic microcopy
const [dynamicText, setDynamicText] = useState('');

useEffect(() => {
  const context = getAppContext();
  
  // Use appropriate microcopy function
  getTopicInputPrompt(context).then(setDynamicText);
}, [level, state, input]);
```

### Step 4: Handle Loading States
```typescript
// Show fallback while microcopy loads
return (
  <div>
    {dynamicText || 'Loading...'}
  </div>
);
```

## Migration Checklist

### Phase 1: Core Components
- [ ] Learn page input section
- [ ] Preview confirmation
- [ ] Auth gate messages
- [ ] Session feedback

### Phase 2: UI Components
- [ ] Button labels
- [ ] Form placeholders
- [ ] Status messages
- [ ] Error handling

### Phase 3: Advanced Features
- [ ] Chat interface
- [ ] Progress indicators
- [ ] Navigation elements
- [ ] Help text

### Phase 4: Testing & Validation
- [ ] Test all microcopy scenarios
- [ ] Verify fallbacks work
- [ ] Performance testing
- [ ] Accessibility validation

## Testing Dynamic Microcopy

### Unit Tests
```typescript
test('microcopy service generates appropriate content', async () => {
  const context: AppContext = {
    learnerLevel: 'beginner',
    currentPhase: 'input',
    brandVoice: 'encouraging'
  };
  
  const microcopy = await getTopicInputPrompt(context);
  
  expect(microcopy).toBeTruthy();
  expect(microcopy.length).toBeGreaterThan(10);
  expect(microcopy.length).toBeLessThan(100);
});
```

### Integration Tests
```typescript
test('learn page uses dynamic microcopy', async ({ page }) => {
  await page.goto('/learn');
  
  const heading = await page.textContent('[data-testid="topic-heading"]');
  expect(heading).toBeTruthy();
  expect(heading).not.toBe('What would you like to master?'); // Should be dynamic
});
```

## Performance Considerations

### Caching
- Microcopy service caches results for 5 minutes
- Cache keys include context and options
- Cache automatically expires

### Loading States
- Always provide fallback text
- Use React state for dynamic updates
- Consider preloading common scenarios

### Bundle Size
- Microcopy service is tree-shakeable
- Import only needed functions
- Consider code splitting for large apps

## Rollback Plan

If dynamic microcopy causes issues:

1. **Immediate**: Use fallback text
2. **Short-term**: Revert to static strings in copy.ts
3. **Long-term**: Fix microcopy service and re-migrate

## Future Enhancements

### Planned Features
- A/B testing for microcopy variants
- Personalization based on user history
- Multi-language support
- Voice tone adaptation
- Context-aware suggestions

### Integration Points
- Analytics tracking for microcopy effectiveness
- User feedback collection
- Performance monitoring
- Quality metrics

## Support

For questions about microcopy migration:
- Check the interaction contract documentation
- Review the microcopy service implementation
- Test with the provided examples
- Use the lint script to catch violations
