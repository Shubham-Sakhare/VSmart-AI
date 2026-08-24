import { orchestrate } from "../ai/orchestrator";
import type { RouteResult } from "../ai/router";
import type { ReplyLang, ChatHistoryMessage } from "../llm/openrouter";

export async function askVSmart(
  input: string,
  lang: ReplyLang = "en",
  history: ChatHistoryMessage[] = []
): Promise<RouteResult> {

  return await orchestrate(input, lang, history);

}