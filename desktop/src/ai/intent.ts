import type { Intent } from "./types";

export function detectIntent(
  text: string
): Intent {

  const input = text.toLowerCase();

  // Browser
  if (
    input.includes("youtube") ||
    input.includes("google") ||
    input.includes("gmail") ||
    input.includes("github") ||
    input.startsWith("search") ||
    input.startsWith("browse")
  ) {
    return "browser";
  }

  // System
  if (
    input.startsWith("open") ||
    input.includes("settings") ||
    input.includes("calculator") ||
    input.includes("notepad") ||
    input.includes("task manager")
  ) {
    return "system";
  }

  // Memory
  if (
    input.startsWith("remember") ||
    input.startsWith("recall") ||
    input.startsWith("show memory")
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

  // Coding
  if (
    input.includes("code") ||
    input.includes("react") ||
    input.includes("typescript") ||
    input.includes("javascript")
  ) {
    return "coding";
  }

  return "chat";

}