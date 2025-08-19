// web/api/prompts/prompt-library.ts
// Cerply Prompt Library (runtime strings for agents)

export type TaskId =
  | "GLOBAL_SYSTEM"
  | "CHUNK_CONTENT"
  | "DECOMPOSE_POLICY"
  | "GENERATE_MCQ"
  | "IMPROVE_DISTRACTORS"
  | "EXPLAIN_ANSWER"
  | "COMPUTE_QUALITY"
  | "RESOLVE_CHALLENGE"
  | "NEXT_STEPS_HINTS"
  | "CERTIFIED_DIFF_SUMMARY"
  | "SUPPORTING_SNIPPETS"
  | "TRANSCRIPT_OBJECTIVES"
  | "PACK_SUMMARY"
  | "BENCHMARKS_SUMMARY"
  | "COST_ROUTE_ADVICE";

export const PROMPTS: Record<TaskId, string> = {
  GLOBAL_SYSTEM: String.raw`SYSTEM
You are Cerply’s content and compliance assistant. Your outputs must be:
- SOURCE-GROUNDED: only use the provided text chunks or URLs; never fabricate facts.
- STRUCTURED: respond EXACTLY in the JSON schema I provide—no prose outside JSON.
- SAFE: do not include chain-of-thought. Provide only final results, short rationales, and citations.
- DILIGENT: when evidence is insufficient, return {"status":"insufficient_evidence"} with reasons.
- ACCESSIBILITY: use plain, concise UK/US-neutral English.

General rules:
- Prefer direct quotes for citations with character offsets when available.
- Never include PII beyond what was supplied in the source.
- Do not speculate. Do not output placeholders like “TBD”.
- Keep reading level ~Year 8–10 unless a higher level is requested for regulators.

Output wrapper (apply to all tasks when requested):
{
  "status": "ok" | "insufficient_evidence" | "error",
  "result": <task-specific-payload-or-null>,
  "citations": [{"sourceId": string, "excerpt": string, "start": number, "end": number}] | [],
  "notes": string | null
}`,

  CHUNK_CONTENT: String.raw`USER
Task: CHUNK_CONTENT
Inputs:
- kind: "url" | "text" | "transcript"
- sourceId: string
- text: string (full extracted text; for transcripts include timestamps if present)
Constraints:
- Aim for 350–700 chars per chunk.
- Respect sentence boundaries; don’t split mid-sentence.
- Drop boilerplate/nav. Keep policy clauses, definitions, obligations.
- For transcript, keep speaker labels and timestamps if present.

Schema:
{
  "status": "ok" | "insufficient_evidence" | "error",
  "result": {
    "chunks": [
      {"id": string, "title": string, "text": string}
    ]
  },
  "citations": [],
  "notes": string | null
}

Return only valid JSON.`,

  DECOMPOSE_POLICY: String.raw`USER
Task: DECOMPOSE_POLICY
Inputs:
- scopeId: string
- chunks: [{id, text}]
Output constraints:
- Objectives: concise, testable statements (max 140 chars).
- ECS: evidence users can capture or observe (attestation, log, report).
- Link each ECS to supporting chunk IDs.

Schema:
{
  "status": "ok" | "insufficient_evidence" | "error",
  "result": {
    "objectives": [
      {"id": string, "code": string, "title": string, "rationale": string}
    ],
    "ecs": [
      {"id": string, "objectiveId": string, "kind": "attestation|log|report|config|sample",
       "description": string, "supports": string[]}
    ]
  },
  "citations": [{"sourceId": string, "excerpt": string, "start": number, "end": number}],
  "notes": string | null
}`,

  GENERATE_MCQ: String.raw`USER
Task: GENERATE_MCQ
Inputs:
- objective: {id, title}
- supportingChunks: [{id, text}]
Rules:
- One correct answer; three distractors that are realistic, not silly.
- No “All of the above/None” patterns.
- Keep stem ≤ 180 chars; answers ≤ 90 chars.
- Add a 20–60 word explainer grounded in the source.

Schema:
{
  "status": "ok" | "insufficient_evidence" | "error",
  "result": {
    "items": [
      {
        "id": string,
        "stem": string,
        "options": [string, string, string, string],
        "correctIndex": 0|1|2|3,
        "explainer": string,
        "meta": {
          "sourceObjectiveId": string,
          "sourceChunkIds": string[]
        }
      }
    ]
  },
  "citations": [{"sourceId": string, "excerpt": string, "start": number, "end": number}],
  "notes": string | null
}`,

  IMPROVE_DISTRACTORS: String.raw`USER
Task: IMPROVE_DISTRACTORS
Inputs:
- item: {stem, options[4], correctIndex, meta:{sourceChunkIds}}
- chunks: [{id,text}]
Rules:
- Keep correct option text unchanged.
- Make distractors specific, common-mistake shaped, not contradictory to sources.

Schema:
{
  "status":"ok",
  "result":{"options":[string,string,string,string]},
  "citations":[],
  "notes":null
}`,

  EXPLAIN_ANSWER: String.raw`USER
Task: EXPLAIN_ANSWER
Inputs:
- stem, options, correctIndex
- supportingChunks
Rules:
- 20–60 words.
- If helpful, cite clause/line.

Schema:
{
  "status":"ok",
  "result":{"explainer": string},
  "citations":[{"sourceId": string, "excerpt": string, "start": number, "end": number}],
  "notes": null
}`,

  COMPUTE_QUALITY: String.raw`USER
Task: COMPUTE_QUALITY
Inputs:
- item: {stem, options[4], explainer}
Rules:
- Banned patterns: double negatives; absolutes (“always/never/all/none”) unless quoted from source; ambiguous stems (“Which of these is true?”).
- Penalise >180 char stems or >90 char answers.
- Score bands: <60 prune, 60–79 review, ≥80 ship.

Schema:
{
  "status":"ok",
  "result":{
    "readability":{"fkGrade": number, "notes": string},
    "bannedFlags": string[],
    "conflicts": string[],
    "qualityScore": number
  },
  "citations":[],
  "notes":null
}`,

  RESOLVE_CHALLENGE: String.raw`USER
Task: RESOLVE_CHALLENGE
Inputs:
- item: {stem, options, correctIndex, explainer, meta:{sourceChunkIds}}
- learnerComment: string
- chunks: [{id,text}]
Rules:
- Decide: "uphold" | "revise". If "revise", supply a corrected item (only minimal changes).
- Include brief rationale and citations.

Schema:
{
  "status":"ok",
  "result":{
    "decision":"uphold"|"revise",
    "rationale": string,
    "revisedItem": null | {stem?:string, options?:[string,string,string,string], correctIndex?:0|1|2|3, explainer?:string}
  },
  "citations":[{"sourceId": string, "excerpt": string, "start": number, "end": number}],
  "notes":null
}`,

  NEXT_STEPS_HINTS: String.raw`USER
Task: NEXT_STEPS_HINTS
Inputs:
- history: [{itemId, correct:boolean, ts}]
- objectiveWeakness: [{objectiveId, mastery:0..1}]
Rules:
- Prefer low mastery & recent recency. Avoid repeats within 24h unless mastery <0.4.
Schema:
{
  "status":"ok",
  "result":{"nextObjectiveIds": string[], "notes": string},
  "citations":[],
  "notes":null
}`,

  CERTIFIED_DIFF_SUMMARY: String.raw`USER
Task: CERTIFIED_DIFF_SUMMARY
Inputs:
- oldText: string
- newText: string
Rules:
- Tag changes as "material" | "minor" | "editorial".
- Extract actions required for learners/orgs.

Schema:{
  "status":"ok",
  "result":{
    "changeLog":[{"type":"material|minor|editorial","summary":string}],
    "learnerActions": string[],
    "orgActions": string[]
  },
  "citations":[],
  "notes":null
}`,

  SUPPORTING_SNIPPETS: String.raw`USER
Task: SUPPORTING_SNIPPETS
Inputs:
- objectiveTitle: string
- chunks: [{id,text}]
Rules:
- 120 chars max per quote; include chunkId and offsets.

Schema:{
  "status":"ok",
  "result":{"snippets":[{"chunkId":string,"excerpt":string,"start":number,"end":number}]},
  "citations":[],
  "notes":null
}`,

  TRANSCRIPT_OBJECTIVES: String.raw`USER
Task: TRANSCRIPT_OBJECTIVES
Inputs:
- transcriptChunks: [{id,text}]
Rules:
- Extract 5–12 key takeaways as objectives; avoid fluff and anecdotes unless instructive.

Schema:{
  "status":"ok",
  "result":{"objectives":[{"id":string,"title":string,"rationale":string,"sourceChunks":string[]}]},
  "citations":[],
  "notes":null
}`,

  PACK_SUMMARY: String.raw`USER
Task: PACK_SUMMARY
Inputs:
- packTitle: string
- chunks: [{id,text}]
Rules:
- Avoid hype. Be precise. No promises beyond content.

Schema:{
  "status":"ok",
  "result":{"summary":string,"bullets":[string,string,string]},
  "citations":[],
  "notes":null
}`,

  BENCHMARKS_SUMMARY: String.raw`USER
Task: BENCHMARKS_SUMMARY
Inputs:
- allowed: boolean
- aggregates: {sector:string, metrics:[{"name":string,"median":number,"n":number}]}
Rules:
- If allowed=false, return {"status":"insufficient_evidence"}.
Schema:{
  "status":"ok"|"insufficient_evidence",
  "result":{"insights":[string]} | null,
  "citations":[],
  "notes":null
}`,

  COST_ROUTE_ADVICE: String.raw`USER
Task: COST_ROUTE_ADVICE
Inputs:
- draftItemsCount: number
- contentStyle: "regulatory|narrative|procedural|mixed"
Rules:
- Recommend "low|std|certified" mode with a short reason.

Schema:{
  "status":"ok",
  "result":{"recommendedBudget":"low|std|certified","reason":string},
  "citations":[],
  "notes":null
}`,
};

export function buildPrompt(task: Exclude<TaskId, "GLOBAL_SYSTEM">): string {
  return `${PROMPTS.GLOBAL_SYSTEM}\n\n${PROMPTS[task]}`;
}