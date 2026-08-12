import { ipcMain } from "electron";
import { getAutostart, setAutostart } from "../services/launchPreference.js";

export function registerLaunchPrefIPC() {
  ipcMain.handle("launchpref:get", () => {
    return getAutostart();
  });

  ipcMain.handle("launchpref:set", (_, enabled: boolean) => {
    setAutostart(enabled);
    return true;
  });
}