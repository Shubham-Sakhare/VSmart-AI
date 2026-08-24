import { askQwenCoder, askQwenCoderProject, askQwenCoderReview } from "../llm/openrouter";
import type { ChatHistoryMessage } from "../llm/openrouter";

interface ProjectFile {
  path: string;
  content: string;
}

interface ProjectPlan {
  projectFolder: string;
  files: ProjectFile[];
  commands?: string[];
}

interface ReviewPlan {
  summary: string;
  fixedFiles: ProjectFile[];
}

// Tracks the most recently created/opened project so follow-ups like
// "find bugs" or "run npm install" know which folder to act on without
// the user having to repeat the path every time.
let lastProjectPath: string | null = null;

// Turns the last few chat turns into a short plain-text context block, so
// follow-ups like "add sum functionality" or "now do multiplication" know
// what language/file was just being discussed — without needing to change
// the structured JSON contract the project-planning prompt relies on.
function historyToContext(history: ChatHistoryMessage[]): string {
  if (history.length === 0) return "";
  const recent = history.slice(-6);
  const lines = recent.map(
    h => `${h.role === "user" ? "User" : "Assistant"}: ${h.content.slice(0, 400)}`
  );
  return `Recent conversation context (use this to understand follow-up requests like "add X to it" or "now do Y"):\n${lines.join("\n")}\n\n`;
}

function stripFences(raw: string): string {
  const fenced = raw.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
  return (fenced ? fenced[1] : raw).trim();
}

function safeParseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(stripFences(raw)) as T;
  } catch {
    // Model sometimes adds a stray sentence before/after the JSON - try to
    // salvage just the {...} block.
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

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

function extractFilename(prompt: string): string | undefined {
  const namedMatch = prompt.match(/(?:file\s+(?:called|named)\s+)([\w-]+\.[a-zA-Z0-9]{1,5})/i);
  if (namedMatch) return namedMatch[1];
  const bareMatch = prompt.match(/\b([\w-]+\.[a-zA-Z0-9]{1,5})\b/);
  if (bareMatch) return bareMatch[1];
  return undefined;
}

const BUG_TRIGGERS = /\b(find|check|fix)\s+(the\s+)?bugs?\b|\bbugs?\s+(dhundo|dhundho|khojo|find|check)\b|\bdebug\b|\breview\s+(the\s+)?code\b/i;

// Pulls the actual shell command out of a "run X in the terminal" style
// request, e.g. "run npm install in the terminal" -> "npm install".
function extractCommand(prompt: string): string | null {
  const explicit = prompt.match(/run\s+(?:this\s+)?(?:cmd|command)?:?\s*["'`]?(.+?)["'`]?\s*(?:in\s+(?:the\s+)?(?:terminal|cmd))?$/i);
  if (explicit && explicit[1] && explicit[1].trim().length > 0) {
    return explicit[1].trim();
  }
  return null;
}

async function handleRunCommand(prompt: string): Promise<string> {
  if (!lastProjectPath) {
    return "I don't have an active project to run that in yet — create or open one first.";
  }

  const command = extractCommand(prompt);
  if (!command) {
    return "I couldn't tell exactly which command to run — try something like \"run npm install in the terminal\".";
  }

  const result = await window.vsmart.project.runCommand(lastProjectPath, command);

  const parts = [`Ran: ${command}`];
  if (result.stdout.trim()) parts.push(`Output:\n${result.stdout.trim().slice(0, 1500)}`);
  if (result.stderr.trim()) parts.push(`Errors:\n${result.stderr.trim().slice(0, 1500)}`);
  parts.push(`Exit code: ${result.exitCode}`);

  return parts.join("\n\n");
}

async function handleFindBugs(prompt: string): Promise<string> {
  if (!lastProjectPath) {
    return "I don't have an active project to review yet — create or open one first.";
  }

  const relativePaths = await window.vsmart.project.listFiles(lastProjectPath);
  if (relativePaths.length === 0) {
    return "That project folder doesn't have any files I can review.";
  }

  const files: ProjectFile[] = [];
  for (const relPath of relativePaths.slice(0, 20)) {
    const content = await window.vsmart.project.readFile(lastProjectPath, relPath);
    if (content !== null) files.push({ path: relPath, content });
  }

  const raw = await askQwenCoderReview(prompt, files);
  const plan = safeParseJson<ReviewPlan>(raw);

  if (!plan) {
    return "I reviewed the code but couldn't structure the results — here's the raw review:\n\n" + raw;
  }

  if (plan.fixedFiles && plan.fixedFiles.length > 0) {
    await window.vsmart.project.writeFiles(lastProjectPath, plan.fixedFiles);
    await window.vsmart.project.openInVSCode(lastProjectPath);
    const fixedList = plan.fixedFiles.map(f => f.path).join(", ");
    return `${plan.summary}\n\nFixed and saved: ${fixedList}`;
  }

  return plan.summary || "No bugs found.";
}

async function handleCreateProject(prompt: string, history: ChatHistoryMessage[]): Promise<string> {
  const context = historyToContext(history);
  const raw = await askQwenCoderProject(context + prompt);
  const plan = safeParseJson<ProjectPlan>(raw);

  if (!plan || !plan.files || plan.files.length === 0) {
    // Fall back to the old single-file behaviour if structured generation
    // didn't come back clean, so the request still produces something.
    const language = detectLanguage(context + prompt);
    const filename = extractFilename(prompt);
    const code = await askQwenCoder(context + "Write only the code for this request, no explanation: " + prompt);
    return await window.vsmart.writeCode(code, language, filename);
  }

  const { ok, projectPath } = await window.vsmart.project.create(
    plan.projectFolder || `project-${Date.now()}`,
    plan.files
  );

  if (!ok || !projectPath) {
    return "I generated the project but couldn't save it to disk.";
  }

  lastProjectPath = projectPath;

  const fileList = plan.files.map(f => f.path).join(", ");
  const parts = [`Created project "${plan.projectFolder}" with: ${fileList}. Opened in VS Code.`];

  if (plan.commands && plan.commands.length > 0) {
    for (const command of plan.commands) {
      const result = await window.vsmart.project.runCommand(projectPath, command);
      parts.push(
        `Ran "${command}" (exit ${result.exitCode})` +
        (result.stderr.trim() ? ` — ${result.stderr.trim().slice(0, 300)}` : "")
      );
    }
  }

  return parts.join("\n");
}

export async function codingAgent(
  prompt: string,
  history: ChatHistoryMessage[] = []
): Promise<string> {
  try {
    if (/\b(cmd|command|terminal)\b/i.test(prompt) && /\b(run|chalao|chala do|execute)\b/i.test(prompt)) {
      return await handleRunCommand(prompt);
    }

    if (BUG_TRIGGERS.test(prompt)) {
      return await handleFindBugs(prompt);
    }

    return await handleCreateProject(prompt, history);

  } catch (err) {
    console.error("Coding agent error:", err);
    return "I ran into a problem with that.";
  }
}