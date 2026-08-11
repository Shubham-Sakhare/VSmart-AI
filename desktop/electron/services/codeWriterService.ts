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

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "").trim();
}

export async function writeAndOpenCode(
  rawCode: string,
  language?: string,
  requestedFilename?: string
): Promise<string> {

  const code = stripMarkdownFences(rawCode);

  const folder = path.join(os.homedir(), "Documents", "VSmart-Code");
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  let filename: string;

  if (requestedFilename && requestedFilename.trim()) {
    const cleaned = sanitizeFilename(requestedFilename);
    // If the user's requested name already has an extension (e.g.
    // "index.html"), keep it exactly - that's the whole point of them
    // naming it. Otherwise fall back to guessing from the language.
    filename = /\.[a-zA-Z0-9]+$/.test(cleaned)
      ? cleaned
      : `${cleaned}.${guessExtension(language)}`;
  } else {
    filename = `vsmart-code-${Date.now()}.${guessExtension(language)}`;
  }

  const filePath = path.join(folder, filename);

  fs.writeFileSync(filePath, code, "utf-8");

  return new Promise((resolve) => {
    // -r reuses the already-open VS Code window instead of spawning a new
    // untracked one, so the file actually shows up where the user is
    // looking.
    exec(`code -r "${filePath}"`, (error) => {
      if (error) {
        // VS Code CLI ("code" command) not in PATH — fall back to opening the file normally.
        exec(`start "" "${filePath}"`, () => {
          resolve(
            `I saved the code to ${filePath}, but couldn't open it directly in VS Code — ` +
            `make sure VS Code's "code" command is added to your PATH.`
          );
        });
      } else {
        resolve(`Created ${filename} and opened it in VS Code (${filePath}).`);
      }
    });
  });
}