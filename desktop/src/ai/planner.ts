import type { Plan } from "./types";
import { detectIntent } from "./intent";

export async function planner(
  text: string
): Promise<Plan> {

  const intent = detectIntent(text);

  let command = text.trim();

  switch (intent) {

    case "browser":
      command = extractBrowserCommand(text);
      break;

    case "system":
      command = extractSystemCommand(text);
      break;

    case "memory":
      command = extractMemoryCommand(text);
      break;

    case "file":
      command = extractFileCommand(text);
      break;

    default:
      command = text;
  }

  return {
    intent,
    command
  };
}

function extractBrowserCommand(text: string) {

  return text
    .replace(/open/i, "")
    .replace(/search/i, "")
    .trim();

}

function extractSystemCommand(text: string) {

  return text
    .replace(/open/i, "")
    .trim();

}

function extractMemoryCommand(text: string) {

  return text.trim();

}

function extractFileCommand(text: string) {

  return text
    .replace(/open/i, "")
    .trim();

}