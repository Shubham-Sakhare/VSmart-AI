import { askHunyuan, askQwenCoder, isCodingPrompt, type ReplyLang } from "./openrouter";
import { pushNotification } from "../lib/Notifications";

const provider =
  import.meta.env.VITE_AI_PROVIDER?.toLowerCase() ?? "auto";

export async function askAI(prompt: string, lang: ReplyLang = "en"): Promise<string> {
  const useCoder = provider === "qwen" || (provider === "auto" && isCodingPrompt(prompt));

  let result: string;
  switch (provider) {
    case "hunyuan":
      result = await askHunyuan(prompt, lang);
      break;
    case "qwen":
      result = await askQwenCoder(prompt, lang);
      break;
    case "auto":
    default: {
      // Only call the model that's actually needed for this prompt —
      // never both — to keep load and cost down.
      result = useCoder
        ? await askQwenCoder(prompt, lang)
        : await askHunyuan(prompt, lang);
      break;
    }
  }

  pushNotification(
    useCoder ? "Code task complete" : "Chat response ready",
    prompt.length > 60 ? `${prompt.slice(0, 60)}…` : prompt,
    "success"
  ).catch(() => {});

  return result;
}