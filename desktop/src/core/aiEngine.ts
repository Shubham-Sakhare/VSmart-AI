import { route, type RouteResult } from "../ai/router";
import type { ReplyLang } from "../llm/openrouter";

export async function askVSmart(
  input: string,
  lang: ReplyLang = "en"
): Promise<RouteResult> {

  return await route(input, lang);

}