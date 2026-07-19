import type { Intent } from "./types";

export function detectIntent(text: string): Intent {

  const input = text.toLowerCase();

  // Memory — check first so "remember chrome password" doesn't get caught by system/browser rules.
  if (
    /\b(remember|yaad rakho|yaad rakh|note kar)\b/.test(input) ||
    /\b(recall|yaad hai|kya tha)\b/.test(input) ||
    input.includes("show memory")
  ) {
    return "memory";
  }

  // File
  if (
    input.includes(".pdf") ||
    input.includes(".txt") ||
    input.includes(".doc") ||
    input.includes(".docx") ||
    input.includes(".png") ||
    input.includes(".jpg")
  ) {
    return "file";
  }

  // Coding — "code likho", "write a function", "program likho" — must have an
  // actual write/generate verb, not just the word "vscode" (that's just opening the app).
  if (
    /\b(code|program|function|script)\b.*\b(likho|likh|likhna|write|banao|banaye)\b/.test(input) ||
    /\b(likho|likh|write|banao)\b.*\b(code|program|function|script)\b/.test(input)
  ) {
    return "coding";
  }

  // System / open app or website — trigger words can appear ANYWHERE in the sentence,
  // e.g. "chrome open karo", "khol do notepad", "open chrome".
  if (
    /\b(open|khol|kholo|khol do|shuru karo|start|chalao|chala do|lagao|laga do|play|search)\b/.test(input) ||
    input.includes("settings") ||
    input.includes("calculator") ||
    input.includes("notepad") ||
    input.includes("task manager")
  ) {
    return "system";
  }

  return "chat";
}