import { ipcMain, shell } from "electron";

export function registerExternalIPC() {
  ipcMain.handle("system:openExternal", async (_, url: string) => {
    if (!url) return false;
    try {
      await shell.openExternal(url);
      return true;
    } catch (error) {
      console.error("Failed to open external URL:", error);
      return false;
    }
  });
}