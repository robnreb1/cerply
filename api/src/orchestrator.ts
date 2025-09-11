// Orchestrator helpers (pure, unit-testable)

export type Msg = { id?: string; role: 'user' | 'assistant' | 'tool'; content: string; meta?: any };
export type LearnerProfile = { userId: string; prefs?: Record<string, any> };

export type OrchestratorDecision =
  | { action: 'generate' }
  | { action: 'revise'; title: string }
  | { action: 'plan' }
  | { action: 'clarify' };

// --- helpers: extract & sanitise "append module" titles -----------------

/**
 * Make a short, sentence-cased title suitable for "Focus: …"
 * - strips leading list numbers like "1) ", "3: ", "2. "
 * - removes polite suffixes like "please", "pls", "thanks"
 * - trims punctuation/whitespace
 * - sentence-cases: "grammar review" -> "Grammar review"
 */
function sanitizeAppendTitle(raw: string): string {
  let t = String(raw ?? '').trim();

  // Strip common section labels with numbers like "Module 3: ", "Lesson 2 - ", "Part 1) ", "Section 4."
  t = t.replace(/^\s*(?:module|lesson|part|section)\s*\d+\s*[\)\].:–\-]*\s*/i, '');

  // Strip leading enumeration like "1) ", "3: ", "2. ", "(4) ", "No. 3: "
  t = t.replace(/^\s*(?:no\.?\s*)?[\(\[]?\d+[\)\].:–\-]*\s*/i, '');

  // Remove polite filler words anywhere
  t = t.replace(/\b(?:please|pls|plz|thanks|thank\s+you)\b/gi, ' ');

  // Trim outer punctuation & trailing sentence punctuation
  t = t.replace(/^[\s\-–:.,;]+/, '').replace(/[.?!\s]+$/, '');

  // Collapse inner whitespace
  t = t.replace(/\s{2,}/g, ' ').trim();

  // Sentence case (first char upper, rest lower)
  if (t.length > 0) t = t[0].toUpperCase() + t.slice(1).toLowerCase();

  return t;
}

/**
 * Extracts a short "append" title from free text like:
 *  - "add speaking practice"
 *  - "include vocabulary drills please"
 *  - "append 3: grammar review."
 * Returns "Focus: Speaking practice" / "Focus: Vocabulary drills" / "Focus: Grammar review"
 * or null when nothing matched.
 */
export function extractAppendModuleTitle(input: string): string | null {
  const s = String(input ?? '').trim();

  // Try to capture the phrase after common verbs
  const m =
    s.match(/\b(?:add|include|append|insert|plus|also add|focus(?:\s+on)?)\s+(.+)$/i) ||
    s.match(/\b(?:add|include|append|insert)\s+a\s+module(?:\s+about| on)?\s+(.+)$/i);

  if (!m) return null;

  const candidate = sanitizeAppendTitle(m[1]);
  if (!candidate) return null;

  return `Focus: ${candidate}`;
}

/** Detects a natural-language "confirm/generate" intent.
 * Guards against negatives like "not"/"don't" and revision verbs like "add/append/include".
 */
function isConfirmIntent(text: string): boolean {
  const s = (text || '').toLowerCase().trim();
  if (!s) return false;

  // Hard guards — if the user is asking to change things, don't treat as confirm.
  if (/(?:\bnot\b|\bdon'?t\b|\bdo not\b|\bhold on\b|\bwait\b|\bstop\b|\bchange\b|\brevise\b|\badd\b|\bappend\b|\binclude\b)/i.test(s)) {
    return false;
  }

  // Any of these patterns imply "go ahead / generate"
  const patterns: RegExp[] = [
    /^(confirm|confirmed|finali[sz]e|lock (it )?in)\b/,
    /\b(looks|sounds)\s+good\b/,
    /\b(ok(ay)?|alright|sure|y(es|ep|up))\b/,
    /\b(go ahead|do it|go for it|ship it|proceed|continue)\b/,
    /\b(let'?s|lets)\s*(go|start|begin|do|roll|build|make)\b/,
    /\b(start|begin|generate|create|build|make)\b/,
    /\b(that works|works for me|i agree|agreed|approved)\b/,
  ];

  return patterns.some((p) => p.test(s));
}

/** Heuristic decision for next action, based on the latest user message */
export function decideNextAction(messages: Msg[], hasPlan: boolean): OrchestratorDecision {
  const lastUser = [...messages].reverse().find(m => m.role === 'user');
  const text = (lastUser?.content || '').trim();
  const lower = text.toLowerCase();
  if (!text) return { action: 'clarify' };

  // generate/confirm intent (broader natural-language matcher)
  if (hasPlan && isConfirmIntent(text)) {
    return { action: 'generate' };
  }

  // natural revision to append
  const appended = extractAppendModuleTitle(text);
  if (hasPlan && appended) {
    return { action: 'revise', title: appended };
  }

  // plan if no plan yet
  if (!hasPlan) return { action: 'plan' };

  // otherwise seek a brief clarification
  return { action: 'clarify' };
}


