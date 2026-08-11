// Parses "remember my X is Y" / "my X is Y" into a clean {key, value} pair.
// Falls back to storing the whole sentence under a generic "note" key when
// no clean pattern is found, so nothing said with "remember..." is ever lost.
function extractKeyValue(text: string): { key: string; value: string } {
  const stripped = text
    .replace(/^remember\s+(that\s+)?/i, "")
    .trim();

  const match = stripped.match(/^(?:my\s+)?(.+?)\s+is\s+(.+)$/i);

  if (match) {
    return { key: match[1].trim(), value: match[2].trim() };
  }

  return { key: `note ${Date.now()}`, value: stripped };
}

export async function memoryAgent(
  action: "save" | "get" | "show",
  data?: Record<string, any>
): Promise<string> {

  switch (action) {

    case "save": {
      const raw = data?.value ?? data?.key ?? "";
      const { key, value } = extractKeyValue(String(raw));

      await window.vsmart.longMemory.saveFact(key, value);
      return `Okay! I'll remember your ${key} is ${value}.`;
    }

    case "get": {
      const query = String(data?.key ?? "");

      // Try an exact match first (fast path for "what is my X").
      const exact = await window.vsmart.longMemory.getFact(query);
      if (exact) {
        return `Your ${query} is ${exact}.`;
      }

      // Fall back to vector (TF-IDF) search — catches phrasing that
      // doesn't exactly match the stored key.
      const matches = await window.vsmart.longMemory.searchFacts(query, 1);
      if (matches.length > 0) {
        return `Your ${matches[0].key} is ${matches[0].value}.`;
      }

      return `I don't remember anything about "${query}".`;
    }

    case "show": {
      const facts = await window.vsmart.longMemory.getAllFacts();

      if (facts.length === 0) {
        return "I don't have anything saved about you yet.";
      }

      const lines = facts.slice(0, 20).map(f => `• ${f.key}: ${f.value}`);
      return `Here's what I remember:\n${lines.join("\n")}`;
    }

    default:
      return "Unknown memory command.";

  }

}