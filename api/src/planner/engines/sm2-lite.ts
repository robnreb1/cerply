export type Sm2State = {
  reps: number;      // number of successful repetitions in a row
  ef: number;        // easiness factor (bounded 1.3..3.0)
  intervalDays: number; // current interval in days
  lastGrade?: number;
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function sm2Update(prev: Sm2State, grade: number): Sm2State {
  const q = clamp(Math.round(grade), 0, 5);
  // EF update (SM-2 formula) applied for all grades
  const efDelta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
  const efNext = clamp((prev.ef || 2.5) + efDelta, 1.3, 3.0);

  if (q < 3) {
    // Failure resets repetitions/interval but keeps EF updated (tends to drop sufficiently)
    return { reps: 0, intervalDays: 0, ef: efNext, lastGrade: q };
  }

  const reps = (prev.reps || 0) + 1;
  let intervalDays = 0;
  if (reps === 1) intervalDays = 1;
  else if (reps === 2) intervalDays = 6;
  else intervalDays = Math.round((prev.intervalDays || 6) * efNext);

  return { reps, ef: efNext, intervalDays, lastGrade: q };
}

export function nextDue(fromISO: string, intervalDays: number): string {
  const from = new Date(fromISO);
  const next = new Date(from.getTime() + intervalDays * 24 * 3600 * 1000);
  return next.toISOString();
}


