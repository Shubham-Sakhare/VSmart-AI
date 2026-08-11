import { orchestrate } from "../ai/orchestrator";
import type { RouteResult } from "../ai/router";
import type { ReplyLang } from "../llm/openrouter";

export async function askVSmart(
  input: string,
  lang: ReplyLang = "en"
): Promise<RouteResult> {

  return await orchestrate(input, lang);

}