import { browserAgent } from "../agents/browserAgent";
import { chatAgent } from "../agents/chatAgent";
import { memoryAgent } from "../agents/memoryAgent";
import { systemAgent } from "../agents/systemAgent";

import type { Plan } from "./types";

export async function commandRouter(
  plan: Plan
): Promise<string> {

  switch (plan.intent) {

    case "browser":
      return await browserAgent(plan.command);

    case "system":
      return await systemAgent(plan.command);

    case "memory":

      if (plan.command.toLowerCase().startsWith("remember")) {

        const text = plan.command.replace(/remember/i, "").trim();

        return await memoryAgent("save", {
          key: "note",
          value: text
        });

      }

      if (plan.command.toLowerCase().startsWith("show")) {
        return await memoryAgent("show");
      }

      return await memoryAgent("get", {
        key: plan.command
      });

    case "chat":
    case "coding":
      return await chatAgent(plan.command);

    default:
      return "Sorry, I don't understand.";
  }

}