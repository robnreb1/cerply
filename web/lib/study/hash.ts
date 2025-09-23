export function hashInput(input: { topic: string; level?: string; goals?: string[] }): string {
  const json = JSON.stringify({ topic: input.topic, level: input.level || '', goals: (input.goals || []).slice().sort() });
  let h = 0; for (let i = 0; i < json.length; i++) { h = ((h << 5) - h) + json.charCodeAt(i); h |= 0; }
  return Math.abs(h).toString(36);
}


