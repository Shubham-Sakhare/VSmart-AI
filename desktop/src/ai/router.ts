import { planner } from "./planner";
import { memoryAgent } from "../agents/memoryAgent";
import { chatAgent } from "../agents/chatAgent";
import { systemAgent } from "../agents/systemAgent";
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

    case "system":
      return {
        success: true,
        action: "system.open",
        message: await systemAgent(command)
      };

    case "browser":
      return {
        success: true,
        action: "browser.search",
        data: { query: command }
      };

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