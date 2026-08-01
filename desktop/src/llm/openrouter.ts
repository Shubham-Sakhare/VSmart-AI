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

const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

function languageInstruction(lang: ReplyLang): string {
  return lang === "hi"
    ? "Always reply only in Hindi using Devanagari script."
    : "Always reply only in English.";
}

async function callOpenRouterOnce(
  apiKey: string,
  model: string,
  prompt: string,
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
            content: prompt,
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
      console.warn(`❌ ${model} failed`);
      console.error(err);
      lastError = err;
    }
  }

  throw lastError ?? new Error("All OpenRouter models failed.");
}

export async function askHunyuan(
  prompt: string,
  lang: ReplyLang = "en"
): Promise<string> {
  return callWithFallback(apiKey, CHAT_MODELS, prompt, lang);
}

export async function askQwenCoder(
  prompt: string,
  lang: ReplyLang = "en"
): Promise<string> {
  return callWithFallback(apiKey, CODER_MODELS, prompt, lang);
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

console.log("OpenRouter API Key Loaded:", !!apiKey);