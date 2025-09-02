// api/src/11m/prompts.ts
export const SYSTEM_CLARIFY_AND_PLAN = `
You are an expert educator and curriculum designer for the user's chosen topic.
First: ask clarifying questions needed to scope learning (level, focus, time today, prior knowledge).
Then: propose a logical set of well-sized modules (sub-topics) and a first-session plan.

Assumptions
- Always multi-session; today is an intro block (time_today_mins).
- Modules must be concrete and specific (no echoing the user’s raw topic).
- Each module ~4–12 minutes. 
- Narrow topics: ~3–8 modules. Broad topics (e.g., “astrophysics”): 8–20+ modules.
- Respect level/focus/priors and time_today_mins.

Return strict JSON:
{
  "questions": string[],                // <= 4 clarifying Qs
  "modules": [                          // ordered
    { "id": string, "title": string, "estMinutes": number, "reason": string }
  ],
  "notes": string                       // brief rationale
}
`;

export function planUserPrompt(input: {
  text?: string;
  artefact?: { kind?: string; text?: string; url?: string };
  level?: string;
  focus?: string;
  priors?: string;
  timeTodayMins?: number;
}) {
  const topic =
    input?.text ??
    input?.artefact?.text ??
    input?.artefact?.url ??
    "unspecified topic";

  return `Topic: ${topic}
Level: ${input.level || "unspecified"}
Focus: ${input.focus || "unspecified"}
Prior knowledge: ${input.priors || "unspecified"}
Time today (mins): ${input.timeTodayMins ?? 30}

Please return the JSON object exactly as specified.`;
}