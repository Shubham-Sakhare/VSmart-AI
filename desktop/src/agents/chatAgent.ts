import { askAI } from "../llm/provider";
import type { ReplyLang } from "../llm/openrouter";

export async function chatAgent(
  prompt: string,
  lang: ReplyLang = "en"
): Promise<string> {
  return await askAI(prompt, lang);
}