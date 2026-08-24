import { route, type RouteResult } from "./router";
import type { ReplyLang, ChatHistoryMessage } from "../llm/openrouter";

// Splits "do X, then do Y, phir Z" into separate steps. Each step still goes
// through the normal single-agent router (intent detection + the right
// agent), so this is real multi-agent chaining: a single message can now
// touch file search, desktop control, system, vision, etc. in one go.
const STEP_CONNECTORS = /\b(?:then|uske baad|phir|after that|and then)\b/i;

export async function orchestrate(
  message: string,
  lang: ReplyLang = "en",
  history: ChatHistoryMessage[] = []
): Promise<RouteResult> {

  if (!STEP_CONNECTORS.test(message)) {
    return route(message, lang, history);
  }

  const steps = message
    .split(STEP_CONNECTORS)
    .map(s => s.trim())
    .filter(Boolean);

  if (steps.length < 2) {
    return route(message, lang, history);
  }

  const results: string[] = [];
  let allSucceeded = true;

  for (const step of steps) {
    // Multi-step commands are treated as one turn split into pieces, not
    // separate conversational turns, so prior chat history isn't threaded
    // into each individual step here.
    const result = await route(step, lang);
    if (!result.success) allSucceeded = false;
    results.push(result.message ?? "");
  }

  const combined = results
    .map((msg, i) => `${i + 1}. ${msg}`)
    .join("\n\n");

  return {
    success: allSucceeded,
    action: "orchestrator.multiStep",
    message: combined
  };

}