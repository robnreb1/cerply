import type { CheckerEngine, ProposerResult, CheckerDecision } from '../interfaces.multiphase';
import type { PlannerInput } from '../interfaces';

function overlap(a: string, b: string): number {
  const A = a.toLowerCase();
  const B = b.toLowerCase();
  if (!A || !B) return 0;
  const terms = new Set(
    A.replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 3)
  );
  let score = 0;
  for (const t of terms) {
    if (B.includes(t)) score += 1;
  }
  return score;
}

export const CheckerV0: CheckerEngine = {
  name: 'checker-v0',
  async check(input: PlannerInput, proposals: ProposerResult[]): Promise<CheckerDecision> {
    const safe: ProposerResult[] = Array.isArray(proposals) ? proposals.filter(p => p && p.planDraft && Array.isArray(p.planDraft.items) && p.planDraft.items.length > 0) : [];
    if (safe.length === 0) {
      return {
        finalPlan: { title: `Plan: ${input.topic}`, items: [] },
        decisionNotes: 'no_valid_proposals',
        usedCitations: []
      };
    }

    // Score proposals: citations count (weighted), semantic overlap between drafts' titles and item fronts, and rationale length
    const baseTitle = `Plan: ${input.topic}`.toLowerCase();
    const scores = safe.map((p) => {
      const c = Array.isArray(p.citations) ? p.citations.length : 0;
      const titleScore = overlap(baseTitle, p.planDraft.title);
      const itemsText = p.planDraft.items.map((it) => it.front).join(' \n ');
      const itemScore = overlap(input.topic, itemsText);
      const rationaleScore = Math.min(5, Math.floor((p.rationale || '').length / 80));
      const total = c * 2 + titleScore + itemScore + rationaleScore;
      return { p, total };
    });

    scores.sort((a, b) => b.total - a.total);
    const best = scores[0]!.p;
    const citationsUsed = best.citations;

    return {
      finalPlan: best.planDraft,
      decisionNotes: `selected:${best.engine};scores:${scores.map(s => `${s.p.engine}:${s.total}`).join(',')}`,
      usedCitations: citationsUsed
    };
  }
};


