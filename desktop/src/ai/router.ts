import { planner } from "./planner";
import { memoryAgent } from "../agents/memoryAgent";
import { chatAgent } from "../agents/chatAgent";
import { systemAgent } from "../agents/systemAgent";
import { codingAgent } from "../agents/codingAgent";
import { visionAgent } from "../agents/visionAgent";
import { speak } from "../app/voice/useVoice";
import type { ReplyLang } from "../llm/openrouter";
import type { Plan } from "./types";


export interface RouteResult {
  success: boolean;
  action: string;
  message?: string;
  data?: Record<string, any>;
}

const CONFIRM_WORDS = ["yes", "haan", "ha", "confirm", "karo", "ok", "sure"];
const CANCEL_WORDS = ["no", "nahi", "cancel", "mat karo"];

type ActionKey =
  | "search" | "open" | "write" | "close" | "play" | "pause" | "stop"
  | "volume" | "brightness" | "wifi" | "bluetooth" | "screenshot"
  | "folder" | "delete" | "create" | "notepad" | "recyclebin";

const ACTION_TEMPLATES: Record<ActionKey, { ack: Record<ReplyLang, string>; done: Record<ReplyLang, string> }> = {
  search: {
    ack: { en: "Ok Boss, searching...", hi: "ओके बॉस, सर्च कर रहा हूँ..." },
    done: { en: "Ok Boss, here's what I found.", hi: "बॉस, ये मिला।" }
  },
  open: {
    ack: { en: "Ok Boss, opening...", hi: "ओके बॉस, खोल रहा हूँ..." },
    done: { en: "Ok Boss, open kar diya. Next, what can I do for you?", hi: "ओके बॉस, खोल दिया। अगला, क्या करूं?" }
  },
  write: {
    ack: { en: "Ok Boss, writing...", hi: "ओके बॉस, लिख रहा हूँ..." },
    done: { en: "Ok Boss, likh diya.", hi: "ओके बॉस, लिख दिया।" }
  },
  close: {
    ack: { en: "Ok Boss, closing...", hi: "ओके बॉस, बंद कर रहा हूँ..." },
    done: { en: "Ok Boss, band kar diya.", hi: "ओके बॉस, बंद कर दिया।" }
  },
  play: {
    ack: { en: "Ok Boss, playing...", hi: "ओके बॉस, चला रहा हूँ..." },
    done: { en: "Ok Boss, chal raha hai.", hi: "ओके बॉस, चल रहा है।" }
  },
  pause: {
    ack: { en: "Ok Boss, pausing...", hi: "ओके बॉस, रोक रहा हूँ..." },
    done: { en: "Ok Boss, paused.", hi: "ओके बॉस, रोक दिया।" }
  },
  stop: {
    ack: { en: "Ok Boss, stopping...", hi: "ओके बॉस, रोक रहा हूँ..." },
    done: { en: "Ok Boss, stopped.", hi: "ओके बॉस, रोक दिया।" }
  },
  volume: {
    ack: { en: "Ok Boss, adjusting volume...", hi: "ओके बॉस, वॉल्यूम बदल रहा हूँ..." },
    done: { en: "Ok Boss, done.", hi: "ओके बॉस, हो गया।" }
  },
  brightness: {
    ack: { en: "Ok Boss, adjusting brightness...", hi: "ओके बॉस, ब्राइटनेस बदल रहा हूँ..." },
    done: { en: "Ok Boss, done.", hi: "ओके बॉस, हो गया।" }
  },
  wifi: {
    ack: { en: "Ok Boss, on it...", hi: "ओके बॉस, कर रहा हूँ..." },
    done: { en: "Ok Boss, done.", hi: "ओके बॉस, हो गया।" }
  },
  bluetooth: {
    ack: { en: "Ok Boss, on it...", hi: "ओके बॉस, कर रहा हूँ..." },
    done: { en: "Ok Boss, done.", hi: "ओके बॉस, हो गया।" }
  },
  screenshot: {
    ack: { en: "Ok Boss, taking a screenshot...", hi: "ओके बॉस, स्क्रीनशॉट ले रहा हूँ..." },
    done: { en: "Ok Boss, screenshot le liya.", hi: "ओके बॉस, स्क्रीनशॉट ले लिया।" }
  },
  folder: {
    ack: { en: "Ok Boss, opening the folder...", hi: "ओके बॉस, फ़ोल्डर खोल रहा हूँ..." },
    done: { en: "Ok Boss, folder open kar diya.", hi: "ओके बॉस, फ़ोल्डर खोल दिया।" }
  },
  delete: {
    ack: { en: "Ok Boss, deleting...", hi: "ओके बॉस, डिलीट कर रहा हूँ..." },
    done: { en: "Ok Boss, deleted.", hi: "ओके बॉस, डिलीट कर दिया।" }
  },
  create: {
    ack: { en: "Ok Boss, creating...", hi: "ओके बॉस, बना रहा हूँ..." },
    done: { en: "Ok Boss, ban gaya.", hi: "ओके बॉस, बन गया।" }
  },
  notepad: {
    ack: { en: "Ok Boss, opening Notepad...", hi: "ओके बॉस, नोटपैड खोल रहा हूँ..." },
    done: { en: "Ok Boss, likh diya.", hi: "ओके बॉस, लिख दिया।" }
  },
  recyclebin: {
    ack: { en: "Ok Boss, opening Recycle Bin...", hi: "ओके बॉस, रीसायकल बिन खोल रहा हूँ..." },
    done: { en: "Ok Boss, open kar diya.", hi: "ओके बॉस, खोल दिया।" }
  }
};

/** Classifies which action keyword a system command matches, using the RAW message
 * (before filler-word stripping) so words like "open"/"search" are still present. */
function classifyAction(rawMessage: string): ActionKey {
  const lower = rawMessage.toLowerCase();

  if (lower.includes("screenshot") || lower.includes("screen shot")) return "screenshot";
  if (lower.includes("recycle bin") || lower.includes("trash")) return "recyclebin";
  if (lower.includes("volume")) return "volume";
  if (lower.includes("brightness") || lower.includes("chamak")) return "brightness";
  if (lower.includes("wifi") || lower.includes("wi-fi")) return "wifi";
  if (lower.includes("bluetooth")) return "bluetooth";
  if (["download", "document", "desktop", "picture", "music", "video", "folder"].some(f => lower.includes(f))) return "folder";
  if (lower.includes("notepad")) return "notepad";
  if (/\b(delete|hatao|hata do|remove)\b/.test(lower)) return "delete";
  if (/\b(create|banao|bana do)\b/.test(lower)) return "create";
  if (/\b(pause|rok do|roko)\b/.test(lower)) return "pause";
  if (/\b(stop|band karo|band kar do)\b/.test(lower)) return "stop";
  if (/\b(close)\b/.test(lower)) return "close";
  if (/\b(play|chalao|chala do|bajao|baja do|lagao|laga do)\b/.test(lower)) return "play";
  if (/\b(search|khojo|dhundo|dhundho)\b/.test(lower)) return "search";
  return "open";
}

const CONFIRM_MSGS: Record<ReplyLang, { restart: string; shutdown: string; cancelled: string; cancelledUnclear: string }> = {
  en: {
    restart: "Are you sure you want to restart the PC, Boss? Say yes to confirm.",
    shutdown: "Are you sure you want to shut down the PC, Boss? Say yes to confirm.",
    cancelled: "Okay, cancelled.",
    cancelledUnclear: "Okay, I've cancelled that for safety."
  },
  hi: {
    restart: "बॉस, क्या आप पक्का पीसी रीस्टार्ट करना चाहते हैं? हां बोलें कन्फर्म करने के लिए।",
    shutdown: "बॉस, क्या आप पक्का पीसी शटडाउन करना चाहते हैं? हां बोलें कन्फर्म करने के लिए।",
    cancelled: "ठीक है, कैंसिल कर दिया।",
    cancelledUnclear: "सुरक्षा के लिए मैंने इसे कैंसिल कर दिया है।"
  }
};

const BLOCKED_TERMS = [
  "porn", "porno", "xxx", "nude", "nudes", "sex video", "adult video",
  "hentai", "onlyfans", "escort"
];

function isBlocked(text: string): boolean {
  const lower = text.toLowerCase();
  return BLOCKED_TERMS.some(term => lower.includes(term));
}

// Tracks a pending destructive action awaiting a yes/no confirmation.
let pendingConfirm: "restart" | "shutdown" | null = null;

export async function route(
  message: string,
  lang: ReplyLang = "en"
): Promise<RouteResult> {

  if (isBlocked(message)) {
    return {
      success: false,
      action: "blocked",
      message: lang === "hi" ? "माफ़ कीजिए बॉस, इसमें मदद नहीं कर सकता।" : "Sorry Boss, I can't help with that."
    };
  }

  const msgs = CONFIRM_MSGS[lang];

  // ---- Handle a pending restart/shutdown confirmation first ----
  if (pendingConfirm) {
    const lower = message.toLowerCase();
    const action = pendingConfirm;
    pendingConfirm = null;

    if (CONFIRM_WORDS.some(w => lower.includes(w))) {
      const result = await systemAgent(action);
      return { success: true, action: `system.${action}`, message: result };
    }

    if (CANCEL_WORDS.some(w => lower.includes(w))) {
      return { success: true, action: "system.cancelled", message: msgs.cancelled };
    }

    return { success: true, action: "system.cancelled", message: msgs.cancelledUnclear };
  }

  const plan: Plan = await planner(message);
  const { intent, command } = plan;

  switch (intent) {

    case "memory": {
      const lower = command.toLowerCase();

      if (lower.startsWith("recall") || lower.startsWith("show memory")) {
        return {
          success: true,
          action: "memory.get",
          message: await memoryAgent("get", { key: command })
        };
      }

      return {
        success: true,
        action: "memory.save",
        message: await memoryAgent("save", { key: command, value: command })
      };
    }

    case "system": {
      const lower = command.toLowerCase();

      if (lower.includes("restart") || lower.includes("reboot")) {
        pendingConfirm = "restart";
        return { success: true, action: "system.confirm", message: msgs.restart };
      }

      if (lower.includes("shutdown") || lower.includes("shut down")) {
        pendingConfirm = "shutdown";
        return { success: true, action: "system.confirm", message: msgs.shutdown };
      }

      const actionKey = classifyAction(message);
      const template = ACTION_TEMPLATES[actionKey];

      speak(template.ack[lang], lang === "hi" ? "hi-IN" : "en-IN");

      const result = await systemAgent(command);

      return {
        success: true,
        action: "system.open",
        message: [result, template.done[lang]].filter(Boolean).join(" ")
      };
    }

    case "vision": {
      speak(
        lang === "hi" ? "ओके बॉस, स्क्रीन देख रहा हूँ..." : "Ok Boss, looking at your screen...",
        lang === "hi" ? "hi-IN" : "en-IN"
      );

      const result = await visionAgent(command, lang);

      return {
        success: true,
        action: "vision.analyze",
        message: result
      };
    }

    case "coding": {
      const template = ACTION_TEMPLATES.write;

      speak(template.ack[lang], lang === "hi" ? "hi-IN" : "en-IN");

      const result = await codingAgent(command);

      return {
        success: true,
        action: "coding.write",
        message: [result, template.done[lang]].filter(Boolean).join(" ")
      };
    }

    case "chat":
    default: {
      const reply = await chatAgent(message, lang);

      return {
        success: true,
        action: "chat",
        message: reply
      };
    }
  }
}