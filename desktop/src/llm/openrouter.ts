// OpenRouter-backed models.
// - Hunyuan (Tencent Hy3): general chat / conversation
// - Qwen3-Coder: coding-specific requests

export type ReplyLang = "en" | "hi";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const HUNYUAN_MODEL = "tencent/hy3:free";
const QWEN_CODER_MODEL = "qwen/qwen3-coder:free";

const hunyuanKey = import.meta.env.VITE_OPENROUTER_HUNYUAN_KEY;
const qwenKey = import.meta.env.VITE_OPENROUTER_QWEN_KEY;

// ===== Debug =====
console.log("========== OpenRouter ==========");
console.log("Hunyuan Key Exists :", !!hunyuanKey);
console.log("Qwen Key Exists    :", !!qwenKey);
console.log("Qwen Key Prefix    :", qwenKey?.slice(0, 12));
console.log("===============================");

function languageInstruction(lang: ReplyLang): string {
  return lang === "hi"
    ? "You must always reply in Hindi (Devanagari script), regardless of what language the user wrote in."
    : "You must always reply in English, regardless of what language the user wrote in.";
}

async function callOpenRouter(
  apiKey: string,
  model: string,
  prompt: string,
  lang: ReplyLang
): Promise<string> {

  if (!apiKey) {
    throw new Error(`❌ API Key missing for ${model}`);
  }

  console.log("Using Model :", model);
  console.log("Prompt      :", prompt);

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "http://localhost:5173",
      "X-Title": "VSmart AI"
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            `You are VSmart, a helpful assistant. ${languageInstruction(lang)}`
        },
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();

    console.error("========== OpenRouter Error ==========");
    console.error("Status :", response.status);
    console.error("Body   :", errorText);
    console.error("======================================");

    throw new Error(errorText);
  }

  const data = await response.json();

  console.log("OpenRouter Success");
  console.log(data);

  return data?.choices?.[0]?.message?.content ?? "No response received.";
}

export async function askHunyuan(
  prompt: string,
  lang: ReplyLang = "en"
): Promise<string> {
  return callOpenRouter(hunyuanKey, HUNYUAN_MODEL, prompt, lang);
}

export async function askQwenCoder(
  prompt: string,
  lang: ReplyLang = "en"
): Promise<string> {
  return callOpenRouter(qwenKey, QWEN_CODER_MODEL, prompt, lang);
}

export function isCodingPrompt(prompt: string): boolean {
  const p = prompt.toLowerCase();

  const codingSignals = [
    "code",
    "function",
    "bug",
    "error",
    "debug",
    "script",
    "python",
    "javascript",
    "typescript",
    "java",
    "c++",
    "html",
    "css",
    "react",
    "component",
    "api",
    "sql",
    "regex",
    "algorithm",
    "class",
    "variable",
    "compile",
    "syntax",
    "refactor"
  ];

  return codingSignals.some(signal => p.includes(signal));
}