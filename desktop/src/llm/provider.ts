import { askHunyuan, askQwenCoder, isCodingPrompt, type ReplyLang } from "./openrouter";

const provider =
  import.meta.env.VITE_AI_PROVIDER?.toLowerCase() ?? "auto";

export async function askAI(prompt: string, lang: ReplyLang = "en"): Promise<string> {
  switch (provider) {
    case "hunyuan":
      return await askHunyuan(prompt, lang);

    case "qwen":
      return await askQwenCoder(prompt, lang);

    case "auto":
    default: {
      // Only call the model that's actually needed for this prompt —
      // never both — to keep load and cost down.
      const useCoder = isCodingPrompt(prompt);

      return useCoder
        ? await askQwenCoder(prompt, lang)
        : await askHunyuan(prompt, lang);
    }
  }
}