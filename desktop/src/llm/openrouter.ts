// OpenRouter-backed models.
// - Hunyuan (Tencent Hy3): general chat / conversation
// - Qwen3-Coder: coding-specific requests
// Only ONE of these is called per request (chosen by isCodingPrompt),
// never both — this keeps load/cost down.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const HUNYUAN_MODEL = "tencent/hy3:free";
const QWEN_CODER_MODEL = "qwen/qwen3-coder:free";

const hunyuanKey = import.meta.env.VITE_OPENROUTER_HUNYUAN_KEY;
const qwenKey = import.meta.env.VITE_OPENROUTER_QWEN_KEY;

async function callOpenRouter(
  apiKey: string,
  model: string,
  prompt: string
): Promise<string> {

  if (!apiKey) {
    throw new Error(`OpenRouter API key missing for model ${model}.`);
  }

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      // OpenRouter asks for these but they can be anything identifying your app.
      "HTTP-Referer": "https://vsmart.local",
      "X-Title": "VSmart AI"
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`OpenRouter (${model}) error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? "No response";
}

export async function askHunyuan(prompt: string): Promise<string> {
  return callOpenRouter(hunyuanKey, HUNYUAN_MODEL, prompt);
}

export async function askQwenCoder(prompt: string): Promise<string> {
  return callOpenRouter(qwenKey, QWEN_CODER_MODEL, prompt);
}

/** Heuristic: does this prompt look like a coding request? */
export function isCodingPrompt(prompt: string): boolean {
  const p = prompt.toLowerCase();

  const codingSignals = [
    "code", "function", "bug", "error", "debug", "script",
    "python", "javascript", "typescript", "java ", "c++", "html", "css",
    "react", "component", "api", "sql", "regex", "algorithm",
    "class ", "variable", "compile", "syntax", "refactor"
  ];

  return codingSignals.some(signal => p.includes(signal));
}