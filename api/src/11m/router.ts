export type Task =
  | "generate.modules"
  | "generate.items"
  | "chat.clarify"
  | "rewrite.micro"
  | "score.answer";

export function pickModel(task: Task) {
  switch (task) {
    case "generate.modules":
      return { name: "gpt-5", max_tokens: 4000, temperature: 0.2 };
    case "generate.items":
      // Use thinking-capable model for lessons/quizzes
      return { name: "gpt-5-thinking", max_tokens: 6000, temperature: 0.4 } as any;
    case "chat.clarify":
    case "rewrite.micro":
      return { name: "gpt-5", max_tokens: 2000, temperature: 0.3 };
    case "score.answer":
      return { name: "gpt-5-nano", max_tokens: 400, temperature: 0.0 };
  }
}