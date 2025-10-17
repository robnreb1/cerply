# Affirmative Response Patterns

## Purpose
These patterns detect when a user is confirming/agreeing with a suggestion, versus refining their request.

## Supported Affirmative Patterns (32 variations)

All patterns are **case-insensitive** and must match the **entire input** (no extra words).

### Simple Affirmatives
- `yes`
- `yep`
- `yeah`
- `yup`
- `sure`
- `ok`
- `okay`

### Correctness Confirmations
- `correct`
- `right`
- `that's right`
- `that's correct`
- `exactly`
- `precisely`
- `spot on`

### Strong Agreement
- `absolutely`
- `definitely`
- `you got it`

### Action-Oriented
- `go ahead`
- `proceed`
- `start`
- `begin`
- `let's do it`

### Positive Feedback
- `sounds good`
- `perfect`
- `great`
- `good`

### Formal Confirmations
- `confirmed`
- `confirm`

### Natural Phrasings
- `it is`
- `that is`
- `yes it is`
- `yes that is`
- `that's it`

## Usage

These patterns are applied in **3 places** for consistency:

1. **Frontend** (`web/app/page.tsx`): Detects confirmations vs refinements
2. **Conversation Engine** (`api/src/services/conversation-engine.ts`): Triggers hardcoded confirmation responses
3. **Intent Detection** (`api/src/routes/workflow.ts`): Fast-path detection for confirmations

## Testing

### Positive Tests (Should be detected as affirmative)
```
User: "teach me Ruby on Rails"
Cerply: "I see you're interested... Is that what you're looking for?"
User: "it is"           ✅ Detected as confirmation
User: "yes"             ✅ Detected as confirmation
User: "that's correct"  ✅ Detected as confirmation
User: "spot on"         ✅ Detected as confirmation
User: "you got it"      ✅ Detected as confirmation
```

### Negative Tests (Should be detected as refinement)
```
User: "teach me Ruby on Rails"
Cerply: "I see you're interested... Is that what you're looking for?"
User: "basics"          ❌ Not a confirmation → Refinement
User: "for beginners"   ❌ Not a confirmation → Refinement
User: "deployment"      ❌ Not a confirmation → Refinement
User: "yes but only deployment" ❌ Not exact match → Refinement
```

## Why Exact Match?

The pattern uses `^...$` anchors to ensure the **entire input** matches. This prevents false positives:

- `"yes but only the basics"` → **Not matched** (has extra words, treated as refinement)
- `"it is for beginners"` → **Not matched** (has extra words, treated as refinement)
- `"yes"` → **Matched** (exact affirmative)

This ensures that if a user is providing additional information, we treat it as a refinement rather than a confirmation.

## Common Failure Cases (Now Fixed)

### Before Fix:
```
User: "Ruby on Rails"
Cerply: "... Is that what you're looking for?"
User: "it is"
Cerply: "I understand you're honing in on a particular aspect..." ❌ WRONG (treated as refinement)
```

### After Fix:
```
User: "Ruby on Rails"
Cerply: "... Is that what you're looking for?"
User: "it is"
Cerply: "Thank you. I'm setting that up for you now." ✅ CORRECT (hardcoded confirmation)
→ Transition message appears 800ms later
```

## Maintenance

When adding new affirmative patterns:
1. Add to all 3 locations (frontend, conversation-engine, workflow)
2. Use `|` separator in regex
3. Ensure pattern is lowercase (regex is case-insensitive with `/i` flag)
4. Test with exact match and with extra words to verify refinement still works
5. Update this document

## Related Files
- `/web/app/page.tsx` (lines ~97-101)
- `/api/src/services/conversation-engine.ts` (lines ~29-31)
- `/api/src/routes/workflow.ts` (lines ~100-103)

