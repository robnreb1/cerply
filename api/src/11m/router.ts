export type Task =
  | "generate.modules"
  | "generate.items"
  | "chat.clarify"
  | "rewrite.micro"
  | "score.answer";

export function pickModel(task: Task) {
  switch (task) {
    case "generate.modules":
    case "generate.items":
      return { name: "gpt-5", max_tokens: 4000, temperature: 0.7 };
    case "chat.clarify":
    case "rewrite.micro":
      return { name: "gpt-5-mini", max_tokens: 1200, temperature: 0.3 };
    case "score.answer":
      return { name: "gpt-5-nano", max_tokens: 400, temperature: 0.0 };
  }
}