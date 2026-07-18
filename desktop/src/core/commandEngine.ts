import { analyzeMemory, recall } from "./memoryManager";

export interface CommandResult {
  success: boolean;
  message: string;
}

export async function processCommand(
  command: string
): Promise<CommandResult> {

  const text = command.trim().toLowerCase();

  // =====================
  // MEMORY COMMANDS
  // =====================

  const memoryResult = await analyzeMemory(command);

  if (memoryResult.type === "memory") {
    return {
      success: true,
      message: memoryResult.response
    };
  }

  // =====================
  // MEMORY RECALL
  // =====================

  if (text.startsWith("what is my ")) {

    const key = text
      .replace("what is my ", "")
      .replace("?", "")
      .trim();

    const value = await recall(key);

    if (value) {
      return {
        success: true,
        message: `Your ${key} is ${value}.`
      };
    }

    return {
      success: false,
      message: `I don't remember your ${key}.`
    };
  }

  // =====================
  // GREETING
  // =====================

  if (
    text.includes("hello") ||
    text.includes("hi") ||
    text.includes("hey")
  ) {

    return {
      success: true,
      message:
        "Hello Shubham. I am VSmart AI. How can I help you today?"
    };

  }

  // =====================
  // IDENTITY
  // =====================

  if (
    text.includes("who are you") ||
    text.includes("your name")
  ) {

    return {
      success: true,
      message:
        "I am VSmart AI, your personal desktop assistant."
    };

  }

  // =====================
  // TIME
  // =====================

  if (
    text === "time" ||
    text.includes("what time")
  ) {

    return {
      success: true,
      message:
        `Current time is ${new Date().toLocaleTimeString()}`
    };

  }

  // =====================
  // DATE
  // =====================

  if (
    text === "date" ||
    text.includes("today date")
  ) {

    return {
      success: true,
      message:
        `Today is ${new Date().toDateString()}`
    };

  }

  // =====================
  // HELP
  // =====================

  if (
    text.includes("help") ||
    text.includes("what can you do")
  ) {

    return {
      success: true,
      message:
`I can:

• Remember information
• Recall memories
• Tell time
• Tell date
• AI Chat (Coming Soon)
• Voice Assistant (Coming Soon)
• System Control (Coming Soon)`
    };

  }

  return {

    success: false,

    message:
      "Sorry, I don't understand this command yet."

  };

}