import { exec } from "child_process";

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
  spotify: "https://open.spotify.com"
};

// Sites that support a direct search/query URL — e.g. "youtube pe interstellar trailer chalao".
const searchableSites: Record<string, string> = {
  youtube: "https://www.youtube.com/results?search_query=",
  google: "https://www.google.com/search?q=",
  amazon: "https://www.amazon.com/s?k="
};

// Connector/filler words to strip out once the site name is found, so only
// the actual search query remains (e.g. "youtube pe interstellar trailer chalao"
// -> "interstellar trailer").
const SEARCH_FILLERS = [
  "pe", "par", "mein", "search", "karo", "kar", "kardo", "chalao", "chala do",
  "lagao", "laga do", "play", "on", "for", "video", "song", "gaana"
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

export async function openApplication(rawInput: string): Promise<string> {
  const key = rawInput.toLowerCase().trim();

  if (!key) {
    return "I didn't catch what you want me to open, Boss.";
  }

  // 1. Known desktop app
  if (appMap[key]) {
    try {
      await runCommand(appMap[key]);
      return `${rawInput} opened.`;
    } catch {
      return `I couldn't open ${rawInput}.`;
    }
  }

  // 2. Known website keyword — with optional search query (e.g. "youtube pe X chalao")
  const siteKey = Object.keys(siteMap).find(k => key.includes(k));
  if (siteKey) {
    const query = extractSearchQuery(key, siteKey);

    if (query && searchableSites[siteKey]) {
      try {
        await runCommand(`${searchableSites[siteKey]}${encodeURIComponent(query)}`);
        return `Playing "${query}" on ${siteKey}.`;
      } catch {
        return `I couldn't search for that on ${siteKey}.`;
      }
    }

    try {
      await runCommand(siteMap[siteKey]);
      return `${siteKey} opened.`;
    } catch {
      return `I couldn't open ${siteKey}.`;
    }
  }

  // 3. Looks like a raw domain (e.g. "example.com")
  if (DOMAIN_PATTERN.test(key)) {
    const url = key.startsWith("http") ? key : `https://${key}`;
    try {
      await runCommand(url);
      return `${key} opened.`;
    } catch {
      return `I couldn't open ${key}.`;
    }
  }

  // 4. Try it as a literal app name anyway (in case it's installed but not in our map)
  try {
    await runCommand(key);
    return `${rawInput} opened.`;
  } catch {
    // 5. Last resort — search the web for it so the command never just fails silently.
    try {
      await runCommand(`https://www.google.com/search?q=${encodeURIComponent(rawInput)}`);
      return `I couldn't find an app called ${rawInput}, so I searched it on Google instead.`;
    } catch {
      return `I couldn't open ${rawInput}.`;
    }
  }
}