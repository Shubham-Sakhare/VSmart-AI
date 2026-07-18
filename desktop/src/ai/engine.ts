import { detectIntent } from "./intent";
import { planner } from "./planner";
import { commandRouter } from "./commandRouter";

import type { AIResponse } from "./types";

export async function processCommand(
  text: string
): Promise<AIResponse> {

  try {

    const intent = detectIntent(text);

    console.log("Intent:", intent);

    const plan = await planner(text);

    console.log("Plan:", plan);

    const reply =
      await commandRouter(plan);

    return {
      success: true,
      reply
    };

  } catch (error) {

    console.error(error);

    return {
      success: false,
      reply: "Something went wrong."
    };

  }

}