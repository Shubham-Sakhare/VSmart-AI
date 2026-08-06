import { askVision } from "../llm/openrouter";
import type { ReplyLang } from "../llm/openrouter";

export async function visionAgent(
  command: string,
  lang: ReplyLang = "en"
): Promise<string> {

  const imageDataUrl = await window.vsmart.vision.captureScreen();

  if (!imageDataUrl) {
    return lang === "hi"
      ? "माफ़ कीजिए बॉस, स्क्रीन कैप्चर नहीं हो पाई।"
      : "Sorry Boss, I couldn't capture the screen.";
  }

  const question = command.trim().length > 3
    ? command
    : (lang === "hi"
        ? "इस स्क्रीन पर क्या दिख रहा है, साफ़ और सीधे तरीके से बताओ।"
        : "Describe clearly and concisely what's shown on this screen.");

  try {
    return await askVision(question, imageDataUrl, lang);
  } catch (err) {
    console.error("visionAgent error:", err);
    return lang === "hi"
      ? "माफ़ कीजिए बॉस, स्क्रीन समझने में दिक्कत आई।"
      : "Sorry Boss, I had trouble understanding the screen.";
  }

}