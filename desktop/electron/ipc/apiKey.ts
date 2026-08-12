import { ipcMain } from "electron";
import { saveApiKey, getApiKey, hasApiKey, clearApiKey } from "../services/keyStore.js";

export function registerApiKeyIPC() {
  ipcMain.handle("apikey:save", (_, key: string) => {
    return saveApiKey(key);
  });

  ipcMain.handle("apikey:get", () => {
    return getApiKey();
  });

  ipcMain.handle("apikey:has", () => {
    return hasApiKey();
  });

  ipcMain.handle("apikey:clear", () => {
    return clearApiKey();
  });
}