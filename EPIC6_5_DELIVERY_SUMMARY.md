# Epic 6.5: Research Mode - Delivery Summary

**Status:** ✅ IMPLEMENTED  
**Date:** 2025-10-10  
**Branch:** fix/ci-quality-canon-version-kpi

## Implementation Complete

Epic 6.5 Research Mode has been fully implemented, extending the 3-LLM ensemble to support topic-based research requests in addition to source material transformation.

## ✅ Completed Tasks

### 1. Input Type Detection ✅
- Added `detectInputType()` function to automatically classify inputs as 'topic' or 'source'
- Text inputs <200 chars or with topic indicators (e.g., "Teach me", "Explain") → Research mode
- Long documents → Source transformation mode
- Located in: `api/src/services/llm-orchestrator.ts` (lines 416-428)

### 2. Research-Oriented Prompts ✅
- Created `RESEARCH_PROMPTS` with specialized prompts for topic-based generation
- Understanding: Extracts topic, domain, key concepts, learning objectives, prerequisites
- Generator A: Technical/academic focus with textbook/paper citations
- Generator B: Practical applications with course/video citations
- Fact-Checker: Validates content accuracy, citation credibility, ethical concerns
- Located in: `api/src/services/llm-orchestrator.ts` (lines 537-632)

### 3. Dynamic Prompt Routing ✅
- Updated `playbackUnderstanding()` to return `inputType` and use appropriate prompts
- Updated `generateWithEnsemble()` to accept `inputType` parameter and route to correct prompts
- All LLM calls now dynamically select between PROMPTS (source) and RESEARCH_PROMPTS (topic)
- Located in: `api/src/services/llm-orchestrator.ts`

### 4. Database Schema ✅
- Created migration: `api/drizzle/010_research_citations.sql`
  - New table: `citations` (stores extracted citations with validation status)
  - Added fields: `content_generations.input_type`, `content_generations.ethical_flags`
- Updated Drizzle schema: `api/src/db/schema.ts`
  - Citations table with full type safety
  - References `content_generations` with cascade delete
- Migration successfully applied to database

### 5. API Route Updates ✅
- `POST /api/content/understand`: Now returns `inputType` field (`'source'` or `'topic'`)
- `POST /api/content/generate`: Passes `inputType` to ensemble generation
- `GET /api/content/generations/:id`: Returns `citations` array for research mode
- Citation extraction: Handles both object and string citation formats
- Provenance handling: Supports both old format (source mode) and new format (research mode)
- Located in: `api/src/routes/content.ts`

### 6. Error Fixes ✅
- Fixed TypeScript linter errors for `refinementIterations` null handling
- Fixed `inputType` type casting for strict type checking
- Fixed provenance insertion to handle both source and research mode formats
- Added comprehensive error logging for citation extraction

### 7. Testing Script ✅
- Created: `api/scripts/test-research-mode.sh`
- Tests full flow: understand → detect topic → generate → poll → verify citations
- Validates: input type detection, module generation, citation extraction, cost tracking
- Made executable with proper permissions

### 8. Documentation ✅
- Updated: `docs/functional-spec.md`
  - Added §27: Research-Driven Content Generation (Epic 6.5)
  - Documented input type detection, research workflow, API changes
  - Included example output and performance metrics

## Technical Achievements

1. **Seamless Mode Detection**: Auto-detects whether to research a topic or transform source material
2. **Dual-Prompt System**: Maintains backward compatibility with source mode while adding research capabilities
3. **Citation Tracking**: Full provenance for all sources used in research mode
4. **Flexible Data Handling**: Robust extraction logic handles multiple citation formats from LLMs
5. **Type Safety**: Full TypeScript typing for all new database tables and API responses

## API Example

```bash
# Research Mode (Auto-Detected)
curl -X POST "http://localhost:8080/api/content/understand" \
  -H "x-admin-token: dev-admin-token-12345" \
  -H "content-type: application/json" \
  -d '{"artefact":"Teach me complex numbers"}'

# Response includes:
{
  "generationId": "uuid",
  "understanding": "Core Topic: Complex Numbers...",
  "inputType": "topic",    ←  Auto-detected as research mode
  "status": "understanding",
  "cost": 0.0034,
  "tokens": 545
}

# After generation completes:
curl "http://localhost:8080/api/content/generations/uuid" \
  -H "x-admin-token: dev-admin-token-12345"

# Returns modules with citations:
{
  "status": "completed",
  "inputType": "topic",
  "modules": [...],      ←  4-6 learning modules
  "citations": [...],    ←  Validated sources
  "totalCost": 0.18,
  "totalTokens": 12500
}
```

## Known Considerations

### O3 Performance
The o3 reasoning model (used as fact-checker) provides excellent quality but can take 5+ minutes for complex topics due to its deep reasoning capabilities. For faster testing/demos:
- Consider using `gpt-4o` or `gemini-2.5-pro` as fact-checker
- Or accept longer wait times for maximum quality

### Citation Format Handling
The implementation handles multiple citation formats:
- String citations: `"Stewart Calculus, Chapter 3"`
- Object citations: `{title: "...", author: "...", type: "textbook"}`
- Both `citations` and `sources` field names
- This flexibility ensures compatibility with different LLM outputs

## Files Modified

1. `api/src/services/llm-orchestrator.ts` - Detection, prompts, routing
2. `api/src/db/schema.ts` - Citations table schema
3. `api/src/routes/content.ts` - API endpoints with citation handling
4. `api/drizzle/010_research_citations.sql` - Database migration
5. `docs/functional-spec.md` - Documentation (§27)
6. `api/scripts/test-research-mode.sh` - Test script

## Next Steps

To verify the implementation:
1. Ensure API is running with updated code
2. Run: `bash api/scripts/test-research-mode.sh`
3. Check that `inputType === 'topic'` is detected
4. Verify modules and citations are generated
5. Note: Allow 5-10 minutes for o3-based fact-checking to complete

## Success Criteria

✅ Input type auto-detection working  
✅ Research prompts implemented  
✅ Database schema updated and migrated  
✅ API routes returning `inputType` and `citations`  
✅ Documentation complete  
✅ Test script created  
⏳ Full end-to-end test (waiting for o3 to complete)

**Epic 6.5 implementation is code-complete and ready for integration.**

