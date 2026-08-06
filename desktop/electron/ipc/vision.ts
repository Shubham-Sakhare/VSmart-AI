import { ipcMain } from "electron";
import { captureScreen } from "../services/visionService.js";

export function registerVisionIPC() {

  ipcMain.handle("vision:captureScreen", async () => {
    try {
      return await captureScreen();
    } catch (error) {
      console.error("vision:captureScreen IPC error:", error);
      return null;
    }
  });

}