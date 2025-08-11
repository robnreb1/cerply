
export function computeECS(totalObligations: number, evidenced: number): number {
  if (totalObligations <= 0) return 0;
  const pct = (evidenced / totalObligations) * 100;
  return Math.round(pct * 10) / 10; // one decimal
}
