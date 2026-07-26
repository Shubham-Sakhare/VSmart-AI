import { exec } from "child_process";
import { openInSession } from "./browserSessionService.js";

const appMap: Record<string, string> = {
  chrome: "chrome",
  browser: "chrome",

  vscode: "code",
  code: "code",

  calculator: "calc",
  calc: "calc",

  notepad: "notepad",

  explorer: "explorer",
  file: "explorer",

  wordpad: "wordpad",
  paint: "mspaint",
  "task manager": "taskmgr",
  settings: "ms-settings:"
};

const siteMap: Record<string, string> = {
  youtube: "https://youtube.com",
  google: "https://google.com",
  gmail: "https://mail.google.com",
  facebook: "https://facebook.com",
  fb: "https://facebook.com",
  instagram: "https://instagram.com",
  whatsapp: "https://web.whatsapp.com",
  twitter: "https://twitter.com",
  x: "https://x.com",
  github: "https://github.com",
  chatgpt: "https://chat.openai.com",
  netflix: "https://netflix.com",
  amazon: "https://amazon.com",
  linkedin: "https://linkedin.com",
  spotify: "https://open.spotify.com",
  wikipedia: "https://en.wikipedia.org"
};

// Sites that support a direct search/query URL.
const searchableSites: Record<string, string> = {
  youtube: "https://www.youtube.com/results?search_query=",
  google: "https://www.google.com/search?q=",
  amazon: "https://www.amazon.com/s?k=",
  wikipedia: "https://en.wikipedia.org/w/index.php?search="
};

// Remembers the last searchable site opened, so follow-up commands like
// "ab isme gana bajao" or "india ki history batao" continue on that same
// site's tab without repeating its name — until a different app/site is opened.
let lastSite: string | null = null;

/** Word-boundary match — avoids false positives like "x" matching inside "next"/"text". */
function matchesWord(text: string, word: string): boolean {
  return new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);
}

function findKey(text: string, map: Record<string, string>): string | undefined {
  return Object.keys(map)
    .sort((a, b) => b.length - a.length) // longer/more specific keys first
    .find(k => matchesWord(text, k));
}

// Blocked terms — never open/search these, regardless of phrasing.
const BLOCKED_TERMS = [
  "porn", "porno", "xxx", "nude", "nudes", "sex video", "adult video",
  "hentai", "onlyfans", "escort"
];

function isBlocked(text: string): boolean {
  return BLOCKED_TERMS.some(term => text.includes(term));
}

// Connector/filler words to strip out once the site name is found, so only
// the actual search query remains.
const SEARCH_FILLERS = [
  "pe", "par", "mein", "isme", "iska", "uska", "ab", "ek", "search", "karo", "kar", "kardo",
  "chalao", "chala do", "bajao", "baja do", "lagao", "laga do", "play", "on", "for",
  "video", "song", "gaana", "gana", "batao", "batado", "chahiye", "dikhao"
];

function extractSearchQuery(text: string, siteKey: string): string {
  let q = text.toLowerCase();
  q = q.replace(new RegExp(`\\b${siteKey}\\b`, "g"), " ");

  for (const word of SEARCH_FILLERS) {
    q = q.replace(new RegExp(`\\b${word}\\b`, "g"), " ");
  }

  return q.replace(/\s+/g, " ").trim();
}

const DOMAIN_PATTERN = /\.(com|in|org|net|io|co|dev|app)(\/\S*)?$/i;

function runCommand(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(`start "" "${command}"`, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function shortOk(): string {
  return "";
}

export async function openApplication(rawInput: string): Promise<string> {
  const key = rawInput.toLowerCase().trim();

  if (!key) {
    return "I didn't catch what you want me to open, Boss.";
  }

  if (isBlocked(key)) {
    return "Sorry Boss, I can't open that.";
  }

  // 1. Known desktop app
  const appKey = findKey(key, appMap);
  if (appKey) {
    try {
      await runCommand(appMap[appKey]);
      lastSite = null; // leaving any browser session
      return shortOk();
    } catch {
      return `I couldn't open ${rawInput}.`;
    }
  }

  // 2. Known website keyword — with optional search query
  const siteKey = findKey(key, siteMap);
  if (siteKey) {
    const query = extractSearchQuery(key, siteKey);

    if (searchableSites[siteKey]) lastSite = siteKey;

    const url =
      query && searchableSites[siteKey]
        ? `${searchableSites[siteKey]}${encodeURIComponent(query)}`
        : siteMap[siteKey];

    try {
      await openInSession(siteKey, url);
      return shortOk();
    } catch {
      return `I couldn't open ${siteKey}.`;
    }
  }

  // 2b. No app/site named — if a browsing session is active, treat this as
  // a continuation/search within it (e.g. "india ki history batao" while
  // Wikipedia is the active session) — reuses the SAME tab via the session map.
  if (lastSite && searchableSites[lastSite]) {
    const query = extractSearchQuery(key, lastSite);
    const url = query
      ? `${searchableSites[lastSite]}${encodeURIComponent(query)}`
      : siteMap[lastSite];

    try {
      await openInSession(lastSite, url);
      return shortOk();
    } catch {
      return `I couldn't do that on ${lastSite}.`;
    }
  }

  // 3. Looks like a raw domain (e.g. "example.com")
  if (DOMAIN_PATTERN.test(key)) {
    const url = key.startsWith("http") ? key : `https://${key}`;
    try {
      await openInSession(key, url);
      lastSite = key;
      return shortOk();
    } catch {
      return `I couldn't open ${key}.`;
    }
  }

  // 4. Try it as a literal app name anyway (in case it's installed but not in our map)
  try {
    await runCommand(key);
    lastSite = null;
    return shortOk();
  } catch {
    // 5. Last resort — search the web for it so the command never just fails silently.
    try {
      await openInSession("google", `https://www.google.com/search?q=${encodeURIComponent(rawInput)}`);
      lastSite = "google";
      return `I couldn't find an app called ${rawInput}, so I searched it on Google instead.`;
    } catch {
      return `I couldn't open ${rawInput}.`;
    }
  }
}