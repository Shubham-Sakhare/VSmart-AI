import { askHunyuan, askQwenCoder, isCodingPrompt } from "./openrouter";

const provider =
  import.meta.env.VITE_AI_PROVIDER?.toLowerCase() ?? "auto";

export async function askAI(prompt: string): Promise<string> {
  switch (provider) {
    case "hunyuan":
      return await askHunyuan(prompt);

    case "qwen":
      return await askQwenCoder(prompt);

    case "auto":
    default: {
      // Only call the model that's actually needed for this prompt —
      // never both — to keep load and cost down.
      const useCoder = isCodingPrompt(prompt);

      return useCoder
        ? await askQwenCoder(prompt)
        : await askHunyuan(prompt);
    }
  }
}