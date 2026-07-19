import { askQwenCoder } from "../llm/openrouter";

function detectLanguage(prompt: string): string {
  const p = prompt.toLowerCase();

  if (p.includes("python")) return "python";
  if (p.includes("typescript")) return "typescript";
  if (p.includes("react") || p.includes("jsx") || p.includes("component")) return "react";
  if (p.includes("javascript") || p.includes("js ")) return "javascript";
  if (p.includes("html")) return "html";
  if (p.includes("css")) return "css";
  if (p.includes("java") && !p.includes("javascript")) return "java";
  if (p.includes("c++")) return "c++";
  if (p.includes("sql")) return "sql";

  return "python";
}

export async function codingAgent(prompt: string): Promise<string> {
  try {
    const language = detectLanguage(prompt);
    const code = await askQwenCoder(
      "Write only the code for this request, no explanation: " + prompt
    );

    const result = await window.vsmart.writeCode(code, language);
    return result;
  } catch (err) {
    console.error("Coding agent error:", err);
    return "I ran into a problem generating that code.";
  }
}
