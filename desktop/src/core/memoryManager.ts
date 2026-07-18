  // Save user information

  export async function remember(
    key: string,
    value: string
  ): Promise<string> {

  await window.vsmart!.saveMemory(key, value);
    return `Okay! I will remember your ${key} is ${value}.`;

  }

  // ======================
  // Recall Memory
  // ======================

  export async function recall(
    key: string
  ): Promise<string | null> {

  const memory = await window.vsmart!.getMemory(key);
    if (memory) {
      return memory;
    }

    return null;

  }

  // ======================
  // Analyze Memory
  // ======================

  export async function analyzeMemory(message: string) {

    const text = message.trim().toLowerCase();

    // remember my name is Shubham
    // remember my city is Nanded
    // remember my college is SRTMU

    if (text.startsWith("remember my ")) {

      const withoutRemember = message.substring(12).trim();

      const parts = withoutRemember.split(" is ");

      if (parts.length >= 2) {

        const key = parts[0].trim().toLowerCase();

        const value = parts.slice(1).join(" is ").trim();

        await remember(key, value);

        return {

          type: "memory",

          response:
            `✅ I will remember your ${key} is ${value}.`

        };

      }

    }

    // my name is Shubham
    // my city is Nanded

    if (text.startsWith("my ") && text.includes(" is ")) {

      const withoutMy = message.substring(3);

      const parts = withoutMy.split(" is ");

      if (parts.length >= 2) {

        const key = parts[0].trim().toLowerCase();

        const value = parts.slice(1).join(" is ").trim();

        await remember(key, value);

        return {

          type: "memory",

          response:
            `✅ I will remember your ${key} is ${value}.`

        };

      }

    }

    return {

      type: "normal",

      response: ""

    };

  }