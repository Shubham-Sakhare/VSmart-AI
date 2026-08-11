import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const PROJECTS_ROOT = path.join(os.homedir(), "Documents", "VSmart-Projects");

export interface ProjectFile {
  path: string; // relative path within the project, e.g. "src/app.js"
  content: string;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

function sanitizeRelativePath(p: string): string {
  // Strip any ".." segments so a file can never be written outside the
  // project folder.
  return p
    .replace(/\\/g, "/")
    .split("/")
    .filter(seg => seg && seg !== "..")
    .join("/");
}

function sanitizeFolderName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, "").trim();
  return cleaned || `project-${Date.now()}`;
}

// A short blocklist for genuinely catastrophic commands - everything else
// is allowed to run, since this is the user's own machine and they're
// explicitly asking their coding agent to run project commands (npm
// install, build scripts, tests, etc.) just like Claude Code / Cursor do.
const DANGEROUS_COMMAND_PATTERNS = [
  /\bformat\s+[a-z]:/i,
  /\brd\s+\/s\s+\/q\s+[a-z]:\\?\s*$/i,
  /\brm\s+-rf\s+\/(\s|$)/i,
  /:\(\)\{.*:\|:.*\};:/, // fork bomb
  /\bdel\s+\/s\s+\/q\s+[a-z]:\\windows/i,
];

export function isDangerousCommand(command: string): boolean {
  return DANGEROUS_COMMAND_PATTERNS.some(p => p.test(command));
}

export function createProject(folderName: string, files: ProjectFile[]): string {
  const safeFolder = sanitizeFolderName(folderName);
  const projectPath = path.join(PROJECTS_ROOT, safeFolder);

  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true });
  }

  for (const file of files) {
    const relPath = sanitizeRelativePath(file.path);
    if (!relPath) continue;

    const fullPath = path.join(projectPath, relPath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, file.content, "utf-8");
  }

  return projectPath;
}

// Writes/overwrites files into an EXISTING project folder (used for adding
// more files later, or writing bug-fixed versions back).
export function writeProjectFiles(projectPath: string, files: ProjectFile[]): void {
  for (const file of files) {
    const relPath = sanitizeRelativePath(file.path);
    if (!relPath) continue;

    const fullPath = path.join(projectPath, relPath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, file.content, "utf-8");
  }
}

export function openProjectInVSCode(projectPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    exec(`code -r "${projectPath}"`, (error) => {
      if (error) {
        exec(`start "" "${projectPath}"`, () => resolve(false));
      } else {
        resolve(true);
      }
    });
  });
}

export function readProjectFile(projectPath: string, relativePath: string): string | null {
  try {
    const relPath = sanitizeRelativePath(relativePath);
    const fullPath = path.join(projectPath, relPath);
    if (!fullPath.startsWith(projectPath)) return null;
    return fs.readFileSync(fullPath, "utf-8");
  } catch {
    return null;
  }
}

export function listProjectFiles(projectPath: string): string[] {
  const results: string[] = [];

  function walk(dir: string, prefix = "") {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;

      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), relPath);
      } else {
        results.push(relPath);
      }
    }
  }

  walk(projectPath);
  return results;
}

export function runTerminalCommand(
  cwd: string,
  command: string,
  timeoutMs = 90000
): Promise<CommandResult> {
  return new Promise((resolve) => {
    exec(
      command,
      { cwd, timeout: timeoutMs, maxBuffer: 1024 * 1024 * 10 },
      (error, stdout, stderr) => {
        resolve({
          stdout: stdout?.toString() ?? "",
          stderr: stderr?.toString() ?? "",
          exitCode: error ? (typeof (error as any).code === "number" ? (error as any).code : 1) : 0
        });
      }
    );
  });
}