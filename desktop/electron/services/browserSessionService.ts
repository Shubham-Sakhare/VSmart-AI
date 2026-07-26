import { exec } from "child_process";
import path from "path";
import os from "os";

const DEBUG_PORT = 9222;
const CHROME_PROFILE = path.join(os.homedir(), ".vsmart-chrome-profile");

// Maps a platform key (e.g. "youtube") to the CDP targetId of its open tab.
const platformSessions = new Map<string, string>();

let browserWs: WebSocket | null = null;
let msgId = 0;

function send(ws: WebSocket, method: string, params: Record<string, any> = {}, sessionId?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    const payload: Record<string, any> = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;

    const timeout = setTimeout(() => {
      ws.removeEventListener("message", handler);
      reject(new Error(`CDP timeout: ${method}`));
    }, 8000);

    const handler = (event: MessageEvent) => {
      const data = JSON.parse(event.data.toString());
      if (data.id === id) {
        clearTimeout(timeout);
        ws.removeEventListener("message", handler);
        if (data.error) reject(new Error(data.error.message));
        else resolve(data.result);
      }
    };

    ws.addEventListener("message", handler);
    ws.send(JSON.stringify(payload));
  });
}

async function isDebugPortUp(): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:${DEBUG_PORT}/json/version`);
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureChromeRunning(): Promise<boolean> {
  if (await isDebugPortUp()) return false; // already running

  exec(
    `start chrome --remote-debugging-port=${DEBUG_PORT} --user-data-dir="${CHROME_PROFILE}" --no-first-run`
  );

  for (let i = 0; i < 25; i++) {
    await new Promise(r => setTimeout(r, 300));
    if (await isDebugPortUp()) return true; // freshly launched
  }

  throw new Error("Chrome (VSmart profile) didn't start in time.");
}

async function connectBrowser(): Promise<WebSocket> {
  if (browserWs && browserWs.readyState === WebSocket.OPEN) return browserWs;

  const info = await fetch(`http://localhost:${DEBUG_PORT}/json/version`).then(r => r.json());
  const ws = new WebSocket(info.webSocketDebuggerUrl);

  await new Promise<void>((resolve, reject) => {
    ws.addEventListener("open", () => resolve(), { once: true });
    ws.addEventListener("error", () => reject(new Error("CDP connection failed")), { once: true });
  });

  browserWs = ws;
  return ws;
}

/**
 * Opens a URL under the given platform "session". If that platform already
 * has an open tab (and it's still open), the SAME tab is reused/navigated.
 * Otherwise a brand new browser window is opened for it.
 */
export async function openInSession(platformKey: string, url: string): Promise<void> {
  const freshlyLaunched = await ensureChromeRunning();
  const ws = await connectBrowser();

  const { targetInfos } = await send(ws, "Target.getTargets");

  // Chrome was just started — it already opened its own default window
  // (blank/new-tab page). Reuse THAT window instead of also creating a new
  // one, otherwise you'd get two windows for the very first command.
  if (freshlyLaunched) {
    const initialTab = targetInfos.find((t: any) => t.type === "page");

    if (initialTab) {
      const { sessionId } = await send(ws, "Target.attachToTarget", { targetId: initialTab.targetId, flatten: true });
      await send(ws, "Page.navigate", { url }, sessionId);
      await send(ws, "Target.activateTarget", { targetId: initialTab.targetId });
      platformSessions.set(platformKey, initialTab.targetId);
      return;
    }
  }

  const existingId = platformSessions.get(platformKey);
  const stillOpen = existingId && targetInfos.some((t: any) => t.targetId === existingId);

  if (stillOpen) {
    // Reuse the same tab — navigate it and bring it to front.
    const { sessionId } = await send(ws, "Target.attachToTarget", { targetId: existingId, flatten: true });
    await send(ws, "Page.navigate", { url }, sessionId);
    await send(ws, "Target.activateTarget", { targetId: existingId });
    return;
  }

  // New platform (or its tab was closed) — open a fresh window.
  const { targetId } = await send(ws, "Target.createTarget", { url, newWindow: true });
  platformSessions.set(platformKey, targetId);
}

/** Clears session memory for a platform (e.g. if the user explicitly closes/switches away). */
export function clearSession(platformKey?: string) {
  if (platformKey) platformSessions.delete(platformKey);
  else platformSessions.clear();
}