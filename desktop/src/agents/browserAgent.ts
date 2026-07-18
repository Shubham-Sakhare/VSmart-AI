import open from "open";

export async function browserAgent(
  query: string
): Promise<string> {

  try {

    const text = query.toLowerCase();

    if (text.includes("youtube")) {
      await open("https://youtube.com");
      return "Opening YouTube.";
    }

    if (text.includes("google")) {
      await open("https://google.com");
      return "Opening Google.";
    }

    if (text.includes("github")) {
      await open("https://github.com");
      return "Opening GitHub.";
    }

    if (text.includes("gmail")) {
      await open("https://mail.google.com");
      return "Opening Gmail.";
    }

    if (text.includes("chatgpt")) {
      await open("https://chat.openai.com");
      return "Opening ChatGPT.";
    }

    const search =
      encodeURIComponent(query);

    await open(
      `https://www.google.com/search?q=${search}`
    );

    return `Searching ${query}`;

  } catch {

    return "Unable to open browser.";

  }

}