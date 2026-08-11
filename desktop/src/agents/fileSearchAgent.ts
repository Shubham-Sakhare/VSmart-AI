import type { ReplyLang } from "../llm/openrouter";

export async function fileSearchAgent(
  query: string,
  lang: ReplyLang = "en"
): Promise<string> {

  const results = await window.vsmart.fileSearch.search(query);

  if (results.length === 0) {
    return lang === "hi"
      ? "माफ़ कीजिए बॉस, कोई matching file नहीं मिली।"
      : "Sorry Boss, I couldn't find any matching files.";
  }

  const lines = results.slice(0, 8).map((r, i) => {
    const date = r.modified ? new Date(r.modified).toLocaleDateString() : "";
    return `${i + 1}. ${r.name}${date ? ` (${date})` : ""}\n   ${r.path}`;
  });

  const header = lang === "hi"
    ? `बॉस, ${results.length} file${results.length > 1 ? "s" : ""} मिलीं:`
    : `Ok Boss, found ${results.length} file${results.length > 1 ? "s" : ""}:`;

  return [header, ...lines].join("\n");

}