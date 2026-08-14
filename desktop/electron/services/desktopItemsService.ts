import { app, shell } from "electron";
import fs from "fs";
import path from "path";
import os from "os";

export type DesktopItemType =
  | "folder"
  | "file"
  | "shortcut"
  | "app"
  | "place";

export interface DesktopItem {
  name: string;
  /** Display label without extension (e.g. "Chrome" not "Chrome.lnk") */
  displayName: string;
  path: string;
  type: DesktopItemType;
  extension: string | null;
  size: number | null;
  modified: string | null;
  /** Built-in place id for Home / Downloads / etc. */
  placeId?: string;
}

/* ================= lightweight in-memory cache ================= */

const CACHE_TTL_MS = 30_000;

let cache: { ts: number; items: DesktopItem[] } | null = null;

const SHORTCUT_EXTS = new Set([".lnk", ".url", ".desktop"]);
const APP_EXTS = new Set([".exe", ".app", ".bat", ".cmd", ".msi", ".appx", ".msix"]);

function stripExtension(name: string): string {
  // Remove common shortcut / app suffixes for clean UI labels
  return name
    .replace(/\.lnk$/i, "")
    .replace(/\.url$/i, "")
    .replace(/\.desktop$/i, "")
    .replace(/ - Shortcut$/i, "")
    .replace(/\.exe$/i, "")
    .trim();
}

function classify(name: string, isDir: boolean): DesktopItemType {
  if (isDir) return "folder";
  const ext = path.extname(name).toLowerCase();
  if (SHORTCUT_EXTS.has(ext)) return "shortcut";
  if (APP_EXTS.has(ext)) return "app";
  return "file";
}

function safePath(key: "home" | "desktop" | "documents" | "downloads" | "pictures" | "music" | "videos"): string {
  try {
    if (key === "home") return app.getPath("home");
    return app.getPath(key);
  } catch {
    const home = process.env.USERPROFILE || process.env.HOME || os.homedir();
    const map: Record<string, string> = {
      home,
      desktop: path.join(home, "Desktop"),
      documents: path.join(home, "Documents"),
      downloads: path.join(home, "Downloads"),
      pictures: path.join(home, "Pictures"),
      music: path.join(home, "Music"),
      videos: path.join(home, "Videos")
    };
    return map[key] || home;
  }
}

/** Quick-access places (Start-menu style: Home, Downloads, Documents…). */
export function getSystemPlaces(): DesktopItem[] {
  const places: { id: string; label: string; path: string }[] = [
    { id: "home", label: "Home", path: safePath("home") },
    { id: "documents", label: "Documents", path: safePath("documents") },
    { id: "downloads", label: "Downloads", path: safePath("downloads") },
    { id: "pictures", label: "Pictures", path: safePath("pictures") },
    { id: "music", label: "Music", path: safePath("music") },
    { id: "videos", label: "Videos", path: safePath("videos") },
    { id: "desktop", label: "Desktop", path: safePath("desktop") }
  ];

  return places.map((p) => ({
    name: p.label,
    displayName: p.label,
    path: p.path,
    type: "place" as const,
    extension: null,
    size: null,
    modified: null,
    placeId: p.id
  }));
}

/**
 * Lists everything on the user's Desktop folder.
 * Pure Node fs — low load, works on any laptop after install.
 */
export function getDesktopItems(force = false): DesktopItem[] {
  if (!force && cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return cache.items;
  }

  const desktopPath = safePath("desktop");

  if (!desktopPath || !fs.existsSync(desktopPath)) {
    cache = { ts: Date.now(), items: [] };
    return [];
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(desktopPath, { withFileTypes: true });
  } catch {
    cache = { ts: Date.now(), items: [] };
    return [];
  }

  const items: DesktopItem[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "desktop.ini") continue;

    const fullPath = path.join(desktopPath, entry.name);
    let isDir = entry.isDirectory();
    let size: number | null = null;
    let modified: string | null = null;

    try {
      const st = fs.statSync(fullPath);
      isDir = st.isDirectory();
      size = isDir ? null : st.size;
      modified = st.mtime.toISOString();
    } catch {
      /* broken link — still list */
    }

    const type = classify(entry.name, isDir);
    const ext = isDir ? null : path.extname(entry.name).toLowerCase() || null;

    items.push({
      name: entry.name,
      displayName: stripExtension(entry.name),
      path: fullPath,
      type,
      extension: ext,
      size,
      modified
    });
  }

  const rank: Record<DesktopItemType, number> = {
    place: 0,
    folder: 1,
    app: 2,
    shortcut: 3,
    file: 4
  };
  items.sort((a, b) => {
    const r = rank[a.type] - rank[b.type];
    if (r !== 0) return r;
    return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" });
  });

  cache = { ts: Date.now(), items };
  return items;
}

export function clearDesktopItemsCache() {
  cache = null;
}

/** Open a path with the OS default handler. Allows Desktop items + known places. */
export async function openDesktopItem(itemPath: string): Promise<boolean> {
  try {
    const resolved = path.resolve(itemPath);
    const allowedRoots = [
      safePath("desktop"),
      safePath("home"),
      safePath("documents"),
      safePath("downloads"),
      safePath("pictures"),
      safePath("music"),
      safePath("videos")
    ].map((p) => path.resolve(p));

    const ok = allowedRoots.some(
      (root) => resolved === root || resolved.startsWith(root + path.sep)
    );
    if (!ok) return false;

    const err = await shell.openPath(resolved);
    return !err;
  } catch {
    return false;
  }
}
