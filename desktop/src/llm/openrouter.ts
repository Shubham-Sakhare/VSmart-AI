export type ReplyLang = "en" | "hi";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const CHAT_MODELS = [
  "openai/gpt-oss-20b:free",
  "nvidia/nemotron-3-ultra:free",
  "google/gemma-3-4b-it:free",
  "nvidia/nemotron-3-super:free",
];
const CODER_MODELS = [
  "openai/gpt-oss-20b:free",
  "cohere/north-mini-code:free",
  "poolside/laguna-s2.1:free",
  "google/gemma-3-4b-it:free",
];
// Free, vision-capable models on OpenRouter (accept image_url content) — used
// for Screen Vision. Kept as a short fallback chain since free-tier vision
// model availability shifts over time.
const VISION_MODELS = [
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
];

// Resolves the API key to use for a request. Priority:
//   1. The user's own key, saved via Settings and stored encrypted on their
//      machine (window.vsmart.apiKey.get()). This is what packaged/shared
//      builds should use — each user supplies their own key.
//   2. The VITE_OPENROUTER_API_KEY from .env, baked in at build time. This
//      only exists in local dev/test builds and should never ship in a
//      build that's handed to other people.
let cachedKey: string | null | undefined;

async function getApiKey(): Promise<string> {
  if (cachedKey !== undefined) return cachedKey ?? "";
  try {
    const stored = await window.vsmart.apiKey.get();
    if (stored) {
      cachedKey = stored;
      return stored;
    }
  } catch {
    // window.vsmart.apiKey may not be available in some contexts - fall through
  }
  const envKey = import.meta.env.VITE_OPENROUTER_API_KEY ?? "";
  cachedKey = envKey || null;
  return envKey;
}

// Call this after the user saves/clears their key in Settings so the next
// request picks up the change instead of using the cached value.
export function invalidateApiKeyCache(): void {
  cachedKey = undefined;
}

function languageInstruction(lang: ReplyLang): string {
  return lang === "hi"
    ? "Always reply only in Hindi using Devanagari script."
    : "Always reply only in English.";
}

type MessageContent =
  | string
  | { type: "text"; text: string }[]
  | ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } })[];

async function callOpenRouterWithContent(
  apiKey: string,
  model: string,
  content: MessageContent,
  lang: ReplyLang
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    console.log("Using model:", model);
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://vsmart.local",
        "X-Title": "VSmart AI",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              `You are VSmart AI, a Jarvis-like assistant. ` +
              languageInstruction(lang) +
              " Keep replies short, direct and helpful. Only explain in detail if the user explicitly asks.",
          },
          {
            role: "user",
            content,
          },
        ],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });
    clearTimeout(timeout);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        data?.error?.message ||
        data?.message ||
        response.statusText
      );
    }
    const answer = data?.choices?.[0]?.message?.content;
    if (!answer) {
      throw new Error("Empty response from OpenRouter.");
    }
    return answer.trim();
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

async function callOpenRouterOnce(
  apiKey: string,
  model: string,
  prompt: string,
  lang: ReplyLang
): Promise<string> {
  return callOpenRouterWithContent(apiKey, model, prompt, lang);
}

async function callWithFallback(
  apiKey: string,
  models: string[],
  prompt: string,
  lang: ReplyLang
): Promise<string> {
  if (!apiKey) {
    throw new Error("OpenRouter API Key missing.");
  }
  let lastError: unknown;
  for (const model of models) {
    try {
      return await callOpenRouterOnce(apiKey, model, prompt, lang);
    } catch (err) {
      console.warn(`Model ${model} failed:`, err);
      lastError = err;
    }
  }
  throw lastError ?? new Error("All OpenRouter models failed.");
}

async function callWithVisionFallback(
  apiKey: string,
  models: string[],
  prompt: string,
  imageDataUrl: string,
  lang: ReplyLang
): Promise<string> {
  if (!apiKey) {
    throw new Error("OpenRouter API Key missing.");
  }
  let lastError: unknown;
  for (const model of models) {
    try {
      return await callOpenRouterWithContent(
        apiKey,
        model,
        [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
        lang
      );
    } catch (err) {
      console.warn(`Vision model ${model} failed:`, err);
      lastError = err;
    }
  }
  throw lastError ?? new Error("All OpenRouter vision models failed.");
}

export async function askHunyuan(
  prompt: string,
  lang: ReplyLang = "en"
): Promise<string> {
  const apiKey = await getApiKey();
  return callWithFallback(apiKey, CHAT_MODELS, prompt, lang);
}

export async function askQwenCoder(
  prompt: string,
  lang: ReplyLang = "en"
): Promise<string> {
  const apiKey = await getApiKey();
  return callWithFallback(apiKey, CODER_MODELS, prompt, lang);
}

// Asks the coder model to plan out an entire small project (folder name +
// multiple files + optional setup commands) as strict JSON, so the coding
// agent can create a real multi-file project rather than a single file.
export async function askQwenCoderProject(request: string): Promise<string> {
  const apiKey = await getApiKey();
  const prompt =
    `Plan a small project for this request: "${request}"\n\n` +
    `Respond with ONLY valid JSON (no markdown fences, no explanation) in exactly this shape:\n` +
    `{"projectFolder":"short-kebab-case-name","files":[{"path":"relative/file/path.ext","content":"full file content"}],"commands":["optional shellcommand to run after creating the files, e.g. npm install"]}\n\n` +
    `Rules: keep the project minimal and focused on exactly what was asked. ` +
    `Use relative paths only. Include real, working code in "content" (escaped for JSON), not placeholders. ` +
    `Only include "commands" if the project genuinely needs a setup step (e.g. npm install for a package.json-based project) - otherwise use an empty array.`;
  return callWithFallback(apiKey, CODER_MODELS, prompt, "en");
}

// Asks the coder model to review existing project files for bugs and
// return both a plain-English explanation and (if fixes are needed) the
// corrected files as strict JSON.
export async function askQwenCoderReview(
  request: string,
  files: { path: string; content: string }[]
): Promise<string> {
  const apiKey = await getApiKey();
  const filesBlock = files
    .map(f => `--- ${f.path} ---\n${f.content}`)
    .join("\n\n");
  const prompt =
    `Review this project's code for bugs. User's request: "${request}"\n\n` +
    `${filesBlock}\n\n` +
    `Respond with ONLY valid JSON (no markdown fences, no explanation outside the JSON) in exactly this shape:\n` +
    `{"summary":"plain-English summary of what you found, 2-4 sentences","fixedFiles":[{"path":"relative/file/path.ext","content":"corrected full file content"}]}\n\n` +
    `Only include a file in "fixedFiles" if you actually changed something in it. If there are no bugs, return an empty "fixedFiles" array.`;
  return callWithFallback(apiKey, CODER_MODELS, prompt, "en");
}

// Screen Vision: sends a screenshot (as a data URL) alongside a question to
// a vision-capable free model.
export async function askVision(
  prompt: string,
  imageDataUrl: string,
  lang: ReplyLang = "en"
): Promise<string> {
  const apiKey = await getApiKey();
  return callWithVisionFallback(apiKey, VISION_MODELS, prompt, imageDataUrl, lang);
}

export function isCodingPrompt(prompt: string): boolean {
  const p = prompt.toLowerCase();
  const codingSignals = [
    "code",
    "coding",
    "program",
    "function",
    "class",
    "bug",
    "error",
    "debug",
    "script",
    "python",
    "javascript",
    "typescript",
    "java",
    "c++",
    "c#",
    "react",
    "node",
    "express",
    "nextjs",
    "next.js",
    "html",
    "css",
    "tailwind",
    "sql",
    "mongodb",
    "mysql",
    "api",
    "json",
    "regex",
    "algorithm",
    "compile",
    "syntax",
    "refactor",
    "fix",
    "build",
    "npm",
    "yarn",
    "pnpm",
    "vite",
    "electron",
  ];
  return codingSignals.some((word) => p.includes(word));
}