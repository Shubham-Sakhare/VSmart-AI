import type { ReplyLang } from "../llm/openrouter";

export async function desktopControlAgent(
  command: string,
  lang: ReplyLang = "en"
): Promise<string> {

  const lower = command.toLowerCase().trim();

  // "click at 500,300" / "click 500 300" / "double click at 500,300" / "right click 500,300"
  const coordMatch = lower.match(/(double\s+click|right\s+click|click)\s*(?:at\s*)?(\d+)[, ]+(\d+)/);
  if (coordMatch) {
    const kind = coordMatch[1];
    const x = parseInt(coordMatch[2], 10);
    const y = parseInt(coordMatch[3], 10);
    const doubleClick = kind.includes("double");
    const button: "left" | "right" = kind.includes("right") ? "right" : "left";

    const ok = await window.vsmart.desktopControl.click(x, y, button, doubleClick);

    return ok
      ? (lang === "hi" ? `ओके बॉस, (${x}, ${y}) पर क्लिक कर दिया।` : `Ok Boss, clicked at (${x}, ${y}).`)
      : (lang === "hi" ? "माफ़ कीजिए बॉस, क्लिक नहीं हो पाया।" : "Sorry Boss, the click didn't go through.");
  }

  // "type hello world" / "likho hello world"
  const typeMatch = command.match(/^(?:type|likho|likh do|likh)\s+(.+)$/i);
  if (typeMatch) {
    const text = typeMatch[1];
    const ok = await window.vsmart.desktopControl.type(text);

    return ok
      ? (lang === "hi" ? "ओके बॉस, टाइप कर दिया।" : "Ok Boss, typed it.")
      : (lang === "hi" ? "माफ़ कीजिए बॉस, टाइप नहीं हो पाया।" : "Sorry Boss, I couldn't type that.");
  }

  // "press ctrl+s" / "press enter" / "dabao enter"
  const pressMatch = lower.match(/(?:press|dabao|dabaiye)\s+([a-z0-9+ ]+)/);
  if (pressMatch) {
    const combo = pressMatch[1].trim();
    const ok = await window.vsmart.desktopControl.pressKey(combo);

    return ok
      ? (lang === "hi" ? `ओके बॉस, ${combo} दबा दिया।` : `Ok Boss, pressed ${combo}.`)
      : (lang === "hi" ? "माफ़ कीजिए बॉस, key press नहीं हो पाया।" : "Sorry Boss, that key press didn't work.");
  }

  return lang === "hi"
    ? "माफ़ कीजिए बॉस, समझ नहीं पाया — 'click at X,Y', 'type ...', या 'press ...' जैसे कमांड इस्तेमाल करें।"
    : "Sorry Boss, I didn't catch that — try commands like 'click at X,Y', 'type ...', or 'press ...'.";

}