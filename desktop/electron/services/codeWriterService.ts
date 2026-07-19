import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const EXTENSION_MAP: Record<string, string> = {
  python: "py",
  py: "py",
  javascript: "js",
  js: "js",
  typescript: "ts",
  ts: "ts",
  react: "jsx",
  jsx: "jsx",
  tsx: "tsx",
  html: "html",
  css: "css",
  java: "java",
  "c++": "cpp",
  cpp: "cpp",
  c: "c",
  json: "json",
  sql: "sql",
  bash: "sh",
  shell: "sh"
};

function guessExtension(language?: string): string {
  if (!language) return "txt";
  const key = language.toLowerCase().trim();
  return EXTENSION_MAP[key] ?? "txt";
}

/** Strips markdown code fences (```lang ... ```) if the model wrapped the code in them. */
function stripMarkdownFences(code: string): string {
  const fenceMatch = code.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
  return fenceMatch ? fenceMatch[1].trim() : code.trim();
}

export async function writeAndOpenCode(
  rawCode: string,
  language?: string
): Promise<string> {

  const code = stripMarkdownFences(rawCode);
  const ext = guessExtension(language);

  const folder = path.join(os.homedir(), "Documents", "VSmart-Code");
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  const filename = `vsmart-code-${Date.now()}.${ext}`;
  const filePath = path.join(folder, filename);

  fs.writeFileSync(filePath, code, "utf-8");

  return new Promise((resolve) => {
    exec(`code "${filePath}"`, (error) => {
      if (error) {
        // VS Code CLI ("code" command) not in PATH — fall back to opening the file normally.
        exec(`start "" "${filePath}"`, () => {
          resolve(
            `I saved the code to ${filename}, but couldn't open it directly in VS Code — ` +
            `make sure VS Code's "code" command is added to your PATH.`
          );
        });
      } else {
        resolve(`Code written and opened in VS Code.`);
      }
    });
  });
}