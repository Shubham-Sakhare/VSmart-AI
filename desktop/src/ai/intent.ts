import type { Intent } from "./types";

export function detectIntent(text: string): Intent {

  const input = text.toLowerCase();

  // Memory — check first so "remember chrome password" doesn't get caught by system/browser rules.
  if (
    /\b(remember|yaad rakho|yaad rakh|note kar)\b/.test(input) ||
    /\b(recall|yaad hai|kya tha)\b/.test(input) ||
    /\b(what is my|what's my|whats my)\b/.test(input) ||
    input.includes("show memory") ||
    input.includes("what do you remember")
  ) {
    return "memory";
  }

  // Vision — "what's on my screen" style questions, checked before the
  // generic system rule so it doesn't get swallowed by the plain
  // screenshot-to-file action.
  if (
    /\b(what'?s on (my |the )?screen|whats on (my |the )?screen)\b/.test(input) ||
    /\b(look at (my |the )?screen|check (my |the )?screen)\b/.test(input) ||
    /\b(explain (my |the )?screen|screen explain karo)\b/.test(input) ||
    /\b(screen dekho|screen dekh|mera screen dekho|screen samjhao|screen batao|is screen (pe|par) kya hai)\b/.test(input)
  ) {
    return "vision";
  }

  // File — either a literal extension mentioned, or a natural-language
  // "find/search my <file-type>" style request.
  if (
    input.includes(".pdf") ||
    input.includes(".txt") ||
    input.includes(".doc") ||
    input.includes(".docx") ||
    input.includes(".png") ||
    input.includes(".jpg") ||
    /\b(find|search|locate|dhundo|dhundho|dhoondo|khojo|kahan hai|kaha hai|where is)\b.*\b(file|files|document|documents|pdf|resume|cv|invoice|photo|photos|image|images|picture|pictures|video|videos|excel|spreadsheet|presentation)\b/.test(input) ||
    /\b(file|files|document|documents|resume|invoice)\b.*\b(find|search|dhundo|dhundho|khojo|locate)\b/.test(input)
  ) {
    return "file";
  }

  // Automation — direct desktop control: mouse clicks and keyboard input.
  // Checked before "system" so "click"/"type"/"press" don't fall through
  // to the generic open/search handling.
  if (
    /\b(click|double\s+click|right\s+click)\s*(at\s*)?\d+[, ]+\d+/.test(input) ||
    /^(type|likho|likh do|likh)\s+.+/.test(input) ||
    /\b(press|dabao|dabaiye)\s+[a-z0-9+ ]+/.test(input)
  ) {
    return "automation";
  }

  // Coding — "code likho", "write a function", "program likho", OR a full
  // project request ("create a project for X", "find bugs", "run npm
  // install in the terminal") — must have an actual write/generate/project
  // verb, not just the word "vscode" (that's just opening the app).
  if (
    /\b(code|program|function|script)\b.*\b(likho|likh|likhna|write|banao|banaye)\b/.test(input) ||
    /\b(likho|likh|write|banao)\b.*\b(code|program|function|script)\b/.test(input) ||
    /\b(create|banao|bana do|start|build)\s+(a\s+|an\s+)?(new\s+)?(project|app|application|website|folder)\b/.test(input) ||
    /\b(find|check|fix)\s+(the\s+)?bugs?\b/.test(input) ||
    /\bbugs?\s+(dhundo|dhundho|khojo|find|check)\b/.test(input) ||
    /\b(debug|review the code|review code)\b/.test(input) ||
    (/\b(cmd|command|terminal)\b/.test(input) && /\b(run|chalao|chala do|execute)\b/.test(input))
  ) {
    return "coding";
  }

  // System / open app or website — trigger words can appear ANYWHERE in the sentence,
  // e.g. "chrome open karo", "khol do notepad", "open chrome".
  if (
    /\b(open|khol|kholo|khol do|shuru karo|start|chalao|chala do|lagao|laga do|play|search|bajao|baja do|gana|gaana|song)\b/.test(input) ||
    input.includes("settings") ||
    input.includes("calculator") ||
    input.includes("notepad") ||
    input.includes("task manager") ||
    input.includes("volume") ||
    input.includes("brightness") ||
    input.includes("chamak") ||
    input.includes("wifi") ||
    input.includes("wi-fi") ||
    input.includes("bluetooth") ||
    input.includes("screenshot") ||
    input.includes("screen shot") ||
    input.includes("recycle bin") ||
    input.includes("trash") ||
    input.includes("restart") ||
    input.includes("reboot") ||
    input.includes("shutdown") ||
    input.includes("shut down") ||
    input.includes("download") ||
    input.includes("document") ||
    input.includes("desktop") ||
    input.includes("picture") ||
    input.includes("folder")
  ) {
    return "system";
  }

  return "chat";
}