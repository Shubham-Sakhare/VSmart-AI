import { askAI } from "../llm/provider";

export async function chatAgent(
  prompt: string
): Promise<string> {
  return await askAI(prompt);
}