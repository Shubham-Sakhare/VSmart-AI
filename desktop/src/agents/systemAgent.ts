// Detects special system-control phrases and dispatches to the right action.
// Anything that doesn't match a special command falls back to the generic
// app/website opener (openSystem).

function extractNumber(text: string): number | null {
  const match = text.match(/(\d{1,3})/);
  return match ? parseInt(match[1], 10) : null;
}

const OFF_WORDS = ["off", "band", "bandh", "disable"];
const ON_WORDS = ["on", "chalu", "chalo", "enable"];

function isOff(text: string) {
  return OFF_WORDS.some(w => text.includes(w));
}

function isOn(text: string) {
  return ON_WORDS.some(w => text.includes(w));
}

export async function systemAgent(target: string): Promise<string> {
  const lower = target.toLowerCase();

  try {
    // Volume
    if (lower.includes("volume")) {
      const pct = extractNumber(lower);
      if (pct !== null) return await window.vsmart.systemControl("setVolume", pct);
    }

    // Brightness
    if (lower.includes("brightness") || lower.includes("chamak")) {
      const pct = extractNumber(lower);
      if (pct !== null) return await window.vsmart.systemControl("setBrightness", pct);
    }

    // Wi-Fi
    if (lower.includes("wifi") || lower.includes("wi-fi")) {
      if (isOff(lower)) return await window.vsmart.systemControl("wifiOff");
      if (isOn(lower)) return await window.vsmart.systemControl("wifiOn");
    }

    // Bluetooth
    if (lower.includes("bluetooth")) {
      if (isOff(lower)) return await window.vsmart.systemControl("bluetoothOff");
      if (isOn(lower)) return await window.vsmart.systemControl("bluetoothOn");
    }

    // Screenshot
    if (lower.includes("screenshot") || lower.includes("screen shot")) {
      return await window.vsmart.systemControl("screenshot");
    }

    // Recycle Bin
    if (lower.includes("recycle bin") || lower.includes("trash")) {
      return await window.vsmart.systemControl("recycleBin");
    }

    // Notepad + write text — e.g. "notepad likho hello world" or notepad + quoted text
    if (lower.includes("notepad")) {
      const quoted = target.match(/["']([^"']+)["']/);
      let textToWrite = quoted?.[1];

      if (!textToWrite) {
        // Hindi is verb-final ("hello world likho"), so strip the trigger/
        // filler words and the verb itself — whatever remains is the text.
        textToWrite = lower
          .replace(/\bnotepad\b/g, " ")
          .replace(/\baur\b/g, " ")
          .replace(/\b(likho|likh|likhna|write|type)\b/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      }

      if (textToWrite) {
        return await window.vsmart.systemControl("writeNotepad", textToWrite);
      }

      return await window.vsmart.openSystem("notepad");
    }

    // Special folders
    const folderKeywords = ["download", "document", "desktop", "picture", "music", "video"];
    if (folderKeywords.some(f => lower.includes(f))) {
      return await window.vsmart.systemControl("openFolder", lower);
    }

    // Restart / Shutdown — router.ts handles the confirmation step before this ever runs.
    if (lower.includes("restart") || lower.includes("reboot")) {
      return await window.vsmart.systemControl("restart");
    }

    if (lower.includes("shutdown") || lower.includes("shut down")) {
      return await window.vsmart.systemControl("shutdown");
    }

    // Fallback — generic app/website opener
    return await window.vsmart.openSystem(target);

  } catch {
    return `I could not do that.`;
  }
}