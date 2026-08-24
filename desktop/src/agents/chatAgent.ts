import { askAI } from "../llm/provider";
import type { ReplyLang, ChatHistoryMessage } from "../llm/openrouter";

export async function chatAgent(
  prompt: string,
  lang: ReplyLang = "en",
  history: ChatHistoryMessage[] = []
): Promise<string> {

  // Pull in any relevant long-term facts about the user (vector/TF-IDF
  // search over saved facts) so the AI can reference them naturally,
  // without the user needing to say "recall X" explicitly.
  let context = "";

  try {
    const matches = await window.vsmart.longMemory.searchFacts(prompt, 3);

    if (matches.length > 0) {
      const facts = matches.map(m => `- ${m.key}: ${m.value}`).join("\n");
      context = `Known facts about the user (use only if relevant, don't force them in):\n${facts}\n\n`;
    }
  } catch {
    // Memory search is best-effort — if it fails, just chat normally.
  }

  return await askAI(context + prompt, lang, history);
}