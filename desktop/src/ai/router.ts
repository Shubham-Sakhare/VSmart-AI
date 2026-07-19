import { planner } from "./planner";
import { memoryAgent } from "../agents/memoryAgent";
import { chatAgent } from "../agents/chatAgent";
import { systemAgent } from "../agents/systemAgent";
// import { codingAgent } from "../agents/codingAgent";
import { codingAgent } from "../agents/codingAgent";
import { speak } from "../app/voice/useVoice";
import type { Plan } from "./types";


export interface RouteResult {
  success: boolean;
  action: string;
  message?: string;
  data?: Record<string, any>;
}

export async function route(
  message: string
): Promise<RouteResult> {

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

      // default: "remember X" -> save
      return {
        success: true,
        action: "memory.save",
        message: await memoryAgent("save", { key: command, value: command })
      };
    }

    case "system": {
      // Jarvis-style acknowledgment BEFORE the action runs, then a short
      // confirmation after — instead of one long delayed reply.
      speak(`Ok Boss, opening ${command}...`);

      const result = await systemAgent(command);

      return {
        success: true,
        action: "system.open",
        message: `${result} What else can I do for you, Boss?`
      };
    }

    case "coding": {
      speak("Ok Boss, writing that code for you...");

      const result = await codingAgent(command);

      return {
        success: true,
        action: "coding.write",
        message: `${result} What else can I do for you, Boss?`
      };
    }

    case "chat":
    default: {
      const reply = await chatAgent(message);

      return {
        success: true,
        action: "chat",
        message: reply
      };
    }
  }
}