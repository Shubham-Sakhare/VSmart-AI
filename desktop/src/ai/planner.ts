import type { Plan } from "./types";
import { detectIntent } from "./intent";

// Words that just mean "do this action" — strip them out to find the actual target.
const FILLER_WORDS = [
  "open", "khol", "kholo", "khol do", "shuru karo", "start",
  "please", "kripya", "karo", "kar do", "kar de", "do", "de"
];

export async function planner(text: string): Promise<Plan> {

  const intent = detectIntent(text);

  let command = text.trim();

  switch (intent) {
    case "system":
      command = extractTarget(text);
      break;

    case "memory":
      command = extractMemoryCommand(text);
      break;

    case "file":
      command = extractTarget(text);
      break;

    case "coding":
      // Keep the full sentence for coding — the LLM needs the whole context
      // to generate the right code, not just the trigger words stripped out.
      command = text.trim();
      break;

    default:
      command = text;
  }

  return { intent, command };
}

/** Strips filler/trigger words from anywhere in the sentence, leaving the target (app/site name). */
function extractTarget(text: string): string {
  let result = text.toLowerCase();

  for (const word of FILLER_WORDS) {
    result = result.replace(new RegExp(`\\b${word}\\b`, "gi"), " ");
  }

  return result.replace(/\s+/g, " ").trim();
}

function extractMemoryCommand(text: string) {
  return text.trim();
}